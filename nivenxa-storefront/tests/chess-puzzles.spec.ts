import { test, expect, type Page } from '@playwright/test'
import { Chess } from 'chess.js'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

// Browser checks for the Chess puzzles flow. NOTHING here writes to real player data: every
// server-action POST (the call that saves a puzzle result) is intercepted and aborted, and the
// test counts how many were attempted. Needs the dev server on :3000 and a populated puzzles table.

const SHOTS = join(process.cwd(), 'docs', 'chess-screenshots', 'puzzles')

async function blockSaves(page: Page) {
  const attempts: string[] = []
  await page.route('**/*', (route) => {
    const req = route.request()
    if (req.method() === 'POST' && req.headers()['next-action']) {
      attempts.push(req.url())
      return route.abort()
    }
    return route.continue()
  })
  return attempts
}

/** Squares -> pixel centre of the chessground board, honouring orientation. */
async function squareCentre(page: Page, square: string) {
  const board = page.locator('cg-board').first()
  const box = (await board.boundingBox())!
  const black = await page.locator('.cg-wrap').first().evaluate((el) => el.classList.contains('orientation-black'))
  const file = square.charCodeAt(0) - 97
  const rank = Number(square[1]) - 1
  const col = black ? 7 - file : file
  const row = black ? rank : 7 - rank
  return { x: box.x + ((col + 0.5) * box.width) / 8, y: box.y + ((row + 0.5) * box.height) / 8 }
}

async function playMove(page: Page, from: string, to: string) {
  await page.locator('cg-board').first().scrollIntoViewIfNeeded()
  const a = await squareCentre(page, from)
  await page.mouse.click(a.x, a.y)
  const b = await squareCentre(page, to)
  await page.mouse.click(b.x, b.y)
}

test.describe('Puzzles: navigation feedback', () => {
  test('clicking Puzzles shows the Puzzles shell immediately while data is slow', async ({ page }) => {
    mkdirSync(SHOTS, { recursive: true })
    await blockSaves(page)
    await page.goto('/chess/learn', { waitUntil: 'networkidle' })
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()

    // Make the route's server data slow (1.5 s) so the loading boundary has to carry the page.
    await page.route(/\/chess\/puzzles(\?|$)/, async (route) => {
      const req = route.request()
      if (req.headers()['rsc'] || req.url().includes('_rsc')) await new Promise((r) => setTimeout(r, 1500))
      await route.continue()
    })

    // In-page timing: click -> skeleton visible, click -> real topic tiles visible.
    await page.evaluate(() => {
      const w = window as unknown as { __t: Record<string, number> }
      w.__t = {}
      document.addEventListener('click', () => (w.__t.click = performance.now()), { capture: true, once: true })
      new MutationObserver(() => {
        if (!w.__t.skeleton && document.querySelector('[aria-busy="true"]')) w.__t.skeleton = performance.now()
        if (!w.__t.ready && !document.querySelector('[aria-busy="true"]') && document.querySelector('a[href^="/chess/puzzles/"]')) w.__t.ready = performance.now()
      }).observe(document.body, { childList: true, subtree: true })
    })

    await page.getByRole('link', { name: 'Puzzles', exact: true }).first().click()

    // The shell: skeleton + Puzzles heading + active nav item, and NOT the Learn content.
    const skeleton = page.locator('[aria-busy="true"]')
    await expect(skeleton).toBeVisible({ timeout: 1200 })
    await expect(page.getByRole('heading', { level: 1, name: 'Puzzles' })).toBeVisible()
    await expect(page).toHaveURL(/\/chess\/puzzles$/)
    await expect(page.locator('nav a[class*="linkActive"]')).toHaveText('Puzzles')
    await expect(page.getByText('Chess Basics', { exact: false })).toHaveCount(0)
    await page.screenshot({ path: join(SHOTS, 'loading-catalogue.png') })

    await expect(page.locator('a[href^="/chess/puzzles/mateIn1"]').first()).toBeVisible({ timeout: 15000 })
    await expect(skeleton).toHaveCount(0)
    const t = await page.evaluate(() => (window as unknown as { __t: Record<string, number> }).__t)
    const feedbackMs = Math.round(t.skeleton - t.click)
    const readyMs = Math.round(t.ready - t.click)
    writeFileSync(join(SHOTS, 'nav-timing.json'), JSON.stringify({ feedbackMs, contentReadyMs: readyMs, serverDelayInjectedMs: 1500, note: 'in-page performance.now(); dev server; Chromium' }, null, 2))
    console.log(`click -> skeleton ${feedbackMs} ms, click -> content ready ${readyMs} ms (1500 ms injected server delay)`)
    expect(feedbackMs).toBeLessThan(200)
  })

  test('Back returns to the previous page and the nav follows the URL', async ({ page }) => {
    await blockSaves(page)
    await page.goto('/chess/learn', { waitUntil: 'networkidle' })
    await page.getByRole('link', { name: 'Puzzles', exact: true }).first().click()
    await expect(page).toHaveURL(/\/chess\/puzzles/)
    await page.goBack()
    await expect(page).toHaveURL(/\/chess\/learn/)
    await expect(page.locator('nav a[class*="linkActive"]')).toHaveText('Learn')
    await page.goForward()
    await expect(page.locator('nav a[class*="linkActive"]')).toHaveText('Puzzles')
  })

  test('an unknown topic is a real 404 (status), not a streamed 200', async ({ page }) => {
    await blockSaves(page)
    const res = await page.goto('/chess/puzzles/notATheme', { waitUntil: 'networkidle' })
    expect(res?.status()).toBe(404)
  })
})

