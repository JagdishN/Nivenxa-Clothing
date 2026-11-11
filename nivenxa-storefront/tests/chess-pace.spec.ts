import { test, expect, type Page } from '@playwright/test'
import { installScriptedEngine, type EngineOpts } from './helpers/scriptedEngine'

// Reply pace on the real Play page (TEST-ONLY flagged build, NEXT_PUBLIC_CHESS_AVATAR_PROTOTYPE=1).
//   BASE_URL=http://localhost:3100 npx playwright test tests/chess-pace.spec.ts --workers=1
// Engine computation time is scripted (gameDelay), so "engine faster / slower than the minimum" is exact. Times are measured IN THE
// PAGE (performance.now) from the moment the human's move is accepted to the moment the opponent's reply appears.

test.setTimeout(120000)
test.use({ viewport: { width: 1366, height: 768 } })

const OLD_PACE_KEY = 'nivenxa.chess.play.pace' // the retired setting: must now be ignored
const HOOK_KEY = 'nivenxa.chess.test.replyMinMs' // test-only override, needs a NEXT_PUBLIC_CHESS_TEST_HOOKS build

async function square(page: Page, sq: string) {
  const box = (await page.locator('cg-board').first().boundingBox())!
  const black = await page.locator('.cg-wrap').first().evaluate((el) => el.classList.contains('orientation-black'))
  const f = sq.charCodeAt(0) - 97
  const r = Number(sq[1]) - 1
  return { x: box.x + (((black ? 7 - f : f) + 0.5) * box.width) / 8, y: box.y + (((black ? r : 7 - r) + 0.5) * box.height) / 8 }
}
async function click(page: Page, sq: string) {
  const p = await square(page, sq)
  await page.mouse.click(p.x, p.y)
}
const INTRO_DONE = ['00000000-0000-4000-8000-000000000a01', '00000000-0000-4000-8000-000000000a02', '00000000-0000-4000-8000-000000000a03']
async function setup(page: Page, o: EngineOpts & { quick?: boolean; oldSaved?: string } = {}) {
  // Coach introduction already completed (it has its own spec), so these tests play the default opponent.
  await page.addInitScript((ids) => { try { localStorage.setItem('nivenxa.chess.coachIntro.v1', JSON.stringify(ids)) } catch {} }, INTRO_DONE)
  if (o.quick) await page.addInitScript(([k, v]) => { try { localStorage.setItem(k, v) } catch {} }, [HOOK_KEY, '500'])
  if (o.oldSaved) await page.addInitScript(([k, v]) => { try { localStorage.setItem(k, v) } catch {} }, [OLD_PACE_KEY, o.oldSaved])
  return installScriptedEngine(page, o)
}
async function start(page: Page, tier = 'Beginner', color = 'White') {
  await page.goto('/chess/play', { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: new RegExp(`^${tier}`) }).click()
  await page.getByRole('button', { name: color, exact: true }).click()
  await page.getByRole('button', { name: 'Start Game' }).click()
  await page.waitForSelector('cg-board')
  await expect(page.getByText('Loading engine…')).toHaveCount(0, { timeout: 40000 })
}
const you = (p: Page) => p.getByTestId('insight-you')
const reply = (p: Page) => p.getByTestId('insight-reply')
const status = (p: Page) => p.getByTestId('game-status')

/** Plays from→to and returns the ms until the opponent's reply (reply section for ply `replyPly`) appeared. */
async function playAndTime(page: Page, from: string, to: string, replyPly = 1): Promise<number> {
  await page.evaluate((ply) => {
    const w = window as unknown as { __t0: number; __t1: number | null }
    w.__t1 = null
    const check = () => {
      const el = document.querySelector('[data-testid=insight-reply]')
      if (el && w.__t1 == null && el.getAttribute('data-ply') === String(ply)) w.__t1 = performance.now()
    }
    new MutationObserver(check).observe(document.body, { subtree: true, childList: true, attributes: true })
  }, replyPly)
  await click(page, from)
  const b = await square(page, to)
  await page.evaluate(() => ((window as unknown as { __t0: number }).__t0 = performance.now()))
  await page.mouse.click(b.x, b.y)
  await page.waitForFunction(() => (window as unknown as { __t1: number | null }).__t1 != null, undefined, { timeout: 30000 })
  return page.evaluate(() => {
    const w = window as unknown as { __t0: number; __t1: number }
    return w.__t1 - w.__t0
  })
}

