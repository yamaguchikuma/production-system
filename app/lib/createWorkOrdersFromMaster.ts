import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

/**
 * 品番マスタ（PartProcess）を参照してWorkOrderを自動作成する
 * @param orderItemId  対象のOrderItem ID
 * @param productCode  品番
 * @returns 作成件数（0 = マスタなし or 既に工程あり）
 */
export async function createWorkOrdersFromMaster(
  orderItemId: string,
  productCode: string | null
): Promise<{ created: number; error?: string }> {
  if (!productCode) return { created: 0 }

  // 品番マスタを検索
  const { data: part } = await supabase
    .from('Part')
    .select('id')
    .eq('partCode', productCode)
    .single()

  if (!part) return { created: 0 }

  // その品番の工程リストを取得
  const { data: partProcesses, error: ppError } = await supabase
    .from('PartProcess')
    .select('seq, processId, machineType')
    .eq('partId', part.id)
    .order('seq')

  if (ppError) return { created: 0, error: ppError.message }
  if (!partProcesses || partProcesses.length === 0) return { created: 0 }

  // machineType名から機械IDを解決
  const machineNames = partProcesses.map(p => p.machineType).filter(Boolean)
  const machineMap = new Map<string, string>()
  if (machineNames.length > 0) {
    const { data: machines } = await supabase
      .from('Machine')
      .select('id, name')
      .in('name', machineNames)
    ;(machines ?? []).forEach(m => machineMap.set(m.name, m.id))
  }

  const workOrders = partProcesses.map(pp => ({
    orderItemId,
    processId: pp.processId,
    machineId: machineMap.get(pp.machineType) ?? null,
    seq: pp.seq,
    status: 'SCHEDULED',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }))

  const { error: woError } = await supabase.from('WorkOrder').insert(workOrders)
  if (woError) return { created: 0, error: woError.message }

  return { created: workOrders.length }
}
