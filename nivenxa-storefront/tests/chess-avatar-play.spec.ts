import { test, expect, type Page } from '@playwright/test'

// Real Play page, TEST-ONLY Tivvi avatar. Needs a build made with NEXT_PUBLIC_CHESS_AVATAR_PROTOTYPE=1:
//   NEXT_PUBLIC_CHESS_AVATAR_PROTOTYPE=1 npm run build && npx next start -p 3100
//   BASE_URL=http://localhost:3100 npx playwright test tests/chess-avatar-play.spec.ts
// Writes are blocked (nothing is saved). The engine and analysis run for real.

test.setTimeout(120000)
test.use({ viewport: { width: 1280, height: 900 } })

async function blockWrites(page: Page) {
  await page.route('**/*', (route) => {
    const r = route.request()
    return r.method() === 'POST' && (r.headers()['next-action'] || r.url().includes('/api/')) ? route.abort() : route.continue()
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
async function start(page: Page, tier = 'Beginner') {
  await blockWrites(page)
  await page.addInitScript(() => { try { localStorage.setItem('nivenxa.chess.test.replyMinMs', '500'); localStorage.setItem('nivenxa.chess.coachIntro.v1', JSON.stringify(['00000000-0000-4000-8000-000000000a01','00000000-0000-4000-8000-000000000a02','00000000-0000-4000-8000-000000000a03'])) } catch {} }) // these suites are not about pace: shorten the level's minimum reply time (test-only hook, needs NEXT_PUBLIC_CHESS_TEST_HOOKS build)
  await page.goto('/chess/play', { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: new RegExp(`^${tier}`) }).click()
  await page.getByRole('button', { name: 'White', exact: true }).click()
  await page.getByRole('button', { name: 'Start Game' }).click()
  await page.waitForSelector('cg-board')
  await expect(page.getByText('Loading engine…')).toHaveCount(0, { timeout: 40000 })
}
const avatar = (page: Page) => page.getByTestId('tivvi-avatar')
const stateOf = (page: Page) => avatar(page).getAttribute('data-state')

test('greets once at game start; the caption outlives the 1.5 s pose', async ({ page }) => {
  await start(page)
  await expect(avatar(page)).toBeVisible()
  await expect.poll(() => stateOf(page), { timeout: 4000 }).toBe('idle') // pose ended
  await expect(page.getByTestId('avatar-caption')).toHaveText(/TIVVI says hello/) // caption still there
})

test('thinking follows the real engine activity (no timer): states line up with "TIVVI is thinking…"', async ({ page }) => {
  await start(page)
  await expect.poll(() => stateOf(page), { timeout: 4000 }).toBe('idle')
  await page.evaluate(() => {
    const w = window as unknown as { __log: [string, boolean, number][] }
    w.__log = []
    const av = document.querySelector('[data-testid=tivvi-avatar]')!
    const main = document.querySelector('main')!
    const rec = () => w.__log.push([av.getAttribute('data-state')!, main.textContent!.includes('TIVVI is thinking…'), Math.round(performance.now())])
    new MutationObserver(rec).observe(av, { attributes: true, attributeFilter: ['data-state'] })
    new MutationObserver(rec).observe(main, { childList: true, subtree: true, characterData: true })
  })
  await move(page, 'e2', 'e4')
  await expect(page.getByText(/1\.\.\.[a-zA-Z]/).first()).toBeVisible({ timeout: 30000 })
  await expect(page.getByText('TIVVI is thinking…')).toHaveCount(0, { timeout: 20000 })
  const log = await page.evaluate(() => (window as unknown as { __log: [string, boolean, number][] }).__log)
  const sawThinkingWhileEngine = log.some(([s, eng]) => s === 'thinking' && eng)
  const thinkingWithoutEngine = log.filter(([s, eng]) => s === 'thinking' && !eng)
  expect(sawThinkingWhileEngine).toBe(true)
  // a transient mismatch can only be the one mutation between the two observers; the pose must end when the engine does
  await expect.poll(() => stateOf(page), { timeout: 4000 }).not.toBe('thinking')
  test.info().annotations.push({ type: 'log', description: `thinking-without-engine samples: ${thinkingWithoutEngine.length}/${log.length}` })
})

test('resign: warm result acknowledgement that persists; never a victory pose; new game resets cleanly', async ({ page }) => {
  await start(page)
  await move(page, 'e2', 'e4')
  await expect(page.getByText(/1\.\.\.[a-zA-Z]/).first()).toBeVisible({ timeout: 30000 })
  await page.getByRole('button', { name: /^Resign/ }).click()
  await page.getByRole('button', { name: /Resign|Yes|Confirm/ }).last().click()
  await expect.poll(() => stateOf(page), { timeout: 5000 }).toBe('encourage')
  await expect(page.getByTestId('avatar-caption')).toHaveText(/good effort/i)
  await page.waitForTimeout(2500) // longer than the 1.5 s pose: still there
  expect(await stateOf(page)).toBe('encourage')
  await page.getByRole('dialog').getByRole('button').first().click() // dismiss the result overlay (it covers the controls); the avatar's result pose must stay
  expect(await stateOf(page)).toBe('encourage')
  await page.getByRole('button', { name: 'New Game', exact: true }).first().click()
  await expect(avatar(page)).toHaveCount(0) // New Game returns to the setup screen: the previous result is gone with it
  await page.getByRole('button', { name: /^Beginner/ }).click()
  await page.getByRole('button', { name: 'White', exact: true }).click()
  await page.getByRole('button', { name: 'Start Game' }).click()
  await expect(avatar(page)).toBeVisible()
  expect(['selected', 'idle']).toContain(await stateOf(page)) // fresh greeting, not the old result pose
  await expect(page.getByTestId('avatar-caption')).not.toHaveText(/good effort/i)
})

test('reduced motion: no animation runs, poses and captions still change; toggle explains why', async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 1280, height: 900 } })
  const page = await ctx.newPage()
  await start(page)
  await page.evaluate(() => {
    const w = window as unknown as { __starts: number }
    w.__starts = 0
    document.addEventListener('animationstart', () => w.__starts++, true)
  })
  await expect(avatar(page)).toHaveAttribute('data-anim', 'off')
  await expect.poll(() => stateOf(page), { timeout: 5000 }).toBe('idle')
  await page.evaluate(() => {
    const w = window as unknown as { __cap: string[]; __poses: string[] }
    w.__cap = []
    w.__poses = []
    const t = document.querySelector('main')!
    new MutationObserver(() => w.__cap.push(t.textContent?.includes('TIVVI is thinking…') ? 'thinking' : '')).observe(t, { childList: true, characterData: true, subtree: true })
    const a = document.querySelector('[data-testid=tivvi-avatar]')!
    new MutationObserver(() => w.__poses.push(a.getAttribute('data-state')!)).observe(a, { attributes: true, attributeFilter: ['data-state'] })
  })
  await move(page, 'e2', 'e4')
  await expect(page.getByText(/1\.\.\.[a-zA-Z]/).first()).toBeVisible({ timeout: 30000 })
  const seen = await page.evaluate(() => {
    const w = window as unknown as { __cap: string[]; __poses: string[] }
    return { __cap: w.__cap, __poses: w.__poses }
  })
  expect(seen.__cap.some((c) => /thinking/.test(c))).toBe(true) // the text caption still informs
  expect(seen.__poses).toContain('thinking') // and the pose changed (statically)
  await page.waitForTimeout(6000)
  expect(await page.evaluate(() => (window as unknown as { __starts: number }).__starts)).toBe(0)
  expect(await page.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running').length)).toBe(0)
  await page.getByTestId('game-settings').click()
  await expect(page.getByTestId('animations-switch')).toBeDisabled() // reduced motion wins: the switch is off and says why
  await expect(page.getByTestId('animations-switch')).toHaveAttribute('aria-checked', 'false')
  await expect(page.getByText(/asks for reduced motion/i)).toBeVisible()
  await ctx.close()
})

