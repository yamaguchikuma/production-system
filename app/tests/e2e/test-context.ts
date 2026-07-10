import fs from 'fs'
import path from 'path'

export interface TestContext {
  runTag: string
  customerId: string
  customerName: string
  productCode: string
  partName: string
}

const CONTEXT_PATH = path.resolve(__dirname, '.test-context.json')

export function saveContext(ctx: TestContext) {
  fs.writeFileSync(CONTEXT_PATH, JSON.stringify(ctx, null, 2))
}

export function loadContext(): TestContext {
  return JSON.parse(fs.readFileSync(CONTEXT_PATH, 'utf-8'))
}

export function contextExists(): boolean {
  return fs.existsSync(CONTEXT_PATH)
}

export function clearContext() {
  if (fs.existsSync(CONTEXT_PATH)) fs.unlinkSync(CONTEXT_PATH)
}
