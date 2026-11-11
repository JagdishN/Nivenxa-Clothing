// Highlight / marker readability on every board theme (private screenshots).
//   BASE_URL=http://localhost:3100 npx tsx scripts/theme-shots.mts
import { chromium, type Page } from '@playwright/test'
import { mkdirSync } from 'node:fs'

const BASE = process.env.BASE_URL ?? 'http://localhost:3100'
const OUT = 'D:/Nivenxa Clothing/Private-Assets/avatars/basics-review/themes'
mkdirSync(OUT, { recursive: true })
const browser = await chromium.launch()

async function at(page: Page, slug: string, step: number, total: number, theme: string) {
  await page.addInitScript(
    ([s, st, t, th]) => {
      localStorage.setItem('nivenxa-chess-basics-progress', JSON.stringify({ [s as string]: { status: 'started', step: st, total: t } }))
      localStorage.setItem('chess-board-theme', th as string)
      localStorage.setItem('chess-voice-muted', '1')
    },
    [slug, step, total, theme] as const
  )
  await page.goto(`${BASE}/chess/learn/basics/${slug}`, { waitUntil: 'networkidle' })
  await page.getByTestId('lesson-continue').click()
}
async function click(page: Page, s: string) {
  const b = (await page.locator('cg-board').first().boundingBox())!
  await page.mouse.click(b.x + ((s.charCodeAt(0) - 97 + 0.5) * b.width) / 8, b.y + ((8 - Number(s[1]) + 0.5) * b.height) / 8)
}

for (const theme of ['green', 'purple']) {
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } })
  let page = await ctx.newPage()
  await at(page, 'the-chessboard', 10, 21, theme) // files demo: band highlight
  await page.screenshot({ path: `${OUT}/${theme}-1-band.png` })
  await page.close()
  page = await ctx.newPage()
  await at(page, 'the-chessboard', 11, 21, theme) // f-file quiz
  await click(page, 'a1') // wrong -> red
  await page.waitForTimeout(150)
  await page.screenshot({ path: `${OUT}/${theme}-2-wrong.png` })
  await page.waitForTimeout(900)
  await page.getByTestId('lesson-hint').click()
  await page.getByTestId('lesson-hint').click()
  await page.screenshot({ path: `${OUT}/${theme}-3-hint.png` })
  await click(page, 'f3')
  await page.waitForTimeout(500)
  await page.screenshot({ path: `${OUT}/${theme}-4-found.png` })
  await page.close()
  page = await ctx.newPage()
  await at(page, 'pawns', 11, 18, theme) // capture markers
  await page.screenshot({ path: `${OUT}/${theme}-5-markers.png` })
  await ctx.close()
}
await browser.close()
console.log('ok')