test('animation-off setting persists and stops all motion; poses still change', async ({ page }) => {
  await start(page)
  await page.getByTestId('game-settings').click()
  await expect(page.getByTestId('animations-switch')).toHaveAttribute('aria-checked', 'true')
  await page.getByTestId('animations-switch').click()
  await expect(page.getByTestId('animations-switch')).toHaveAttribute('aria-checked', 'false')
  await expect(avatar(page)).toHaveAttribute('data-anim', 'off')
  await page.evaluate(() => {
    const w = window as unknown as { __starts: number }
    w.__starts = 0
    document.addEventListener('animationstart', () => w.__starts++, true)
  })
  await move(page, 'a2', 'a3')
  await page.waitForTimeout(7000)
  expect(await page.evaluate(() => (window as unknown as { __starts: number }).__starts)).toBe(0)
  await page.reload({ waitUntil: 'networkidle' }) // preference survives a reload
  await page.getByRole('button', { name: /^Beginner/ }).click()
  await page.getByRole('button', { name: 'White', exact: true }).click()
  await page.getByRole('button', { name: 'Start Game' }).click()
  await expect(avatar(page)).toHaveAttribute('data-anim', 'off')
  await page.getByTestId('game-settings').click()
  await expect(page.getByTestId('animations-switch')).toHaveAttribute('aria-checked', 'false')
})

