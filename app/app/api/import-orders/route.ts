import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { createWorkOrdersFromMaster } from '@/lib/createWorkOrdersFromMaster'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

function normalizeDate(raw: string): string {
  let s = raw.normalize('NFKC').trim()

  // Excelシリアル値（数値のみ）→ 日付変換
  if (/^\d{4,6}$/.test(s)) {
    const serial = Number(s)
    const date = new Date((serial - 25569) * 86400 * 1000)
    return date.toISOString().slice(0, 10)
  }

  // 曜日除去
  s = s.replace(/\([^\)]*\)/, '').trim()
  // スラッシュ・ドットをハイフンに統一
  s = s.replace(/[\/\.]/g, '-')
  // yyyy-m-d → yyyy-mm-dd
  const m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (m) {
    return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`
  }
  return s
}

export async function POST(request: Request) {
  const formData = await request.formData()
  const file = formData.get('file') as File
  if (!file) return NextResponse.json({ error: 'ファイルがありません' }, { status: 400 })

  const buffer = await file.arrayBuffer()
  const wb = XLSX.read(buffer, { type: 'array' })
  const sheet = wb.Sheets['入力']
  if (!sheet) return NextResponse.json({ error: '「入力」シートが見つかりません' }, { status: 400 })

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })

  const { data: customers } = await supabase.from('Customer').select('id, name')
  const customerMap = new Map((customers ?? []).map(c => [c.name, c.id]))

  const { data: processes } = await supabase.from('Process').select('id, name')
  const processMap = new Map((processes ?? []).map(p => [p.name, p.id]))

  const { data: machines } = await supabase.from('Machine').select('id, name')
  const machineMap = new Map((machines ?? []).map(m => [m.name, m.id]))

  const now = new Date()
  const prefix = `${String(now.getFullYear()).slice(-2)}${String(now.getMonth() + 1).padStart(2, '0')}`

  const results: string[] = []
  const errors: string[] = []

  // 顧客ごとにグループ化して受注ヘッダーをまとめる
  const grouped = new Map<string, typeof rows>()
  for (const row of rows) {
    const customerName = String(row['顧客名'] ?? '').trim()
    if (!customerName) continue
    if (!grouped.has(customerName)) grouped.set(customerName, [])
    grouped.get(customerName)!.push(row)
  }

  for (const [customerName, items] of grouped) {
    const customerId = customerMap.get(customerName)
    if (!customerId) {
      errors.push(`顧客「${customerName}」がマスタに存在しません`)
      continue
    }

    // 納期はアイテムの最も早い納期を受注納期にする
    const dueDates = items
      .map(r => normalizeDate(String(r['納期'] ?? '')))
      .filter(Boolean)
      .sort()
    const dueDate = dueDates[0] ?? ''

    // 受注番号生成
    const { count } = await supabase
      .from('Order')
      .select('*', { count: 'exact', head: true })
      .like('orderNumber', `${prefix}-%`)
    const seq = String((count ?? 0) + 1).padStart(3, '0')
    const orderNumber = `${prefix}-${seq}`

    const { data: order, error: orderError } = await supabase
      .from('Order')
      .insert([{
        orderNumber,
        customerId,
        dueDate,
        status: 'PENDING',
        source: 'excel',
        notes: '',
      }])
      .select()
      .single()

    if (orderError) {
      errors.push(`顧客「${customerName}」の受注作成失敗: ${orderError.message}`)
      continue
    }

    const orderItems = items.map(row => ({
      orderId: order.id,
      productCode: String(row['品番'] ?? '').trim() || null,
      partName: String(row['品名'] ?? '').trim() || null,
      quantity: Number(row['数量']) || 1,
      unitPrice: Number(row['単価（円）']) || null,
      hasBend: false,
      processingMethod: 'PRESS',
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }))

    const { data: insertedItems, error: itemError } = await supabase
      .from('OrderItem').insert(orderItems).select('id, productCode')
    if (itemError) {
      errors.push(`顧客「${customerName}」の明細作成失敗: ${itemError.message}`)
      continue
    }

    // 工程登録（工程1・工程2が入力されていれば WorkOrder を作成）
    for (let idx = 0; idx < items.length; idx++) {
      const row = items[idx]
      const orderItemId = insertedItems?.[idx]?.id
      if (!orderItemId) continue

      const processCols = [
        { process: String(row['工程1'] ?? '').trim(), machine: String(row['機械1'] ?? '').trim() },
        { process: String(row['工程2'] ?? '').trim(), machine: String(row['機械2'] ?? '').trim() },
        { process: String(row['工程3'] ?? '').trim(), machine: String(row['機械3'] ?? '').trim() },
        { process: String(row['工程4'] ?? '').trim(), machine: String(row['機械4'] ?? '').trim() },
        { process: String(row['工程5'] ?? '').trim(), machine: String(row['機械5'] ?? '').trim() },
      ]

      const workOrders = processCols
        .filter(c => c.process)
        .map((c, seq) => ({
          orderItemId,
          processId: processMap.get(c.process) ?? null,
          machineId: machineMap.get(c.machine) ?? null,
          seq: seq + 1,
          status: 'SCHEDULED',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }))
        .filter(w => w.processId)

      if (workOrders.length > 0) {
        const { error: woError } = await supabase.from('WorkOrder').insert(workOrders)
        if (woError) errors.push(`工程登録失敗（${String(row['品番'] ?? '')}）: ${woError.message}`)
      } else {
        // Excel に工程列がない場合は品番マスタから自動セット
        const productCode = String(row['品番'] ?? '').trim() || null
        const { error: masterError } = await createWorkOrdersFromMaster(orderItemId, productCode)
        if (masterError) errors.push(`品番マスタからの工程登録失敗（${productCode}）: ${masterError}`)
      }
    }

    results.push(`${orderNumber} ${customerName} ${items.length}品目`)
  }

  return NextResponse.json({ success: results, errors })
}
