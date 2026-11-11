// Screenshots for the layout/check review (private folder: they show the artwork). Uses a scripted opponent so a check position is reached.
//   BASE_URL=http://localhost:3100 node scripts/review-play-layout.mjs
import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
const BASE = process.env.BASE_URL ?? 'http://localhost:3100'
const OUT = process.env.OUT ?? 'D:/Nivenxa Clothing/Private-Assets/avatars/layout-review'
mkdirSync(OUT, { recursive: true })
const R = { 'rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b': 'e7e6', 'rnbqkbnr/pppp1ppp/4p3/8/3P4/P7/1PP1PPPP/RNBQKBNR b': 'f8b4' }
const STUB = `const R=${JSON.stringify(R)};let pos='';onmessage=(e)=>{const m=String(e.data);if(m==='uci')postMessage('uciok');else if(m==='isready')postMessage('readyok');else if(m.startsWith('position fen '))pos=m.slice(13);else if(m.startsWith('go')){const f=pos.split(' ');const mv=R[f[0]+' '+f[1]]||'e2e4';postMessage('info depth 10 multipv 1 score cp 20 pv '+mv);postMessage('bestmove '+mv)}}`
const browser = await chromium.launch()
for (const [name, vp, extra] of [
  ['1366x768', { width: 1366, height: 768 }],
  ['1440x900', { width: 1440, height: 900 }],
  ['1920x1080', { width: 1920, height: 1080 }],
  ['mobile', { width: 390, height: 844 }, { deviceScaleFactor: 2, isMobile: true, hasTouch: true }],
]) {
  const page = await (await browser.newContext({ viewport: vp, ...(extra ?? {}) })).newPage()
  await page.route('**/*', (r) => {
    const q = r.request(), u = q.url()
    if (u.includes('/stockfish/stockfish-18-lite-single.js')) return r.fulfill({ contentType: 'application/javascript', body: STUB })
    if (q.method() === 'POST' && /explain-(move|engine-purpose)/.test(u)) return r.fulfill({ contentType: 'application/json', body: JSON.stringify({ headline: `${JSON.parse(q.postData() ?? '{}').move} — A developing move`, explanation: 'It opens a line for a piece. It also keeps the centre.', bullets: [] }) })
    return q.method() === 'POST' && (q.headers()['next-action'] || u.includes('/api/')) ? r.abort() : r.continue()
  })
  await page.goto(`${BASE}/chess/play`, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: /^Beginner/ }).click()
  await page.getByRole('button', { name: 'White', exact: true }).click()
  await page.getByRole('button', { name: 'Start Game' }).click()
  await page.waitForSelector('cg-board')
  await page.waitForFunction(() => !document.body.innerText.includes('Loading engine'), undefined, { timeout: 90000 })
  await page.waitForTimeout(500)
  const sq = async (s) => { const b = await page.locator('cg-board').first().boundingBox(); const f = s.charCodeAt(0) - 97, r = Number(s[1]) - 1; return { x: b.x + ((f + 0.5) * b.width) / 8, y: b.y + ((7 - r + 0.5) * b.height) / 8 } }
  const mv = async (a, b) => { for (const s of [a, b]) { const p = await sq(s); await (extra?.hasTouch ? page.touchscreen.tap(p.x, p.y) : page.mouse.click(p.x, p.y)); await page.waitForTimeout(150) } }
  await mv('d2', 'd4'); await page.waitForTimeout(2500)
  await mv('a2', 'a3')
  await page.getByTestId('game-status').filter({ hasText: 'Check' }).waitFor({ timeout: 20000 })
  await page.waitForTimeout(1500)
  const why = page.getByRole('button', { name: 'Why?' })
  if (await why.count()) await why.click()
  if (!extra) await page.screenshot({ path: join(OUT, `check-${name}.png`) })
  else {
    await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(300)
    await page.screenshot({ path: join(OUT, `check-${name}-top.png`) })
    await page.getByTestId('insight-you').scrollIntoViewIfNeeded(); await page.waitForTimeout(300)
    await page.screenshot({ path: join(OUT, `check-${name}-panel.png`) })
  }
  console.log(name, 'ok')
  await page.close()
}
await browser.close()
