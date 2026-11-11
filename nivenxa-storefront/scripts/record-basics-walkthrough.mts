// Short walkthrough recordings of the four refined Chess Basics lessons (private output; real production build, no test hooks).
// Narration is FAKED in the page (held "Speaking…" forever) so the recording can show Next working while speech is active; no real audio is
// involved or claimed.   BASE_URL=http://localhost:3100 npx tsx scripts/record-basics-walkthrough.mts
import { chromium, type Page } from '@playwright/test'
import { mkdirSync, renameSync } from 'node:fs'

const BASE = process.env.BASE_URL ?? 'http://localhost:3100'
const OUT = 'D:/Nivenxa Clothing/Private-Assets/avatars/basics-review/videos'
mkdirSync(OUT, { recursive: true })
const browser = await chromium.launch({ slowMo: 140 })

async function session(name: string, run: (page: Page) => Promise<void>, seed?: Record<string, string>) {
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 }, recordVideo: { dir: `${OUT}/tmp`, size: { width: 1366, height: 768 } } })
  const page = await ctx.newPage()
  await page.addInitScript((s) => {
    for (const [k, v] of Object.entries(s ?? {})) localStorage.setItem(k, v)
    const log = { active: 0 }
    class U { text: string; rate = 1; onstart: (() => void) | null = null; onend: (() => void) | null = null; onerror: (() => void) | null = null; constructor(t: string) { this.text = t } }
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: U, configurable: true })
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: { speaking: false, paused: false, speak(u: U) { log.active += 1; setTimeout(() => u.onstart?.(), 0) }, cancel() { log.active = 0 }, pause() {}, resume() {} } })
  }, seed ?? {})
  await run(page)
  await page.waitForTimeout(1200)
  const vid = page.video()
  await ctx.close()
  renameSync(await vid!.path(), `${OUT}/${name}.webm`)
}
const next = (p: Page) => p.getByTestId('lesson-next')
async function sq(p: Page, s: string) {
  const b = (await p.locator('cg-board').first().boundingBox())!
  return { x: b.x + ((s.charCodeAt(0) - 97 + 0.5) * b.width) / 8, y: b.y + ((8 - Number(s[1]) + 0.5) * b.height) / 8 }
}
async function click(p: Page, s: string) { const c = await sq(p, s); await p.mouse.click(c.x, c.y) }
async function move(p: Page, a: string, b: string) { await click(p, a); await click(p, b) }
const progress = (slug: string, step: number, total: number) => ({ 'nivenxa-chess-basics-progress': JSON.stringify({ [slug]: { status: 'started', step, total } }) })

// 1. The Chessboard: navigation while narration is "Speaking…", plain-language hints, help recorded honestly, fresh try
await session('1-the-chessboard', async (p) => {
  await p.goto(`${BASE}/chess/learn/basics/the-chessboard`, { waitUntil: 'networkidle' })
  await p.getByTestId('lesson-start').click()
  await p.getByText('Speaking…').waitFor()
  await p.waitForTimeout(800)
  for (let i = 0; i < 3; i++) await next(p).click() // Next works while the voice is "speaking"
  await p.getByTestId('lesson-back').click()
  await p.getByTestId('lesson-replay').click()
  await p.waitForTimeout(800)
})
await session('1b-chessboard-hints-and-help', async (p) => {
  await p.goto(`${BASE}/chess/learn/basics/the-chessboard`, { waitUntil: 'networkidle' })
  await p.getByTestId('lesson-continue').click() // resume at the light-square quiz
  await p.waitForTimeout(500)
  await p.getByTestId('lesson-hint').click(); await p.waitForTimeout(900)
  await p.getByTestId('lesson-hint').click(); await p.waitForTimeout(1500) // plain "bottom-left corner" hint, no square names
  await p.getByTestId('lesson-showme').click(); await p.waitForTimeout(1500)
  await click(p, 'a2'); await p.waitForTimeout(1500) // "Completed with help"
  await p.getByTestId('fresh-try').waitFor().catch(() => {})
}, progress('the-chessboard', 6, 21))
await session('1c-chessboard-fresh-try', async (p) => {
  await p.goto(`${BASE}/chess/learn/basics/the-chessboard`, { waitUntil: 'networkidle' })
  await p.getByTestId('lesson-continue').click() // b7
  await p.getByTestId('lesson-showme').click(); await p.waitForTimeout(1200)
  await click(p, 'b7'); await p.waitForTimeout(1500)
  await p.getByTestId('fresh-try').click(); await p.waitForTimeout(1200)
  await click(p, 'g2'); await p.waitForTimeout(1800) // "Done on your own on a fresh try"
}, progress('the-chessboard', 18, 21))

// 2. Meet Your Pieces: fixed pieces (dragging does nothing), "N of M found", repeated clicks, keyboard
await session('2-meet-your-pieces', async (p) => {
  await p.goto(`${BASE}/chess/learn/basics/meet-the-pieces`, { waitUntil: 'networkidle' })
  await p.getByTestId('lesson-continue').click() // king quiz (step 4)
  await p.waitForTimeout(600)
  const from = await sq(p, 'g1')
  await p.mouse.move(from.x, from.y); await p.mouse.down()
  await p.mouse.move(from.x + 60, from.y - 160, { steps: 12 }); await p.mouse.move(1200, 80, { steps: 12 })
  await p.waitForTimeout(500); await p.mouse.up() // the knight stays put
  await p.waitForTimeout(900)
  await click(p, 'e1'); await p.waitForTimeout(600)
  await click(p, 'e1'); await p.waitForTimeout(600) // already found: still 1 of 2
  await click(p, 'e8'); await p.waitForTimeout(1500)
}, progress('meet-the-pieces', 4, 15))

