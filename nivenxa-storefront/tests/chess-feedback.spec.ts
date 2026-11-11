import { test, expect, type Page } from '@playwright/test'

// Guided-play feedback: two sections (your move / TIVVI's reply), results tied to their exact move, timeouts, stale captions,
// grades and check help on the real Play page (TEST-ONLY flagged build, NEXT_PUBLIC_CHESS_AVATAR_PROTOTYPE=1).
//   BASE_URL=http://localhost:3100 npx playwright test tests/chess-feedback.spec.ts --workers=1
// The engine WORKER is a scripted UCI stub so the timing of both engines is under test control:
//   - the gameplay worker (the one given a Skill Level) answers from REPLIES after `gameDelay` ms;
//   - the analysis worker answers `go movetime` (best move, eval before) and `go depth` (eval after, side-to-move score) after
//     `analysisDelay` ms, or never when `analysisHang` is set.
// The two explanation endpoints are mocked with per-move delays/failures. Nothing is saved.

test.setTimeout(120000)
test.use({ viewport: { width: 1366, height: 768 } })

const REPLIES: Record<string, string> = {
  'rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b': 'e7e6', // 1.d4 e6
  'rnbqkbnr/pppp1ppp/4p3/8/3P4/P7/1PP1PPPP/RNBQKBNR b': 'f8b4', // 2.a3 Bb4+
  'rnbqk1nr/pppp1ppp/4p3/8/1b1P4/P1P5/1P2PPPP/RNBQKBNR b': 'b4a5', // 3.c3 Ba5
  'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b': 'f7f6', // 1.e4 f6
  'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w': 'e2e4',
}
// Best move for the analysis worker (must be legal in that position), by "<placement> <side>".
const BEST: Record<string, string> = {
  'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w': 'e2e4',
  'rnbqkbnr/pppp1ppp/4p3/8/3P4/8/PPP1PPPP/RNBQKBNR w': 'e2e4',
  'rnbqk1nr/pppp1ppp/4p3/8/1b1P4/P7/1PP1PPPP/RNBQKBNR w': 'c2c3',
  'rnbqkbnr/pppp1ppp/4p3/8/4P3/8/PPPP1PPP/RNBQKBNR w': 'd2d4',
}

interface Cfg { gameDelay: number; analysisDelay: number; analysisHang: boolean; afterCp: number }
const stub = (c: Cfg) => `const R = ${JSON.stringify(REPLIES)}, B = ${JSON.stringify(BEST)}, C = ${JSON.stringify(c)};
let pos = '', game = false;
onmessage = (e) => {
  const m = String(e.data);
  if (m === 'uci') postMessage('uciok');
  else if (m === 'isready') postMessage('readyok');
  else if (m.startsWith('setoption name Skill Level')) game = true;
  else if (m.startsWith('position fen ')) pos = m.slice(13);
  else if (m.startsWith('go')) {
    const f = pos.split(' '), key = f[0] + ' ' + f[1];
    let out;
    if (game) { const mv = R[key] || 'e2e4'; out = () => { postMessage('info depth 10 multipv 1 score cp 20 pv ' + mv); postMessage('bestmove ' + mv); }; if (C.gameDelay) setTimeout(out, C.gameDelay); else out(); return; }
    if (C.analysisHang) return;
    if (m.startsWith('go movetime')) { const mv = B[key] || 'e2e4'; out = () => { postMessage('info depth 12 multipv 1 score cp 30 pv ' + mv); postMessage('bestmove ' + mv); }; }
    else { out = () => { postMessage('info depth 14 score cp ' + C.afterCp); postMessage('bestmove e2e4'); }; }
    if (C.analysisDelay) setTimeout(out, C.analysisDelay); else out();
  }
};`

