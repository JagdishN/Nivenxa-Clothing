import { test, expect, type Page, type Route } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

// My Activity: routes + old-route compatibility + login return (as a guest, real server), the three lists / empty /
// failed / loading states rendered from FIXTURES (dev-only preview route), the account menu (Supabase mocked in the
// browser), and screenshots. Nothing here reads or writes a real account's data. Ownership isolation with two real
// accounts, real saves and real history need test accounts and a migrated database: NOT covered here.
const OUT = join(process.cwd(), 'docs', 'chess-screenshots', 'activity')
mkdirSync(OUT, { recursive: true })
const PREVIEW = '/chess/dev-preview/activity'

test.describe('routes and compatibility (signed out)', () => {
  test.use({ viewport: { width: 1280, height: 800 } })

  for (const tab of ['games', 'analyses', 'puzzles']) {
    test(`/chess/activity/${tab} sends a guest to the login drawer and returns here afterwards`, async ({ page }) => {
      await page.goto(`/chess/activity/${tab}`, { waitUntil: 'networkidle' })
      expect(new URL(page.url()).pathname).toBe('/chess')
      expect(new URL(page.url()).searchParams.get('redirect')).toBe(`/chess/activity/${tab}`)
      await expect(page.getByRole('dialog')).toBeVisible()
    })
  }

  test('filters survive the login round trip; old bookmarks land on the right tab', async ({ page }) => {
    await page.goto('/chess/activity/analyses?filter=analysed', { waitUntil: 'networkidle' })
    expect(new URL(page.url()).searchParams.get('redirect')).toBe('/chess/activity/analyses?filter=analysed')

    await page.goto('/chess/analysis/my-games?filter=analyzed', { waitUntil: 'networkidle' })
    expect(new URL(page.url()).searchParams.get('redirect')).toBe('/chess/activity/analyses?filter=analysed')
    await page.goto('/chess/analysis/my-games', { waitUntil: 'networkidle' })
    expect(new URL(page.url()).searchParams.get('redirect')).toBe('/chess/activity/analyses')
    await page.goto('/chess/analysis/my-puzzles', { waitUntil: 'networkidle' })
    expect(new URL(page.url()).searchParams.get('redirect')).toBe('/chess/activity/puzzles')
    await page.goto('/chess/activity', { waitUntil: 'networkidle' })
    expect(new URL(page.url()).searchParams.get('redirect')).toBe('/chess/activity/games')
  })

  test('Analysis stays in the main nav and is for STARTING an analysis; history links go to My Activity', async ({ page }) => {
    await page.goto('/chess/analysis', { waitUntil: 'networkidle' })
    await expect(page.locator('header nav').getByRole('link', { name: 'Analysis' })).toBeVisible()
    await expect(page.getByRole('link', { name: /Import a Game/ })).toHaveAttribute('href', '/chess/analysis/import')
    await expect(page.getByRole('link', { name: /Recreate a Game/ })).toHaveAttribute('href', '/chess/analysis/self-analysis')
    // the personal-history tabs are gone from this screen
    await expect(page.getByRole('navigation', { name: 'Analysis sections' })).toHaveCount(0)
    await expect(page.getByRole('link', { name: 'My Puzzles' })).toHaveCount(0)
    // signed out: the My Games card asks for an account and remembers where to return
    const login = page.getByRole('link', { name: 'Log In' }).first()
    expect(await login.getAttribute('href')).toContain(encodeURIComponent('/chess/activity/games'))
    const saved = page.getByRole('link', { name: /View my saved analyses/ })
    await expect(saved).toBeVisible()
    expect(await saved.getAttribute('href')).toContain(encodeURIComponent('/chess/activity/analyses'))
    await page.screenshot({ path: join(OUT, 'analysis-landing-desktop-view.png') })
  })

  test('import and recreate still open for guests', async ({ page }) => {
    for (const path of ['/chess/analysis/import', '/chess/analysis/self-analysis']) {
      const res = await page.goto(path, { waitUntil: 'networkidle' })
      expect(res?.status()).toBe(200)
      expect(new URL(page.url()).pathname).toBe(path)
    }
  })
})