// 3. Set Up the Board: pieces accumulate, then an independent build with a correction
await session('3-set-up-the-board', async (p) => {
  await p.goto(`${BASE}/chess/learn/basics/set-up-the-pieces`, { waitUntil: 'networkidle' })
  await p.getByTestId('lesson-start').click()
  await next(p).click(); await next(p).click()
  for (const s of ['a1', 'h1', 'a8', 'h8']) await click(p, s)
  await p.waitForTimeout(1200)
  await next(p).click(); await next(p).click()
  for (const s of ['b1', 'g1', 'b8', 'g8']) await click(p, s)
  await p.waitForTimeout(1500) // rooks AND knights now on the board
})
await session('3b-independent-setup', async (p) => {
  await p.goto(`${BASE}/chess/learn/basics/set-up-the-pieces`, { waitUntil: 'networkidle' })
  await p.getByTestId('lesson-continue').click() // the build step
  const cell = (s: string) => p.locator(`[data-testid=setup-board] [data-square=${s}]`)
  await p.getByTestId('tray-R').click(); await cell('a1').click(); await cell('h1').click()
  await p.getByTestId('tray-B').click(); await cell('b1').click() // wrong: a bishop where a knight belongs
  await p.getByTestId('setup-check').click(); await p.waitForTimeout(1800)
  await p.getByTestId('setup-remove-wrong').click(); await p.waitForTimeout(1200) // only the wrong piece comes off
  await p.getByTestId('lesson-hint').click(); await p.waitForTimeout(900)
  await p.getByTestId('lesson-hint').click(); await p.waitForTimeout(1500)
  await p.getByTestId('lesson-showme').click(); await p.waitForTimeout(1800)
  const START: Record<string, string> = {}
  'abcdefgh'.split('').forEach((f, i) => { const back = 'rnbqkbnr'[i]; START[`${f}1`] = back.toUpperCase(); START[`${f}2`] = 'P'; START[`${f}7`] = 'p'; START[`${f}8`] = back })
  for (const letter of ['R', 'N', 'B', 'Q', 'K', 'P', 'r', 'n', 'b', 'q', 'k', 'p']) {
    await p.getByTestId(`tray-${letter}`).click()
    for (const [s, piece] of Object.entries(START)) if (piece === letter) await cell(s).click({ delay: 0 })
  }
  await p.getByTestId('setup-check').click(); await p.waitForTimeout(2000) // "Completed with help"
  await next(p).click(); await p.waitForTimeout(800)
  await next(p).click(); await p.waitForTimeout(1500) // the board is ready: all 32 pieces
  await next(p).click(); await p.waitForTimeout(5000) // completion dialog with the complete board
}, progress('set-up-the-pieces', 15, 17))

// 4. How Pawns Move: shape markers, Black pawn, blocked, capture, then Next lesson starts at once
await session('4-how-pawns-move', async (p) => {
  await p.goto(`${BASE}/chess/learn/basics/pawns`, { waitUntil: 'networkidle' })
  await p.getByTestId('lesson-start').click(); await p.waitForTimeout(1500)
  await next(p).click(); await move(p, 'e2', 'e3'); await p.waitForTimeout(900)
  await next(p).click(); await p.waitForTimeout(900)
  await next(p).click(); await move(p, 'e7', 'e6'); await p.waitForTimeout(1200) // black exercise
  await next(p).click(); await p.waitForTimeout(1500) // one or two
  await next(p).click(); await move(p, 'e2', 'e4'); await p.waitForTimeout(900)
  await next(p).click(); await p.waitForTimeout(1800) // blocked demo (cross + dot legend)
  await next(p).click(); await p.getByTestId('lesson-hint').click(); await p.getByTestId('lesson-hint').click(); await p.waitForTimeout(1200)
  await move(p, 'e2', 'e3'); await p.waitForTimeout(600)
  await next(p).click(); await p.getByRole('button', { name: 'No', exact: true }).click(); await p.waitForTimeout(900)
  await next(p).click(); await next(p).click(); await p.waitForTimeout(1800) // capture demo (ring legend)
  await next(p).click(); await move(p, 'e2', 'd3'); await p.waitForTimeout(900)
  await next(p).click(); await p.waitForTimeout(1500) // straight ahead: cross only
})
await session('4b-pawns-finish-and-next-lesson', async (p) => {
  await p.goto(`${BASE}/chess/learn/basics/pawns`, { waitUntil: 'networkidle' })
  await p.getByTestId('lesson-continue').click() // step 14: the four final checks
  await move(p, 'c3', 'c4'); await next(p).click()
  await move(p, 'd7', 'd6'); await next(p).click()
  await p.getByRole('button', { name: 'No', exact: true }).click(); await next(p).click()
  await move(p, 'e4', 'd5'); await next(p).click()
  await next(p).click() // Finish lesson
  await p.getByTestId('lesson-complete-modal').waitFor({ timeout: 8000 })
  await p.waitForTimeout(3500) // nothing navigates away while the summary is read
  await p.getByTestId('modal-next-lesson').click()
  await p.getByTestId('lesson-step-counter').waitFor() // Rooks begins at once: no second Start click
  await p.waitForTimeout(2500)
}, progress('pawns', 14, 18))
await browser.close()
console.log('recorded to', OUT)
