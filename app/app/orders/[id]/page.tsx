'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'

interface OrderItem {
  id: string
  productCode: string | null
  quantity: number
  unitPrice: number | null
  hasBend: boolean
  status: string
  processingMethod: string
}

interface Order {
  id: string
  orderNumber: string
  dueDate: string
  status: string
  notes: string
  source: string
  Customer: { id: string; name: string }
  OrderItem: OrderItem[]
}

const statusLabel: Record<string, string> = {
  PENDING: '未着手',
  IN_PROGRESS: '生産中',
  COMPLETED: '完了',
  SHIPPED: '出荷済み',
  ON_HOLD: '保留',
}

const statusColor: Record<string, string> = {
  PENDING: 'bg-gray-100 text-gray-600',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-green-100 text-green-700',
  SHIPPED: 'bg-purple-100 text-purple-700',
  ON_HOLD: 'bg-yellow-100 text-yellow-700',
}

export default function OrderDetailPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/orders/${id}`)
      .then(r => r.json())
      .then(data => { setOrder(data); setLoading(false) })
  }, [id])

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
  }

  const totalAmount = order?.OrderItem.reduce((sum, item) =>
    sum + (item.unitPrice ?? 0) * item.quantity, 0) ?? 0

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400">読み込み中...</div>
  if (!order) return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400">受注が見つかりません</div>

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-4">

        {/* ヘッダー */}
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/orders')} className="text-gray-400 hover:text-gray-600 text-sm">← 受注一覧</button>
        </div>

        {/* 基本情報 */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-xs text-gray-400 mb-1">受注番号</p>
              <h1 className="text-2xl font-bold text-blue-600 font-mono">{order.orderNumber}</h1>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColor[order.status]}`}>
              {statusLabel[order.status]}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-6 text-sm">
            <div>
              <p className="text-gray-400 mb-1">顧客名</p>
              <p className="font-medium text-gray-800">{order.Customer?.name}</p>
            </div>
            <div>
              <p className="text-gray-400 mb-1">納期</p>
              <p className="font-medium text-gray-800">{formatDate(order.dueDate)}</p>
            </div>
            <div>
              <p className="text-gray-400 mb-1">登録方法</p>
              <p className="text-gray-600">{order.source === 'excel' ? 'Excel一括登録' : '手動登録'}</p>
            </div>
            {order.notes && (
              <div className="col-span-3">
                <p className="text-gray-400 mb-1">備考</p>
                <p className="text-gray-700">{order.notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* 明細一覧 */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b flex justify-between items-center">
            <h2 className="font-semibold text-gray-800">受注明細</h2>
            <span className="text-sm text-gray-400">{order.OrderItem.length} 品目</span>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">#</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">品番</th>
                <th className="text-right px-4 py-3 text-gray-500 font-medium">数量</th>
                <th className="text-right px-4 py-3 text-gray-500 font-medium">単価</th>
                <th className="text-right px-4 py-3 text-gray-500 font-medium">金額</th>
                <th className="text-center px-4 py-3 text-gray-500 font-medium">曲げ</th>
                <th className="text-center px-4 py-3 text-gray-500 font-medium">ステータス</th>
              </tr>
            </thead>
            <tbody>
              {order.OrderItem.map((item, i) => (
                <tr key={item.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-400">{i + 1}</td>
                  <td className="px-4 py-3 font-mono text-gray-800">{item.productCode ?? '—'}</td>
                  <td className="px-4 py-3 text-right text-gray-700">{item.quantity.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-gray-700">
                    {item.unitPrice != null ? `¥${item.unitPrice.toLocaleString()}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700">
                    {item.unitPrice != null ? `¥${(item.unitPrice * item.quantity).toLocaleString()}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {item.hasBend ? <span className="text-blue-600 font-medium">○</span> : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor[item.status]}`}>
                      {statusLabel[item.status]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            {totalAmount > 0 && (
              <tfoot className="bg-gray-50 border-t">
                <tr>
                  <td colSpan={4} className="px-4 py-3 text-right text-sm font-medium text-gray-600">合計金額</td>
                  <td className="px-4 py-3 text-right font-bold text-gray-800">¥{totalAmount.toLocaleString()}</td>
                  <td colSpan={2}/>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

      </div>
    </div>
  )
}
