'use client'

import { useEffect, useState, useCallback } from 'react'

interface Customer { name: string }
interface OrderData { id: string; orderNumber: string; dueDate: string; notes: string | null; Customer: Customer }
interface OrderItem { id: string; productCode: string | null; partName?: string | null; quantity: number; Order: OrderData }

interface WorkOrder {
  id: string
  seq: number
  status: string
  machineId: string
  Process: { id: string; name: string }
  OrderItem: OrderItem & { partName?: string | null }
  allProcesses: { seq: number; status: string; processName: string }[]
}

interface JobItem { id: string; OrderItem: OrderItem }
interface ProductionJob {
  id: string
  jobNumber: string
  status: string
  machineId: string
  JobItem: JobItem[]
}

interface Machine {
  id: string
  name: string
  machineType: string
  workOrders: WorkOrder[]
  jobs: ProductionJob[]
}

const MACHINE_ORDER = [
  'レーザー', 'タレパン', 'シャーリング',
  'プレス150t①', 'プレス150t②', 'プレス110t', 'プレス80t', 'プレス45t',
  'ブレーキ', 'ボール盤', 'バリ取り', '溶接',
]

function formatDate(d: string) {
  const dt = new Date(d)
  return `${dt.getMonth()+1}/${dt.getDate()}`
}

