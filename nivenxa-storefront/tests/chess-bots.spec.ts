import { test, expect, type Page, type BrowserContext } from '@playwright/test'
import { installScriptedEngine, keyAfter, REPLIES } from './helpers/scriptedEngine'

// Opponent selection and the Beginner coach introduction on the real Play page (TEST-ONLY flagged build).
//   BASE_URL=http://localhost:3100 npx playwright test tests/chess-bots.spec.ts --workers=1
// The engine is scripted (exact replies). "Signed in" is a SIMULATED session with a mocked progress API: no real account is used.
// The account-side storage rules are the server route + migration; they are not exercised against a real database here.

test.setTimeout(120000)
test.use({ viewport: { width: 1366, height: 768 } })

// Fool's mate: 1.f3 e5 2.g4 Qh4# - the scripted opponent checkmates the player, which finishes the game genuinely.
REPLIES[keyAfter(['f3'])] = 'e7e5'
REPLIES[keyAfter(['f3', 'e5', 'g4'])] = 'd8h4'

const KEY = 'nivenxa.chess.coachIntro.v1'
const BOT_KEY = 'nivenxa.chess.play.bot'
const ids = (n: number, from = 1) => Array.from({ length: n }, (_, i) => `00000000-0000-4000-8000-0000000000${String(from + i).padStart(2, '0')}`)

async function sq(page: Page, s: string) {
  const b = (await page.locator('cg-board').first().boundingBox())!
  const black = await page.locator('.cg-wrap').first().evaluate((el) => el.classList.contains('orientation-black'))
  const f = s.charCodeAt(0) - 97
  const r = Number(s[1]) - 1
  return { x: b.x + (((black ? 7 - f : f) + 0.5) * b.width) / 8, y: b.y + (((black ? r : 7 - r) + 0.5) * b.height) / 8 }
}
const click = async (page: Page, s: string) => { const p = await sq(page, s); await page.mouse.click(p.x, p.y) }
const move = async (page: Page, a: string, b: string) => { await click(page, a); await click(page, b) }

async function open(page: Page, o: { progress?: string[]; bot?: string; api?: Progress } = {}) {
  await page.addInitScript(([k, v, bk, bv]) => { try { if (v) localStorage.setItem(k as string, v as string); if (bv) localStorage.setItem(bk as string, bv as string) } catch {} }, [KEY, o.progress ? JSON.stringify(o.progress) : '', BOT_KEY, o.bot ?? ''])
  await installScriptedEngine(page, {})
  if (o.api) await mockProgress(page, o.api) // registered after the engine stub so it is matched first
  await page.goto('/chess/play', { waitUntil: 'networkidle' })
}
async function start(page: Page, tier = 'Beginner', color = 'White') {
  await page.getByRole('button', { name: new RegExp(`^${tier}`) }).click()
  await page.getByRole('button', { name: color, exact: true }).click()
  await page.getByRole('button', { name: 'Start Game' }).click()
  await page.waitForSelector('cg-board')
  await expect(page.getByText('Loading engine…')).toHaveCount(0, { timeout: 40000 })
}
const bot = (p: Page, id: string) => p.getByTestId(`bot-${id}`)
const stored = (p: Page) => p.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? '[]') as string[], KEY)

test('a new Beginner sees the coach introduction: only Lumio is playable, the others are previews with a clear message', async ({ page }) => {
  await open(page)
  await expect(page.getByTestId('coach-intro-banner')).toContainText('Coach introduction · Game 1 of 3')
  await expect(page.getByTestId('coach-intro-banner')).toContainText('3 coach games with Lumio')
  await expect(bot(page, 'lumio')).toHaveAttribute('aria-checked', 'true')
  await expect(bot(page, 'lumio')).toContainText('Selected')
  for (const id of ['tivvi', 'piplo', 'zorvi', 'veluno', 'mivro', 'orvyn', 'kelvo']) {
    await expect(bot(page, id)).toHaveAttribute('data-available', 'false')
    await expect(bot(page, id)).toContainText('After your coach games')
    await bot(page, id).click({ force: true })
    await expect(bot(page, 'lumio')).toHaveAttribute('aria-checked', 'true') // a preview cannot be selected
  }
  // artwork, name and a short description on every card
  for (const id of ['lumio', 'tivvi', 'piplo', 'zorvi', 'veluno', 'mivro', 'orvyn', 'kelvo']) await expect(page.getByTestId(`bot-art-${id}`)).toBeVisible()
  await expect(bot(page, 'lumio')).toContainText('Guided opponent')
  await expect(page.getByText('Every opponent plays at the strength of your level.')).toBeVisible()
  // guests are told progress lives in this browser
  await expect(page.getByTestId('coach-intro-device-note')).toContainText('saved in this browser only')
})

