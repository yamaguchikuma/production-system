'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface Employee { id: string; name: string }
interface Process { id: string; name: string }
interface Machine { id: string; name: string }
interface OrderItem {
  id: string
  productCode: string | null
  quantity: number
  productFamilyId: string | null
  ProductFamily: { id: string; name: string } | null
  Order: { orderNumber: string; dueDate: string; Customer: { name: string } }
}
interface FamilyProcess {
  seq: number
  stdMinPerPc: number | null
  Process: Process
  Machine: Machine | null
}
interface WorkOrderDraft {
  processId: string
  processName: string
  machineId: string
  machineName: string
  employeeId: string
  scheduledDate: string
}

export default function SchedulePage() {
  const router = useRouter()
  const [orderItems, setOrderItems] = useState<OrderItem[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [processes, setProcesses] = useState<Process[]>([])
  const [machines, setMachines] = useState<Machine[]>([])
  const [selected, setSelected] = useState<OrderItem | null>(null)
  const [drafts, setDrafts] = useState<WorkOrderDraft[]>([])
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState<string[]>([])

  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    fetch('/api/order-items').then(r => r.json()).then(setOrderItems)
    fetch('/api/employees').then(r => r.json()).then(setEmployees)
    fetch('/api/processes').then(r => r.json()).then(setProcesses)
    fetch('/api/machines').then(r => r.json()).then(setMachines)
  }, [])

  const handleSelect = async (item: OrderItem) => {
    setSelected(item)
    setDrafts([])

    if (item.productFamilyId) {
      const res = await fetch(`/api/product-families/${item.productFamilyId}/processes`)
      const familyProcesses: FamilyProcess[] = await res.json()

      if (familyProcesses.length > 0) {
        setDrafts(familyProcesses.map(fp => ({
          processId: fp.Process.id,
          processName: fp.Process.name,
          machineId: fp.Machine?.id ?? '',
          machineName: fp.Machine?.name ?? '',
          employeeId: '',
          scheduledDate: today,
        })))
        return
      }
    }

    // 製品ファミリーに工程がない場合は空の1行
    setDrafts([{ processId: '', processName: '', machineId: '', machineName: '', employeeId: '', scheduledDate: today }])
  }

  const updateDraft = (index: number, field: keyof WorkOrderDraft, value: string) => {
    setDrafts(prev => prev.map((d, i) => i === index ? { ...d, [field]: value } : d))
  }

  const handleSubmit = async () => {
    if (!selected) return
    const invalid = drafts.some(d => !d.processId || !d.employeeId || !d.scheduledDate)
    if (invalid) { alert('工程・担当者・作業日は必須です'); return }

    setSaving(true)
    for (let i = 0; i < drafts.length; i++) {
      const d = drafts[i]
      await fetch('/api/work-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderItemId: selected.id,
          processId: d.processId,
          machineId: d.machineId || null,
          employeeId: d.employeeId,
          scheduledStart: new Date(`${d.scheduledDate}T00:00`).toISOString(),
          scheduledEnd: new Date(`${d.scheduledDate}T23:59`).toISOString(),
          seq: i + 1,
        }),
      })
    }
    setSaving(false)
    setDone(prev => [...prev, selected.id])
    setSelected(null)
    setDrafts([])
  }

  const formatDate = (d: string) => new Date(d).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">作業指示 割り当て</h1>
          <p className="text-gray-500 text-sm mt-1">受注明細を選択すると工程が自動で表示されます</p>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* 左：受注明細一覧 */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b">
              <h2 className="font-semibold text-gray-700">受注明細</h2>
            </div>
            <div className="divide-y max-h-[600px] overflow-y-auto">
              {orderItems.length === 0 ? (
                <p className="text-center py-10 text-gray-400">受注明細がありません</p>
              ) : (
                orderItems.map(item => {
                  const isDone = done.includes(item.id)
                  const isSelected = selected?.id === item.id
                  return (
                    <div
                      key={item.id}
                      onClick={() => !isDone && handleSelect(item)}
                      className={`px-4 py-3 cursor-pointer transition-colors ${
                        isDone ? 'bg-green-50 opacity-60 cursor-default' :
                        isSelected ? 'bg-blue-50 border-l-4 border-blue-500' :
                        'hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-gray-800 text-sm">{item.Order.Customer.name}</p>
                          <p className="text-xs text-gray-500">{item.Order.orderNumber} / {item.productCode ?? '品番未設定'}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {item.ProductFamily?.name ?? '製品ファミリー未設定'} · {item.quantity}個
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-400">納期</p>
                          <p className="text-sm font-medium text-gray-700">{formatDate(item.Order.dueDate)}</p>
                          {isDone && <span className="text-xs text-green-600 font-medium">登録済み</span>}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* 右：工程一覧 */}
          <div className="bg-white rounded-xl shadow-sm">
            {!selected ? (
              <div className="flex items-center justify-center h-full text-gray-400 py-20">
                <div className="text-center">
                  <p className="text-4xl mb-3">←</p>
                  <p>左の明細を選択してください</p>
                </div>
              </div>
            ) : (
              <div className="p-4 space-y-4">
                <div className="bg-blue-50 rounded-lg p-3 text-sm">
                  <p className="font-medium text-blue-800">{selected.Order.Customer.name}</p>
                  <p className="text-blue-600">{selected.Order.orderNumber} · {selected.productCode ?? '-'} · {selected.quantity}個</p>
                  {selected.ProductFamily && <p className="text-blue-500 text-xs mt-1">{selected.ProductFamily.name}</p>}
                </div>

                <div className="space-y-3">
                  {drafts.map((draft, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">工程{index + 1}</span>
                        {draft.processName
                          ? <span className="font-medium text-gray-800 text-sm">{draft.processName}</span>
                          : <select
                              value={draft.processId}
                              onChange={e => {
                                const p = processes.find(p => p.id === e.target.value)
                                updateDraft(index, 'processId', e.target.value)
                                updateDraft(index, 'processName', p?.name ?? '')
                              }}
                              className="border border-gray-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">工程を選択 *</option>
                              {processes.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                              ))}
                            </select>
                        }
                        {draft.machineName && <span className="text-xs text-gray-500">🔧 {draft.machineName}</span>}
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">担当者 *</label>
                          <select
                            value={draft.employeeId}
                            onChange={e => updateDraft(index, 'employeeId', e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">選択</option>
                            {employees.map(e => (
                              <option key={e.id} value={e.id}>{e.name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">作業日 *</label>
                          <input
                            type="date"
                            value={draft.scheduledDate}
                            onChange={e => updateDraft(index, 'scheduledDate', e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs text-gray-500 mb-1">機械</label>
                        <select
                          value={draft.machineId}
                          onChange={e => {
                            const m = machines.find(m => m.id === e.target.value)
                            updateDraft(index, 'machineId', e.target.value)
                            updateDraft(index, 'machineName', m?.name ?? '')
                          }}
                          className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">未指定</option>
                          {machines.map(m => (
                            <option key={m.id} value={m.id}>{m.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => setDrafts(prev => [...prev, { processId: '', processName: '', machineId: '', machineName: '', employeeId: '', scheduledDate: today }])}
                  className="w-full py-2 border border-dashed border-gray-300 rounded-lg text-gray-500 text-sm hover:border-blue-400 hover:text-blue-500"
                >
                  ＋ 工程を追加
                </button>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => { setSelected(null); setDrafts([]) }}
                    className="flex-1 py-2.5 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 text-sm"
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={saving}
                    className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50"
                  >
                    {saving ? '登録中...' : `作業指示を登録（${drafts.length}工程）`}
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