test('no pace selector or Quick/Comfortable/Relaxed labels anywhere: setup, in-game, Settings', async ({ page }) => {
  await setup(page)
  await page.goto('/chess/play', { waitUntil: 'networkidle' })
  for (const tier of ['Beginner', 'Intermediate', 'Expert', 'Master']) {
    await page.getByRole('button', { name: new RegExp(`^${tier}`) }).click()
    await expect(page.getByText('Reply pace')).toHaveCount(0)
    await expect(page.getByRole('button', { name: /^(Quick|Comfortable|Relaxed)$/ })).toHaveCount(0)
  }
  await page.getByRole('button', { name: /^Beginner/ }).click()
  await page.getByRole('button', { name: 'White', exact: true }).click()
  await page.getByRole('button', { name: 'Start Game' }).click()
  await page.waitForSelector('cg-board')
  await page.getByTestId('game-settings').click()
  await expect(page.getByText(/Reply pace|Quick|Comfortable|Relaxed/)).toHaveCount(0)
  await page.keyboard.press('Escape')
  const dt = await playAndTime(page, 'd2', 'd4')
  expect(dt).toBeGreaterThanOrEqual(3950)
  await expect(page.locator('body')).not.toContainText(/Quick|Comfortable|Relaxed/)
  expect(await status(page).innerText()).not.toMatch(/Quick|Comfortable|Relaxed/)
})

test('a previously saved pace is ignored: the selected level decides', async ({ page }) => {
  await setup(page, { oldSaved: 'quick' }) // would have made Beginner instant before
  await start(page, 'Beginner')
  const dt = await playAndTime(page, 'd2', 'd4')
  expect(dt).toBeGreaterThanOrEqual(3950)
  expect(dt).toBeLessThan(4800)
  await expect(page.getByTestId('assistance-label')).toHaveText('Guided play') // strength and assistance are untouched
})

test('Beginner (4 s minimum): a ready engine is held to 4 s from the accepted move; feedback is on screen meanwhile; the board is locked, Undo is not', async ({ page }) => {
  await setup(page, { gameDelay: 0 })
  await start(page)
  const board0 = (await page.locator('cg-board').first().boundingBox())!
  const dt = await playAndTime(page, 'd2', 'd4')
  expect(dt).toBeGreaterThanOrEqual(3950)
  expect(dt).toBeLessThan(4800)
  // (the same run, replayed to inspect the interval)
  await page.getByRole('button', { name: /^Undo/ }).click()
  await expect(page.getByTestId('insight-panel')).not.toContainText('1.d4')
  await click(page, 'd2')
  await click(page, 'd4')
  await expect(status(page)).toHaveText(/TIVVI is thinking…/)
  await expect(status(page)).toHaveAttribute('data-host', 'engine') // beside the relevant (TIVVI's) header
  await expect(you(page)).toHaveAttribute('data-grade', /./, { timeout: 3000 }) // verified grade shown while TIVVI is still "thinking"
  await expect(reply(page)).toHaveAttribute('data-state', 'empty') // nothing for TIVVI yet
  // no extra human move while the reply is pending
  await click(page, 'a2')
  await click(page, 'a3')
  await expect(you(page)).toHaveAttribute('data-move', 'd4')
  await expect(page.getByRole('button', { name: /^Undo/ })).toBeEnabled()
  expect(await page.locator('cg-board').first().boundingBox()).toEqual(board0)
  await expect(reply(page)).toHaveAttribute('data-move', 'e6', { timeout: 10000 })
  await expect(you(page)).toHaveAttribute('data-move', 'd4') // your feedback was not erased by the reply
  await expect(status(page)).toHaveText(/Your move/)
})