test('the restriction is Beginner only: Intermediate, Expert and Master can pick any character at once', async ({ page }) => {
  await open(page)
  for (const tier of ['Intermediate', 'Expert', 'Master']) {
    await page.getByRole('button', { name: new RegExp(`^${tier}`) }).click()
    await expect(page.getByTestId('coach-intro-banner')).toHaveCount(0)
    for (const id of ['lumio', 'tivvi', 'piplo', 'zorvi', 'veluno', 'mivro', 'orvyn', 'kelvo']) await expect(bot(page, id)).toHaveAttribute('data-available', 'true')
  }
  await bot(page, 'kelvo').click()
  await expect(bot(page, 'kelvo')).toHaveAttribute('aria-checked', 'true')
  await page.getByRole('button', { name: /^Beginner/ }).click() // back to the restricted level: the coach again
  await expect(bot(page, 'lumio')).toHaveAttribute('aria-checked', 'true')
})

test('the introduction game uses the coach everywhere: heading, thinking message, label; still artwork (no Tivvi face)', async ({ page }) => {
  await open(page)
  await start(page)
  await expect(page.getByTestId('coach-intro-label')).toHaveText('Coach introduction · Game 1 of 3')
  await expect(page.getByTestId('opponent-name')).toContainText('Lumio')
  await expect(page.getByTestId('opponent-sub')).toHaveText('Guided opponent')
  await expect(page.getByTestId('opponent-header').locator('svg')).toHaveCount(0) // Tivvi's layered face is not used for another character
  await expect(page.getByTestId('bot-art-lumio')).toBeVisible()
  await move(page, 'd2', 'd4')
  await expect(page.getByTestId('game-status')).toHaveText('Lumio is thinking…')
  await expect(page.getByTestId('insight-reply')).toContainText('Lumio', { timeout: 15000 })
  // there is no character picker in a running game: the opponent cannot change midway
  await expect(page.getByTestId('bot-picker')).toHaveCount(0)
})

test('a genuinely finished game counts once; resigning at once, restarting and abandoning do not count', async ({ page }) => {
  await open(page)
  // 1) resign after a single move (Resign is not even available before the first move): no credit
  await start(page)
  await expect(page.getByRole('button', { name: /^Resign/ })).toBeDisabled()
  await move(page, 'd2', 'd4')
  await expect(page.getByTestId('insight-reply')).toHaveAttribute('data-move', 'e6', { timeout: 15000 })
  await page.getByRole('button', { name: /^Resign/ }).click()
  await page.getByRole('button', { name: 'Resign Game' }).click()
  await expect(page.getByTestId('review-with-explanations')).toHaveCount(1)
  expect(await stored(page)).toEqual([])
  await expect(page.getByTestId('intro-progress')).toContainText('This game did not count')
  await expect(page.getByTestId('intro-progress')).toHaveAttribute('data-counted', 'false')
  // 2) abandon (New Game mid-game) and start again: no credit
  await page.getByRole('button', { name: 'New Game' }).last().click()
  await start(page)
  await move(page, 'e2', 'e4')
  await page.getByRole('button', { name: 'More options' }).click().catch(() => undefined)
  await page.getByRole('menuitem', { name: 'New Game' }).click()
  await page.getByRole('button', { name: 'Start New Game' }).click()
  expect(await stored(page)).toEqual([])
  await expect(page.getByTestId('coach-intro-notice')).toContainText('was not finished, so it did not count')
  await expect(page.getByTestId('coach-intro-rules')).toContainText('resign after 10 of your own moves')
  // 3) a real game that ends in checkmate (the player loses): it counts, exactly once
  await page.goto('/chess/play', { waitUntil: 'networkidle' })
  await start(page)
  await move(page, 'f2', 'f3')
  await expect(page.getByTestId('insight-reply')).toHaveAttribute('data-move', 'e5', { timeout: 15000 })
  await move(page, 'g2', 'g4')
  await expect(page.getByText('Checkmate').first()).toBeVisible({ timeout: 15000 })
  await expect.poll(async () => (await stored(page)).length).toBe(1)
  await expect(page.getByTestId('intro-progress')).toHaveText('Coach introduction: game 1 of 3 complete.')
  await expect(page.getByTestId('intro-progress')).toHaveAttribute('data-counted', 'true')
  await page.waitForTimeout(1500)
  expect((await stored(page)).length).toBe(1) // not counted again by re-renders
  await page.reload({ waitUntil: 'networkidle' })
  await expect(page.getByTestId('coach-intro-banner')).toContainText('Game 2 of 3')
  expect((await stored(page)).length).toBe(1) // and a reload does not add one
})

