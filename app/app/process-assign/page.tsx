'use client'

import { useEffect, useState } from 'react'

interface OrderItem {
  id: string
  productCode: string | null
  partName: string | null
  quantity: number
  unitPrice: number | null
  hasBend: boolean
  Order: { orderNumber: string; dueDate: string; notes: string | null; Customer: { name: string } }
}

interface Process { id: string; name: string }
interface Machine { id: string; name: string }

interface ProcessDraft {
  processId: string
  machineId: string
}

export default function ProcessAssignPage() {
  const [items, setItems] = useState<OrderItem[]>([])
  const [processes, setProcesses] = useState<Process[]>([])
  const [machines, setMachines] = useState<Machine[]>([])
  const [selected, setSelected] = useState<OrderItem | null>(null)
  const [drafts, setDrafts] = useState<ProcessDraft[]>([{ processId: '', machineId: '' }])
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetch('/api/order-items?no-work-order=true').then(r => r.json()).then(setItems)
    fetch('/api/processes').then(r => r.json()).then(setProcesses)
    fetch('/api/machines').then(r => r.json()).then(setMachines)
  }, [])

  const formatDate = (d: string) => {
    const dt = new Date(d)
    return `${dt.getFullYear()}/${String(dt.getMonth()+1).padStart(2,'0')}/${String(dt.getDate()).padStart(2,'0')}`
  }

  const getDueDateColor = (d: string) => {
    const diff = (new Date(d).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    if (diff < 0) return 'text-red-600 font-bold'
    if (diff <= 3) return 'text-orange-500 font-semibold'
    return 'text-gray-700'
  }

  const handleSelect = (item: OrderItem) => {
    setSelected(item)
    setDrafts([{ processId: '', machineId: '' }])
  }

  const updateDraft = (i: number, field: keyof ProcessDraft, value: string) =>
    setDrafts(prev => prev.map((d, idx) => idx === i ? { ...d, [field]: value } : d))

  const handleSave = async () => {
    if (!selected) return
    if (drafts.some(d => !d.processId)) { alert('工程を選択してください'); return }
    setSaving(true)
    for (let i = 0; i < drafts.length; i++) {
      const d = drafts[i]
      const res = await fetch('/api/work-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderItemId: selected.id,
          processId: d.processId,
          machineId: d.machineId || null,
          seq: i + 1,
        }),
      })
      if (!res.ok) { alert('登録に失敗しました'); setSaving(false); return }
    }
    setDone(prev => new Set(prev).add(selected.id))
    setItems(prev => prev.filter(it => it.id !== selected.id))
    setSelected(null)
    setDrafts([{ processId: '', machineId: '' }])
    setSaving(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-gray-800">工程登録</h1>
          <p className="text-gray-500 text-sm mt-1">工程未登録の品目 {items.length} 件</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* 左：品目一覧 */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b">
              <h2 className="font-semibold text-gray-700 text-sm">工程未登録の品目</h2>
            </div>
            <div className="divide-y max-h-[calc(100vh-220px)] overflow-y-auto">
              {items.length === 0 ? (
                <p className="text-center py-16 text-gray-400">未登録の品目はありません</p>
              ) : items.map(item => (
                <div key={item.id} onClick={() => handleSelect(item)}
                  className={`px-4 py-3 cursor-pointer transition-colors ${
                    selected?.id === item.id ? 'bg-blue-50 border-l-4 border-blue-500' : 'hover:bg-gray-50'
                  }`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-gray-800 text-sm">{item.Order.Customer.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {item.Order.orderNumber}
                        {item.productCode && <span className="ml-2 font-mono">{item.productCode}</span>}
                        {item.partName && <span className="ml-2">{item.partName}</span>}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {item.quantity}個
                        {item.hasBend && <span className="ml-2 text-blue-500">曲げあり</span>}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-400">納期</p>
                      <p className={`text-sm font-medium ${getDueDateColor(item.Order.dueDate)}`}>
                        {formatDate(item.Order.dueDate)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 右：工程登録パネル */}
          <div className="bg-white rounded-xl shadow-sm">
            {!selected ? (
              <div className="flex items-center justify-center h-full text-gray-400 py-32">
                <div className="text-center">
                  <p className="text-4xl mb-3">←</p>
                  <p className="text-sm">左の品目を選択してください</p>
                </div>
              </div>
            ) : (
              <div className="p-5 space-y-4">
                {/* 選択品目の情報 */}
                <div className="bg-blue-50 rounded-lg p-3 text-sm">
                  <p className="font-semibold text-blue-800">{selected.Order.Customer.name}</p>
                  <p className="text-blue-600 text-xs mt-0.5">
                    {selected.Order.orderNumber}
                    {selected.productCode && <span className="ml-2 font-mono">{selected.productCode}</span>}
                    {selected.partName && <span className="ml-2">{selected.partName}</span>}
                  </p>
                  <p className="text-blue-500 text-xs mt-0.5">
                    {selected.quantity}個　納期：{formatDate(selected.Order.dueDate)}
                    {selected.hasBend && <span className="ml-2 font-medium">曲げあり</span>}
                  </p>
                </div>

                {/* 工程リスト */}
                <div className="space-y-3">
                  {drafts.map((draft, i) => (
                    <div key={i} className="border border-gray-200 rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="bg-purple-100 text-purple-700 text-xs font-bold px-2 py-0.5 rounded-full">
                          工程 {i + 1}
                        </span>
                        {drafts.length > 1 && (
                          <button type="button" onClick={() => setDrafts(prev => prev.filter((_, idx) => idx !== i))}
                            className="text-xs text-red-400 hover:text-red-600">削除</button>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">工程 *</label>
                        <select value={draft.processId} onChange={e => updateDraft(i, 'processId', e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500">
                          <option value="">選択してください</option>
                          {processes.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">使用機械</label>
                        <select value={draft.machineId} onChange={e => updateDraft(i, 'machineId', e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500">
                          <option value="">未定</option>
                          {machines.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>

                <button type="button"
                  onClick={() => setDrafts(prev => [...prev, { processId: '', machineId: '' }])}
                  className="w-full py-2 border border-dashed border-gray-300 rounded-lg text-gray-500 text-sm hover:border-purple-400 hover:text-purple-500">
                  ＋ 工程を追加
                </button>

                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={() => { setSelected(null); setDrafts([{ processId: '', machineId: '' }]) }}
                    className="flex-1 py-2.5 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 text-sm">
                    キャンセル
                  </button>
                  <button type="button" onClick={handleSave} disabled={saving}
                    className="flex-1 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium disabled:opacity-50">
                    {saving ? '登録中...' : `工程登録（${drafts.length}工程）`}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
