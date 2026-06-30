import * as XLSX from 'xlsx'
import { fileURLToPath } from 'url'
import path from 'path'
import fs from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const processes = [
  'ブランク', '手送り抜き', '穴あけ①', '穴あけ②', '切欠き',
  '曲げ①', '曲げ②', '絞り①', '絞り②', '成型①',
  'タップ', 'バリ取り', 'シャー', '小切り'
]

const machines = [
  'プレス150t①', 'プレス150t②', '110t', '80t', '45t',
  'シャーリング', 'タレパン', 'ブレーキ', 'レーザー', 'ボール盤'
]

const wb = XLSX.utils.book_new()

// ===== マスタシート =====
const masterData = [
  ['工程名称', '機械名'],
  ...Array.from({ length: Math.max(processes.length, machines.length) }, (_, i) => [
    processes[i] ?? '', machines[i] ?? ''
  ])
]
const masterSheet = XLSX.utils.aoa_to_sheet(masterData)
masterSheet['!cols'] = [{ wch: 16 }, { wch: 16 }]
XLSX.utils.book_append_sheet(wb, masterSheet, 'マスタ')

// ===== 入力シート =====
const MAX_PROCESS = 8
const headers1 = ['製品ファミリー名']
const headers2 = ['']
for (let i = 1; i <= MAX_PROCESS; i++) {
  headers1.push(`工程${i}`, '', '')
  headers2.push('工程名称', '機械', '標準時間(分/個)')
}

const inputData = [headers1, headers2]

// サンプル行
inputData.push(['プレスブラケット', 'ブランク', 'プレス150t①', 2, '穴あけ①', 'プレス150t①', 1, '曲げ①', 'ブレーキ', 2, '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''])
inputData.push(['パネル', 'ブランク', 'シャーリング', 3, 'バリ取り', '', 1, '曲げ①', 'ブレーキ', 2, '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''])
inputData.push(['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''])
inputData.push(['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''])
inputData.push(['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''])

const inputSheet = XLSX.utils.aoa_to_sheet(inputData)

// 列幅設定
const cols = [{ wch: 20 }]
for (let i = 0; i < MAX_PROCESS; i++) {
  cols.push({ wch: 14 }, { wch: 14 }, { wch: 10 })
}
inputSheet['!cols'] = cols

// セル結合（工程Nのヘッダー）
const merges = []
for (let i = 0; i < MAX_PROCESS; i++) {
  const col = 1 + i * 3
  merges.push({ s: { r: 0, c: col }, e: { r: 0, c: col + 2 } })
}
inputSheet['!merges'] = merges

// データ入力規則（ドロップダウン）をJSON形式で出力するためのメモ
// xlsxライブラリはドロップダウンに対応していないため、
// 選択肢はマスタシートに記載

XLSX.utils.book_append_sheet(wb, inputSheet, '入力')

// 出力先
const outDir = path.join(__dirname, '..', 'docs')
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })
const outPath = path.join(outDir, '製品工程マスタ_入力フォーマット.xlsx')
XLSX.writeFile(wb, outPath)
console.log('作成完了:', outPath)
