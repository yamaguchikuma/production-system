import { test, expect, type Page } from '@playwright/test'
import { loadContext, type TestContext } from './test-context'

test.describe.serial('生産管理システム 主要機能', () => {
  let page: Page
  let ctx: TestContext
  let testEmployeeId: string

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage()
    ctx = loadContext()
  })

  test.afterAll(async () => {
    await page.close()
  })

  test('受注を新規登録できる', async () => {
    await page.goto('/orders/new')

    await page.getByTestId('order-customer-select').selectOption({ label: ctx.customerName })

    const due = new Date()
    due.setDate(due.getDate() + 7)
    await page.getByTestId('order-duedate-input').fill(due.toISOString().slice(0, 10))
    await page.getByTestId('order-notes-input').fill('E2E自動テスト')

    await page.getByTestId('item-productcode-0').fill(ctx.productCode)
    await page.getByTestId('item-partname-0').fill(ctx.partName)
    await page.getByTestId('item-quantity-0').fill('3')

    await page.getByRole('button', { name: '受注登録' }).click()
    await expect(page).toHaveURL(/\/orders$/)
  })

  test('登録した受注が一覧に表示される', async () => {
    await page.goto('/orders')
    await page.getByTestId('orders-filter-customer').selectOption({ label: ctx.customerName })

    const row = page.locator('[data-testid="orders-row"]', { hasText: ctx.productCode })
    await expect(row).toBeVisible()
    await expect(row).toContainText(ctx.partName)
  })

  test('工程を追加できる', async () => {
    await page.goto('/schedule')

    const item = page.locator('[data-testid="schedule-item-row"]', { hasText: ctx.productCode })
    await expect(item).toBeVisible()
    await item.click()

    await expect(page.locator('[data-testid="schedule-draft-0"]')).toBeVisible()

    // 「＋ 工程を追加」で行が増えることを確認する
    await page.getByTestId('schedule-add-process-btn').click()
    await expect(page.locator('[data-testid="schedule-draft-1"]')).toBeVisible()

    const employeeSelect0 = page.getByTestId('schedule-draft-employee-0')
    const firstEmployeeOption = employeeSelect0.locator('option').nth(1)
    testEmployeeId = (await firstEmployeeOption.getAttribute('value'))!

    await page.getByTestId('schedule-draft-process-0').selectOption({ index: 1 })
    await page.getByTestId('schedule-draft-process-1').selectOption({ index: 2 })
    await employeeSelect0.selectOption({ index: 1 })
    await page.getByTestId('schedule-draft-employee-1').selectOption({ index: 1 })

    await page.getByTestId('schedule-submit-btn').click()

    await expect(
      page.locator('[data-testid="schedule-item-row"]', { hasText: ctx.productCode })
    ).toContainText('登録済み', { timeout: 10_000 })
  })

  test('工程を完了に変更できる', async () => {
    await page.goto('/field')
    await page.getByTestId('field-employee-select').selectOption(testEmployeeId)

    const card = page.locator('[data-testid="field-workorder-card"]', { hasText: ctx.productCode }).first()
    await expect(card).toBeVisible({ timeout: 10_000 })

    await card.getByTestId('field-start-btn').click()
    await expect(card.getByTestId('field-complete-btn')).toBeVisible()

    await card.getByTestId('field-complete-btn').click()
    await expect(card.getByTestId('field-completed-label')).toBeVisible()
  })

  test.skip('PDF出力ボタンを押してエラーが出ない', async () => {
    // PDF出力機能は現時点でアプリに未実装のため保留。実装後にこのテストを有効化してください。
  })
})
