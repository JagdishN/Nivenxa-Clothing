// Records a short video + screenshots of the Guided-play feedback flow on the real Play page (production build with
// NEXT_PUBLIC_CHESS_AVATAR_PROTOTYPE=1 on BASE_URL). The engine WORKER is a scripted UCI stub so the timing is repeatable and slow
// enough to watch; the commentary endpoint is mocked (the real one has no model key locally). Output stays OUTSIDE the repo (artwork).
//   BASE_URL=http://localhost:3100 OUT=D:/.../feedback-review node scripts/record-feedback.mjs
import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'

const BASE = process.env.BASE_URL ?? 'http://localhost:3100'
const OUT = process.env.OUT ?? 'D:/Nivenxa Clothing/Private-Assets/avatars/feedback-review'
mkdirSync(OUT, { recursive: true })

const R = {
  'rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b': 'e7e6', // 1.d4 e6
  'rnbqkbnr/pppp1ppp/4p3/8/3P4/P7/1PP1PPPP/RNBQKBNR b': 'f8b4', // 2.a3 Bb4+
  'rnbqk1nr/pppp1ppp/4p3/8/1b1P4/P1P5/1P2PPPP/RNBQKBNR b': 'b4a5', // 3.c3 Ba5
}
const BEST = {
  'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w': 'e2e4',
  'rnbqkbnr/pppp1ppp/4p3/8/3P4/8/PPP1PPPP/RNBQKBNR w': 'e2e4',
  'rnbqk1nr/pppp1ppp/4p3/8/1b1P4/P7/1PP1PPPP/RNBQKBNR w': 'c2c3',
}
// cp for the side to move AFTER the human move: 1.d4 is shown as a blunder (to demo the concern caption); everything else is fine
const AFTER = { 'rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b': 700 }
const GAME_DELAY = 2600, ANALYSIS_DELAY = 1100
const stub = `const R=${JSON.stringify(R)},B=${JSON.stringify(BEST)},A=${JSON.stringify(AFTER)};let pos='',game=false;
onmessage=(e)=>{const m=String(e.data);
 if(m==='uci')postMessage('uciok');else if(m==='isready')postMessage('readyok');
 else if(m.startsWith('setoption name Skill Level'))game=true;
 else if(m.startsWith('position fen '))pos=m.slice(13);
 else if(m.startsWith('go')){const f=pos.split(' '),k=f[0]+' '+f[1];
  if(game){const mv=R[k]||'e2e4';setTimeout(()=>{postMessage('info depth 10 multipv 1 score cp 20 pv '+mv);postMessage('bestmove '+mv)},${GAME_DELAY});return}
  if(m.startsWith('go movetime')){const mv=B[k]||'e2e4';setTimeout(()=>{postMessage('info depth 12 multipv 1 score cp 30 pv '+mv);postMessage('bestmove '+mv)},${ANALYSIS_DELAY / 2})}
  else setTimeout(()=>{postMessage('info depth 14 score cp '+(A[k]??-20));postMessage('bestmove e2e4')},${ANALYSIS_DELAY / 2});}};`

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 }, recordVideo: { dir: OUT, size: { width: 1366, height: 768 } } })
const page = await ctx.newPage()
let n = 0
await page.route('**/*', async (route) => {
  const q = route.request()
  const url = q.url()
  if (url.includes('/stockfish/stockfish-18-lite-single.js')) return route.fulfill({ contentType: 'application/javascript', body: stub })
  if (q.method() === 'POST' && /\/api\/chess\/explain-(move|engine-purpose)/.test(url)) {
    const body = JSON.parse(q.postData() ?? '{}')
    const delay = body.move === 'd4' ? 4200 : 1200
    await new Promise((res) => setTimeout(res, delay))
    const text = body.move === 'd4' ? 'Opens the centre but gives you nothing extra to work with. Try developing a knight first.' : `${body.move} fits the plan and keeps the position solid.`
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ headline: `${body.move} — ${text.split('.')[0]}`, explanation: text, bullets: [] }) })
  }
  return q.method() === 'POST' && (q.headers()['next-action'] || url.includes('/api/')) ? route.abort() : route.continue()
})
const sq = async (s) => {
  const box = await page.locator('cg-board').first().boundingBox()
  const f = s.charCodeAt(0) - 97
  const rk = Number(s[1]) - 1
  return { x: box.x + ((f + 0.5) * box.width) / 8, y: box.y + ((7 - rk + 0.5) * box.height) / 8 }
}
const move = async (a, b) => { const p = await sq(a); await page.mouse.click(p.x, p.y); const q = await sq(b); await page.mouse.click(q.x, q.y) }
const shot = (name) => page.screenshot({ path: `${OUT}/${name}.png` })
const headerShot = async (name) => page.getByTestId('opponent-header').screenshot({ path: `${OUT}/${name}.png` })