for (const vp of [
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'mobile', width: 390, height: 844 },
]) {
  test.describe(`lists from fixtures (${vp.name})`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } })

    test('three tabs with accessible state; every row shows what it should; no overflow; footer complete', async ({ page }) => {
      await page.goto(`${PREVIEW}?view=games`, { waitUntil: 'networkidle' })
      const tabs = page.getByRole('navigation', { name: 'My Activity sections' })
      expect(await tabs.getByRole('link').allInnerTexts()).toEqual(['My Games', 'My Analyses', 'My Puzzles'])
      await expect(tabs.getByRole('link', { name: 'My Games' })).toHaveAttribute('href', '/chess/activity/games')
      await expect(tabs.getByRole('link', { name: 'My Analyses' })).toHaveAttribute('href', '/chess/activity/analyses')
      await expect(tabs.getByRole('link', { name: 'My Puzzles' })).toHaveAttribute('href', '/chess/activity/puzzles')

      // My Games: date, opponent, colour, result/status, time control, analysis availability, actions
      const rows = page.getByRole('listitem').filter({ hasText: 'Nivenxa ·' })
      const first = rows.nth(0)
      await expect(first).toContainText('Won')
      await expect(first).toContainText('9 Nov 2026')
      await expect(first).toContainText('You played White')
      await expect(first).toContainText('Rapid · 10 + 5')
      await expect(first).toContainText('Analysis saved')
      await expect(first.getByRole('link', { name: 'Replay' })).toHaveAttribute('href', /\/chess\/activity\/games\/f0000000/)
      await expect(first.getByRole('link', { name: 'View analysis' })).toHaveAttribute('href', /\/chess\/analysis\/player\?gameId=/)
      await expect(first.getByRole('button', { name: 'Download PGN' })).toBeVisible()
      await expect(rows.nth(1)).toContainText('Lost')
      await expect(rows.nth(1)).toContainText('Resigned')
      await expect(rows.nth(1).getByRole('button', { name: 'Analyse' })).toBeVisible() // not analysed yet -> Analyse
      await expect(rows.nth(2)).toContainText('Draw')
      await expect(rows.nth(2)).toContainText('Untimed')
      await expect(rows.nth(3)).toContainText('Unfinished')
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
      await expect(page.locator('footer').getByRole('heading', { name: 'Support & Legal' })).toBeVisible() // the complete footer is there
      await page.screenshot({ path: join(OUT, `my-games-${vp.name}-view.png`) })

      await page.goto(`${PREVIEW}?view=analyses`, { waitUntil: 'networkidle' })
      const a = page.getByRole('listitem').filter({ hasText: 'saved' })
      await expect(a.nth(0)).toContainText('Analysis complete')
      await expect(a.nth(0)).toContainText('Game played on NIVENXA')
      await expect(a.nth(0)).toContainText('Accuracy 87%')
      await expect(a.nth(0).getByRole('link', { name: 'Open analysis' })).toHaveAttribute('href', /gameId=/)
      await expect(a.nth(1)).toContainText('Saved, not analysed')
      await expect(a.nth(1)).toContainText('Imported: Online Blitz Final')
      await expect(a.nth(1).getByRole('link', { name: 'Analyse' })).toBeVisible()
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
      await page.screenshot({ path: join(OUT, `my-analyses-${vp.name}-view.png`) })

      await page.goto(`${PREVIEW}?view=puzzles`, { waitUntil: 'networkidle' })
      const p = page.getByRole('listitem').filter({ hasText: /Retry/ })
      await expect(p.nth(0)).toContainText('Solved on your own')
      await expect(p.nth(0)).toContainText('Forks')
      await expect(p.nth(0)).toContainText('No help used')
      await expect(p.nth(0).getByRole('link', { name: 'Retry' })).toHaveAttribute('href', '/chess/puzzles/fork?puzzle=abc12')
      await expect(p.nth(1)).toContainText('Solved with hints')
      await expect(p.nth(1)).toContainText('2 hints · 1 wrong move')
      await expect(p.nth(2)).toContainText('Solution viewed')
      await expect(p.nth(2)).toContainText('solution shown')
      await expect(p.nth(3)).toContainText('Skipped')
      await expect(p.nth(4)).toContainText('Solved on your own') // a row from before outcomes were tracked
      await expect(p.nth(4).getByRole('link', { name: 'Retry' })).toHaveAttribute('href', '/chess/puzzles')
      await page.screenshot({ path: join(OUT, `my-puzzles-${vp.name}-view.png`) })
    })

    test('empty, failed (not the same as empty), unavailable and loading states', async ({ page }) => {
      const cases: Array<[string, RegExp, string]> = [
        ['empty-games', /No games yet/, 'Play your first game'],
        ['empty-analyses', /No saved analyses yet/, 'Analyse a game'],
        ['empty-puzzles', /No puzzles yet/, 'Try a puzzle'],
      ]
      for (const [view, title, cta] of cases) {
        await page.goto(`${PREVIEW}?view=${view}`, { waitUntil: 'networkidle' })
        await expect(page.getByRole('heading', { name: title })).toBeVisible()
        await expect(page.getByRole('link', { name: cta })).toBeVisible()
      }
      await page.goto(`${PREVIEW}?view=failed`, { waitUntil: 'networkidle' })
      await expect(page.locator('main [role="alert"]')).toContainText('couldn’t load')
      await expect(page.locator('main [role="alert"]')).toContainText('not an empty history')
      await expect(page.getByRole('link', { name: 'Retry' })).toBeVisible()
      await page.screenshot({ path: join(OUT, `failed-${vp.name}-view.png`) })
      await page.goto(`${PREVIEW}?view=unavailable`, { waitUntil: 'networkidle' })
      await expect(page.locator('main [role="alert"]')).toContainText('still being set up')
      await page.goto(`${PREVIEW}?view=loading`, { waitUntil: 'networkidle' })
      await expect(page.getByRole('status')).toContainText('Loading your games')
      expect(await page.locator('li[class*="skeletonRow"]').count()).toBe(5)
      await page.screenshot({ path: join(OUT, `loading-${vp.name}-view.png`) })
      await page.goto(`${PREVIEW}?view=empty-games`, { waitUntil: 'networkidle' })
      await page.screenshot({ path: join(OUT, `empty-games-${vp.name}-view.png`) })
    })
  })
}

