// Records a short video + screenshots of the Beginner level's 4 s minimum reply time on the real Play page (production build with
// NEXT_PUBLIC_CHESS_AVATAR_PROTOTYPE=1 on BASE_URL): feedback completing inside the 4 s interval, both feedback cards, a faulty
// explanation replaced by a factual sentence, and a pending reply cancelled by Undo then the same move replayed. The engine WORKER is a
// scripted UCI stub and commentary is mocked (the real endpoint has no model key locally). Output stays OUTSIDE the repo (artwork).
//   BASE_URL=http://localhost:3100 npx tsx scripts/record-pace.mts
import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { engineSource } from '../tests/helpers/scriptedEngine'

const BASE = process.env.BASE_URL ?? 'http://localhost:3100'
const OUT = process.env.OUT ?? 'D:/Nivenxa Clothing/Private-Assets/avatars/pace-review'
mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 }, recordVideo: { dir: OUT, size: { width: 1366, height: 768 } } })
const page = await ctx.newPage()
const TEXT: Record<string, { headline?: string; explanation: string }> = {
  d4: { headline: 'd4 — Claims the centre', explanation: 'The pawn moves to d4 and controls the squares e5 and c5.' },
  e6: { headline: 'e6 — Opens the bishop', explanation: 'The pawn moves to e6 and gives the bishop on f8 room to move.' },
  // a faulty model answer: it describes Black's earlier ...e6 instead of White's a3 (the page must not show it)
  a3: { headline: 'a3 — Stops the bishop', explanation: "Black's ...e6 prepared Bb4, so White uses the pawn to ask the question." },
}
await page.route('**/*', async (route) => {
  const q = route.request()
  const url = q.url()
  if (url.includes('/stockfish/stockfish-18-lite-single.js')) return route.fulfill({ contentType: 'application/javascript', body: engineSource({ gameDelay: 0, analysisDelay: 500, analysisHang: false, afterCp: -20 }) })
  if (q.method() === 'POST' && /\/api\/chess\/explain-(move|engine-purpose)/.test(url)) {
    const body = JSON.parse(q.postData() ?? '{}')
    await new Promise((res) => setTimeout(res, 900))
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ bullets: [], ...(TEXT[body.move] ?? { explanation: `${body.move} develops the position.` }) }) })
  }
  return q.method() === 'POST' && (q.headers()['next-action'] || url.includes('/api/')) ? route.abort() : route.continue()
})
const sq = async (s: string) => {
  const b = (await page.locator('cg-board').first().boundingBox())!
  return { x: b.x + ((s.charCodeAt(0) - 97 + 0.5) * b.width) / 8, y: b.y + ((7 - (Number(s[1]) - 1) + 0.5) * b.height) / 8 }
}
const move = async (a: string, b: string) => { const p = await sq(a); await page.mouse.click(p.x, p.y); const q = await sq(b); await page.mouse.click(q.x, q.y) }
const shot = (n: string) => page.screenshot({ path: `${OUT}/${n}.png` })

await page.goto(`${BASE}/chess/play`, { waitUntil: 'networkidle' })
await page.waitForTimeout(900)
await shot('00-setup-no-pace-selector')
await page.getByRole('button', { name: /^Beginner/ }).click()
await page.getByRole('button', { name: 'White', exact: true }).click()
await page.getByRole('button', { name: 'Start Game' }).click()
await page.waitForSelector('cg-board')
await page.waitForFunction(() => !document.body.innerText.includes('Loading engine'))
await page.waitForTimeout(1500)

await move('d2', 'd4') // Relaxed: TIVVI replies no sooner than 4 s after this
await page.waitForTimeout(1900)
await shot('01-1.9s-your-feedback-complete-TIVVI-still-thinking')
await move('a2', 'a3') // the board is locked while TIVVI is pending: this click does nothing
await page.waitForTimeout(1200)
await shot('02-3.1s-board-locked-still-thinking')
await page.waitForFunction(() => document.querySelector('[data-testid=insight-reply]')?.getAttribute('data-move') === 'e6', undefined, { timeout: 8000 })
await page.waitForTimeout(500)
await shot('03-reply-after-4s-both-cards')
await page.waitForTimeout(1200)

await move('a2', 'a3') // 2.a3: the (faulty) commentary is replaced by a factual sentence
await page.waitForTimeout(2200)
await shot('04-faulty-commentary-replaced-by-facts')
await page.getByRole('button', { name: /^Undo/ }).click() // cancel the pending reply
await page.waitForTimeout(800)
await shot('05-undo-during-pending-reply')
await page.waitForTimeout(4500) // the cancelled reply's moment passes: nothing happens
await shot('06-5s-later-nothing-was-applied')
await move('a2', 'a3') // the very same move again still gets its reply
await page.waitForFunction(() => document.querySelector('[data-testid=insight-reply]')?.getAttribute('data-move') === 'Bb4+', undefined, { timeout: 9000 })
await page.waitForTimeout(900)
await shot('07-same-move-replayed-gets-exactly-one-reply')
await page.waitForTimeout(1200)

await ctx.close()
await browser.close()
console.log('saved to', OUT)
