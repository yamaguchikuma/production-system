import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET() {
  const { data, error } = await supabase
    .from('ProductionJob')
    .select(`
      id, jobNumber, processType, status, scheduledDate, startedAt, completedAt, notes,
      Machine (id, name),
      JobItem (
        id,
        OrderItem (
          id, productCode, quantity, hasBend,
          Order (id, orderNumber, dueDate, Customer (name))
        )
      )
    `)
    .order('createdAt', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const body = await request.json()
  const { processType, machineId, scheduledDate, notes, orderItemIds } = body

  // ジョブ番号生成（例: JOB-2606-001）
  const now = new Date()
  const prefix = `JOB-${String(now.getFullYear()).slice(-2)}${String(now.getMonth() + 1).padStart(2, '0')}`
  const { count } = await supabase
    .from('ProductionJob')
    .select('*', { count: 'exact', head: true })
    .like('jobNumber', `${prefix}-%`)
  const seq = String((count ?? 0) + 1).padStart(3, '0')
  const jobNumber = `${prefix}-${seq}`

  const { data: job, error: jobError } = await supabase
    .from('ProductionJob')
    .insert([{ jobNumber, processType, machineId: machineId || null, scheduledDate: scheduledDate || null, notes: notes || null, status: 'PENDING' }])
    .select()
    .single()

  if (jobError) return NextResponse.json({ error: jobError.message }, { status: 500 })

  if (orderItemIds && orderItemIds.length > 0) {
    const jobItems = orderItemIds.map((orderItemId: string) => ({ jobId: job.id, orderItemId }))
    const { error: itemError } = await supabase.from('JobItem').insert(jobItems)
    if (itemError) return NextResponse.json({ error: itemError.message }, { status: 500 })
  }

  return NextResponse.json(job)
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url)
  const jobId = searchParams.get('id')
  if (!jobId) return NextResponse.json({ error: 'id required' }, { status: 400 })

  await supabase.from('JobItem').delete().eq('jobId', jobId)
  const { error } = await supabase.from('ProductionJob').delete().eq('id', jobId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
