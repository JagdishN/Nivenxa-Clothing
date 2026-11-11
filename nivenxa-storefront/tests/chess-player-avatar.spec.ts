import { test, expect, type Page, type BrowserContext } from '@playwright/test'

// The human player's avatar on the real Play page (TEST-ONLY flagged build).
//   BASE_URL=http://localhost:3100 npx playwright test tests/chess-player-avatar.spec.ts
// There are NO test accounts. "Signed in" here is a SIMULATED session: a fabricated, unsigned session cookie in the browser plus
// mocked Supabase auth endpoints (nothing reaches the real project, no account is touched). It exercises the page's own avatar
// logic (default / saved / change / save failure / sign-out); it does not prove real sign-in works.

test.setTimeout(90000)
const COOKIE = 'sb-chess-auth'
const b64url = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url')

function fakeSession(metadata: Record<string, unknown>) {
  const exp = Math.floor(Date.now() / 1000) + 3600
  const user = { id: '00000000-0000-4000-8000-000000000001', aud: 'authenticated', role: 'authenticated', email: 'simulated@example.test', app_metadata: {}, user_metadata: metadata, created_at: '2026-01-01T00:00:00Z' }
  return {
    access_token: `${b64url({ alg: 'none' })}.${b64url({ sub: user.id, exp, role: 'authenticated' })}.sig`,
    refresh_token: 'simulated',
    expires_in: 3600,
    expires_at: exp,
    token_type: 'bearer',
    user,
  }
}

async function signInSimulated(ctx: BrowserContext, metadata: Record<string, unknown>) {
  await ctx.addCookies([{ name: COOKIE, value: `base64-${b64url(fakeSession(metadata))}`, domain: 'localhost', path: '/' }])
}

interface Net { updates: Record<string, unknown>[] }
async function mockNet(page: Page, opts: { failUpdate?: boolean } = {}): Promise<Net> {
  const net: Net = { updates: [] }
  await page.route('**/*', async (route) => {
    const r = route.request()
    const url = r.url()
    if (/supabase\.co\/auth\/v1\/user/.test(url) && r.method() === 'PUT') {
      const data = (JSON.parse(r.postData() ?? '{}').data ?? {}) as Record<string, unknown>
      net.updates.push(data)
      if (opts.failUpdate) return route.fulfill({ status: 500, contentType: 'application/json', body: '{"msg":"nope"}' })
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ ...fakeSession(data).user }) })
    }
    if (/supabase\.co\/auth\/v1\//.test(url)) return route.fulfill({ status: 204, body: '' })
    if (r.method() === 'POST' && (r.headers()['next-action'] || url.includes('/api/'))) return route.abort()
    return route.continue()
  })
  return net
}

async function startGame(page: Page) {
  await page.addInitScript(() => { try { localStorage.setItem('nivenxa.chess.test.replyMinMs', '500'); localStorage.setItem('nivenxa.chess.coachIntro.v1', JSON.stringify(['00000000-0000-4000-8000-000000000a01','00000000-0000-4000-8000-000000000a02','00000000-0000-4000-8000-000000000a03'])) } catch {} }) // these suites are not about pace: shorten the level's minimum reply time (test-only hook, needs NEXT_PUBLIC_CHESS_TEST_HOOKS build)
  await page.goto('/chess/play', { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: /^Beginner/ }).click()
  await page.getByRole('button', { name: 'White', exact: true }).click()
  await page.getByRole('button', { name: 'Start Game' }).click()
  await page.waitForSelector('cg-board')
  await expect(page.getByText('Loading engine…')).toHaveCount(0, { timeout: 40000 })
}
const avatar = (page: Page) => page.getByTestId('player-avatar')

test('guest: default knight avatar, sign-in prompt, no change control; the same size as the opponent avatar', async ({ page }) => {
  await mockNet(page)
  await startGame(page)
  await expect(avatar(page)).toHaveAttribute('data-avatar-id', 'plum')
  await expect(page.getByTestId('player-avatar-signin')).toHaveText('Sign in to change your picture')
  await expect(page.getByTestId('player-avatar-change')).toHaveCount(0)
  const you = (await avatar(page).boundingBox())!
  const opp = (await page.getByTestId('opponent-header').locator('> div').first().boundingBox())!
  expect(Math.round(you.width)).toBe(Math.round(opp.width))
  expect(Math.round(you.height)).toBe(Math.round(opp.height))
  // asking to sign in never interrupts the game
  await page.getByTestId('player-avatar-signin').click()
  await expect(page.locator('cg-board')).toBeVisible()
})

test('signed in with no saved choice: the default avatar, no sign-in prompt, a Change profile picture control', async ({ page, context }) => {
  await signInSimulated(context, {})
  await mockNet(page)
  await startGame(page)
  await expect(avatar(page)).toHaveAttribute('data-avatar-id', 'plum')
  await expect(page.getByTestId('player-avatar-change')).toBeVisible()
  await expect(page.getByTestId('player-avatar-signin')).toHaveCount(0)
})

test('signed in with a saved choice: that avatar is shown; the game and the avatar stay separate from the bot', async ({ page, context }) => {
  await signInSimulated(context, { chess_avatar: 'teal' })
  await mockNet(page)
  await startGame(page)
  await expect(avatar(page)).toHaveAttribute('data-avatar-id', 'teal')
  // an unknown saved value falls back to the default
})

test('an unknown saved value falls back to the default avatar', async ({ page, context }) => {
  await signInSimulated(context, { chess_avatar: 'does-not-exist' })
  await mockNet(page)
  await startGame(page)
  await expect(avatar(page)).toHaveAttribute('data-avatar-id', 'plum')
})

test('changing the avatar saves it to the account; a failed save restores the previous one; the board is not touched', async ({ page, context }) => {
  await signInSimulated(context, { chess_avatar: 'teal' })
  const net = await mockNet(page)
  await startGame(page)
  const before = (await page.locator('cg-board').first().boundingBox())!
  await page.getByTestId('player-avatar-change').click()
  await page.locator('summary', { hasText: 'choose an icon' }).click()
  await page.getByTestId('player-avatar-option-indigo').click()
  await expect(avatar(page)).toHaveAttribute('data-avatar-id', 'indigo')
  await expect.poll(() => net.updates.length).toBe(1)
  expect(net.updates[0]).toEqual({ chess_avatar: 'indigo' })
  expect(await page.locator('cg-board').first().boundingBox()).toEqual(before) // no layout shift, no scroll jump (the dialog is a modal, not a popover over the board)
})

test('a failed save keeps the previous avatar', async ({ page, context }) => {
  await signInSimulated(context, { chess_avatar: 'teal' })
  const net = await mockNet(page, { failUpdate: true })
  await startGame(page)
  await page.getByTestId('player-avatar-change').click()
  await page.locator('summary', { hasText: 'choose an icon' }).click()
  await page.getByTestId('player-avatar-option-rust').click()
  await expect.poll(() => net.updates.length).toBe(1)
  await expect(avatar(page)).toHaveAttribute('data-avatar-id', 'teal')
})

test('both avatars are drawn inline (no image file to fail): the player avatar cannot show a broken image', async ({ page }) => {
  await mockNet(page)
  await startGame(page)
  expect(await avatar(page).locator('svg').count()).toBe(1)
  expect(await avatar(page).locator('img').count()).toBe(0)
  expect(await page.getByTestId('opponent-header').locator('img').count()).toBe(0)
})
