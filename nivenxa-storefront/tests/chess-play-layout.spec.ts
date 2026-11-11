import { test, expect, type Page } from '@playwright/test'

// Play screen fit, check handling and loading labels on the real page (TEST-ONLY flagged build, NEXT_PUBLIC_CHESS_AVATAR_PROTOTYPE=1).
//   BASE_URL=http://localhost:3100 npx playwright test tests/chess-play-layout.spec.ts
// Check scenarios need the opponent to play a known reply, so the engine WORKER is replaced by a tiny scripted UCI stub
// (it only answers positions listed in REPLIES). Layout tests use the real engine. The explanation endpoints are mocked. Nothing is saved.

test.setTimeout(120000)

// "<piece placement> <side to move>" -> the opponent's reply
const REPLIES: Record<string, string> = {
  // human White: 1.d4 e6 2.a3 Bb4+ (check on White) 3.c3 (block)
  'rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b': 'e7e6',
  'rnbqkbnr/pppp1ppp/4p3/8/3P4/P7/1PP1PPPP/RNBQKBNR b': 'f8b4',
  'rnbqk1nr/pppp1ppp/4p3/8/1b1P4/P1P5/1P2PPPP/RNBQKBNR b': 'b4a5',
  // human White gives check: 1.e4 f6 2.Qh5+ g6
  'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b': 'f7f6',
  'rnbqkbnr/ppppp1pp/5p2/7Q/4P3/8/PPPP1PPP/RNB1KBNR b': 'g7g6',
  // human White gets mated: 1.f3 e5 2.g4 Qh4#
  'rnbqkbnr/pppppppp/8/8/8/5P2/PPPPP1PP/RNBQKBNR b': 'e7e5',
  'rnbqkbnr/pppp1ppp/8/4p3/6P1/5P2/PPPPP2P/RNBQKBNR b': 'd8h4',
  // human Black (board flipped): 1.e4 f6 2.Qh5+ (check on Black) g6
  'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w': 'e2e4',
  'rnbqkbnr/ppppp1pp/5p2/8/4P3/8/PPPP1PPP/RNBQKBNR w': 'd1h5',
}

// gameDelay holds back only the GAMEPLAY engine's reply (the worker that was given a Skill Level), so a state like "TIVVI to move"
// stays observable; the analysis worker is unaffected.
const stub = (gameDelay: number) => `const R = ${JSON.stringify(REPLIES)};
let pos = '', game = false;
onmessage = (e) => {
  const m = String(e.data);
  if (m === 'uci') postMessage('uciok');
  else if (m === 'isready') postMessage('readyok');
  else if (m.startsWith('setoption name Skill Level')) game = true;
  else if (m.startsWith('position fen ')) pos = m.slice(13);
  else if (m.startsWith('go')) {
    const f = pos.split(' ');
    const mv = R[f[0] + ' ' + f[1]] || 'e2e4';
    const out = () => { postMessage('info depth 10 multipv 1 score cp 20 pv ' + mv); postMessage('bestmove ' + mv); };
    if (game && ${gameDelay}) setTimeout(out, ${gameDelay}); else out();
  }
};`