test('engine slower than the minimum: the reply is played when ready, with no extra delay on top', async ({ page }) => {
  await setup(page, { gameDelay: 6000 })
  await start(page)
  const dt = await playAndTime(page, 'd2', 'd4')
  expect(dt).toBeGreaterThanOrEqual(5900)
  expect(dt).toBeLessThan(7000) // 6 s of computation + small overhead, NOT 6 + 4
})

test('engine time counts toward the minimum: a 1.5 s search is still replied to at 4 s, not 5.5 s', async ({ page }) => {
  await setup(page, { gameDelay: 1500 })
  await start(page)
  const dt = await playAndTime(page, 'd2', 'd4')
  expect(dt).toBeGreaterThanOrEqual(3950)
  expect(dt).toBeLessThan(4800)
})

// Intermediate/Expert/Master games have no live Insight panel in Rapid, so the reply is timed from the status chip: "thinking" -> "Your move".
async function timeViaStatus(page: Page): Promise<number> {
  await page.evaluate(() => {
    const w = window as unknown as { __t1: number | null; __thought: boolean }
    w.__t1 = null
    w.__thought = false
    new MutationObserver(() => {
      const t = document.querySelector('[data-testid=game-status]')?.textContent ?? ''
      if (/thinking/.test(t)) w.__thought = true
      else if (w.__thought && /Your move/.test(t) && w.__t1 == null) w.__t1 = performance.now()
    }).observe(document.body, { subtree: true, childList: true, characterData: true })
  })
  await click(page, 'd2')
  const b = await square(page, 'd4')
  await page.evaluate(() => ((window as unknown as { __t0: number }).__t0 = performance.now()))
  await page.mouse.click(b.x, b.y)
  await page.waitForFunction(() => (window as unknown as { __t1: number | null }).__t1 != null, undefined, { timeout: 30000 })
  return page.evaluate(() => { const w = window as unknown as { __t0: number; __t1: number }; return w.__t1 - w.__t0 })
}

for (const [tier, lo, hi] of [['Intermediate', 1950, 2700], ['Expert', 450, 1400], ['Master', 450, 1400]] as const) {
  test(`${tier} (instant engine): reply no sooner than its minimum, then straight away`, async ({ page }) => {
    await setup(page)
    await start(page, tier)
    const dt = await timeViaStatus(page)
    expect(dt).toBeGreaterThanOrEqual(lo)
    expect(dt).toBeLessThan(hi)
  })
}

test('Undo during a pending reply cancels it: no stale reply is ever applied, and play continues from the right position', async ({ page }) => {
  await setup(page, { explainDelay: {} })
  await start(page)
  await page.evaluate(() => {
    const w = window as unknown as { __replies: string[] }
    w.__replies = []
    new MutationObserver(() => {
      const el = document.querySelector('[data-testid=insight-reply]')
      const mv = el?.getAttribute('data-move')
      if (mv && w.__replies.at(-1) !== mv) w.__replies.push(mv)
    }).observe(document.body, { subtree: true, childList: true, attributes: true })
  })
  await click(page, 'd2')
  await click(page, 'd4')
  await page.waitForTimeout(1200)
  await page.getByRole('button', { name: /^Undo/ }).click() // mid-interval
  await expect(page.getByTestId('insight-panel')).not.toContainText('1.d4')
  await expect(status(page)).toHaveText(/Your move/)
  await page.waitForTimeout(5000) // the cancelled reply's time has long passed
  expect(await page.evaluate(() => (window as unknown as { __replies: string[] }).__replies)).toEqual([]) // nothing was applied
  await click(page, 'e2') // a different first move now; its own reply (f6) arrives once, after the pace
  await click(page, 'e4')
  await expect(reply(page)).toHaveAttribute('data-move', 'f6', { timeout: 10000 })
  await page.waitForTimeout(1500)
  expect(await page.evaluate(() => (window as unknown as { __replies: string[] }).__replies)).toEqual(['f6']) // exactly once
})