test('after three completed games every character can be chosen (Lumio too); the choice is kept and applies to the NEXT game', async ({ page }) => {
  await open(page, { progress: ids(3) })
  await expect(page.getByTestId('coach-intro-banner')).toHaveCount(0)
  for (const id of ['lumio', 'tivvi', 'piplo', 'zorvi', 'veluno', 'mivro', 'orvyn', 'kelvo']) await expect(bot(page, id)).toHaveAttribute('data-available', 'true')
  await expect(bot(page, 'tivvi')).toHaveAttribute('aria-checked', 'true') // the established default
  await bot(page, 'zorvi').click()
  await expect(bot(page, 'zorvi')).toHaveAttribute('aria-checked', 'true')
  await expect(bot(page, 'zorvi')).toContainText('Selected')
  await expect(bot(page, 'tivvi')).not.toContainText('Selected')
  await page.reload({ waitUntil: 'networkidle' })
  await expect(bot(page, 'zorvi')).toHaveAttribute('aria-checked', 'true') // remembered
  await start(page)
  await expect(page.getByTestId('opponent-name')).toContainText('Zorvi')
  await expect(page.getByTestId('coach-intro-label')).toHaveCount(0) // no introduction label once it is done
  await expect(page.getByTestId('opponent-header').locator('svg')).toHaveCount(0)
  // changing the choice later only affects the NEXT game: the running game has no picker; setup (after leaving it) does
  await expect(page.getByTestId('bot-picker')).toHaveCount(0)
  await page.getByRole('button', { name: 'More options' }).click()
  await page.getByRole('menuitem', { name: 'New Game' }).click()
  await page.getByRole('button', { name: 'Start New Game' }).click()
  await bot(page, 'piplo').click()
  await expect(bot(page, 'piplo')).toHaveAttribute('aria-checked', 'true')
  await start(page)
  await expect(page.getByTestId('opponent-name')).toContainText('Piplo')
})

test('character, strength, assistance and pace stay separate: Beginner timing does not depend on the character', async ({ page }) => {
  await open(page, { progress: ids(3), bot: 'kelvo' })
  await start(page)
  await expect(page.getByTestId('opponent-name')).toContainText('Kelvo')
  await expect(page.getByTestId('assistance-label')).toHaveText('Guided play')
  await expect(page.getByTestId('game-meta')).toContainText('Beginner')
  await page.evaluate(() => {
    const w = window as unknown as { __t1: number | null }
    w.__t1 = null
    new MutationObserver(() => { if (w.__t1 == null && document.querySelector('[data-testid=insight-reply]')?.getAttribute('data-ply') === '1') w.__t1 = performance.now() }).observe(document.body, { subtree: true, childList: true, attributes: true })
  })
  const a = await sq(page, 'd2'); await page.mouse.click(a.x, a.y)
  const b = await sq(page, 'd4')
  await page.evaluate(() => ((window as unknown as { __t0: number }).__t0 = performance.now()))
  await page.mouse.click(b.x, b.y)
  await page.waitForFunction(() => (window as unknown as { __t1: number | null }).__t1 != null, undefined, { timeout: 30000 })
  const dt = await page.evaluate(() => { const w = window as unknown as { __t0: number; __t1: number }; return w.__t1 - w.__t0 })
  expect(dt).toBeGreaterThanOrEqual(3950) // the Beginner minimum, whichever character is chosen
  expect(dt).toBeLessThan(4900)
  await expect(page.getByTestId('game-status')).toHaveText('Your move')
})