interface Opts {
  gameDelay?: number
  analysisDelay?: number
  analysisHang?: boolean
  afterCp?: number // score for the side to move after the human move (negative = good for the human)
  /** ms to hold the commentary response, by move (SAN). 'never' holds it until the page gives up. */
  explainDelay?: Record<string, number | 'never'>
  explainFailFor?: string[]
}
interface Handle { requests: { move: string; n: number }[] }

async function setup(page: Page, o: Opts = {}): Promise<Handle> {
  const h: Handle = { requests: [] }
  const cfg: Cfg = { gameDelay: o.gameDelay ?? 0, analysisDelay: o.analysisDelay ?? 0, analysisHang: !!o.analysisHang, afterCp: o.afterCp ?? -20 }
  let n = 0
  await page.route('**/*', async (route) => {
    const r = route.request()
    const url = r.url()
    if (url.includes('/stockfish/stockfish-18-lite-single.js')) return route.fulfill({ contentType: 'application/javascript', body: stub(cfg) })
    if (r.method() === 'POST' && /\/api\/chess\/explain-(move|engine-purpose)/.test(url)) {
      const body = JSON.parse(r.postData() ?? '{}')
      const request = ++n
      h.requests.push({ move: body.move, n: request })
      const d = o.explainDelay?.[body.move]
      if (d === 'never') return new Promise(() => undefined)
      if (d) await new Promise((res) => setTimeout(res, d))
      if (o.explainFailFor?.includes(body.move)) return route.fulfill({ status: 500, body: 'no' })
      return route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ headline: `${body.move} — Reply ${request} for ${body.move}`, explanation: `Reply ${request} for ${body.move}. It follows a plan.`, bullets: [] }),
      })
    }
    if (r.method() === 'POST' && (r.headers()['next-action'] || url.includes('/api/'))) return route.abort()
    return route.continue()
  })
  return h
}
async function square(page: Page, sq: string) {
  const box = (await page.locator('cg-board').first().boundingBox())!
  const black = await page.locator('.cg-wrap').first().evaluate((el) => el.classList.contains('orientation-black'))
  const f = sq.charCodeAt(0) - 97
  const r = Number(sq[1]) - 1
  return { x: box.x + (((black ? 7 - f : f) + 0.5) * box.width) / 8, y: box.y + (((black ? r : 7 - r) + 0.5) * box.height) / 8 }
}
async function move(page: Page, from: string, to: string) {
  const a = await square(page, from)
  await page.mouse.click(a.x, a.y)
  const b = await square(page, to)
  await page.mouse.click(b.x, b.y)
}
async function start(page: Page, tier = 'Beginner') {
  await page.addInitScript(() => { try { localStorage.setItem('nivenxa.chess.test.replyMinMs', '500'); localStorage.setItem('nivenxa.chess.coachIntro.v1', JSON.stringify(['00000000-0000-4000-8000-000000000a01','00000000-0000-4000-8000-000000000a02','00000000-0000-4000-8000-000000000a03'])) } catch {} }) // these suites are not about pace: shorten the level's minimum reply time (test-only hook, needs NEXT_PUBLIC_CHESS_TEST_HOOKS build)
  await page.goto('/chess/play', { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: new RegExp(`^${tier}`) }).click()
  await page.getByRole('button', { name: 'White', exact: true }).click()
  await page.getByRole('button', { name: 'Start Game' }).click()
  await page.waitForSelector('cg-board')
  await expect(page.getByText('Loading engine…')).toHaveCount(0, { timeout: 40000 })
}
const you = (p: Page) => p.getByTestId('insight-you')
const reply = (p: Page) => p.getByTestId('insight-reply')
const caption = (p: Page) => p.getByTestId('avatar-caption')
const status = (p: Page) => p.getByTestId('game-status')
const CONCERN = /look at that move|leaves your|lets a /