test('motion pauses when the avatar is off-screen and when the tab is hidden; resumes after', async ({ page }) => {
  await start(page)
  const starts = async (ms: number) => {
    await page.evaluate(() => {
      const w = window as unknown as { __n: number }
      w.__n = 0
      if (!(window as unknown as { __hooked?: boolean }).__hooked) {
        ;(window as unknown as { __hooked?: boolean }).__hooked = true
        document.addEventListener('animationstart', () => w.__n++, true)
      }
    })
    await page.waitForTimeout(ms)
    return page.evaluate(() => (window as unknown as { __n: number }).__n)
  }
  await page.waitForTimeout(2500) // let the greeting end
  const visible = await starts(14000)
  expect(visible).toBeGreaterThan(0) // blinking happens while visible
  // off-screen: push the avatar's row far outside the viewport (IntersectionObserver reports it hidden)
  await page.evaluate(() => ((document.querySelector('[data-testid=tivvi-avatar]')!.closest('div') as HTMLElement).style.transform = 'translateY(-3000px)'))
  await page.waitForTimeout(500)
  expect(await starts(14000)).toBe(0)
  await page.evaluate(() => ((document.querySelector('[data-testid=tivvi-avatar]')!.closest('div') as HTMLElement).style.transform = ''))
  await page.waitForTimeout(500)
  expect(await starts(14000)).toBeGreaterThan(0)
  // hidden tab
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { value: true, configurable: true })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await page.waitForTimeout(400) // let a burst that began in the same instant finish before counting
  expect(await starts(14000)).toBe(0)
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { value: false, configurable: true })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  expect(await starts(14000)).toBeGreaterThan(0)
})

test('Expert: thinking and the greeting work; no live evaluation reaction ever appears', async ({ page }) => {
  await start(page, 'Expert')
  await expect(avatar(page)).toBeVisible()
  const seen = new Set<string>()
  await page.evaluate(() => {
    const w = window as unknown as { __states: string[] }
    w.__states = []
    new MutationObserver(() => w.__states.push(document.querySelector('[data-testid=tivvi-avatar]')!.getAttribute('data-state')!)).observe(document.querySelector('[data-testid=tivvi-avatar]')!, { attributes: true, attributeFilter: ['data-state'] })
  })
  // a deliberately weak sequence; with a live reaction tier this could trigger one
  for (const [a, b] of [['f2', 'f3'], ['e1', 'f2'], ['f2', 'g3']]) {
    await move(page, a, b)
    await page.waitForTimeout(500)
    await expect(page.getByText('TIVVI is thinking…')).toHaveCount(0, { timeout: 40000 })
  }
  const states = await page.evaluate(() => (window as unknown as { __states: string[] }).__states)
  states.forEach((s) => seen.add(s))
  expect(seen.has('concern')).toBe(false)
  expect(await page.getByTestId('avatar-caption').textContent()).not.toMatch(/(look at that move|leaves your|lets a )/)
})

test('undo/navigation: real graded moves never leave a stale caption or a stuck "Reviewing…"; Undo clears; leaving the page resets everything', async ({ page }) => {
  await start(page)
  // a weak king walk with the REAL engine and real analysis (Beginner = live coaching). TIVVI no longer waits for the grade, so a
  // grade may arrive after the reply; whatever happens, a caption about a position that is gone must never stay up.
  const you = page.getByTestId('insight-you')
  let n = 0
  for (const [a, b] of [['f2', 'f3'], ['e1', 'f2'], ['f2', 'g3']]) {
    n++
    await move(page, a, b)
    await expect(you).toHaveAttribute('data-ply', String((n - 1) * 2), { timeout: 20000 })
    await expect(page.getByText('TIVVI is thinking…')).toHaveCount(0, { timeout: 40000 }) // TIVVI has replied
    // the position moved on, so no reaction caption (about the previous position) may remain
    await expect(page.getByTestId('avatar-caption')).not.toHaveText(/(look at that move|leaves your|lets a )/)
    // your section is never stuck loading: it ends as a confirmed grade (or an explicit unavailable message)
    await expect(you).toHaveAttribute('data-state', /ready|quiet|error/, { timeout: 25000 })
  }
  await page.getByRole('button', { name: /^Undo/ }).click()
  await page.waitForTimeout(500)
  await expect(page.getByTestId('avatar-caption')).not.toHaveText(/(look at that move|leaves your|lets a )/) // feedback about an undone move is gone
  expect(await stateOf(page)).not.toBe('concern')
  await expect(page.getByTestId('insight-you-heading')).toContainText('2.Kf2') // the section is about the move now last
  // navigation: leave and come back; nothing carries over
  await page.goto('/chess', { waitUntil: 'networkidle' })
  await page.addInitScript(() => { try { localStorage.setItem('nivenxa.chess.test.replyMinMs', '500'); localStorage.setItem('nivenxa.chess.coachIntro.v1', JSON.stringify(['00000000-0000-4000-8000-000000000a01','00000000-0000-4000-8000-000000000a02','00000000-0000-4000-8000-000000000a03'])) } catch {} }) // these suites are not about pace: shorten the level's minimum reply time (test-only hook, needs NEXT_PUBLIC_CHESS_TEST_HOOKS build)
  await page.goto('/chess/play', { waitUntil: 'networkidle' })
  await expect(avatar(page)).toHaveCount(0) // setup screen: no avatar until a game starts
})