interface Opts { stubEngine?: boolean; gameDelay?: number; explainDelay?: number; explainFail?: boolean }
async function setup(page: Page, o: Opts = {}) {
  await page.route('**/*', async (route) => {
    const r = route.request()
    const url = r.url()
    if (o.stubEngine && url.includes('/stockfish/stockfish-18-lite-single.js')) {
      return route.fulfill({ contentType: 'application/javascript', body: stub(o.gameDelay ?? 0) })
    }
    if (r.method() === 'POST' && /\/api\/chess\/explain-(move|engine-purpose)/.test(url)) {
      if (o.explainDelay) await new Promise((res) => setTimeout(res, o.explainDelay))
      if (o.explainFail) return route.fulfill({ status: 500, body: 'no' })
      const body = JSON.parse(r.postData() ?? '{}')
      return route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ headline: `${body.move} — A sensible move`, explanation: 'A sensible move. It follows a plan.', bullets: [] }),
      })
    }
    if (r.method() === 'POST' && (r.headers()['next-action'] || url.includes('/api/'))) return route.abort()
    return route.continue()
  })
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
async function start(page: Page, color: 'White' | 'Black' = 'White') {
  await page.addInitScript(() => { try { localStorage.setItem('nivenxa.chess.test.replyMinMs', '500'); localStorage.setItem('nivenxa.chess.coachIntro.v1', JSON.stringify(['00000000-0000-4000-8000-000000000a01','00000000-0000-4000-8000-000000000a02','00000000-0000-4000-8000-000000000a03'])) } catch {} }) // these suites are not about pace: shorten the level's minimum reply time (test-only hook, needs NEXT_PUBLIC_CHESS_TEST_HOOKS build)
  await page.goto('/chess/play', { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: /^Beginner/ }).click()
  await page.getByRole('button', { name: color, exact: true }).click()
  await page.getByRole('button', { name: 'Start Game' }).click()
  await page.waitForSelector('cg-board')
  await expect(page.getByText('Loading engine…')).toHaveCount(0, { timeout: 40000 })
}
const status = (page: Page) => page.getByTestId('game-status')
const checkSquares = (page: Page) => page.locator('cg-board square.check')

// ─── 1. the whole playing area fits ───────────────────────────────────────────
for (const [w, h] of [[1366, 768], [1440, 900], [1920, 1080], [1280, 720]] as const) {
  test(`desktop ${w}x${h}: board, both headers and controls are visible together; footer stays after the game`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h })
    await setup(page)
    await start(page)
    await page.waitForTimeout(500)
    const r = async (sel: string) => (await page.locator(sel).first().boundingBox())!
    const board = await r('cg-board')
    const opp = await page.getByTestId('opponent-header').boundingBox()
    const you = await page.getByTestId('player-avatar').boundingBox()
    const resign = (await page.getByRole('button', { name: 'Resign' }).boundingBox())!
    const undo = (await page.getByRole('button', { name: 'Undo' }).boundingBox())!
    for (const [name, b] of Object.entries({ board, opp, you, resign, undo })) {
      expect(b, name).toBeTruthy()
      expect(b!.y + b!.height, `${name} bottom within ${h}`).toBeLessThanOrEqual(h)
      expect(b!.y, `${name} below the nav`).toBeGreaterThanOrEqual(0)
    }
    expect(board.width).toBeGreaterThanOrEqual(w >= 1920 ? 640 : 400) // readable, not shrunk to fit
    expect(opp!.width).toBeGreaterThan(100)
    expect(you!.height).toBeGreaterThanOrEqual(63) // the avatar stays 64px
    expect((await page.getByTestId('player-avatar').boundingBox())!.width).toBeGreaterThanOrEqual(63)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    // panel never taller than the board column; footer sits after the game content
    const footerTop = await page.evaluate(() => document.querySelector('footer')!.getBoundingClientRect().top + scrollY)
    expect(footerTop).toBeGreaterThanOrEqual(you!.y + you!.height)
  })
}

test('mobile 390x844: board is full width, nothing overflows sideways, scrolling reaches the player header and footer', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
  const page = await ctx.newPage()
  await setup(page)
  await start(page)
  const board = (await page.locator('cg-board').first().boundingBox())!
  expect(board.width).toBeGreaterThanOrEqual(310)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.getByTestId('player-avatar').scrollIntoViewIfNeeded()
  await expect(page.getByTestId('player-avatar')).toBeVisible()
  await ctx.close()
})

test('increased browser zoom (125% and 200% of a 1366x768 screen): the board keeps a readable size and the page scrolls', async ({ browser }) => {
  for (const [w, h] of [[1093, 614], [683, 384]] as const) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h } })
    const page = await ctx.newPage()
    await setup(page)
    await start(page)
    const board = (await page.locator('cg-board').first().boundingBox())!
    expect(board.width, `${w}x${h}`).toBeGreaterThanOrEqual(330)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
    await page.getByTestId('player-avatar').scrollIntoViewIfNeeded()
    await expect(page.getByTestId('player-avatar')).toBeVisible()
    await ctx.close()
  }
})