test('your feedback stays when TIVVI replies; each section completes on its own; the grade appears with a label', async ({ page }) => {
  await setup(page, { explainDelay: { d4: 3500 }, afterCp: -20 })
  await start(page)
  await move(page, 'd2', 'd4')
  // TIVVI replies at once (nothing waits for commentary) while your commentary is still being written
  await expect(reply(page)).toHaveAttribute('data-move', 'e6', { timeout: 15000 })
  await expect(you(page)).toHaveAttribute('data-move', 'd4') // not replaced by the reply
  await expect(page.getByTestId('insight-you-heading')).toContainText('Your last move · 1.d4')
  await expect(page.getByTestId('insight-reply-heading')).toHaveText("TIVVI's reply · 1...e6")
  // grade is confirmed (analysis is done) and readable; the explanation is still on its way
  await expect(page.getByTestId('insight-you-grade')).toHaveText('Good')
  await expect(you(page).getByTestId('insight-loading')).toHaveText('Writing the explanation…')
  await expect(reply(page)).toHaveAttribute('data-state', 'ready', { timeout: 15000 })
  // your commentary completes later, in your section only
  await expect(you(page)).toHaveAttribute('data-state', 'ready', { timeout: 15000 })
  await expect(page.getByTestId('insight-you-observation')).toContainText('Reply')
  await expect(reply(page)).toHaveAttribute('data-move', 'e6')
  // analysis and commentary are measured separately on the entry
  const analysis = Number(await you(page).getAttribute('data-analysis-ms'))
  const commentary = Number(await you(page).getAttribute('data-commentary-ms'))
  expect(analysis).toBeGreaterThanOrEqual(0)
  expect(commentary).toBeGreaterThanOrEqual(3400) // the mocked 3.5 s: commentary time is its own number, not mixed into analysis
  expect(analysis).toBeLessThan(commentary)
})

test('grades are neutral while pending: no label, no tone, no mistake implied by a missing result', async ({ page }) => {
  await setup(page, { analysisDelay: 2500, afterCp: 700 }) // would be a blunder, but the result is not in yet
  await start(page)
  await move(page, 'd2', 'd4')
  await expect(you(page)).toHaveAttribute('data-state', 'pending')
  await expect(you(page)).not.toHaveAttribute('data-grade', /./)
  await expect(page.getByTestId('insight-you-grade')).toHaveCount(0)
  await expect(you(page).getByTestId('insight-loading')).toHaveText('Reviewing your move…')
  expect(await you(page).getAttribute('class')).not.toMatch(/tone_(danger|warning)/)
  await expect(caption(page)).not.toHaveText(CONCERN)
  // confirmed: a readable label that matches the existing classification
  await expect(page.getByTestId('insight-you-grade')).toHaveText('Blunder', { timeout: 15000 })
  await expect(you(page)).toHaveAttribute('data-grade', 'blunder')
})

test('analysis that never finishes ends as "unavailable" (no endless Reviewing…), the game keeps going', async ({ page }) => {
  await setup(page, { analysisHang: true })
  await start(page)
  await move(page, 'd2', 'd4')
  await expect(you(page)).toHaveAttribute('data-state', 'pending')
  await expect(page.getByTestId('insight-you').getByTestId('insight-unavailable')).toBeVisible({ timeout: 25000 })
  await expect(page.getByTestId('insight-you').getByTestId('insight-unavailable')).toContainText("A review isn't available for this move. The game isn't affected.")
  await expect(you(page).getByTestId('insight-loading')).toHaveCount(0)
  await expect(reply(page)).toHaveAttribute('data-move', 'e6') // TIVVI was never held up
  await move(page, 'a2', 'a3')
  await expect(page.locator('[data-move="Bb4+"]')).toBeVisible({ timeout: 15000 })
})

