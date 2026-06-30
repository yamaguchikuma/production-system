import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: Request) {
  const formData = await request.formData()
  const file = formData.get('file') as File
  if (!file) return NextResponse.json({ error: 'ファイルがありません' }, { status: 400 })

  const buffer = await file.arrayBuffer()
  const wb = XLSX.read(buffer, { type: 'array' })
  const sheet = wb.Sheets['入力']
  if (!sheet) return NextResponse.json({ error: '「入力」シートが見つかりません' }, { status: 400 })

  // 2行ヘッダー構造を処理（1行目:工程N、2行目:工程名称/機械/時間）
  const rawRows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: '' }) as string[][]
  if (rawRows.length < 3) return NextResponse.json({ error: 'データがありません' }, { status: 400 })

  const header1 = rawRows[0] // 品番, 品名, 顧客名, 工程1, '', '', 工程2, ...
  const header2 = rawRows[1] // '', '', '', 工程名称, 機械, 時間(分/個), ...
  const dataRows = rawRows.slice(2)

  // 単価列を探す（3列目固定 or ヘッダーで判定）
  const unitPriceCol = String(header1[3]).includes('単価') ? 3 : -1
  const dataStartCol = unitPriceCol >= 0 ? 4 : 3

  // 列インデックスを解析
  const colMap: { processIdx: number; nameCol: number; machineCol: number; timeCol: number }[] = []
  let processIdx = 1
  for (let c = dataStartCol; c < header1.length; c++) {
    if (String(header1[c]).startsWith('工程')) {
      colMap.push({ processIdx: processIdx++, nameCol: c, machineCol: c + 1, timeCol: c + 2 })
    }
  }

  const { data: processes } = await supabase.from('Process').select('id, name')
  const processMap = new Map((processes ?? []).map(p => [p.name, p.id]))

  const results: string[] = []
  const errors: string[] = []

  for (const row of dataRows) {
    const partCode = String(row[0] ?? '').trim()
    if (!partCode) continue

    const partName = String(row[1] ?? '').trim()
    const customerName = String(row[2] ?? '').trim()
    const unitPrice = unitPriceCol >= 0 ? (Number(row[unitPriceCol]) || null) : null

    let { data: part } = await supabase
      .from('Part')
      .select('id')
      .eq('partCode', partCode)
      .single()

    if (!part) {
      const { data: newPart, error } = await supabase
        .from('Part')
        .insert({ partCode, partName, customerName, unitPrice })
        .select('id')
        .single()
      if (error) { errors.push(`品番「${partCode}」の作成失敗: ${error.message}`); continue }
      part = newPart
    } else {
      await supabase.from('Part').update({ partName, customerName, unitPrice }).eq('id', part.id)
    }

    await supabase.from('PartProcess').delete().eq('partId', part.id)

    for (const col of colMap) {
      const processName = String(row[col.nameCol] ?? '').trim()
      if (!processName) continue

      const processId = processMap.get(processName) ?? null
      if (!processId) errors.push(`品番「${partCode}」の工程「${processName}」がマスタに存在しません`)

      const machineName = String(row[col.machineCol] ?? '').trim()
      const stdMin = Number(row[col.timeCol]) || null

      await supabase.from('PartProcess').insert({
        partId: part.id,
        seq: col.processIdx,
        processId,
        machineType: machineName || null,
        stdMinPerPc: stdMin,
      })
    }

    results.push(`${partCode} ${partName}`)
  }

  return NextResponse.json({ success: results, errors })
}