// ─── Accounts (SIMULATED session, mocked progress API) ────────────────────────────────────
const COOKIE = 'sb-chess-auth'
const b64url = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url')
async function signIn(ctx: BrowserContext) {
  const exp = Math.floor(Date.now() / 1000) + 3600
  const id = '00000000-0000-4000-8000-0000000000aa'
  const user = { id, aud: 'authenticated', role: 'authenticated', email: 'simulated@example.test', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' }
  const s = { access_token: `${b64url({ alg: 'none' })}.${b64url({ sub: id, exp, role: 'authenticated' })}.sig`, refresh_token: 'simulated', expires_in: 3600, expires_at: exp, token_type: 'bearer', user }
  await ctx.addCookies([{ name: COOKIE, value: `base64-${b64url(s)}`, domain: 'localhost', path: '/' }])
}
interface Progress { ids: string[]; posts: string[][]; down?: boolean }
async function mockProgress(page: Page, p: Progress) {
  await page.route('**/api/chess/coach-intro', async (route) => {
    const r = route.request()
    if (p.down) return route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"x"}' })
    if (r.method() === 'POST') {
      const sent = (JSON.parse(r.postData() ?? '{}').ids ?? []) as string[]
      p.posts.push(sent)
      for (const id of sent) if (!p.ids.includes(id)) p.ids.push(id) // unique per account: duplicates are ignored, nothing is ever removed
    }
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ ids: p.ids }) })
  })
  await page.route('**/supabase.co/auth/v1/**', (route) => route.fulfill({ status: 204, body: '' }))
}

test('sign-in merges guest progress with the account: no duplicates, never lowers the account, guest copy cleared', async ({ page, context }) => {
  await signIn(context)
  const server: Progress = { ids: ids(2, 10), posts: [] } // the account already has 2 games (10, 11)
  // the browser holds guest progress: game 11 (the account already has it) and a new game 30
  await open(page, { progress: [ids(1, 11)[0], ids(1, 30)[0]], api: server })
  await expect.poll(() => server.posts.length).toBe(1)
  expect(server.posts[0].sort()).toEqual([ids(1, 11)[0], ids(1, 30)[0]].sort())
  expect(server.ids.sort()).toEqual([ids(1, 10)[0], ids(1, 11)[0], ids(1, 30)[0]].sort()) // 3 distinct games: 11 was not counted twice
  await expect(page.getByTestId('coach-intro-banner')).toHaveCount(0) // 3 completed: unlocked
  expect(await stored(page)).toEqual([]) // merged into the account, no longer kept as browser progress
  // merging nothing, or less, can never lower the account
  const before = server.ids.length
  await page.reload({ waitUntil: 'networkidle' })
  expect(server.ids.length).toBe(before)
})

test('account progress alone unlocks the characters on any device; a failed account read keeps browser progress and says so', async ({ page, context }) => {
  await signIn(context)
  const server: Progress = { ids: ids(3, 20), posts: [] }
  await open(page, { api: server })
  await expect(page.getByTestId('coach-intro-banner')).toHaveCount(0)
  await expect(bot(page, 'veluno')).toHaveAttribute('data-available', 'true')
  server.down = true
  const p2 = await context.newPage()
  await open(p2, { progress: ids(1, 40), api: server })
  await expect(p2.getByTestId('coach-intro-banner')).toContainText('Game 2 of 3')
  await expect(p2.getByTestId('coach-intro-device-note')).toContainText('could not be saved to your account')
})