test('Resign during a pending reply: the reply is never applied and the game stays over', async ({ page }) => {
  await setup(page)
  await start(page)
  await click(page, 'd2')
  await click(page, 'd4')
  await page.waitForTimeout(800)
  await page.getByRole('button', { name: /^Resign/ }).click()
  await page.getByRole('button', { name: 'Resign Game' }).click()
  await page.waitForTimeout(5500)
  await page.getByRole('button', { name: 'Dismiss' }).click()
  await page.getByTestId('review-with-explanations').click()
  const items = page.getByRole('heading', { name: 'Game Review' }).locator('xpath=..').locator('ol > li')
  await expect(items).toHaveCount(1) // only your d4 was ever played
})

test('New game during a pending reply: nothing from the old game lands in the new one; exactly one reply per move', async ({ page }) => {
  await setup(page)
  await start(page)
  await click(page, 'd2')
  await click(page, 'd4')
  await page.waitForTimeout(800)
  await page.getByRole('button', { name: 'More options' }).click()
  await page.getByRole('menuitem', { name: 'New Game' }).click()
  await page.getByRole('button', { name: 'Start New Game' }).click()
  await page.getByRole('button', { name: 'Start Game' }).click()
  await page.waitForSelector('cg-board')
  await expect(page.getByText('Loading engine…')).toHaveCount(0, { timeout: 40000 })
  await page.waitForTimeout(5500)
  await expect(page.getByTestId('insight-panel')).not.toContainText('1.')
  await expect(reply(page)).toHaveCount(0)
  await expect(status(page)).toHaveText(/Your move/)
})

test('leaving the page during a pending reply raises no errors, and coming back shows a clean setup screen', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(String(e)))
  await setup(page)
  await start(page)
  await click(page, 'd2')
  await click(page, 'd4')
  await page.waitForTimeout(700)
  await page.goto('/chess', { waitUntil: 'networkidle' })
  await page.waitForTimeout(4500)
  await page.goto('/chess/play', { waitUntil: 'networkidle' })
  await expect(page.getByRole('button', { name: 'Start Game' })).toBeVisible()
  expect(errors).toEqual([])
})

test('a stale timer cannot move: undo and a different move during the hold give exactly one reply, to the NEW position', async ({ page }) => {
  await setup(page)
  await start(page)
  await page.evaluate(() => {
    const w = window as unknown as { __replies: string[] }
    w.__replies = []
    new MutationObserver(() => {
      const mv = document.querySelector('[data-testid=insight-reply]')?.getAttribute('data-move')
      if (mv && w.__replies.at(-1) !== mv) w.__replies.push(mv)
    }).observe(document.body, { subtree: true, childList: true, attributes: true })
  })
  await click(page, 'd2')
  await click(page, 'd4')
  await page.waitForTimeout(1500)
  await page.getByRole('button', { name: /^Undo/ }).click()
  await click(page, 'e2')
  await click(page, 'e4')
  await expect(reply(page)).toHaveAttribute('data-move', 'f6', { timeout: 10000 })
  await page.waitForTimeout(4500) // the abandoned d4 reply's moment passes
  expect(await page.evaluate(() => (window as unknown as { __replies: string[] }).__replies)).toEqual(['f6'])
})

test('rapid play and both colours: every reply is applied once to its own position', async ({ page }) => {
  await setup(page, { quick: true })
  await start(page, 'Beginner', 'Black')
  await expect(reply(page)).toHaveAttribute('data-move', 'e4', { timeout: 10000 }) // TIVVI (White) opens
  await click(page, 'e7')
  await click(page, 'e5')
  await expect(reply(page)).toHaveAttribute('data-move', 'Nf3', { timeout: 10000 })
  await expect(you(page)).toHaveAttribute('data-move', 'e5')
})