await page.goto(`${BASE}/chess/play`, { waitUntil: 'networkidle' })
await page.getByRole('button', { name: /^Beginner/ }).click()
await page.getByRole('button', { name: 'White', exact: true }).click()
await page.getByRole('button', { name: 'Start Game' }).click()
await page.waitForSelector('cg-board')
await page.waitForFunction(() => !document.body.innerText.includes('Loading engine'))
await page.waitForTimeout(400)
await headerShot('tivvi-greeting')
await page.waitForTimeout(2200)
await headerShot('tivvi-idle')
await shot('01-start')

await move('d2', 'd4') // 1.d4: the grade lands, TIVVI reacts, then TIVVI replies; the explanation arrives last
await page.waitForTimeout(500)
await shot('02-reviewing-your-move')
await headerShot('tivvi-thinking') // TIVVI is working on its reply (no reaction is active yet)
await page.getByTestId('insight-you-grade').waitFor({ timeout: 8000 })
await page.waitForTimeout(350)
await shot('03-grade-confirmed-with-concern-caption')
await headerShot('tivvi-concern')
await shot('04-concern-caption-and-thinking-status-share-the-header-line')
await page.getByTestId('insight-reply').waitFor({ timeout: 10000 })
await page.waitForFunction(() => document.querySelector('[data-testid=insight-reply]')?.getAttribute('data-move') === 'e6')
await page.waitForTimeout(400)
await shot('05-tivvi-replied-caption-gone-your-feedback-kept')
await page.waitForFunction(() => document.querySelector('[data-testid=insight-you]')?.getAttribute('data-state') === 'ready', undefined, { timeout: 15000 })
await page.waitForTimeout(500)
await shot('06-your-explanation-arrived-later')
await page.getByRole('button', { name: 'Why?' }).first().click().catch(() => {})
await page.waitForTimeout(700)

await move('a2', 'a3') // 2.a3 Bb4+ : check
await page.waitForFunction(() => document.querySelector('[data-testid=game-status]')?.getAttribute('data-check') === 'true', undefined, { timeout: 15000 })
await page.waitForTimeout(500)
await shot('07-check-status-beside-your-header')
await page.getByRole('button', { name: 'How can I respond?' }).click()
await page.waitForTimeout(900)
await shot('08-check-help')
await page.waitForTimeout(900)
await move('c2', 'c3') // block: the check and its help clear
await page.waitForTimeout(700)
await shot('09-check-resolved-help-cleared')
await page.getByTestId('insight-history-toggle').click().catch(() => {})
await page.waitForTimeout(900)
await shot('10-history-open')
await page.waitForTimeout(3200) // TIVVI's reply to 3.c3 arrives

// resign: the supportive "encourage" pose and the result
await page.getByRole('button', { name: /^Resign/ }).click()
await page.getByRole('button', { name: 'Resign Game' }).click()
await page.waitForTimeout(900)
await shot('11-game-over')
await page.getByRole('button', { name: 'Dismiss' }).click() // dismiss the result overlay so the header is not dimmed
await page.waitForTimeout(600)
await headerShot('tivvi-encourage-after-loss-or-resign')
await page.waitForTimeout(1200)

await ctx.close()
await browser.close()
console.log('saved to', OUT)