test('commentary that never arrives times out into a non-blocking unavailable message', async ({ page }) => {
  await setup(page, { explainDelay: { d4: 'never' } })
  await start(page)
  await move(page, 'd2', 'd4')
  await expect(you(page)).toHaveAttribute('data-state', 'loading', { timeout: 10000 })
  // The commentary gave up: the confirmed grade is kept and the card says so plainly (no indefinite "Writing the explanation…").
  await expect(you(page)).toHaveAttribute('data-state', 'ready', { timeout: 30000 })
  await expect(page.getByTestId('insight-you-observation')).toHaveText('Explanation unavailable.')
  await expect(you(page).getByTestId('insight-loading')).toHaveCount(0)
  await expect(page.getByTestId('insight-you-grade')).toHaveText('Good') // the confirmed grade is kept
  await expect(reply(page)).toHaveAttribute('data-state', 'ready') // TIVVI's own feedback is unaffected
})

test('a late result for an earlier move updates its history entry, never the newer move\'s section', async ({ page }) => {
  await setup(page, { explainDelay: { d4: 6000 } })
  await start(page)
  await move(page, 'd2', 'd4')
  await expect(reply(page)).toHaveAttribute('data-move', 'e6', { timeout: 15000 })
  await move(page, 'a2', 'a3') // your second move while the first move's commentary is still pending
  await expect(you(page)).toHaveAttribute('data-move', 'a3', { timeout: 15000 })
  await expect(you(page)).toHaveAttribute('data-state', 'ready', { timeout: 15000 })
  const mine = await page.getByTestId('insight-you-observation').innerText()
  await page.waitForTimeout(6500) // the d4 commentary lands now
  expect(await page.getByTestId('insight-you-observation').innerText()).toBe(mine) // the visible section did not change
  await expect(you(page)).toHaveAttribute('data-move', 'a3')
  await page.getByTestId('insight-history-toggle').click()
  const d4 = page.getByTestId('insight-history').locator('li[data-ply="0"]')
  await expect(d4).toContainText('1.d4')
  await expect(d4).toContainText('Reply') // its own late result ended up on its own entry
})

test('undo drops results of the abandoned move and nothing leaks onto the replayed one', async ({ page }) => {
  const h = await setup(page, { explainDelay: { d4: 5000 } })
  await start(page)
  await move(page, 'd2', 'd4')
  await expect(reply(page)).toHaveAttribute('data-move', 'e6', { timeout: 15000 })
  await page.getByRole('button', { name: /^Undo/ }).click()
  await move(page, 'e2', 'e4')
  await expect(you(page)).toHaveAttribute('data-move', 'e4')
  await expect(you(page)).toHaveAttribute('data-state', 'ready', { timeout: 15000 })
  await page.waitForTimeout(5500) // the abandoned d4 result is back by now
  await expect(you(page)).toHaveAttribute('data-move', 'e4')
  expect(await page.getByTestId('insight-panel').innerText()).not.toContain('for d4')
  expect(h.requests.filter((r) => r.move === 'd4').length).toBe(1) // not requested twice
})

test('a new game never receives the previous game\'s late result, even for the same move', async ({ page }) => {
  const h = await setup(page, { explainDelay: { d4: 5000 } })
  await start(page)
  await move(page, 'd2', 'd4') // request 1 (slow) belongs to this game
  await expect(reply(page)).toHaveAttribute('data-move', 'e6', { timeout: 15000 })
  await page.getByRole('button', { name: 'More options' }).click()
  await page.getByRole('menuitem', { name: 'New Game' }).click()
  await page.getByRole('button', { name: 'Start New Game' }).click()
  await page.getByRole('button', { name: 'Start Game' }).click()
  await page.waitForSelector('cg-board')
  await expect(page.getByText('Loading engine…')).toHaveCount(0, { timeout: 40000 })
  await expect(page.getByTestId('insight-panel')).not.toContainText('1.d4') // fresh panel
  await expect(caption(page)).not.toHaveText(CONCERN)
  await move(page, 'd2', 'd4') // the SAME move at the SAME ply in the new game; its commentary is also slow
  await expect(you(page)).toHaveAttribute('data-state', 'loading', { timeout: 15000 })
  await page.waitForTimeout(1500)
  await expect(you(page)).toHaveAttribute('data-state', 'loading') // the first game's response (arriving ~now) did not fill it
  await expect(you(page)).toHaveAttribute('data-state', 'ready', { timeout: 15000 })
  const d4 = h.requests.filter((r) => r.move === 'd4')
  expect(d4.length).toBe(2)
  const text = await page.getByTestId('insight-you-observation').innerText()
  expect(text).toContain(`Reply ${d4[1].n}`) // its own request...
  expect(text).not.toContain(`Reply ${d4[0].n}`) // ...never the first game's
})

