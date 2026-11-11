import { chromium } from '@playwright/test'
const BASE = process.env.BASE_URL ?? 'http://localhost:3100'
const OUT = 'D:/Nivenxa Clothing/Private-Assets/avatars/basics-review/round2'
import { mkdirSync } from 'node:fs'
mkdirSync(OUT, { recursive: true })
const tag = process.argv[2] ?? 'before'
const browser = await chromium.launch()
for (const [name, vp] of [['1366', { width: 1366, height: 768 }], ['390', { width: 390, height: 844 }]] as const) {
  const ctx = await browser.newContext({ viewport: vp })
  const page = await ctx.newPage()
  await page.addInitScript(() => { localStorage.setItem('nivenxa-chess-basics-progress', JSON.stringify({ 'set-up-the-pieces': { status: 'started', step: 15, total: 17 } })); localStorage.setItem('chess-voice-muted', '1') })
  await page.goto(`${BASE}/chess/learn/basics/set-up-the-pieces`, { waitUntil: 'networkidle' })
  await page.getByTestId('lesson-continue').click()
  await page.getByTestId('tray-r').click(); await page.locator('[data-testid=setup-board] [data-square=a1]').click()
  await page.getByTestId('lesson-hint').click()
  await page.screenshot({ path: `${OUT}/${tag}-step15-${name}.png` })
  await page.getByTestId('lesson-settings-toggle').click()
  await page.screenshot({ path: `${OUT}/${tag}-step15-settings-${name}.png` })
  await ctx.close()
}
await browser.close()
