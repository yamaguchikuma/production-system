'use client'

import { useEffect, useState } from 'react'

interface Employee { id: string; name: string }
interface WorkOrder {
  id: string
  seq: number
  status: string
  scheduledStart: string
  scheduledEnd: string
  actualStart: string | null
  actualEnd: string | null
  setupMinutes: number
  processMinutes: number
  Process: { name: string; machineType: string }
  Machine: { name: string } | null
  OrderItem: {
    productCode: string | null
    quantity: number
    thickness: number | null
    width: number | null
    height: number | null
    hasBend: boolean
    Order: {
      orderNumber: string
      dueDate: string
      Customer: { name: string }
    }
  }
}

const statusLabel: Record<string, string> = {
  PENDING: '未開始',
  DRAFT: '未確定',
  SCHEDULED: '予定',
  IN_PROGRESS: '作業中',
  COMPLETED: '完了',
  ON_HOLD: '保留',
}

const statusColor: Record<string, string> = {
  PENDING: 'bg-gray-100 text-gray-500',
  DRAFT: 'bg-yellow-100 text-yellow-600',
  SCHEDULED: 'bg-blue-100 text-blue-600',
  IN_PROGRESS: 'bg-orange-100 text-orange-600',
  COMPLETED: 'bg-green-100 text-green-700',
  ON_HOLD: 'bg-red-100 text-red-600',
}

export default function FieldPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [selectedEmployee, setSelectedEmployee] = useState<string>('')
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([])
  const [today] = useState(() => new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch('/api/employees').then(r => r.json()).then(setEmployees)
  }, [])

  useEffect(() => {
    if (!selectedEmployee) return
    setLoading(true)
    fetch(`/api/work-orders?employeeId=${selectedEmployee}&date=${today}`)
      .then(r => r.json())
      .then(data => { setWorkOrders(data); setLoading(false) })
  }, [selectedEmployee, today])

  const handleStart = async (id: string) => {
    await fetch('/api/work-orders', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: 'IN_PROGRESS', actualStart: new Date().toISOString() }),
    })
    setWorkOrders(prev => prev.map(wo => wo.id === id ? { ...wo, status: 'IN_PROGRESS', actualStart: new Date().toISOString() } : wo))
  }

  const handleComplete = async (id: string) => {
    await fetch('/api/work-orders', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: 'COMPLETED', actualEnd: new Date().toISOString() }),
    })
    setWorkOrders(prev => prev.map(wo => wo.id === id ? { ...wo, status: 'COMPLETED', actualEnd: new Date().toISOString() } : wo))
  }

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return '-'
    const d = new Date(dateStr)
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  const todayLabel = new Date().toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' })

  return (
    <div className="min-h-screen bg-gray-100">
      {/* ヘッダー */}
      <div className="bg-blue-700 text-white px-4 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold">作業指示</h1>
            <p className="text-blue-200 text-sm">{todayLabel}</p>
          </div>
          <select
            value={selectedEmployee}
            onChange={e => setSelectedEmployee(e.target.value)}
            className="bg-blue-600 text-white border border-blue-400 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">担当者を選択</option>
            {employees.map(e => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="p-4 space-y-4">
        {!selectedEmployee ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-4xl mb-4">👤</p>
            <p className="text-lg">担当者を選択してください</p>
          </div>
        ) : loading ? (
          <div className="text-center py-20 text-gray-400">読み込み中...</div>
        ) : workOrders.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl">
            <p className="text-4xl mb-4">✅</p>
            <p className="text-gray-500 text-lg">今日の作業はありません</p>
          </div>
        ) : (
          workOrders.map((wo, index) => (
            <div
              key={wo.id}
              className={`bg-white rounded-2xl shadow-sm overflow-hidden border-l-4 ${
                wo.status === 'COMPLETED' ? 'border-green-400 opacity-70' :
                wo.status === 'IN_PROGRESS' ? 'border-orange-400' :
                'border-blue-400'
              }`}
            >
              {/* カードヘッダー */}
              <div className="px-4 pt-4 pb-2 flex justify-between items-start">
                <div>
                  <span className="text-gray-400 text-sm">作業 {index + 1}</span>
                  <h2 className="text-xl font-bold text-gray-800">{wo.Process?.name}</h2>
                  {wo.Machine && (
                    <p className="text-gray-500 text-sm">🔧 {wo.Machine.name}</p>
                  )}
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColor[wo.status]}`}>
                  {statusLabel[wo.status]}
                </span>
              </div>

              {/* 作業内容 */}
              <div className="px-4 py-3 bg-gray-50 mx-4 rounded-xl mb-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-400">顧客</span>
                    <p className="font-medium text-gray-800">{wo.OrderItem?.Order?.Customer?.name}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">受注番号</span>
                    <p className="font-medium text-gray-800">{wo.OrderItem?.Order?.orderNumber}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">品番</span>
                    <p className="font-medium text-gray-800">{wo.OrderItem?.productCode ?? '-'}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">数量</span>
                    <p className="font-bold text-blue-700 text-lg">{wo.OrderItem?.quantity} 個</p>
                  </div>
                  {wo.OrderItem?.thickness && (
                    <div>
                      <span className="text-gray-400">板厚</span>
                      <p className="font-medium text-gray-800">t{wo.OrderItem.thickness}</p>
                    </div>
                  )}
                  {(wo.OrderItem?.width || wo.OrderItem?.height) && (
                    <div>
                      <span className="text-gray-400">サイズ</span>
                      <p className="font-medium text-gray-800">
                        {wo.OrderItem.width ?? '?'} × {wo.OrderItem.height ?? '?'}
                      </p>
                    </div>
                  )}
                </div>
                {wo.OrderItem?.hasBend && (
                  <div className="mt-2">
                    <span className="bg-orange-100 text-orange-600 text-xs px-2 py-1 rounded-full font-medium">曲げあり</span>
                  </div>
                )}
              </div>

              {/* 時間情報 */}
              <div className="px-4 pb-3 flex gap-4 text-sm text-gray-500">
                <span>予定: {formatTime(wo.scheduledStart)} 〜 {formatTime(wo.scheduledEnd)}</span>
                {wo.actualStart && <span>開始: {formatTime(wo.actualStart)}</span>}
                {wo.actualEnd && <span>完了: {formatTime(wo.actualEnd)}</span>}
              </div>

              {/* ボタン */}
              <div className="px-4 pb-4 flex gap-3">
                {wo.status === 'SCHEDULED' || wo.status === 'PENDING' ? (
                  <button
                    onClick={() => handleStart(wo.id)}
                    className="flex-1 py-4 bg-blue-600 text-white rounded-xl text-lg font-bold hover:bg-blue-700 active:scale-95 transition-transform"
                  >
                    ▶ 開始する
                  </button>
                ) : wo.status === 'IN_PROGRESS' ? (
                  <button
                    onClick={() => handleComplete(wo.id)}
                    className="flex-1 py-4 bg-green-600 text-white rounded-xl text-lg font-bold hover:bg-green-700 active:scale-95 transition-transform"
                  >
                    ✓ 完了した
                  </button>
                ) : wo.status === 'COMPLETED' ? (
                  <div className="flex-1 py-4 bg-gray-100 text-gray-400 rounded-xl text-lg font-bold text-center">
                    完了済み
                  </div>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
