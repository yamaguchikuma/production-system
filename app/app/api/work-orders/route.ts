import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const employeeId = searchParams.get('employeeId')
  const date = searchParams.get('date') // YYYY-MM-DD

  let query = supabase
    .from('WorkOrder')
    .select(`
      *,
      Process (id, name, machineType),
      Machine (id, name),
      Employee (id, name),
      OrderItem (
        id, productCode, quantity, thickness, width, height, hasBend,
        Order (id, orderNumber, dueDate, Customer (name))
      )
    `)
    .order('seq', { ascending: true })

  if (employeeId) query = query.eq('employeeId', employeeId)

  if (date) {
    const start = `${date}T00:00:00`
    const end = `${date}T23:59:59`
    query = query.gte('scheduledStart', start).lte('scheduledStart', end)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const body = await request.json()
  const { orderItemId, processId, machineId, employeeId, scheduledStart, scheduledEnd, seq } = body

  const { data, error } = await supabase
    .from('WorkOrder')
    .insert({
      orderItemId,
      processId,
      machineId: machineId || null,
      employeeId: employeeId || null,
      scheduledStart,
      scheduledEnd,
      seq: seq ?? 1,
      status: 'SCHEDULED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PATCH(request: Request) {
  const body = await request.json()
  const { id, status, actualStart, actualEnd } = body

  const updateData: Record<string, unknown> = { status }
  if (actualStart) updateData.actualStart = actualStart
  if (actualEnd) updateData.actualEnd = actualEnd

  const { data, error } = await supabase
    .from('WorkOrder')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
