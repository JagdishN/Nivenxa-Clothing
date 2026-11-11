// Exploratory screenshots of the four Chess Basics lessons (private output, not committed).
//   BASE_URL=http://localhost:3100 npx tsx scripts/explore-basics.mts
import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'

const BASE = process.env.BASE_URL ?? 'http://localhost:3100'
const OUT = 'D:/Nivenxa Clothing/Private-Assets/avatars/basics-review/explore'
mkdirSync(OUT, { recursive: true })
const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } })
const page = await ctx.newPage()
const errors: string[] = []
page.on('pageerror', (e) => errors.push(String(e)))
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))

async function shot(name: string) {
  await page.screenshot({ path: `${OUT}/${name}.png` })
}
const next = () => page.getByTestId('lesson-next').click()

await page.goto(`${BASE}/chess/learn/basics/the-chessboard`, { waitUntil: 'networkidle' })
await shot('01-chessboard-start')
await page.getByTestId('lesson-start').click()
await shot('02-chessboard-step1')
for (let i = 0; i < 4; i++) await next()
await shot('03-chessboard-colour-picker')
await next()
await shot('04-chessboard-light-quiz')
await page.getByTestId('lesson-hint').click()
await page.getByTestId('lesson-hint').click()
await shot('05-chessboard-light-hint')
await page.getByTestId('lesson-settings-toggle').click()
await shot('06-chessboard-settings')

await page.goto(`${BASE}/chess/learn/basics/set-up-the-pieces`, { waitUntil: 'networkidle' })
await page.getByTestId('lesson-start').click()
await shot('10-setup-step1')
await page.goto(`${BASE}/chess/learn/basics/pawns`, { waitUntil: 'networkidle' })
await page.getByTestId('lesson-start').click()
await shot('20-pawns-step1')
console.log('errors:', errors.slice(0, 5))
await browser.close()