// ── account menu, with Supabase mocked in the browser ───────────────────────
const jwt = (payload: object) => {
  const b = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url')
  return `${b({ alg: 'HS256', typ: 'JWT' })}.${b(payload)}.sig`
}
const EMAIL = 'a.very.long.email.address.for.testing@example-university.edu'
const SESSION = () => ({
  access_token: jwt({ sub: '00000000-0000-0000-0000-000000000001', email: EMAIL, exp: Math.floor(Date.now() / 1000) + 3600, role: 'authenticated', aud: 'authenticated' }),
  token_type: 'bearer',
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  refresh_token: 'mock-refresh',
  user: { id: '00000000-0000-0000-0000-000000000001', aud: 'authenticated', role: 'authenticated', email: EMAIL, app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() },
})
const json = (route: Route, status: number, body: unknown) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })

async function signInMocked(page: Page) {
  await page.route('**/auth/v1/otp**', (r) => json(r, 200, {}))
  await page.route('**/auth/v1/verify**', (r) => json(r, 200, SESSION()))
  await page.route('**/auth/v1/user**', (r) => json(r, 200, SESSION().user))
  await page.route('**/auth/v1/logout**', (r) => r.fulfill({ status: 204, body: '' }))
  await page.goto('/chess', { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: 'Log In' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('textbox', { name: 'Email address' }).fill(EMAIL)
  await dialog.getByRole('button', { name: 'Send code' }).click()
  await dialog.getByLabel('Digit 1 of 6').fill('123456')
  await expect(dialog.getByText('Who is this account for?')).toBeVisible()
  await dialog.getByRole('button', { name: 'Close' }).click()
}

test.describe('account menu', () => {
  test.use({ viewport: { width: 1280, height: 800 } })

  test('avatar button (not just a truncated email): full email, My Activity, Log out; Escape returns focus', async ({ page }) => {
    await signInMocked(page)
    const avatar = page.getByRole('button', { name: 'Account menu' })
    await expect(avatar).toBeVisible()
    await expect(avatar).toHaveAttribute('aria-expanded', 'false')
    await expect(avatar).toHaveText('A')
    await avatar.click()
    await expect(avatar).toHaveAttribute('aria-expanded', 'true')
    await expect(page.getByText(EMAIL, { exact: true })).toBeVisible() // the FULL address, unabridged
    await expect(page.getByRole('link', { name: 'My Activity' })).toHaveAttribute('href', '/chess/activity')
    await expect(page.getByRole('button', { name: 'Log out' })).toBeVisible()
    const box = (await page.getByText(EMAIL, { exact: true }).boundingBox())!
    expect(box.x).toBeGreaterThanOrEqual(0)
    expect(box.x + box.width).toBeLessThanOrEqual(1280)
    await page.screenshot({ path: join(OUT, 'account-menu-desktop.png') })
    await page.keyboard.press('Escape')
    await expect(avatar).toHaveAttribute('aria-expanded', 'false')
    await expect(avatar).toBeFocused()
    await page.keyboard.press('Enter') // keyboard open
    await expect(page.getByRole('link', { name: 'My Activity' })).toBeVisible()
    await page.mouse.click(300, 400)
    await expect(page.getByRole('link', { name: 'My Activity' })).toHaveCount(0)
  })

  test('mobile: the menu stays on screen', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await signInMocked(page)
    await page.getByRole('button', { name: 'Account menu' }).click()
    const box = (await page.getByText(EMAIL, { exact: true }).boundingBox())!
    expect(box.x).toBeGreaterThanOrEqual(0)
    expect(box.x + box.width).toBeLessThanOrEqual(390)
    await page.screenshot({ path: join(OUT, 'account-menu-mobile.png') })
  })
})
