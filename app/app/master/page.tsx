'use client'

import { useState, useEffect } from 'react'

interface UploadResult { success: string[]; errors: string[] }
interface Item { id: string; name: string; machineType?: string }

// Excel取り込みセクション
function UploadSection({ title, description, apiPath, inputId }: {
  title: string; description: string; apiPath: string; inputId: string
}) {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<UploadResult | null>(null)

  const handleUpload = async () => {
    if (!file) return
    setLoading(true)
    setResult(null)
    const formData = new FormData()
    formData.append('file', file)
    const res = await fetch(apiPath, { method: 'POST', body: formData })
    const data = await res.json()
    setResult(data)
    setLoading(false)
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
      <div>
        <h2 className="text-lg font-bold text-gray-800">{title}</h2>
        <p className="text-gray-500 text-sm mt-1">{description}</p>
      </div>
      <div
        className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-blue-400 transition-colors"
        onClick={() => document.getElementById(inputId)?.click()}
      >
        <p className="text-3xl mb-2">📂</p>
        <p className="text-gray-500 text-sm">{file ? file.name : 'クリックしてファイルを選択'}</p>
        <p className="text-gray-400 text-xs mt-1">.xlsx ファイル</p>
        <input id={inputId} type="file" accept=".xlsx" className="hidden"
          onChange={e => setFile(e.target.files?.[0] ?? null)} />
      </div>
      <button onClick={handleUpload} disabled={!file || loading}
        className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-40">
        {loading ? '取り込み中...' : '取り込む'}
      </button>
      {result && (
        <div className="space-y-3">
          {result.success.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <p className="font-semibold text-green-700 mb-2">✅ 登録完了（{result.success.length}件）</p>
              <ul className="text-sm text-green-600 space-y-1">
                {result.success.map(name => <li key={name}>・{name}</li>)}
              </ul>
            </div>
          )}
          {result.errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="font-semibold text-red-700 mb-2">⚠️ エラー（{result.errors.length}件）</p>
              <ul className="text-sm text-red-600 space-y-1">
                {result.errors.map((e, i) => <li key={i}>・{e}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// 工程・機械管理セクション
function ItemManager({ title, fetchUrl, addUrl, deleteUrl, placeholder }: {
  title: string; fetchUrl: string; addUrl: string; deleteUrl: string; placeholder: string
}) {
  const [items, setItems] = useState<Item[]>([])
  const [newName, setNewName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = () => {
    fetch(fetchUrl).then(r => r.json()).then(data => {
      if (Array.isArray(data)) setItems(data)
    })
  }

  useEffect(() => { load() }, [])

  const add = async () => {
    if (!newName.trim()) return
    setLoading(true)
    setError(null)
    const res = await fetch(addUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim() }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? '追加に失敗しました'); setLoading(false); return }
    setNewName('')
    setLoading(false)
    load()
  }

  const remove = async (id: string, name: string) => {
    if (!confirm(`「${name}」を削除しますか？\n※この工程・機械が登録された受注データがある場合は削除できません。`)) return
    const res = await fetch(`${deleteUrl}?id=${id}`, { method: 'DELETE' })
    if (!res.ok) {
      const data = await res.json()
      alert(`削除失敗: ${data.error}`)
      return
    }
    load()
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
      <h2 className="text-lg font-bold text-gray-800">{title}</h2>

      {/* 追加フォーム */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && add()}
          placeholder={placeholder}
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button onClick={add} disabled={!newName.trim() || loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-40">
          追加
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* 一覧 */}
      <div className="flex flex-wrap gap-2">
        {items.length === 0 && <p className="text-sm text-gray-400">登録なし</p>}
        {items.map(item => (
          <div key={item.id}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 rounded-lg text-sm text-gray-700">
            <span>{item.name}</span>
            <button onClick={() => remove(item.id, item.name)}
              className="text-gray-400 hover:text-red-500 ml-1 text-xs font-bold leading-none">✕</button>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function MasterPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">マスタ登録</h1>
          <p className="text-gray-500 text-sm mt-1">マスタデータの管理・Excelからの一括取り込み</p>
        </div>

        {/* 工程マスタ */}
        <ItemManager
          title="工程マスタ"
          fetchUrl="/api/processes"
          addUrl="/api/processes"
          deleteUrl="/api/processes"
          placeholder="工程名を入力（例：レーザー、曲げ①）"
        />

        {/* 機械マスタ */}
        <ItemManager
          title="機械マスタ"
          fetchUrl="/api/machines-list"
          addUrl="/api/machines"
          deleteUrl="/api/machines"
          placeholder="機械名を入力（例：プレス150t①）"
        />

        {/* Excel取り込み */}
        <UploadSection
          title="受注一括登録"
          description="受注一括登録_入力フォーマット.xlsx をアップロードして受注を一括登録します"
          apiPath="/api/import-orders"
          inputId="orders-file-input"
        />

        <UploadSection
          title="品番マスタ一括登録"
          description="品番マスタ_入力フォーマット_v2.xlsx をアップロードして品番・工程を一括登録します"
          apiPath="/api/import-parts"
          inputId="parts-file-input"
        />
      </div>
    </div>
  )
}
