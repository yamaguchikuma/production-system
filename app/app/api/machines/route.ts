import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET() {
  const { data: machines, error } = await supabase
    .from('Machine')
    .select('id, name, machineType')
    .order('name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // 全WorkOrderを取得（品目ごとの全工程リスト用）
  const { data: allWorkOrders } = await supabase
    .from('WorkOrder')
    .select(`id, seq, status, machineId, Process (id, name), OrderItem (id)`)
    .not('machineId', 'is', null)

  // WorkOrder（個別品目の工程登録）を機械ごとに取得
  const { data: workOrders, error: woError } = await supabase
    .from('WorkOrder')
    .select(`
      id, seq, status, machineId,
      Process (id, name),
      OrderItem (
        id, productCode, partName, quantity,
        Order (id, orderNumber, dueDate, notes, Customer (name))
      )
    `)
    .not('machineId', 'is', null)
    .not('status', 'eq', 'COMPLETED')

  if (woError) console.error('WorkOrder query error:', woError.message)

  // アクティブなJobItem（完了・キャンセル以外）に含まれているOrderItemのIDを取得
  const { data: activeJobs } = await supabase
    .from('ProductionJob')
    .select('id')
    .not('status', 'in', '("DONE","COMPLETED","CANCELLED")')
  const activeJobIds = (activeJobs ?? []).map((j: { id: string }) => j.id)
  const nestedOrderItemIds = new Set<string>()
  if (activeJobIds.length > 0) {
    const { data: jobItems } = await supabase
      .from('JobItem')
      .select('orderItemId')
      .in('jobId', activeJobIds)
    ;(jobItems ?? []).forEach((ji: { orderItemId: string }) => nestedOrderItemIds.add(ji.orderItemId))
  }

  // 品目ごとの全工程マップ（展開表示用）
  const allWoByItem: Record<string, { seq: number; status: string; processName: string }[]> = {}
  for (const wo of allWorkOrders ?? []) {
    const key = wo.OrderItem?.id
    if (!key) continue
    if (!allWoByItem[key]) allWoByItem[key] = []
    allWoByItem[key].push({ seq: wo.seq, status: wo.status, processName: wo.Process?.name ?? '' })
  }

  // 品目ごとに最小seq（次にやるべき工程）のみ残す & ネスティング済みを除外
  const nextWorkOrders = Object.values(
    (workOrders ?? []).reduce((acc, wo) => {
      const key = wo.OrderItem?.id
      if (!key) return acc
      if (nestedOrderItemIds.has(key)) return acc
      if (!acc[key] || wo.seq < acc[key].seq) acc[key] = wo
      return acc
    }, {} as Record<string, typeof workOrders[0]>)
  ).map(wo => ({
    ...wo,
    allProcesses: (allWoByItem[wo.OrderItem?.id] ?? []).sort((a, b) => a.seq - b.seq),
  }))

  // ProductionJob（ネスティンググループ）を機械ごとに取得
  const { data: jobs } = await supabase
    .from('ProductionJob')
    .select(`
      id, "jobNumber", status, "machineId",
      JobItem (
        id,
        OrderItem (
          id, productCode, partName, quantity,
          Order (id, orderNumber, dueDate, Customer (name))
        )
      )
    `)
    .not('status', 'eq', 'DONE')

  const machinesWithData = (machines ?? []).map(m => ({
    ...m,
    workOrders: nextWorkOrders.filter(w => w.machineId === m.id),
    jobs: (jobs ?? []).filter(j => j.machineId === m.id),
  }))

  return NextResponse.json(machinesWithData)
}

export async function POST(request: Request) {
  const { name, machineType } = await request.json()
  if (!name?.trim()) return NextResponse.json({ error: '機械名は必須です' }, { status: 400 })

  const { data, error } = await supabase
    .from('Machine')
    .insert({ name: name.trim(), machineType: machineType?.trim() ?? '' })
    .select('id, name, machineType')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { error } = await supabase.from('Machine').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
