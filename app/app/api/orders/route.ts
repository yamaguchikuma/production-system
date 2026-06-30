import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { createWorkOrdersFromMaster } from '@/lib/createWorkOrdersFromMaster'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET() {
  const { data, error } = await supabase
    .from('Order')
    .select(`
      *,
      Customer (id, name),
      OrderItem (id, productCode, partName, quantity, unitPrice, hasBend, status)
    `)
    .order('dueDate', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const body = await request.json()
  const { customerId, dueDate, notes, orderItems } = body

  // 受注番号を生成（年2桁-月2桁-連番3桁）
  const now = new Date()
  const prefix = `${String(now.getFullYear()).slice(-2)}${String(now.getMonth() + 1).padStart(2, '0')}`
  const { count } = await supabase
    .from('Order')
    .select('*', { count: 'exact', head: true })
    .like('orderNumber', `${prefix}-%`)
  const seq = String((count ?? 0) + 1).padStart(3, '0')
  const orderNumber = `${prefix}-${seq}`

  // 受注ヘッダー作成
  const { data: order, error: orderError } = await supabase
    .from('Order')
    .insert([{ orderNumber, customerId, dueDate, notes, status: 'PENDING', source: 'manual' }])
    .select()
    .single()

  if (orderError) {
    console.error('Order insert error:', orderError)
    return NextResponse.json({ error: orderError.message }, { status: 500 })
  }

  // 受注明細作成
  if (orderItems && orderItems.length > 0) {
    const items = orderItems.map((item: Record<string, unknown>) => ({
      orderId: order.id,
      productFamilyId: item.productFamilyId || null,
      productCode: item.productCode || null,
      partName: item.partName || null,
      quantity: Number(item.quantity),
      unitPrice: item.unitPrice ? Number(item.unitPrice) : null,
      thickness: item.thickness ? Number(item.thickness) : null,
      width: item.width ? Number(item.width) : null,
      height: item.height ? Number(item.height) : null,
      hasBend: item.hasBend ?? false,
      processingMethod: item.processingMethod || 'PRESS',
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }))
    const { data: insertedItems, error: itemError } = await supabase
      .from('OrderItem').insert(items).select('id, productCode')
    if (itemError) {
      console.error('OrderItem insert error:', itemError)
      return NextResponse.json({ error: itemError.message }, { status: 500 })
    }

    // 品番マスタから工程を自動セット
    for (const item of insertedItems ?? []) {
      await createWorkOrdersFromMaster(item.id, item.productCode)
    }
  }

  return NextResponse.json(order)
}