test('stale caption: a reaction caption disappears when TIVVI moves; its explanation stays on the move; nothing replays', async ({ page }) => {
  await setup(page, { gameDelay: 3500, afterCp: 700 }) // grade (blunder) lands before TIVVI's reply
  await start(page)
  await page.evaluate(() => {
    const w = window as unknown as { __poses: string[] }
    w.__poses = []
    const a = document.querySelector('[data-testid=tivvi-avatar]')!
    new MutationObserver(() => w.__poses.push(a.getAttribute('data-state')!)).observe(a, { attributes: true, attributeFilter: ['data-state'] })
  })
  const boardBefore = (await page.locator('cg-board').first().boundingBox())!
  await move(page, 'd2', 'd4')
  await expect(page.getByTestId('insight-you-grade')).toHaveText('Blunder', { timeout: 15000 })
  await expect(caption(page)).toHaveText(CONCERN, { timeout: 5000 }) // current, relevant: the position it describes is on the board
  await expect(status(page)).toHaveText(/TIVVI is thinking…/) // thinking is shown once, in the status chip
  // the caption and the status chip share the header's one line: the board does not move and the human header stays in view
  expect(await page.locator('cg-board').first().boundingBox()).toEqual(boardBefore)
  const header = (await page.getByTestId('opponent-header').boundingBox())!
  const chip = (await status(page).boundingBox())!
  expect(chip.y).toBeGreaterThanOrEqual(header.y - 1)
  expect(chip.y + chip.height).toBeLessThanOrEqual(header.y + header.height + 1)
  const you2 = (await page.getByTestId('player-avatar').boundingBox())!
  expect(you2.y + you2.height).toBeLessThanOrEqual(768)
  await expect(page.getByTestId('opponent-header')).not.toContainText('is thinking')
  // TIVVI moves: the caption's position is gone, so it is gone
  await expect(reply(page)).toHaveAttribute('data-move', 'e6', { timeout: 15000 })
  await expect(caption(page)).not.toHaveText(CONCERN)
  await expect(caption(page)).toHaveText('')
  await expect(you(page)).toHaveAttribute('data-grade', 'blunder') // the grade/explanation stay on the original move
  await page.waitForTimeout(2500)
  const poses = await page.evaluate(() => (window as unknown as { __poses: string[] }).__poses)
  expect(poses.filter((p) => p === 'concern').length).toBe(1) // reacted once, not replayed
})

test('late grade after TIVVI already replied: no concern caption or pose for a position that has gone', async ({ page }) => {
  await setup(page, { analysisDelay: 3000, afterCp: 700 })
  await start(page)
  await page.evaluate(() => {
    const w = window as unknown as { __poses: string[]; __caps: string[] }
    w.__poses = []
    w.__caps = []
    const a = document.querySelector('[data-testid=tivvi-avatar]')!
    new MutationObserver(() => w.__poses.push(a.getAttribute('data-state')!)).observe(a, { attributes: true, attributeFilter: ['data-state'] })
    const c = document.querySelector('[data-testid=avatar-caption]')!
    new MutationObserver(() => w.__caps.push(c.textContent ?? '')).observe(c, { childList: true, characterData: true, subtree: true })
  })
  await move(page, 'd2', 'd4')
  await expect(reply(page)).toHaveAttribute('data-move', 'e6', { timeout: 15000 }) // TIVVI is not held for the grade
  await expect(page.getByTestId('insight-you-grade')).toHaveText('Blunder', { timeout: 15000 }) // the grade still arrives, on its own move
  await page.waitForTimeout(1000)
  const seen = await page.evaluate(() => {
    const w = window as unknown as { __poses: string[]; __caps: string[] }
    return { __poses: w.__poses, __caps: w.__caps }
  })
  expect(seen.__poses).not.toContain('concern')
  expect(seen.__caps.some((c) => CONCERN.test(c))).toBe(false)
})