test.describe('Puzzle states', () => {
  // Tall enough for the whole board; the fit-the-board-on-a-laptop question is tracked separately (C4).
  test.use({ viewport: { width: 1280, height: 1100 } })

  test('fresh puzzle: Hint + Show solution + Skip, no Try again; explicit objective', async ({ page }) => {
    mkdirSync(SHOTS, { recursive: true })
    const saves = await blockSaves(page)
    await page.goto('/chess/puzzles/mateIn1', { waitUntil: 'networkidle' })
    await expect(page.getByText(/to move — checkmate in one move\./)).toBeVisible()
    await expect(page.getByRole('button', { name: /Hint/ })).toBeEnabled()
    await expect(page.getByRole('button', { name: /Show solution/ })).toBeEnabled()
    await expect(page.getByRole('button', { name: /Skip/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /Try again|Try yourself/ })).toHaveCount(0)
    await page.screenshot({ path: join(SHOTS, 'fresh.png') })
    expect(saves).toHaveLength(0)
  })

  test('hints escalate; the last one names the move; solving it shows Next primary + Try again secondary; saved once', async ({ page }) => {
    const saves = await blockSaves(page)
    await page.goto('/chess/puzzles/mateIn1', { waitUntil: 'networkidle' })
    const hint = page.getByRole('button', { name: /Hint/ })
    await hint.click()
    await expect(page.getByText(/Hint 1 of 3: .*checkmate in one move/i)).toBeVisible()
    await hint.click()
    await expect(page.getByText(/Hint 2 of 3: Look at your \w+ on [a-h][1-8]\./)).toBeVisible()
    await hint.click()
    const text = (await page.getByText(/Hint 3 of 3:/).textContent())!
    const m = /from ([a-h][1-8]) to ([a-h][1-8])/.exec(text)!
    await expect(hint).toBeDisabled()
    await playMove(page, m[1], m[2])

    await expect(page.getByText('Solved!')).toBeVisible({ timeout: 5000 })
    await expect(page.getByRole('button', { name: /Next puzzle/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /Try again/ })).toBeVisible()
    await expect(page.getByText('Why it works')).toBeVisible()
    await expect(page.getByText(/is checkmate\./)).toBeVisible()
    await page.screenshot({ path: join(SHOTS, 'solved.png') })
    await page.waitForTimeout(300)
    expect(saves).toHaveLength(1) // one result, however the buttons are used

    // Try again is practice: solving again must not write a second result.
    await page.getByRole('button', { name: /Try again/ }).click()
    await expect(page.getByRole('button', { name: /Try again/ })).toHaveCount(0)
    await page.getByRole('button', { name: /Hint/ }).click()
    await page.getByRole('button', { name: /Hint/ }).click()
    await page.getByRole('button', { name: /Hint/ }).click()
    const t2 = (await page.getByText(/Hint 3 of 3:/).textContent())!
    const m2 = /from ([a-h][1-8]) to ([a-h][1-8])/.exec(t2)!
    await playMove(page, m2[1], m2[2])
    await expect(page.getByText(/Solved again/)).toBeVisible({ timeout: 5000 })
    await page.waitForTimeout(300)
    expect(saves).toHaveLength(1)
  })

  test('keyboard path: type the move; an illegal entry is explained; no mouse needed', async ({ page }) => {
    const saves = await blockSaves(page)
    await page.goto('/chess/puzzles/mateIn1', { waitUntil: 'networkidle' })
    // Reveal the SAN through the hints (3 presses), then type it.
    for (let i = 0; i < 3; i++) await page.getByRole('button', { name: /Hint/ }).click()
    const san = /\(([^)]+)\)\./.exec((await page.getByText(/Hint 3 of 3:/).textContent())!)![1]
    await page.getByText('Type your move instead').click()
    const input = page.getByLabel(/Move in standard notation/)
    await input.fill('Zz9')
    await input.press('Enter')
    await expect(page.getByRole('alert').filter({ hasText: "isn't a legal move" })).toBeVisible()
    await input.fill(san)
    await input.press('Enter')
    await expect(page.getByText('Solved!')).toBeVisible({ timeout: 5000 })
    await page.waitForTimeout(300)
    expect(saves).toHaveLength(1)
  })

  test('wrong (legal) move: explained, board snaps back, no Try again, no result saved', async ({ page }) => {
    mkdirSync(SHOTS, { recursive: true })
    const saves = await blockSaves(page)
    await page.goto('/chess/puzzles/mateIn1', { waitUntil: 'networkidle' })
    for (let i = 0; i < 3; i++) await page.getByRole('button', { name: /Hint/ }).click()
    const hintText = (await page.getByText(/Hint 3 of 3:/).textContent())!
    const san = /\(([^)]+)\)\./.exec(hintText)![1]
    const fen = (await page.locator('[data-fen]').first().getAttribute('data-fen'))!
    // Any legal move that is not a checkmate.
    const wrong = new Chess(fen).moves().find((m) => !m.includes('#') && m !== san)!
    await page.getByText('Type your move instead').click()
    const input = page.getByLabel(/Move in standard notation/)
    await input.fill(wrong)
    await input.press('Enter')
    await expect(page.getByText('Not quite — try another move.')).toBeVisible()
    await expect(page.getByText(/does not give check|check, but it is not mate|can simply be captured/)).toBeVisible()
    await page.screenshot({ path: join(SHOTS, 'wrong-move.png') })
    await expect(page.getByRole('button', { name: /Try again|Try yourself/ })).toHaveCount(0)
    // snaps back by itself and is playable again
    await expect(page.locator('[data-fen]').first()).toHaveAttribute('data-attempt', 'idle', { timeout: 4000 })
    expect(await page.locator('[data-fen]').first().getAttribute('data-fen')).toBe(fen)
    expect(saves).toHaveLength(0)
  })

  test('Show solution: plays out, then Try yourself + Next puzzle; counted as viewed, once, even if clicked twice', async ({ page }) => {
    const saves = await blockSaves(page)
    await page.goto('/chess/puzzles/mateIn1', { waitUntil: 'networkidle' })
    const show = page.getByRole('button', { name: /Show solution/ })
    await show.click()
    await show.click({ force: true, timeout: 500 }).catch(() => undefined) // disabled during playback
    await expect(page.getByText('Watch the solution…')).toBeVisible()
    await expect(page.getByRole('button', { name: /Hint/ })).toBeDisabled()
    await expect(page.getByRole('button', { name: /Try yourself/ })).toBeVisible({ timeout: 8000 })
    await expect(page.getByRole('button', { name: /Next puzzle/ })).toBeVisible()
    await expect(page.getByText('Why it works')).toBeVisible()
    await page.screenshot({ path: join(SHOTS, 'solution-viewed.png') })
    expect(saves).toHaveLength(1)
    await expect(page.getByText('Solved!')).toHaveCount(0) // a viewed solution is not a solve
  })

  test('Skip records a skip once and moves on', async ({ page }) => {
    const saves = await blockSaves(page)
    await page.goto('/chess/puzzles/mateIn1', { waitUntil: 'networkidle' })
    await expect(page.getByText(/Puzzle 1 of/)).toBeVisible()
    await page.getByRole('button', { name: /Skip/ }).dblclick()
    await expect(page.getByText(/Puzzle 2 of/)).toBeVisible()
    expect(saves.length).toBe(1)
  })
})

