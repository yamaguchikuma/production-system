import { test, expect } from '@playwright/test'

const PAGES = ['/orders', '/orders/new', '/process-assign', '/schedule', '/field']

test.describe('スマホ幅でも画面が大きく崩れない', () => {
  test.use({ viewport: { width: 375, height: 812 } })

  for (const path of PAGES) {
    test(`横スクロールが発生しない: ${path}`, async ({ page }) => {
      await page.goto(path)
      await page.waitForLoadState('networkidle')

      const overflow = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }))

      // 375px幅に対して大幅にはみ出していないか（多少のボーダー誤差は許容）
      expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 20)
    })
  }
})
