import { supabaseAdmin } from './supabase-admin'
import { contextExists, loadContext, clearContext } from './test-context'

export default async function globalTeardown() {
  if (!contextExists()) return
  const ctx = loadContext()

  const { data: orders } = await supabaseAdmin
    .from('Order')
    .select('id')
    .eq('customerId', ctx.customerId)

  for (const order of orders ?? []) {
    const { data: items } = await supabaseAdmin
      .from('OrderItem')
      .select('id')
      .eq('orderId', order.id)
    const itemIds = (items ?? []).map(i => i.id)
    if (itemIds.length > 0) {
      await supabaseAdmin.from('WorkOrder').delete().in('orderItemId', itemIds)
      await supabaseAdmin.from('JobItem').delete().in('orderItemId', itemIds)
      await supabaseAdmin.from('OrderItem').delete().in('id', itemIds)
    }
    await supabaseAdmin.from('Order').delete().eq('id', order.id)
  }

  await supabaseAdmin.from('Customer').delete().eq('id', ctx.customerId)

  clearContext()
}