test('no-assistance mode (Intermediate, Rapid): no live grades, no insight sections, no check help, no evaluative reactions', async ({ page }) => {
  await setup(page, { afterCp: 700 })
  await start(page, 'Intermediate')
  await move(page, 'd2', 'd4')
  await page.waitForTimeout(4000) // long enough for the stubbed engine's grade and TIVVI's reply
  await expect(page.getByTestId('insight-you')).toHaveCount(0)
  await expect(page.getByTestId('insight-reply')).toHaveCount(0)
  await expect(page.locator('[data-grade]')).toHaveCount(0)
  await expect(page.getByTestId('check-help-toggle')).toHaveCount(0)
  await expect(caption(page)).not.toHaveText(CONCERN)
})

test('check help: optional, lists only legal answers, closes when the position changes', async ({ page }) => {
  await setup(page)
  await start(page)
  await move(page, 'd2', 'd4')
  await expect(reply(page)).toHaveAttribute('data-move', 'e6', { timeout: 15000 })
  await move(page, 'a2', 'a3')
  await expect(status(page)).toHaveText(/Check — your move/, { timeout: 15000 })
  await expect(status(page)).toHaveAttribute('data-host', 'human') // beside your own header, next to the board
  await expect(page.getByTestId('check-help')).toHaveCount(0) // not forced
  const toggle = page.getByRole('button', { name: 'How can I respond?' })
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')
  await toggle.click()
  const help = page.getByTestId('check-help')
  await expect(help.locator('li')).toHaveCount(2) // capture and block only: e2 is occupied and d2 is attacked
  await expect(help).toContainText('Capture the checking piece: axb4')
  await expect(help).toContainText('Block the line:')
  await expect(help).not.toContainText('Move the king')
  await expect(help).not.toContainText('best move') // no stronger-move suggestion in this help
  await move(page, 'c2', 'c3') // the position changes: help and its options are cleared
  await expect(page.getByTestId('check-help')).toHaveCount(0, { timeout: 15000 })
  await expect(page.getByTestId('check-help-toggle')).toHaveCount(0)
})

test('the two sections keep the whole desktop board and both avatars in view', async ({ page }) => {
  await setup(page)
  await start(page)
  await move(page, 'd2', 'd4')
  await expect(reply(page)).toHaveAttribute('data-state', 'ready', { timeout: 15000 })
  await move(page, 'a2', 'a3')
  await expect(status(page)).toHaveText(/Check — your move/, { timeout: 15000 })
  await page.getByRole('button', { name: 'How can I respond?' }).click()
  await page.getByTestId('insight-history-toggle').click()
  for (const sel of ['cg-board', '[data-testid=opponent-header]', '[data-testid=player-avatar]']) {
    const b = (await page.locator(sel).first().boundingBox())!
    expect(b.y, sel).toBeGreaterThanOrEqual(0)
    expect(b.y + b.height, sel).toBeLessThanOrEqual(768)
  }
  const board = (await page.locator('cg-board').first().boundingBox())!
  expect(board.width).toBeGreaterThanOrEqual(440)
  const panel = (await page.getByTestId('insight-panel').boundingBox())!
  expect(panel.y + panel.height).toBeLessThanOrEqual(768)
  expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight + 1)).toBe(true)
})