test.describe('Multi-tag puzzles', () => {
  test.use({ viewport: { width: 1280, height: 1100 } })

  test('a mate puzzle listed under Hanging Pieces says why, and the topic header sits close above the board', async ({ page }) => {
    const saves = await blockSaves(page)
    await page.goto('/chess/puzzles/hangingPiece', { waitUntil: 'networkidle' })
    // Skip (saves are blocked) until a puzzle that also carries a mate tag comes up: 9 of the 24 do (audit-multitheme).
    let found = false
    for (let i = 0; i < 24 && !found; i++) {
      const note = page.getByText(/Tagged Hanging Pieces and Mate in \d/)
      if (await note.count()) {
        found = true
        await expect(page.getByText(/to move — checkmate in (one move|\d moves)\./)).toBeVisible()
        await expect(note).toContainText('The goal is the checkmate')
        mkdirSync(SHOTS, { recursive: true })
        await page.screenshot({ path: join(SHOTS, 'hanging-pieces-with-mate.png') })
      } else {
        await page.getByRole('button', { name: /Skip/ }).click()
        await page.waitForTimeout(600)
      }
    }
    expect(found).toBe(true)
    // Header-to-board gap: heading bottom to the board's top
    const gap = await page.evaluate(() => {
      const h = document.querySelector('h1')!.getBoundingClientRect()
      const b = document.querySelector('cg-board')!.getBoundingClientRect()
      return Math.round(b.top - h.bottom)
    })
    console.log('heading-to-board gap px', gap)
    expect(gap).toBeLessThan(120)
  })
})
