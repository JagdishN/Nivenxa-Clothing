// Round-2 walkthrough recordings (private output). Real production build, no test hooks. Narration is FAKED in the page; no audio is involved.
//   BASE_URL=http://localhost:3100 npx tsx scripts/record-basics-round2.mts
import { chromium, type Page } from '@playwright/test'
import { mkdirSync, renameSync } from 'node:fs'

const BASE = process.env.BASE_URL ?? 'http://localhost:3100'
const OUT = 'D:/Nivenxa Clothing/Private-Assets/avatars/basics-review/round2/videos'
mkdirSync(OUT, { recursive: true })
const browser = await chromium.launch({ slowMo: 160 })

async function session(name: string, seed: Record<string, string>, run: (page: Page) => Promise<void>) {
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 }, recordVideo: { dir: `${OUT}/tmp`, size: { width: 1366, height: 768 } } })
  const page = await ctx.newPage()
  await page.addInitScript((s) => {
    for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v)
    class U { text: string; rate = 1; onstart: (() => void) | null = null; onend: (() => void) | null = null; onerror: (() => void) | null = null; constructor(t: string) { this.text = t } }
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: U, configurable: true })
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: { speaking: false, paused: false, speak(u: U) { setTimeout(() => u.onstart?.(), 0); setTimeout(() => u.onend?.(), 600) }, cancel() {}, pause() {}, resume() {} } })
  }, seed)
  await run(page)
  await page.waitForTimeout(1200)
  const vid = page.video()
  await ctx.close()
  renameSync(await vid!.path(), `${OUT}/${name}.webm`)
}
const progress = (slug: string, step: number, total: number, results?: Record<number, string>) => ({
  'nivenxa-chess-basics-progress': JSON.stringify({ [slug]: { status: 'started', step, total } }),
  ...(results ? { 'nivenxa-chess-basics-results-v1': JSON.stringify({ [slug]: results }) } : {}),
})
const START: Record<string, string> = {}
'abcdefgh'.split('').forEach((f, i) => { const b = 'rnbqkbnr'[i]; START[`${f}1`] = b.toUpperCase(); START[`${f}2`] = 'P'; START[`${f}7`] = 'p'; START[`${f}8`] = b })
const mirror = (p: Record<string, string>) => Object.fromEntries(Object.entries(p).map(([sq, v]) => [`${sq[0]}${9 - Number(sq[1])}`, v]))
const cell = (p: Page, sq: string) => p.locator(`[data-testid=setup-board] [data-square=${sq}]`)
async function place(p: Page, plan: Record<string, string>) {
  for (const letter of ['R', 'N', 'B', 'Q', 'K', 'P', 'r', 'n', 'b', 'q', 'k', 'p']) {
    const todo = Object.entries(plan).filter(([, v]) => v === letter).map(([s]) => s)
    if (!todo.length) continue
    await p.getByTestId(`tray-${letter}`).click()
    for (const sq of todo) await cell(p, sq).click()
  }
}
const open = async (p: Page) => { await p.goto(`${BASE}/chess/learn/basics/set-up-the-pieces`, { waitUntil: 'networkidle' }); await p.getByTestId('lesson-continue').click() }

// 1. Readable independent setup: labelled tray, selection status, side labels, settings dialog that does not move the lesson
await session('1-readable-independent-setup', progress('set-up-the-pieces', 15, 17), async (p) => {
  await open(p)
  await p.waitForTimeout(1500)
  await p.getByTestId('tray-B').click(); await cell(p, 'c1').click(); await p.waitForTimeout(600)
  await cell(p, 'c1').click(); await p.waitForTimeout(900) // occupied: nothing replaced
  await cell(p, 'f1').click(); await p.waitForTimeout(900) // second bishop: the tray entry is used up
  await p.getByTestId('lesson-settings-toggle').click(); await p.waitForTimeout(1500)
  await p.keyboard.press('Escape'); await p.waitForTimeout(900)
})
// 2. Reversed sides: pattern feedback, Retry buttons, rebuild
await session('2-reversed-feedback-and-correction', progress('set-up-the-pieces', 15, 17), async (p) => {
  await open(p)
  await place(p, mirror(START))
  await p.waitForTimeout(1200)
  await p.getByTestId('setup-check').click(); await p.waitForTimeout(3500)
  await p.getByTestId('setup-retry-white').click(); await p.waitForTimeout(2500)
  await p.getByTestId('setup-check').click(); await p.waitForTimeout(2500)
  await p.getByTestId('setup-retry-black').click(); await p.waitForTimeout(1500)
  await place(p, START)
  await p.waitForTimeout(800)
  await p.getByTestId('setup-check').click(); await p.waitForTimeout(2500)
})
// 3. King/queen swap, then correct acceptance with cleared placement status
await session('3-swap-then-accepted', progress('set-up-the-pieces', 15, 17), async (p) => {
  await open(p)
  await place(p, { ...START, d1: 'K', e1: 'Q' })
  await p.getByTestId('setup-check').click(); await p.waitForTimeout(3500)
  await p.getByTestId('setup-remove-wrong').click(); await p.waitForTimeout(1500)
  await p.getByTestId('tray-K').click(); await cell(p, 'e1').click()
  await p.getByTestId('tray-Q').click(); await cell(p, 'd1').click()
  await p.getByTestId('setup-check').click(); await p.waitForTimeout(3500)
  await p.getByTestId('lesson-hint').click({ force: true }); await p.waitForTimeout(1500) // help after success changes nothing
})
// 4. Finish lesson and next-lesson navigation (Set Up the Board -> How Pawns Move, then straight into step 1)
await session('4-finish-and-next-lesson', progress('set-up-the-pieces', 17, 17, { 2: 'independent', 4: 'independent', 6: 'independent', 8: 'independent', 10: 'independent', 12: 'independent', 14: 'independent' }), async (p) => {
  await p.goto(`${BASE}/chess/learn/basics/set-up-the-pieces`, { waitUntil: 'networkidle' })
  await p.getByTestId('lesson-continue').click(); await p.waitForTimeout(1500)
  await p.getByTestId('lesson-next').click()
  await p.getByTestId('lesson-complete-modal').waitFor({ timeout: 8000 }); await p.waitForTimeout(4000)
  await p.getByTestId('modal-next-lesson').click()
  await p.getByTestId('lesson-step-counter').waitFor(); await p.waitForTimeout(2500)
})
await browser.close()
console.log('recorded to', OUT)
