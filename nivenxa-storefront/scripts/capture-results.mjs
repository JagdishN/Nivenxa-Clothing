// Captures TIVVI's header at actual game-view size when the HUMAN wins (checkmate, played as Black against a scripted opponent that
// plays 1.f3 2.g4) and for a mobile view of the new status placement. Output stays outside the repo (artwork).
import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'
const BASE = process.env.BASE_URL ?? 'http://localhost:3100'
const OUT = process.env.OUT ?? 'D:/Nivenxa Clothing/Private-Assets/avatars/feedback-review'
mkdirSync(OUT, { recursive: true })
const R = { 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w': 'f2f3', 'rnbqkbnr/pppp1ppp/8/4p3/8/5P2/PPPPP1PP/RNBQKBNR w': 'g2g4' }
const stub = `const R=${JSON.stringify(R)};let pos='';onmessage=(e)=>{const m=String(e.data);if(m==='uci')postMessage('uciok');else if(m==='isready')postMessage('readyok');else if(m.startsWith('position fen '))pos=m.slice(13);else if(m.startsWith('go')){const f=pos.split(' ');const mv=R[f[0]+' '+f[1]]||'e2e4';postMessage('info depth 10 multipv 1 score cp 20 pv '+mv);postMessage('bestmove '+mv)}};`
const browser = await chromium.launch()
async function newPage(viewport, extra = {}) {
  const ctx = await browser.newContext({ viewport, ...extra })
  const page = await ctx.newPage()
  await page.route('**/*', (route) => {
    const q = route.request(); const url = q.url()
    if (url.includes('/stockfish/stockfish-18-lite-single.js')) return route.fulfill({ contentType: 'application/javascript', body: stub })
    return q.method() === 'POST' && (q.headers()['next-action'] || url.includes('/api/')) ? route.abort() : route.continue()
  })
  return [ctx, page]
}
const startGame = async (page, color) => {
  await page.goto(`${BASE}/chess/play`, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: /^Beginner/ }).click()
  await page.getByRole('button', { name: color, exact: true }).click()
  await page.getByRole('button', { name: 'Start Game' }).click()
  await page.waitForSelector('cg-board')
  await page.waitForFunction(() => !document.body.innerText.includes('Loading engine'))
}
const sqAt = async (page, s, black) => {
  const box = await page.locator('cg-board').first().boundingBox()
  const f = s.charCodeAt(0) - 97, rk = Number(s[1]) - 1
  return { x: box.x + (((black ? 7 - f : f) + 0.5) * box.width) / 8, y: box.y + (((black ? rk : 7 - rk) + 0.5) * box.height) / 8 }
}
// human wins as Black: 1.f3 e5 2.g4 Qh4#
{
  const [ctx, page] = await newPage({ width: 1366, height: 768 })
  await startGame(page, 'Black')
  await page.waitForFunction(() => document.querySelector('[data-testid=insight-reply]')?.getAttribute('data-move') === 'f3', undefined, { timeout: 20000 })
  const mv = async (a, b) => { const p = await sqAt(page, a, true); await page.mouse.click(p.x, p.y); const q = await sqAt(page, b, true); await page.mouse.click(q.x, q.y) }
  await mv('e7', 'e5')
  await page.waitForFunction(() => document.querySelector('[data-testid=insight-reply]')?.getAttribute('data-move') === 'g4', undefined, { timeout: 20000 })
  await mv('d8', 'h4')
  await page.waitForTimeout(1500)
  await page.screenshot({ path: `${OUT}/12-human-wins-desktop.png` })
  await page.getByRole('button', { name: 'Dismiss' }).click() // dismiss the result overlay so the header is not dimmed
  await page.waitForTimeout(600)
  await page.getByTestId('opponent-header').screenshot({ path: `${OUT}/tivvi-ackwin-human-checkmates.png` })
  await ctx.close()
}
// mobile layout with status chip, two sections
{
  const [ctx, page] = await newPage({ width: 390, height: 844 }, { deviceScaleFactor: 2, isMobile: true, hasTouch: true })
  await startGame(page, 'White')
  await page.waitForTimeout(500)
  await page.screenshot({ path: `${OUT}/13-mobile-start.png` })
  await ctx.close()
}
await browser.close()
console.log('saved')