export default function DashboardPage() {
  const [machines, setMachines] = useState<Machine[]>([])
  const [loading, setLoading] = useState(true)
  const [nestingMachineId, setNestingMachineId] = useState<string | null>(null)
  const [selectedWoIds, setSelectedWoIds] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [expandedWoId, setExpandedWoId] = useState<string | null>(null)

  const fetchData = useCallback(() => {
    setLoading(true)
    fetch(`/api/machines?t=${Date.now()}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(data => {
        const sorted = [...data].sort((a, b) => {
          const ai = MACHINE_ORDER.indexOf(a.name)
          const bi = MACHINE_ORDER.indexOf(b.name)
          return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
        })
        setMachines(sorted)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const dissolveJob = async (jobId: string) => {
    if (!confirm('このネスティングを解除しますか？')) return
    await fetch(`/api/jobs?id=${jobId}`, { method: 'DELETE' })
    fetchData()
  }

  const startNesting = (machineId: string) => {
    setNestingMachineId(machineId)
    setSelectedWoIds(new Set())
  }

  const cancelNesting = () => {
    setNestingMachineId(null)
    setSelectedWoIds(new Set())
  }

  const toggleWo = (id: string) => {
    setSelectedWoIds(prev => {
      const n = new Set(prev)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }

  const handleNesting = async () => {
    if (selectedWoIds.size < 2) { alert('2件以上選択してください'); return }
    const machine = machines.find(m => m.id === nestingMachineId)
    const selectedWos = (machine?.workOrders ?? []).filter(w => selectedWoIds.has(w.id))

    setSaving(true)
    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          processType: selectedWos[0]?.Process?.name ?? 'LASER',
          machineId: nestingMachineId,
          orderItemIds: selectedWos.map(w => w.OrderItem.id),
        }),
      })
      if (!res.ok) { alert('ネスティング作成に失敗しました'); return }
      // 先にネスティングモードを解除してから再取得
      setNestingMachineId(null)
      setSelectedWoIds(new Set())
      fetchData()
    } finally {
      setSaving(false)
    }
  }

  const totalItems = (m: Machine) => m.workOrders.length + m.jobs.reduce((s, j) => s + j.JobItem.length, 0)
  const loadColor = (count: number) => {
    if (count === 0) return 'bg-gray-100 text-gray-400'
    if (count <= 3) return 'bg-green-100 text-green-700'
    if (count <= 7) return 'bg-yellow-100 text-yellow-700'
    return 'bg-red-100 text-red-700'
  }

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400">読み込み中...</div>

  const activeMachines = machines.filter(m => totalItems(m) > 0)
  const emptyMachines = machines.filter(m => totalItems(m) === 0)

  return (
    <div className="min-h-screen bg-gray-50 p-4">

      {/* ヘッダー */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold text-gray-800">生産管理</h1>
        <div className="flex gap-2">
          {nestingMachineId && (
            <button onClick={cancelNesting}
              className="px-3 py-2 border border-gray-300 bg-white rounded-lg text-sm text-gray-600 hover:bg-gray-50">
              キャンセル
            </button>
          )}
          <button onClick={fetchData}
            className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
            更新
          </button>
        </div>
      </div>

      {/* ネスティング選択中バナー */}
      {nestingMachineId && (
        <div className="mb-4 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-blue-800">
              ネスティング選択中 — {machines.find(m => m.id === nestingMachineId)?.name}
            </p>
            <p className="text-xs text-blue-600 mt-0.5">
              まとめたい品目にチェックを入れてください（2件以上）
            </p>
          </div>
          <button
            onClick={handleNesting}
            disabled={selectedWoIds.size < 2 || saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-40">
            {saving ? '作成中...' : `まとめる（${selectedWoIds.size}件選択中）`}
          </button>
        </div>
      )}

      {/* 稼働中・待機中の機械 */}
      {activeMachines.length > 0 && (
        <div className="space-y-3 mb-4">
          {activeMachines.map(machine => {
            const isNestingTarget = nestingMachineId === machine.id

            return (
              <div key={machine.id}
                className="bg-white rounded-xl shadow-sm overflow-hidden">

                {/* 機械ヘッダー */}
                <div className="flex items-center gap-3 px-4 py-2 border-b bg-gray-50">
                  <span className="font-bold text-gray-800 text-sm w-32">{machine.name}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${loadColor(totalItems(machine))}`}>
                    {totalItems(machine)}件
                  </span>
                  <div className="ml-auto">
                    {/* ネスティングボタン（個別WorkOrderが1件以上あるときのみ） */}
                    {machine.workOrders.length >= 1 && !nestingMachineId && (
                      <button onClick={() => startNesting(machine.id)}
                        className="text-xs px-3 py-1 bg-blue-50 text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-100">
                        ネスティングにまとめる
                      </button>
                    )}
                    {isNestingTarget && (
                      <span className="text-xs text-blue-600 font-medium">← 品目を選択中</span>
                    )}
                  </div>
                </div>

                {/* 品目カード一覧 */}
                <div className="p-3 flex flex-wrap gap-2">
                  {/* 個別WorkOrder */}
                  {machine.workOrders.map(wo => {
                    const isExpanded = expandedWoId === wo.id
                    const isSelected = selectedWoIds.has(wo.id)
                    return (
                      <div key={wo.id}
                        className={`border rounded-lg text-xs transition-all
                          ${isNestingTarget && isSelected ? 'border-blue-500 ring-2 ring-blue-300' : ''}
                          ${isNestingTarget && !isSelected ? 'border-gray-300' : ''}
                          ${!isNestingTarget && isExpanded ? 'border-blue-300 bg-blue-50' : ''}
                          ${!isNestingTarget && !isExpanded ? 'border-gray-200' : ''}
                        `}
                        style={{ minWidth: isExpanded ? '220px' : '140px' }}>

                        {/* カードヘッダー（常に表示） */}
                        <div
                          onClick={() => isNestingTarget
                            ? toggleWo(wo.id)
                            : setExpandedWoId(isExpanded ? null : wo.id)
                          }
                          className="px-3 py-2 cursor-pointer hover:bg-black/5 rounded-lg">
                          {isNestingTarget && (
                            <div className="flex items-center gap-1.5 mb-1">
                              <input type="checkbox" readOnly checked={isSelected}
                                className="w-3.5 h-3.5 accent-blue-600" />
                              <span className="text-blue-600 text-xs font-medium">
                                {isSelected ? '選択済み' : '選択する'}
                              </span>
                            </div>
                          )}
                          <div className="font-medium text-gray-800">{wo.OrderItem.Order.Customer.name}</div>
                          <div className="text-gray-500 font-mono">{wo.OrderItem.productCode ?? '—'}</div>
                          <div className="flex justify-between mt-1">
                            <span className="text-gray-400">{wo.OrderItem.quantity}個</span>
                            <span className="text-gray-400">納期 {formatDate(wo.OrderItem.Order.dueDate)}</span>
                          </div>
                          <div className="mt-1 text-purple-600 font-medium">{wo.Process?.name}</div>
                        </div>

                        {/* 展開詳細（クリック時のみ表示） */}
                        {isExpanded && !isNestingTarget && (
                          <div className="border-t border-blue-200 px-3 py-2 space-y-1.5">
                            {wo.OrderItem.partName && (
                              <div className="text-gray-600">品名: {wo.OrderItem.partName}</div>
                            )}
                            {wo.OrderItem.Order.notes && (
                              <div className="text-gray-500 bg-yellow-50 border border-yellow-200 rounded px-2 py-1">
                                備考: {wo.OrderItem.Order.notes}
                              </div>
                            )}
                            <div className="pt-1">
                              <div className="text-gray-400 mb-1 font-medium">工程</div>
                              {wo.allProcesses.length === 0 ? (
                                <div className="text-gray-400">工程未登録</div>
                              ) : (
                                wo.allProcesses.map((p, i) => (
                                  <div key={i} className="flex items-center gap-2 py-0.5">
                                    <span className="text-gray-400 w-4">{p.seq}.</span>
                                    <span className="text-gray-700">{p.processName}</span>
                                    <span className={`ml-auto px-1.5 py-0.5 rounded text-xs font-medium ${
                                      p.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                                      p.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' :
                                      'bg-gray-100 text-gray-500'
                                    }`}>
                                      {p.status === 'COMPLETED' ? '完了' : p.status === 'IN_PROGRESS' ? '進行中' : '待機'}
                                    </span>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}

                  {/* ネスティンググループ */}
                  {machine.jobs.map(job => (
                    <div key={job.id} className="border-2 border-orange-300 rounded-lg px-3 py-2 text-xs bg-orange-50 min-w-[160px]">
                      <div className="flex items-center gap-1 mb-1">
                        <span className="bg-orange-500 text-white px-1.5 py-0.5 rounded text-xs font-bold">ネスティング</span>
                        <span className="text-orange-700 font-mono text-xs flex-1">{job.jobNumber}</span>
                        <button
                          onClick={() => dissolveJob(job.id)}
                          className="text-xs text-orange-400 hover:text-red-600 px-1.5 py-0.5 rounded hover:bg-red-50 ml-1"
                          title="ネスティング解除">
                          解除
                        </button>
                      </div>
                      {job.JobItem.map(ji => (
                        <div key={ji.id} className="text-gray-600 border-t border-orange-200 pt-1 mt-1 first:border-0 first:pt-0 first:mt-0">
                          <span className="font-mono">{ji.OrderItem.productCode ?? '—'}</span>
                          <span className="ml-1 text-gray-400">{ji.OrderItem.quantity}個</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* 空き機械 */}
      <div className="bg-white rounded-xl shadow-sm p-3">
        <p className="text-xs text-gray-400 mb-2 font-medium">空き機械</p>
        <div className="flex flex-wrap gap-2">
          {emptyMachines.map(m => (
            <span key={m.id} className="px-3 py-1.5 bg-gray-100 text-gray-500 rounded-lg text-xs">{m.name}</span>
          ))}
        </div>
      </div>
    </div>
  )
}
