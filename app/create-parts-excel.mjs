import ExcelJS from 'exceljs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const SUPABASE_URL = 'https://jqecjcxlngujvfnzvawa.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpxZWNqY3hsbmd1anZmbnp2YXdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3MDQ1OTQsImV4cCI6MjA5NzI4MDU5NH0.xamCoODd_G3iMi347rDzG7YlgMy1FqxEIj5InK4ydr4'
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const { data: customers } = await supabase.from('Customer').select('name').order('name')
const { data: processes } = await supabase.from('Process').select('name').order('name')
const { data: machines }  = await supabase.from('Machine').select('name').order('name')

const customerNames = (customers ?? []).map(c => c.name)
const processNames  = (processes ?? []).map(p => p.name)
const machineNames  = (machines ?? []).map(m => m.name)

const MAX_PROCESS = 8
const wb = new ExcelJS.Workbook()

// ===== マスタシート =====
const master = wb.addWorksheet('マスタ')
master.getCell('A1').value = '顧客名'
master.getCell('B1').value = '工程名称'
master.getCell('C1').value = '機械名'

const maxRows = Math.max(customerNames.length, processNames.length, machineNames.length)
for (let i = 0; i < maxRows; i++) {
  master.getCell(i + 2, 1).value = customerNames[i] ?? ''
  master.getCell(i + 2, 2).value = processNames[i] ?? ''
  master.getCell(i + 2, 3).value = machineNames[i] ?? ''
}
master.getColumn(1).width = 20
master.getColumn(2).width = 16
master.getColumn(3).width = 16
// master.state はデフォルトで表示（編集可能）

// ===== 入力シート =====
const ws = wb.addWorksheet('入力')

// 列幅設定
ws.getColumn(1).width = 14  // 品番
ws.getColumn(2).width = 18  // 品名
ws.getColumn(3).width = 18  // 顧客名
ws.getColumn(4).width = 10  // 単価
for (let i = 0; i < MAX_PROCESS; i++) {
  ws.getColumn(5 + i * 3).width = 14  // 工程名称
  ws.getColumn(6 + i * 3).width = 14  // 機械
  ws.getColumn(7 + i * 3).width = 10  // 時間
}

// ヘッダー行1（工程グループ）
const row1 = ws.getRow(1)
row1.getCell(1).value = '品番'
row1.getCell(2).value = '品名'
row1.getCell(3).value = '顧客名'
row1.getCell(4).value = '単価(円)'
for (let i = 1; i <= MAX_PROCESS; i++) {
  row1.getCell(4 + (i - 1) * 3 + 1).value = `工程${i}`
}
row1.font = { bold: true }
row1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } }

// ヘッダー行2（サブ項目）
const row2 = ws.getRow(2)
row2.getCell(1).value = ''
row2.getCell(2).value = ''
row2.getCell(3).value = ''
row2.getCell(4).value = ''
for (let i = 0; i < MAX_PROCESS; i++) {
  row2.getCell(5 + i * 3).value = '工程名称'
  row2.getCell(6 + i * 3).value = '機械'
  row2.getCell(7 + i * 3).value = '時間(分/個)'
}
row2.font = { bold: true }
row2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } }

// 工程ヘッダーのセル結合
for (let i = 0; i < MAX_PROCESS; i++) {
  const col = 5 + i * 3
  ws.mergeCells(1, col, 1, col + 2)
  const cell = ws.getCell(1, col)
  cell.alignment = { horizontal: 'center' }
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF92D050' } }  // 緑
}

// ドロップダウン範囲（マスタシートから）
const custCount  = customerNames.length || 50
const procCount  = processNames.length  || 50
const machCount  = machineNames.length  || 50
const custRange  = `マスタ!$A$2:$A$${custCount + 1}`
const procRange  = `マスタ!$B$2:$B$${procCount + 1}`
const machRange  = `マスタ!$C$2:$C$${machCount + 1}`

// データ行にドロップダウンを設定（3〜100行）
const DATA_ROWS = 100
for (let r = 3; r <= DATA_ROWS; r++) {
  // 顧客名（C列）
  ws.getCell(r, 3).dataValidation = {
    type: 'list', allowBlank: true, showDropDown: false,
    formulae: [custRange]
  }
  // 工程名称・機械（各工程列）
  for (let i = 0; i < MAX_PROCESS; i++) {
    ws.getCell(r, 5 + i * 3).dataValidation = {
      type: 'list', allowBlank: true, showDropDown: false,
      formulae: [procRange]
    }
    ws.getCell(r, 6 + i * 3).dataValidation = {
      type: 'list', allowBlank: true, showDropDown: false,
      formulae: [machRange]
    }
  }
}

// 行の高さ
ws.getRow(1).height = 20
ws.getRow(2).height = 18

// 先頭行を固定
ws.views = [{ state: 'frozen', ySplit: 2 }]

const outPath = path.join(__dirname, '..', 'docs', '品番マスタ_入力フォーマット_v2.xlsx')
await wb.xlsx.writeFile(outPath)
console.log('作成完了:', outPath)
