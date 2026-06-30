import ExcelJS from 'exceljs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const SUPABASE_URL = 'https://jqecjcxlngujvfnzvawa.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpxZWNqY3hsbmd1anZmbnp2YXdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3MDQ1OTQsImV4cCI6MjA5NzI4MDU5NH0.xamCoODd_G3iMi347rDzG7YlgMy1FqxEIj5InK4ydr4'

const headers = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }

const [customersRes, processesRes, machinesRes] = await Promise.all([
  fetch(`${SUPABASE_URL}/rest/v1/Customer?select=name&order=name`, { headers }),
  fetch(`${SUPABASE_URL}/rest/v1/Process?select=name&order=name`, { headers }),
  fetch(`${SUPABASE_URL}/rest/v1/Machine?select=name&order=name`, { headers }),
])
const customerNames = (await customersRes.json()).map(c => c.name)
const processNames  = (await processesRes.json()).map(p => p.name)
const machineNames  = (await machinesRes.json()).map(m => m.name)

const wb = new ExcelJS.Workbook()

// ===== マスタシート =====
const masterSheet = wb.addWorksheet('マスタ')
masterSheet.getColumn(1).width = 30
masterSheet.getColumn(2).width = 20
masterSheet.getColumn(3).width = 20

masterSheet.getCell('A1').value = '顧客名'
customerNames.forEach((name, i) => { masterSheet.getCell(`A${i + 2}`).value = name })

masterSheet.getCell('B1').value = '工程'
processNames.forEach((name, i) => { masterSheet.getCell(`B${i + 2}`).value = name })

masterSheet.getCell('C1').value = '機械'
machineNames.forEach((name, i) => { masterSheet.getCell(`C${i + 2}`).value = name })

// ===== 入力シート =====
const inputSheet = wb.addWorksheet('入力')

// 受注列（A〜G）+ 工程列（H〜Q：工程1-5・機械1-5）
inputSheet.columns = [
  { header: '顧客名',    key: 'customerName', width: 28 },
  { header: '品番',      key: 'partCode',     width: 14 },
  { header: '品名',      key: 'partName',     width: 20 },
  { header: '数量',      key: 'quantity',     width: 8  },
  { header: '単価（円）', key: 'unitPrice',    width: 12 },
  { header: '納期',      key: 'dueDate',      width: 14 },
  { header: '備考',      key: 'notes',        width: 20 },
  { header: '工程1',     key: 'process1',     width: 14 },
  { header: '機械1',     key: 'machine1',     width: 14 },
  { header: '工程2',     key: 'process2',     width: 14 },
  { header: '機械2',     key: 'machine2',     width: 14 },
  { header: '工程3',     key: 'process3',     width: 14 },
  { header: '機械3',     key: 'machine3',     width: 14 },
  { header: '工程4',     key: 'process4',     width: 14 },
  { header: '機械4',     key: 'machine4',     width: 14 },
  { header: '工程5',     key: 'process5',     width: 14 },
  { header: '機械5',     key: 'machine5',     width: 14 },
]

// ヘッダー書式（受注列：青、工程列：緑）
const headerRow = inputSheet.getRow(1)
headerRow.eachCell((cell, col) => {
  cell.font = { bold: true }
  cell.fill = {
    type: 'pattern', pattern: 'solid',
    fgColor: { argb: col <= 7 ? 'FFD9E1F2' : 'FFD9F2E1' },
  }
})
headerRow.commit()


// 空行
for (let i = 0; i < 50; i++) inputSheet.addRow([])

const lastCustomerRow = customerNames.length + 1
const lastProcessRow  = processNames.length + 1
const lastMachineRow  = machineNames.length + 1

// 工程・機械列の列文字（H〜Q）
const processCols = ['H', 'J', 'L', 'N', 'P']
const machineCols = ['I', 'K', 'M', 'O', 'Q']

for (let row = 2; row <= 52; row++) {
  // A列：顧客名
  inputSheet.getCell(`A${row}`).dataValidation = {
    type: 'list', allowBlank: true,
    formulae: [`マスタ!$A$2:$A$${lastCustomerRow}`],
    showErrorMessage: false,
  }
  // 工程1〜5・機械1〜5
  for (const col of processCols) {
    inputSheet.getCell(`${col}${row}`).dataValidation = {
      type: 'list', allowBlank: true,
      formulae: [`マスタ!$B$2:$B$${lastProcessRow}`],
      showErrorMessage: false,
    }
  }
  for (const col of machineCols) {
    inputSheet.getCell(`${col}${row}`).dataValidation = {
      type: 'list', allowBlank: true,
      formulae: [`マスタ!$C$2:$C$${lastMachineRow}`],
      showErrorMessage: false,
    }
  }
}

const outPath = path.join(__dirname, '..', 'docs', '受注一括登録_入力フォーマット.xlsx')
await wb.xlsx.writeFile(outPath)
console.log('作成完了:', outPath)
console.log(`顧客数: ${customerNames.length}件 / 工程数: ${processNames.length}件 / 機械数: ${machineNames.length}件`)
