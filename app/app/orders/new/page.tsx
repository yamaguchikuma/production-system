'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'

interface Customer { id: string; name: string }
interface ProductFamily { id: string; name: string }
interface Part { id: string; partCode: string; partName: string; customerName: string; unitPrice: number | null }
interface OrderItem {
  partId: string; productFamilyId: string; productCode: string; partName: string
  quantity: number; unitPrice: string; hasBend: boolean
}

type SearchMode = 'customer' | 'keyword' | 'stepwise'

function MasterSearch({ parts, customers, onSelect, selectedPartId, onClear }: {
  parts: Part[]; customers: Customer[]
  onSelect: (part: Part) => void
  selectedPartId: string
  onClear: () => void
}) {
  const [mode, setMode] = useState<SearchMode>('customer')
  const [filterCustomer, setFilterCustomer] = useState('')
  const [keyword, setKeyword] = useState('')
  const [stepCustomer, setStepCustomer] = useState('')
  const [stepCode, setStepCode] = useState('')

  const customerNames = useMemo(() => [...new Set(parts.map(p => p.customerName))].sort(), [parts])

  const filtered = useMemo(() => {
    if (mode === 'customer') return filterCustomer ? parts.filter(p => p.customerName === filterCustomer) : parts
    if (mode === 'keyword') {
      const kw = keyword.toLowerCase()
      return kw ? parts.filter(p => p.partCode.toLowerCase().includes(kw) || p.partName.toLowerCase().includes(kw)) : []
    }
    if (mode === 'stepwise') {
      let r = parts
      if (stepCustomer) r = r.filter(p => p.customerName === stepCustomer)
      if (stepCode) r = r.filter(p => p.partCode === stepCode)
      return r
    }
    return parts
  }, [mode, parts, filterCustomer, keyword, stepCustomer, stepCode])

  const stepCodes = useMemo(() =>
    [...new Set(parts.filter(p => !stepCustomer || p.customerName === stepCustomer).map(p => p.partCode))].sort()
  , [parts, stepCustomer])

  if (selectedPartId) {
    const selected = parts.find(p => p.id === selectedPartId)
    return (
      <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-sm">
        <span className="text-green-700 font-medium">{selected?.partCode} — {selected?.partName}</span>
        <span className="text-green-500 text-xs">（マスタ）</span>
        <button type="button" onClick={onClear} className="ml-auto text-xs text-gray-400 hover:text-red-500">新規入力に切替</button>
      </div>
    )
  }

  return (
    <div className="border border-gray-200 rounded-lg p-2 bg-gray-50 space-y-2">
      <div className="flex gap-1">
        {([['customer','①顧客→品番'],['keyword','②ワード検索'],['stepwise','③段階絞り込み']] as [SearchMode,string][]).map(([k,l]) => (
          <button key={k} type="button" onClick={() => setMode(k)}
            className={`text-xs px-2 py-1 rounded-md font-medium whitespace-nowrap transition-colors ${
              mode===k ? 'bg-blue-600 text-white' : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-100'
            }`}>{l}</button>
        ))}
      </div>

      {mode === 'customer' && (
        <div className="flex gap-2">
          <select value={filterCustomer} onChange={e => setFilterCustomer(e.target.value)}
            className="flex-1 min-w-0 border border-gray-300 rounded-lg px-2 py-1.5 text-sm bg-white">
            <option value="">顧客（すべて）</option>
            {customerNames.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
          <select onChange={e => { const p = parts.find(x => x.id === e.target.value); if(p) onSelect(p) }}
            className="flex-1 min-w-0 border border-gray-300 rounded-lg px-2 py-1.5 text-sm bg-white">
            <option value="">品番を選択</option>
            {filtered.map(p => <option key={p.id} value={p.id}>{p.partCode} — {p.partName}</option>)}
          </select>
        </div>
      )}

      {mode === 'keyword' && (
        <div className="space-y-1">
          <input type="text" value={keyword} onChange={e => setKeyword(e.target.value)}
            placeholder="品番または品名を入力..."
            className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-white" />
          {keyword && (
            <div className="max-h-36 overflow-y-auto space-y-1 bg-white border border-gray-200 rounded-lg p-1">
              {filtered.length === 0 && <p className="text-xs text-gray-400 text-center py-2">該当なし</p>}
              {filtered.map(p => (
                <button key={p.id} type="button" onClick={() => onSelect(p)}
                  className="w-full text-left text-xs px-3 py-2 rounded-md hover:bg-blue-50 transition-colors">
                  <span className="font-medium text-gray-800">{p.partCode}</span>
                  <span className="ml-2 text-gray-500">{p.partName}</span>
                  <span className="ml-2 text-gray-400">{p.customerName}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {mode === 'stepwise' && (
        <div className="flex gap-2">
          <select value={stepCustomer} onChange={e => { setStepCustomer(e.target.value); setStepCode('') }}
            className="flex-1 min-w-0 border border-gray-300 rounded-lg px-2 py-1.5 text-sm bg-white">
            <option value="">顧客（すべて）</option>
            {customerNames.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
          <select value={stepCode} onChange={e => setStepCode(e.target.value)}
            className="flex-1 min-w-0 border border-gray-300 rounded-lg px-2 py-1.5 text-sm bg-white">
            <option value="">品番（すべて）</option>
            {stepCodes.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select onChange={e => { const p = parts.find(x => x.id === e.target.value); if(p) onSelect(p) }}
            className="flex-1 min-w-0 border border-gray-300 rounded-lg px-2 py-1.5 text-sm bg-white">
            <option value="">品名を選択</option>
            {filtered.map(p => <option key={p.id} value={p.id}>{p.partName}</option>)}
          </select>
        </div>
      )}
    </div>
  )
}

export default function NewOrderPage() {
  const router = useRouter()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [parts, setParts] = useState<Part[]>([])
  const [productFamilies, setProductFamilies] = useState<ProductFamily[]>([])
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ customerId: '', dueDate: '', notes: '' })
  const [items, setItems] = useState<OrderItem[]>([
    { partId: '', productFamilyId: '', productCode: '', partName: '', quantity: 1, unitPrice: '', hasBend: false }
  ])

  useEffect(() => {
    fetch('/api/customers').then(r => r.json()).then(setCustomers)
    fetch('/api/parts').then(r => r.json()).then(setParts)
    fetch('/api/product-families').then(r => r.json()).then(setProductFamilies)
  }, [])

  const updateItem = (i: number, field: string, value: unknown) =>
    setItems(prev => prev.map((item, idx) => idx === i ? { ...item, [field]: value } : item))

  const handlePartSelect = (index: number, part: Part) => {
    setItems(prev => prev.map((item, i) => i !== index ? item : {
      ...item, partId: part.id, productCode: part.partCode,
      partName: part.partName, unitPrice: part.unitPrice ? String(part.unitPrice) : '',
    }))
    const customer = customers.find(c => c.name === part.customerName)
    if (customer && !form.customerId) setForm(f => ({ ...f, customerId: customer.id }))
  }

  const handlePartClear = (index: number) => {
    setItems(prev => prev.map((item, i) => i !== index ? item : {
      ...item, partId: '', productCode: '', partName: '', unitPrice: '',
    }))
  }

  const addItem = () => setItems(prev => [...prev, {
    partId: '', productFamilyId: '', productCode: '', partName: '', quantity: 1, unitPrice: '', hasBend: false
  }])

  const removeItem = (i: number) => setItems(prev => prev.filter((_, idx) => idx !== i))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, orderItems: items }),
      })
      if (!res.ok) throw new Error('登録に失敗しました')
      router.push('/orders')
    } catch (err) {
      alert(err instanceof Error ? err.message : '登録に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-4">
        <h1 className="text-2xl font-bold text-gray-800">受注登録</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 基本情報 */}
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">顧客名 *</label>
                <select required data-testid="order-customer-select" value={form.customerId} onChange={e => setForm({ ...form, customerId: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">選択してください</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">納期 *</label>
                <input type="date" required data-testid="order-duedate-input" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">備考</label>
                <input type="text" data-testid="order-notes-input" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="特記事項" />
              </div>
            </div>
          </div>

          {/* 明細 */}
          <div className="space-y-3">
            {items.map((item, i) => (
              <div key={i} className="bg-white rounded-xl shadow-sm p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-500">明細 {i + 1}</span>
                  {items.length > 1 && (
                    <button type="button" onClick={() => removeItem(i)} className="text-xs text-red-400 hover:text-red-600">削除</button>
                  )}
                </div>

                {/* マスタ検索（常時表示） */}
                <MasterSearch
                  parts={parts} customers={customers}
                  selectedPartId={item.partId}
                  onSelect={part => handlePartSelect(i, part)}
                  onClear={() => handlePartClear(i)}
                />

                {/* 品番・品名・数量・単価・曲げ */}
                <div className="grid grid-cols-5 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">品番</label>
                    <input type="text" data-testid={`item-productcode-${i}`} value={item.productCode}
                      onChange={e => updateItem(i, 'productCode', e.target.value)}
                      readOnly={!!item.partId}
                      className={`w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${item.partId ? 'bg-gray-50 text-gray-500' : ''}`}
                      placeholder="ABC-001" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs text-gray-500 mb-1">品名</label>
                    <input type="text" data-testid={`item-partname-${i}`} value={item.partName}
                      onChange={e => updateItem(i, 'partName', e.target.value)}
                      readOnly={!!item.partId}
                      className={`w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${item.partId ? 'bg-gray-50 text-gray-500' : ''}`}
                      placeholder="品名" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">数量 *</label>
                    <input type="number" required min={1} data-testid={`item-quantity-${i}`} value={item.quantity}
                      onChange={e => updateItem(i, 'quantity', Number(e.target.value))}
                      className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">単価（円）</label>
                    <input type="number" value={item.unitPrice}
                      onChange={e => updateItem(i, 'unitPrice', e.target.value)}
                      readOnly={!!item.partId}
                      className={`w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${item.partId ? 'bg-gray-50 text-gray-500' : ''}`}
                      placeholder="0" />
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                    <input type="checkbox" checked={item.hasBend}
                      onChange={e => updateItem(i, 'hasBend', e.target.checked)} className="w-4 h-4" />
                    曲げあり
                  </label>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-500">製品ファミリー</label>
                    <select value={item.productFamilyId}
                      onChange={e => updateItem(i, 'productFamilyId', e.target.value)}
                      className="border border-gray-300 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="">なし</option>
                      {productFamilies.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center">
            <button type="button" onClick={addItem}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-200">
              ＋ 明細を追加
            </button>
            <div className="flex gap-3">
              <button type="button" onClick={() => router.push('/orders')}
                className="px-6 py-2 border border-gray-300 rounded-xl text-gray-600 hover:bg-gray-50 text-sm font-medium">
                キャンセル
              </button>
              <button type="submit" disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 text-sm font-medium disabled:opacity-50">
                {loading ? '登録中...' : '受注登録'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
