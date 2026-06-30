import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const unassigned = searchParams.get('unassigned') === 'true'
  const noWorkOrder = searchParams.get('no-work-order') === 'true'

  let query = supabase
    .from('OrderItem')
    .select(`
      id, productCode, partName, quantity, unitPrice, hasBend, status,
      Order (id, orderNumber, dueDate, notes, Customer (name))
    `)
    .order('createdAt', { ascending: true })

  if (unassigned) {
    const { data: assignedItems } = await supabase
      .from('JobItem')
      .select('orderItemId')
    const assignedIds = (assignedItems ?? []).map((j: { orderItemId: string }) => j.orderItemId)
    if (assignedIds.length > 0) {
      query = query.not('id', 'in', `(${assignedIds.map((id: string) => `"${id}"`).join(',')})`)
    }
    query = query.eq('status', 'PENDING')
  }

  if (noWorkOrder) {
    // WorkOrderが1件もない品目のみ返す
    const { data: woItems } = await supabase
      .from('WorkOrder')
      .select('orderItemId')
    const woIds = [...new Set((woItems ?? []).map((w: { orderItemId: string }) => w.orderItemId))]
    if (woIds.length > 0) {
      query = query.not('id', 'in', `(${woIds.map((id: string) => `"${id}"`).join(',')})`)
    }
    query = query.eq('status', 'PENDING')
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