test("TIVVI's completed move stays highlighted until you move, then your move is highlighted", async ({ page }) => {
  await setup(page, { quick: true })
  await start(page)
  await click(page, 'd2')
  await click(page, 'd4')
  await expect(reply(page)).toHaveAttribute('data-move', 'e6', { timeout: 10000 })
  await page.waitForTimeout(1200)
  const centres = async () => {
    const sqs = page.locator('cg-board square.last-move')
    const n = await sqs.count()
    const out: { x: number; y: number }[] = []
    for (let i = 0; i < n; i++) {
      const b = (await sqs.nth(i).boundingBox())!
      out.push({ x: b.x + b.width / 2, y: b.y + b.height / 2 })
    }
    return out
  }
  const near = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.abs(a.x - b.x) < 6 && Math.abs(a.y - b.y) < 6
  let c = await centres()
  expect(c.length).toBe(2)
  const e7 = await square(page, 'e7')
  const e6 = await square(page, 'e6')
  expect(c.some((p) => near(p, e7)) && c.some((p) => near(p, e6))).toBe(true) // TIVVI's e7-e6
  await click(page, 'a2')
  await click(page, 'a3')
  c = await centres()
  const a2 = await square(page, 'a2')
  const a3 = await square(page, 'a3')
  expect(c.some((p) => near(p, a2)) && c.some((p) => near(p, a3))).toBe(true) // now yours
})

test('single result presentation; counts come from engine grades; incomplete summaries are provisional', async ({ page }) => {
  await setup(page, { analysisHang: true, quick: true }) // grading never completes
  await start(page)
  await click(page, 'd2')
  await click(page, 'd4')
  await expect(reply(page)).toHaveAttribute('data-move', 'e6', { timeout: 10000 })
  await page.getByRole('button', { name: /^Resign/ }).click()
  await page.getByRole('button', { name: 'Resign Game' }).click()
  await expect(page.getByTestId('review-with-explanations')).toHaveCount(1) // the modal OR the panel, never both
  await expect(page.getByTestId('result-provisional')).toContainText('Analysis in progress — 0 of 1 moves reviewed.')
  // the analysis gives up after its time limit: the summary is then labelled partial instead of waiting forever
  await expect(page.getByTestId('result-provisional')).toContainText('Partial summary — based on 0 of 1 moves.', { timeout: 20000 })
  await expect(page.getByTestId('result-owner')).toContainText('your moves only')
  await expect(page.getByText('Open full analysis →')).toHaveCount(1)
  await page.getByRole('button', { name: 'Dismiss' }).click()
  await expect(page.getByTestId('review-with-explanations')).toHaveCount(1) // now only the panel
  await expect(page.getByText('Review with explanations')).toBeVisible()
  await expect(page.getByText('Open full analysis →')).toBeVisible() // the two actions stay distinct
})

test('hidden-tab resume: a REAL frozen page (CDP lifecycle freeze, timers stopped) resumes with exactly one reply, applied to the right position', async ({ page }) => {
  await setup(page, { gameDelay: 0 })
  await start(page)
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Page.enable')
  await click(page, 'd2')
  await click(page, 'd4')
  await expect(status(page)).toHaveText(/TIVVI is thinking…/)
  await page.waitForTimeout(800)
  await cdp.send('Page.setWebLifecycleState', { state: 'frozen' }) // like a background tab being discarded to a frozen state: no timers run
  await new Promise((r) => setTimeout(r, 6000)) // longer than the 4 s minimum, in REAL time
  await cdp.send('Page.setWebLifecycleState', { state: 'active' })
  await expect(reply(page)).toHaveAttribute('data-move', 'e6', { timeout: 10000 })
  await expect(status(page)).toHaveText('Your move')
  await page.waitForTimeout(1500)
  // exactly one reply was applied: the game has two moves, and the board is at the position after 1.d4 e6
  expect(await page.evaluate(() => document.querySelectorAll('[data-testid=insight-reply]').length)).toBe(1)
  await expect(page.getByTestId('insight-history-toggle')).toHaveCount(0) // no earlier plies exist beyond these two
  await click(page, 'a2')
  await click(page, 'a3') // the next move is accepted normally (it is the player's turn)
  await expect(you(page)).toHaveAttribute('data-move', 'a3', { timeout: 10000 })
  await expect(reply(page)).toHaveAttribute('data-move', 'Bb4+', { timeout: 10000 })
})

test('the test-only pace override is a no-op unless the build allows it (this build does; see the normal-build smoke script for the opposite)', async ({ page }) => {
  await setup(page, { quick: true })
  await start(page)
  const dt = await playAndTime(page, 'd2', 'd4')
  expect(dt).toBeLessThan(1400) // the hook shortened Beginner's 4 s in this TEST build
})
