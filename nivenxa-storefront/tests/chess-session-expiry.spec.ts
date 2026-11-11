import { test, expect, type Page, type BrowserContext } from '@playwright/test'
import sharp from 'sharp'
import { installScriptedEngine, keyAfter, REPLIES } from './helpers/scriptedEngine'

// Session expiry on the real Play page (TEST-ONLY flagged build). MOCKED: the account is a SIMULATED session and the account routes are
// stand-ins that start answering 401 ("expired"), so these tests show how the PAGE behaves when the server rejects the session. They are
// not a test of real Supabase expiry.
//   BASE_URL=http://localhost:3100 npx playwright test tests/chess-session-expiry.spec.ts --workers=1

test.setTimeout(120000)
test.use({ viewport: { width: 1366, height: 768 } })
REPLIES[keyAfter(['f3'])] = 'e7e5'
REPLIES[keyAfter(['f3', 'e5', 'g4'])] = 'd8h4'

const COOKIE = 'sb-chess-auth'
const b64url = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url')
const INTRO_DONE = ['00000000-0000-4000-8000-000000000a01', '00000000-0000-4000-8000-000000000a02', '00000000-0000-4000-8000-000000000a03']
async function signIn(ctx: BrowserContext) {
  const exp = Math.floor(Date.now() / 1000) + 3600
  const id = '00000000-0000-4000-8000-0000000000bb'
  const user = { id, aud: 'authenticated', role: 'authenticated', email: 'simulated@example.test', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' }
  const s = { access_token: `${b64url({ alg: 'none' })}.${b64url({ sub: id, exp, role: 'authenticated' })}.sig`, refresh_token: 'simulated', expires_in: 3600, expires_at: exp, token_type: 'bearer', user }
  await ctx.addCookies([{ name: COOKIE, value: `base64-${b64url(s)}`, domain: 'localhost', path: '/' }])
}

interface Server { expired: boolean; pictureVersion: number; hasPicture: boolean; coachIds: string[]; coachPosts: string[][] }
async function setup(page: Page, srv: Server, opts: { introDone: boolean }) {
  await page.addInitScript(([ids, done]) => { try { if (done) localStorage.setItem('nivenxa.chess.coachIntro.v1', JSON.stringify(ids)) } catch {} }, [INTRO_DONE, opts.introDone] as const)
  await installScriptedEngine(page, {})
  await page.route('**/supabase.co/auth/v1/**', (r) => r.fulfill({ status: 204, body: '' }))
  await page.route('**/api/chess/coach-intro', (r) => {
    if (srv.expired) return r.fulfill({ status: 401, contentType: 'application/json', body: '{"error":"Not signed in"}' })
    if (r.request().method() === 'POST') {
      const sent = (JSON.parse(r.request().postData() ?? '{}').ids ?? []) as string[]
      srv.coachPosts.push(sent)
      for (const id of sent) if (!srv.coachIds.includes(id)) srv.coachIds.push(id)
    }
    return r.fulfill({ contentType: 'application/json', body: JSON.stringify({ ids: srv.coachIds }) })
  })
  await page.route('**/api/chess/profile-picture**', async (r) => {
    const q = r.request()
    if (srv.expired) return r.fulfill({ status: 401, contentType: 'application/json', body: '{"error":"Sign in to use a profile picture."}' })
    if (q.method() === 'GET' && q.url().includes('info=1')) return r.fulfill({ contentType: 'application/json', body: JSON.stringify({ version: srv.pictureVersion, hasPicture: srv.hasPicture }) })
    if (q.method() === 'GET') return r.fulfill({ status: srv.hasPicture ? 200 : 404, contentType: 'image/webp', body: srv.hasPicture ? await sharp({ create: { width: 64, height: 64, channels: 3, background: '#c33' } }).webp().toBuffer() : Buffer.alloc(0) })
    if (q.method() === 'POST') { srv.pictureVersion += 1; srv.hasPicture = true; return r.fulfill({ contentType: 'application/json', body: JSON.stringify({ version: srv.pictureVersion, hasPicture: true }) }) }
    return r.fulfill({ contentType: 'application/json', body: JSON.stringify({ version: srv.pictureVersion, hasPicture: false }) })
  })
}
async function sq(page: Page, s: string) {
  const b = (await page.locator('cg-board').first().boundingBox())!
  return { x: b.x + ((s.charCodeAt(0) - 97 + 0.5) * b.width) / 8, y: b.y + ((7 - (Number(s[1]) - 1) + 0.5) * b.height) / 8 }
}
const move = async (page: Page, a: string, b: string) => { for (const s of [a, b]) { const p = await sq(page, s); await page.mouse.click(p.x, p.y) } }
async function startGame(page: Page) {
  await page.goto('/chess/play', { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: /^Beginner/ }).click()
  await page.getByRole('button', { name: 'White', exact: true }).click()
  await page.getByRole('button', { name: 'Start Game' }).click()
  await page.waitForSelector('cg-board')
  await expect(page.getByText('Loading engine…')).toHaveCount(0, { timeout: 40000 })
}
const png = () => sharp({ create: { width: 300, height: 300, channels: 3, background: '#38c' } }).png().toBuffer()
const notice = (p: Page) => p.getByTestId('session-expired')

test('expiry during an upload: clear message once, the game and its position are untouched, the default picture stands in', async ({ page, context }) => {
  await signIn(context)
  const srv: Server = { expired: false, pictureVersion: 2, hasPicture: true, coachIds: [], coachPosts: [] }
  await setup(page, srv, { introDone: true })
  await startGame(page)
  await expect(page.getByTestId('player-avatar-image')).toBeVisible() // the saved picture
  await move(page, 'e2', 'e4')
  await expect(page.getByTestId('insight-reply')).toHaveAttribute('data-move', /./, { timeout: 15000 })
  srv.expired = true // the session expires while the dialog is open
  await page.getByTestId('player-avatar-change').click()
  await page.getByTestId('profile-picture-file').setInputFiles({ name: 'a.png', mimeType: 'image/png', buffer: await png() })
  await page.getByTestId('profile-picture-save').click()
  await expect(page.getByTestId('profile-picture-error')).toContainText('sign-in has expired')
  await expect(page.getByTestId('profile-picture-progress')).toHaveCount(0) // nothing keeps "loading"
  await expect(page.getByTestId('profile-picture-save')).toBeEnabled()
  await page.getByTestId('profile-picture-cancel').click()
  await expect(notice(page)).toHaveCount(1)
  await expect(page.getByTestId('player-avatar')).toHaveAttribute('data-avatar-id', 'plum') // the previous picture is NOT shown as current
  await expect(page.getByTestId('insight-you')).toHaveAttribute('data-move', 'e4') // the game is intact
  // asking again does not stack a second message
  await page.getByTestId('player-avatar-change').click()
  await page.getByTestId('profile-picture-file').setInputFiles({ name: 'a.png', mimeType: 'image/png', buffer: await png() })
  await page.getByTestId('profile-picture-save').click()
  await expect(page.getByTestId('profile-picture-error')).toContainText('sign-in has expired')
  await page.getByTestId('profile-picture-cancel').click()
  await expect(notice(page)).toHaveCount(1)
  await notice(page).getByRole('button', { name: 'Dismiss' }).click()
  await expect(notice(page)).toHaveCount(0)
})

test('expiry while the opponent is replying: exactly one reply, on the right position, play continues', async ({ page, context }) => {
  await signIn(context)
  const srv: Server = { expired: false, pictureVersion: 0, hasPicture: false, coachIds: [], coachPosts: [] }
  await setup(page, srv, { introDone: true })
  await startGame(page)
  await move(page, 'd2', 'd4') // Beginner: the reply is held to 4 s
  await expect(page.getByTestId('game-status')).toHaveText(/thinking/)
  srv.expired = true
  await page.getByTestId('player-avatar-change').click()
  await page.getByTestId('profile-picture-file').setInputFiles({ name: 'a.png', mimeType: 'image/png', buffer: await png() })
  await page.getByTestId('profile-picture-save').click()
  await expect(page.getByTestId('profile-picture-error')).toContainText('sign-in has expired')
  await page.getByTestId('profile-picture-cancel').click()
  await expect(page.getByTestId('insight-reply')).toHaveAttribute('data-move', 'e6', { timeout: 15000 })
  expect(await page.locator('[data-testid=insight-reply]').count()).toBe(1)
  await expect(page.getByTestId('game-status')).toHaveText('Your move')
  await move(page, 'a2', 'a3')
  await expect(page.getByTestId('insight-reply')).toHaveAttribute('data-move', 'Bb4+', { timeout: 15000 })
})

test('expiry while saving coach progress: the game still counts in this browser, one message, merged after signing in again', async ({ page, context }) => {
  await signIn(context)
  const srv: Server = { expired: false, pictureVersion: 0, hasPicture: false, coachIds: [], coachPosts: [] }
  await setup(page, srv, { introDone: false })
  await startGame(page)
  srv.expired = true // the session ends before the game does
  await move(page, 'f2', 'f3')
  await expect(page.getByTestId('insight-reply')).toHaveAttribute('data-move', 'e5', { timeout: 15000 })
  await move(page, 'g2', 'g4')
  await expect(page.getByText('Checkmate').first()).toBeVisible({ timeout: 15000 })
  await expect(page.getByTestId('intro-progress')).toContainText('Coach introduction: game 1 of 3 complete.')
  await expect(notice(page)).toHaveCount(1)
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('nivenxa.chess.coachIntro.v1') ?? '[]') as string[])
  expect(stored).toHaveLength(1) // kept in this browser, never lost
  // signing in works again: the browser's progress is merged into the account and the message is gone
  srv.expired = false
  await page.reload({ waitUntil: 'networkidle' })
  await expect.poll(() => srv.coachIds.length).toBe(1)
  expect(srv.coachPosts.flat()).toEqual(stored)
  await expect(notice(page)).toHaveCount(0)
  expect(await page.evaluate(() => localStorage.getItem('nivenxa.chess.coachIntro.v1'))).toBeNull()
})
