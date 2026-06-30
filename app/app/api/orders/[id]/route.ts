import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { data, error } = await supabase
    .from('Order')
    .select(`
      *,
      Customer (id, name),
      OrderItem (
        id, productCode, quantity, unitPrice, hasBend, status,
        processingMethod, createdAt
      )
    `)
    .eq('id', id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  // OrderItem・WorkOrderを先に削除してからOrderを削除
  const { data: items } = await supabase.from('OrderItem').select('id').eq('orderId', id)
  const itemIds = (items ?? []).map(i => i.id)
  if (itemIds.length > 0) {
    await supabase.from('WorkOrder').delete().in('orderItemId', itemIds)
    await supabase.from('JobItem').delete().in('orderItemId', itemIds)
    await supabase.from('OrderItem').delete().in('id', itemIds)
  }
  const { error } = await supabase.from('Order').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
