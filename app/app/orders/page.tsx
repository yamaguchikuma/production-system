'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'

interface OrderItem {
  id: string
  productCode: string | null
  partName: string | null
  quantity: number
  unitPrice: number | null
  status: string
}

interface Order {
  id: string
  orderNumber: string
  dueDate: string
  status: string
  notes: string | null
  Customer: { name: string }
  OrderItem: OrderItem[]
}

interface FlatRow {
  orderId: string
  orderNumber: string
  customerName: string
  dueDate: string
  notes: string | null
  productCode: string | null
  partName: string | null
  quantity: number
  unitPrice: number | null
  itemStatus: string
}

const statusLabel: Record<string, string> = {
  PENDING: '未着手', IN_PROGRESS: '生産中', COMPLETED: '完了',
  SHIPPED: '出荷済み', ON_HOLD: '保留',
}
const statusColor: Record<string, string> = {
  PENDING: 'bg-gray-100 text-gray-600', IN_PROGRESS: 'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-green-100 text-green-700', SHIPPED: 'bg-purple-100 text-purple-700',
  ON_HOLD: 'bg-yellow-100 text-yellow-700',
}

export default function OrdersPage() {
  const router = useRouter()
  const [rows, setRows] = useState<FlatRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [filterCustomer, setFilterCustomer] = useState('')
  const [filterDate, setFilterDate] = useState('')
  const [deleting, setDeleting] = useState(false)

  const fetchOrders = () => {
    setLoading(true)
    fetch(`/api/orders?t=${Date.now()}`, { cache: 'no-store' })
      .then(r => r.json())
      .then((data: Order[]) => {
        if (!Array.isArray(data)) { setError(JSON.stringify(data)); setLoading(false); return }
        const flat: FlatRow[] = []
        for (const order of data) {
          for (const item of order.OrderItem) {
            flat.push({
              orderId: order.id,
              orderNumber: order.orderNumber,
              customerName: order.Customer?.name ?? '—',
              dueDate: order.dueDate,
              notes: order.notes,
              productCode: item.productCode,
              partName: item.partName,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              itemStatus: item.status,
            })
          }
        }
        setRows(flat)
        setChecked(new Set())
        setLoading(false)
      })
      .catch(e => { setError(String(e)); setLoading(false) })
  }

  useEffect(() => { fetchOrders() }, [])

  const customerNames = useMemo(() => [...new Set(rows.map(r => r.customerName))].sort(), [rows])

  const filtered = useMemo(() => rows.filter(r => {
    if (filterCustomer && r.customerName !== filterCustomer) return false
    if (filterDate && r.dueDate.slice(0, 10) !== filterDate) return false
    return true
  }), [rows, filterCustomer, filterDate])

  const formatDate = (d: string) => {
    const dt = new Date(d)
    return `${dt.getFullYear()}/${String(dt.getMonth()+1).padStart(2,'0')}/${String(dt.getDate()).padStart(2,'0')}`
  }
  const getDueDateColor = (d: string) => {
    const diff = (new Date(d).getTime() - Date.now()) / (1000*60*60*24)
    if (diff < 0) return 'text-red-600 font-bold'
    if (diff <= 3) return 'text-orange-500 font-semibold'
    return 'text-gray-700'
  }

  // チェック操作
  const toggleRow = (orderId: string) => {
    setChecked(prev => {
      const next = new Set(prev)
      next.has(orderId) ? next.delete(orderId) : next.add(orderId)
      return next
    })
  }
  const allFilteredOrderIds = [...new Set(filtered.map(r => r.orderId))]
  const allChecked = allFilteredOrderIds.length > 0 && allFilteredOrderIds.every(id => checked.has(id))
  const toggleAll = () => {
    if (allChecked) {
      setChecked(prev => { const n = new Set(prev); allFilteredOrderIds.forEach(id => n.delete(id)); return n })
    } else {
      setChecked(prev => { const n = new Set(prev); allFilteredOrderIds.forEach(id => n.add(id)); return n })
    }
  }

  // 削除
  const deleteOrders = async (orderIds: string[]) => {
    if (!confirm(`${orderIds.length}件の受注を削除しますか？`)) return
    setDeleting(true)
    for (const id of orderIds) {
      await fetch(`/api/orders/${id}`, { method: 'DELETE' })
    }
    setDeleting(false)
    setFilterCustomer('')
    setFilterDate('')
    fetchOrders()
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-3">

        {/* ヘッダー */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">受注一覧</h1>
            <p className="text-gray-500 text-sm mt-0.5">
              {filtered.length} 品目
              {checked.size > 0 && <span className="ml-2 text-blue-600">{checked.size}件選択中</span>}
            </p>
          </div>
          <div className="flex gap-2">
            {checked.size > 0 && (
              <button onClick={() => deleteOrders([...checked])} disabled={deleting}
                className="px-4 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 text-sm font-medium disabled:opacity-50">
                {deleting ? '削除中...' : `選択削除（${checked.size}件）`}
              </button>
            )}
            <button onClick={() => router.push('/orders/new')}
              className="bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 font-medium text-sm">
              ＋ 新規受注登録
            </button>
          </div>
        </div>

        {/* 絞り込み */}
        <div className="bg-white rounded-xl shadow-sm px-4 py-3 flex flex-wrap gap-3 items-center">
          <select value={filterCustomer} onChange={e => setFilterCustomer(e.target.value)} data-testid="orders-filter-customer"
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">顧客（すべて）</option>
            {customerNames.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
          <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          {(filterCustomer || filterDate) && (
            <button onClick={() => { setFilterCustomer(''); setFilterDate('') }}
              className="text-sm text-gray-400 hover:text-gray-600">クリア</button>
          )}
        </div>

        {error && <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">エラー: {error}</div>}

        {loading ? (
          <div className="text-center py-20 text-gray-400">読み込み中...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl shadow-sm text-gray-400">データがありません</div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm overflow-auto">
            <table className="w-full text-sm whitespace-nowrap">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-3 py-3">
                    <input type="checkbox" checked={allChecked} onChange={toggleAll} className="w-4 h-4 cursor-pointer" />
                  </th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">受注番号</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">顧客名</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">品番</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">品名</th>
                  <th className="text-right px-4 py-3 text-gray-500 font-medium">数量</th>
                  <th className="text-right px-4 py-3 text-gray-500 font-medium">単価</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">納期</th>
                  <th className="text-center px-4 py-3 text-gray-500 font-medium">ステータス</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">備考</th>
                  <th className="px-3 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row, i) => (
                  <tr key={i} data-testid="orders-row" data-product-code={row.productCode ?? ''} className={`border-b hover:bg-gray-50 ${checked.has(row.orderId) ? 'bg-blue-50' : ''}`}>
                    <td className="px-3 py-2.5 text-center" onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={checked.has(row.orderId)} onChange={() => toggleRow(row.orderId)}
                        className="w-4 h-4 cursor-pointer" />
                    </td>
                    <td className="px-4 py-2.5 font-mono text-blue-600 cursor-pointer"
                      onClick={() => router.push(`/orders/${row.orderId}`)}>{row.orderNumber}</td>
                    <td className="px-4 py-2.5 text-gray-800">{row.customerName}</td>
                    <td className="px-4 py-2.5 font-mono text-gray-700">{row.productCode ?? '—'}</td>
                    <td className="px-4 py-2.5 text-gray-700">{row.partName ?? '—'}</td>
                    <td className="px-4 py-2.5 text-right text-gray-700">{row.quantity.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-right text-gray-700">
                      {row.unitPrice != null ? `¥${row.unitPrice.toLocaleString()}` : '—'}
                    </td>
                    <td className={`px-4 py-2.5 ${getDueDateColor(row.dueDate)}`}>{formatDate(row.dueDate)}</td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor[row.itemStatus]}`}>
                        {statusLabel[row.itemStatus]}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-gray-500 max-w-xs truncate">{row.notes ?? '—'}</td>
                    <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
                      <button onClick={() => deleteOrders([row.orderId])}
                        className="text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded hover:bg-red-50">
                        削除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