test('descriptions say who a character is, never an implemented playing style; Lumio is the guided opponent', async ({ page }) => {
  await open(page, { progress: ids(3) })
  const text = await page.getByTestId('bot-picker').innerText()
  for (const claim of [/attack/i, /defen[cs]/i, /tactic/i, /endgame/i, /strateg/i, /specialis/i, /aggressive/i, /learning partner/i]) expect(text, String(claim)).not.toMatch(claim)
  await expect(bot(page, 'lumio')).toContainText('Play a guided game with Lumio.')
  await expect(bot(page, 'lumio')).toContainText('Guided opponent')
  await bot(page, 'lumio').click() // still selectable after the introduction
  await expect(bot(page, 'lumio')).toHaveAttribute('aria-checked', 'true')
  for (const id of ['tivvi', 'piplo', 'zorvi', 'veluno', 'mivro', 'orvyn', 'kelvo']) await expect(bot(page, id)).toHaveAttribute('data-available', 'true')
  await expect(page.getByTestId('coach-intro-banner')).toHaveCount(0)
})

for (const [w, h] of [[1366, 768], [1440, 900], [1280, 720]] as const) {
  test(`setup ${w}x${h}: Start Game is reachable without scrolling and the grid stays readable (new Beginner)`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h })
    await open(page)
    const start = (await page.getByRole('button', { name: 'Start Game' }).boundingBox())!
    expect(start.y + start.height, 'Start Game inside the window').toBeLessThanOrEqual(h)
    const grid = (await page.getByTestId('bot-picker').boundingBox())!
    expect(grid.height, 'picker is compact').toBeLessThan(340)
    for (const id of ['lumio', 'zorvi']) {
      const b = (await bot(page, id).boundingBox())!
      expect(b.width).toBeGreaterThan(100)
      expect(b.height).toBeGreaterThan(60)
    }
    await expect(page.getByTestId('coach-intro-banner')).toContainText('Coach introduction · Game 1 of 3')
    await expect(page.getByTestId('coach-intro-banner')).toContainText('Beginner starts with 3 coach games with Lumio. After that, every opponent is available.')
    // keyboard: a card can be reached and chosen with the keyboard
    await bot(page, 'lumio').focus()
    await page.keyboard.press('Enter')
    await expect(bot(page, 'lumio')).toHaveAttribute('aria-checked', 'true')
  })
}

test('mobile 390x844: two-column picker, Start Game reachable, no sideways overflow', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
  const page = await ctx.newPage()
  await open(page)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  const start = (await page.getByRole('button', { name: 'Start Game' }).boundingBox())!
  expect(start.y + start.height).toBeLessThanOrEqual(844)
  const a = (await bot(page, 'lumio').boundingBox())!
  const b = (await bot(page, 'tivvi').boundingBox())!
  expect(Math.abs(a.y - b.y)).toBeLessThan(2) // same row: two columns
  await ctx.close()
})

test('draw completion (threefold repetition): the result is presented once as a Draw, and the game counts for the coach introduction', async ({ page }) => {
  // 1.Nf3 Nf6 2.Ng1 Ng8 3.Nf3 Nf6 4.Ng1 Ng8: the start position occurs a third time on the engine's last move.
  REPLIES[keyAfter(['Nf3'])] = 'g8f6'
  REPLIES[keyAfter(['Nf3', 'Nf6', 'Ng1'])] = 'f6g8'
  REPLIES[keyAfter(['Nf3', 'Nf6', 'Ng1', 'Ng8', 'Nf3'])] = 'g8f6'
  REPLIES[keyAfter(['Nf3', 'Nf6', 'Ng1', 'Ng8', 'Nf3', 'Nf6', 'Ng1'])] = 'f6g8'
  await open(page)
  await start(page)
  const plan = [['g1', 'f3', 'f6'], ['f3', 'g1', 'g8'], ['g1', 'f3', 'f6'], ['f3', 'g1', 'g8']] as const
  for (const [i, [a, b]] of plan.entries()) {
    await move(page, a, b)
    if (i === plan.length - 1) break // the engine's reply ends the game; waited for below
    await expect(page.getByTestId('game-status')).toHaveText(/thinking/)
    await expect(page.getByTestId('game-status')).not.toHaveText(/thinking/, { timeout: 15000 })
  }
  await expect(page.getByText('Draw').first()).toBeVisible({ timeout: 15000 })
  await expect(page.getByText(/threefold repetition/i).first()).toBeVisible()
  await expect(page.getByTestId('review-with-explanations')).toHaveCount(1) // one presentation: modal OR panel
  await expect(page.getByText('Rematch').first()).toBeVisible()
  await expect.poll(async () => (await stored(page)).length).toBe(1) // a finished draw counts once
  await page.getByRole('button', { name: 'Dismiss' }).click()
  await expect(page.getByTestId('review-with-explanations')).toHaveCount(1) // now only the side panel
  await expect(page.getByTestId('result-owner')).toContainText('your moves only')
})