// ─── 2. check ─────────────────────────────────────────────────────────────────
test('the opponent gives check: highlighted king, persistent status, verified explanation, legal ways out; resolved by blocking', async ({ page }) => {
  await setup(page, { stubEngine: true })
  await start(page)
  await move(page, 'd2', 'd4')
  await expect(page.locator('[data-move=\"e6\"]')).toBeVisible({ timeout: 20000 })
  await move(page, 'a2', 'a3')
  await expect(status(page)).toHaveText(/Check — your move/, { timeout: 20000 })
  await expect(status(page)).toHaveAttribute('data-check', 'true')
  await expect(checkSquares(page)).toHaveCount(1)
  const king = (await checkSquares(page).boundingBox())!
  const e1 = await square(page, 'e1')
  expect(Math.abs(king.x + king.width / 2 - e1.x)).toBeLessThan(6) // the highlight is on the white king's square
  // verified facts appear whether or not the commentary has arrived
  await expect(page.getByTestId('insight-check')).toContainText("TIVVI's bishop on b4 gives check to your king on e1, along the diagonal")
  await expect(page.getByTestId('check-help')).toHaveCount(0) // help is optional: offered, never forced
  await page.getByRole('button', { name: 'How can I respond?' }).click()
  // e2 is still occupied by the pawn and d2 is attacked, so the legal ways out are exactly: capture on b4, or block
  await expect(page.getByTestId('check-help')).toContainText('Capture the checking piece: axb4')
  await expect(page.getByTestId('check-help')).toContainText('Block the line:')
  await expect(page.getByTestId('check-help')).not.toContainText('Move the king')
  // the status stays while the commentary loads / changes
  await expect(status(page)).toHaveText(/Check — your move/)
  // resolve it
  await move(page, 'c2', 'c3')
  await expect(checkSquares(page)).toHaveCount(0, { timeout: 20000 })
  await expect(status(page)).not.toHaveText(/Check/)
  await expect(page.getByTestId('insight-check')).toHaveCount(0)
})

test('the player gives check: status says whose move it is, no response advice is shown for the opponent', async ({ page }) => {
  await setup(page, { stubEngine: true, gameDelay: 2500 })
  await start(page)
  await move(page, 'e2', 'e4')
  await expect(page.locator('[data-move=\"f6\"]')).toBeVisible({ timeout: 20000 })
  await move(page, 'd1', 'h5')
  await expect(status(page)).toHaveText(/Check — TIVVI to move/, { timeout: 5000 })
  await expect(page.getByTestId('insight-check')).toContainText("Your queen on h5 gives check to TIVVI's king on e8, along the diagonal")
  await expect(page.getByTestId('check-help-toggle')).toHaveCount(0) // no advice about the opponent's replies
  // the reply (…g6) resolves it
  await expect(page.locator('[data-move=\"g6\"]')).toBeVisible({ timeout: 20000 })
  await expect(checkSquares(page)).toHaveCount(0)
})

test('playing Black on a flipped board: check on the Black king is highlighted on the right square and explained', async ({ page }) => {
  await setup(page, { stubEngine: true })
  await start(page, 'Black')
  await expect(page.locator('[data-move=\"e4\"]')).toBeVisible({ timeout: 20000 })
  await move(page, 'f7', 'f6')
  await expect(status(page)).toHaveText(/Check — your move/, { timeout: 20000 })
  const king = (await checkSquares(page).boundingBox())!
  const e8 = await square(page, 'e8')
  expect(Math.abs(king.x + king.width / 2 - e8.x)).toBeLessThan(6)
  expect(Math.abs(king.y + king.height / 2 - e8.y)).toBeLessThan(6)
  await expect(page.getByTestId('insight-check')).toContainText("TIVVI's queen on h5 gives check to your king on e8")
  // manual flip keeps the highlight on the king
  await page.getByRole('button', { name: 'Flip' }).click()
  const king2 = (await checkSquares(page).boundingBox())!
  const e8b = await square(page, 'e8')
  expect(Math.abs(king2.y + king2.height / 2 - e8b.y)).toBeLessThan(6)
  await move(page, 'g7', 'g6')
  await expect(checkSquares(page)).toHaveCount(0, { timeout: 20000 })
})

