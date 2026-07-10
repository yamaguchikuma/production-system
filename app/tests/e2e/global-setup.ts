import { supabaseAdmin } from './supabase-admin'
import { saveContext } from './test-context'

export default async function globalSetup() {
  const runTag = `E2E-${Date.now()}`

  const { data: customer, error } = await supabaseAdmin
    .from('Customer')
    .insert([{ name: `【自動テスト】${runTag}`, isExcelSync: false }])
    .select()
    .single()

  if (error || !customer) {
    throw new Error(`テスト用顧客の作成に失敗しました: ${error?.message}`)
  }

  saveContext({
    runTag,
    customerId: customer.id,
    customerName: customer.name,
    productCode: `${runTag}-PART`,
    partName: `自動テスト部品_${runTag}`,
  })
}