test('the third eligible game announces completion; every opponent (Lumio too) is then available; no duplicate result counts it twice', async ({ page }) => {
  await open(page, { progress: ids(2) })
  await expect(page.getByTestId('coach-intro-banner')).toContainText('Game 3 of 3')
  await start(page)
  await move(page, 'f2', 'f3')
  await expect(page.getByTestId('insight-reply')).toHaveAttribute('data-move', 'e5', { timeout: 15000 })
  await move(page, 'g2', 'g4')
  await expect(page.getByTestId('intro-progress')).toHaveText('Your coach introduction is complete. You can now choose any opponent.', { timeout: 15000 })
  await page.waitForTimeout(1500)
  expect((await stored(page)).length).toBe(3) // 2 + this one, exactly once
  // Dismiss + re-open the result and re-render: nothing counts again
  await page.getByRole('button', { name: 'Dismiss' }).click()
  await page.getByRole('button', { name: 'New Game' }).last().click()
  await expect(page.getByTestId('coach-intro-banner')).toHaveCount(0)
  for (const id of ['lumio', 'tivvi', 'piplo', 'zorvi', 'veluno', 'mivro', 'orvyn', 'kelvo']) await expect(bot(page, id)).toHaveAttribute('data-available', 'true')
  await bot(page, 'lumio').click()
  await expect(bot(page, 'lumio')).toHaveAttribute('aria-checked', 'true')
  expect((await stored(page)).length).toBe(3)
})

test('keyboard and accessible names: the opponent group is a labelled radio group with arrow-key choice', async ({ page }) => {
  await open(page, { progress: ids(3) })
  const group = page.getByRole('radiogroup', { name: 'Opponent' })
  await expect(group).toBeVisible()
  await expect(page.getByRole('radio')).toHaveCount(8)
  await expect(page.getByRole('radio', { name: /^Lumio\. Guided opponent\. Play a guided game with Lumio\./ })).toBeVisible()
  await page.getByRole('radio', { name: /^TIVVI/ }).focus()
  await page.keyboard.press('ArrowRight')
  await expect(page.getByRole('radio', { name: /^Piplo/ })).toBeChecked()
  await expect(page.getByRole('radio', { name: /^Piplo/ })).toBeFocused()
  await page.keyboard.press('ArrowLeft')
  await page.keyboard.press('ArrowLeft')
  await expect(page.getByRole('radio', { name: /^Lumio/ })).toBeChecked()
  await page.keyboard.press('ArrowLeft') // wraps
  await expect(page.getByRole('radio', { name: /^Kelvo/ })).toBeChecked()
  // only the chosen character is in the tab order (standard radio-group behaviour)
  expect(await page.locator('[role=radio][tabindex="0"]').count()).toBe(1)
})

test('preview characters are announced as not available yet and cannot be chosen by keyboard', async ({ page }) => {
  await open(page)
  await expect(page.getByRole('radio', { name: /^Zorvi.*Not available yet: After your coach games/ })).toBeVisible()
  await bot(page, 'lumio').focus()
  await page.keyboard.press('ArrowRight') // the only available character: stays on Lumio
  await expect(bot(page, 'lumio')).toHaveAttribute('aria-checked', 'true')
})