test('checkmate: the mated king stays highlighted and the result says TIVVI wins', async ({ page }) => {
  await setup(page, { stubEngine: true })
  await start(page)
  await move(page, 'f2', 'f3')
  await expect(page.locator('[data-move=\"e5\"]')).toBeVisible({ timeout: 20000 })
  await move(page, 'g2', 'g4')
  await expect(page.getByText('TIVVI wins').first()).toBeVisible({ timeout: 20000 })
  await expect(checkSquares(page)).toHaveCount(1)
})

// ─── 3. loading labels, failures, panel stability ─────────────────────────────
test('loading labels say whose move is being reviewed, show move number and side, and never block play', async ({ page }) => {
  await setup(page, { stubEngine: true, explainDelay: 4000 })
  await start(page)
  await move(page, 'd2', 'd4')
  const you = page.getByTestId('insight-you')
  const reply = page.getByTestId('insight-reply')
  await expect(page.getByTestId('insight-you-heading')).toContainText('Your last move · 1.d4')
  await expect(you.getByTestId('insight-loading')).toHaveText(/Reviewing your move…|Writing the explanation…/)
  await expect(status(page)).toHaveText(/TIVVI is thinking…|Your move/)
  // TIVVI's reply: its own move is reviewed under its own label, and the board is already usable while that loads
  await expect(reply).toHaveAttribute('data-move', 'e6', { timeout: 20000 })
  await expect(page.getByTestId('insight-reply-heading')).toHaveText("TIVVI's reply · 1...e6")
  await expect(reply.getByTestId('insight-loading')).toHaveText("Reviewing TIVVI's move…")
  await expect(you).toHaveAttribute('data-move', 'd4') // the reply did not replace your feedback
  await move(page, 'a2', 'a3') // plays immediately, commentary is still loading
  await expect(page.locator('[data-move="a3"], [data-move="Bb4+"]').first()).toBeVisible({ timeout: 20000 })
})

test('failed commentary: a brief non-blocking message, the game stays playable', async ({ page }) => {
  await setup(page, { stubEngine: true, explainFail: true })
  await start(page)
  await move(page, 'd2', 'd4')
  await expect(page.getByText("Commentary isn't available for this move. The game isn't affected.").first()).toBeVisible({ timeout: 30000 })
  await expect(page.locator('[data-move=\"e6\"]')).toBeVisible({ timeout: 20000 })
  await move(page, 'a2', 'a3')
  await expect(page.locator('[data-move="a3"], [data-move="Bb4+"]').first()).toBeVisible({ timeout: 20000 })
})

test('expanding Why? and the history never moves or resizes the board; no vague filler text', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 })
  await setup(page, { stubEngine: true })
  await start(page)
  await move(page, 'd2', 'd4')
  await expect(page.locator('[data-move=\"e6\"]')).toBeVisible({ timeout: 20000 })
  await expect(page.getByTestId('insight-you-observation')).toBeVisible({ timeout: 20000 })
  await expect(page.getByTestId('insight-reply-observation')).toBeVisible({ timeout: 20000 })
  await move(page, 'a2', 'a3') // a second exchange, so the first one moves into the history
  await expect(page.locator('[data-move="Bb4+"]')).toBeVisible({ timeout: 20000 })
  const before = (await page.locator('cg-board').first().boundingBox())!
  await page.getByRole('button', { name: 'Why?' }).first().click()
  await page.getByTestId('insight-history-toggle').click()
  const after = (await page.locator('cg-board').first().boundingBox())!
  expect(after).toEqual(before)
  await expect(page.getByText('Shown on the board now')).toHaveCount(0)
  const panel = (await page.getByTestId('insight-panel').boundingBox())!
  expect(panel.y + panel.height).toBeLessThanOrEqual(768)
})

test('labels are not repeated: strength and mode appear once, TIVVI keeps its own description', async ({ page }) => {
  await setup(page)
  await start(page)
  await expect(page.getByTestId('opponent-name')).toHaveText('TIVVI · Black')
  await expect(page.getByTestId('opponent-sub')).toHaveText('Friendly partner')
  await expect(page.getByTestId('game-meta')).toContainText('Guided play')
  expect(await page.getByText('Guided play').count()).toBe(1)
  expect(await page.getByText(/Beginner/).count()).toBeLessThanOrEqual(1)
})
