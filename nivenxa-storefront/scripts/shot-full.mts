import { chromium } from '@playwright/test'
const BASE = process.env.BASE_URL ?? 'http://localhost:3100'
const OUT = 'D:/Nivenxa Clothing/Private-Assets/avatars/basics-review/round2'
const [w, h, name] = [Number(process.argv[2] ?? 1366), Number(process.argv[3] ?? 768), process.argv[4] ?? 'full']
const browser = await chromium.launch()
const page = await (await browser.newContext({ viewport: { width: w, height: h } })).newPage()
await page.addInitScript(() => { localStorage.setItem('nivenxa-chess-basics-progress', JSON.stringify({ 'set-up-the-pieces': { status: 'started', step: 15, total: 17 } })); localStorage.setItem('chess-voice-muted', '1') })
await page.goto(`${BASE}/chess/learn/basics/set-up-the-pieces`, { waitUntil: 'networkidle' })
await page.getByTestId('lesson-continue').click()
await page.getByTestId('tray-B').click()
await page.screenshot({ path: `${OUT}/${name}-top.png` })
await page.screenshot({ path: `${OUT}/${name}-page.png`, fullPage: true })
await browser.close()
