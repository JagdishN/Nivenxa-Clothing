import { test, expect, type Page, type BrowserContext } from '@playwright/test'
import sharp from 'sharp'

// Custom profile pictures on the real Play page (TEST-ONLY flagged build).
//   BASE_URL=http://localhost:3100 npx playwright test tests/chess-profile-picture.spec.ts --workers=1
// There are NO real test accounts. "Signed in" is a SIMULATED session (a fabricated cookie plus mocked Supabase auth) and the picture
// API is an in-memory stand-in, so these tests exercise the page's own dialog, crop, upload, error, toast and cache behaviour.
// The server rules (content validation, re-encoding, metadata stripping, ownership, failure handling) are covered separately by
// tests/unit/profilePicture.test.ts against real image decoding. Real-account persistence across devices is NOT proven here.

test.setTimeout(90000)
const COOKIE = 'sb-chess-auth'
const b64url = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url')
const INTRO_DONE = ['00000000-0000-4000-8000-000000000a01', '00000000-0000-4000-8000-000000000a02', '00000000-0000-4000-8000-000000000a03']

function fakeSession(id: string) {
  const exp = Math.floor(Date.now() / 1000) + 3600
  const user = { id, aud: 'authenticated', role: 'authenticated', email: 'simulated@example.test', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' }
  return { access_token: `${b64url({ alg: 'none' })}.${b64url({ sub: id, exp, role: 'authenticated' })}.sig`, refresh_token: 'simulated', expires_in: 3600, expires_at: exp, token_type: 'bearer', user }
}
const signIn = (ctx: BrowserContext, id = '00000000-0000-4000-8000-000000000001') =>
  ctx.addCookies([{ name: COOKIE, value: `base64-${b64url(fakeSession(id))}`, domain: 'localhost', path: '/' }])

/** An in-memory stand-in for the picture API (shared between contexts to model "another device"). */
interface Api {
  version: number
  has: boolean
  image: Buffer | null
  posts: { type: string; bytes: number; square?: [number, number] }[]
  deletes: number
  failNext?: { status: number; error: string }
  imageStatus?: number
}
const newApi = (): Api => ({ version: 0, has: false, image: null, posts: [], deletes: 0 })

async function mock(page: Page, api: Api) {
  await page.route('**/*', async (route) => {
    const r = route.request()
    const url = r.url()
    if (/supabase\.co\/auth\/v1\//.test(url)) return route.fulfill({ status: 204, body: '' })
    if (url.includes('/api/chess/profile-picture')) {
      const json = (status: number, body: unknown) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
      if (r.method() === 'GET' && url.includes('info=1')) return json(200, { version: api.version, hasPicture: api.has })
      if (r.method() === 'GET') {
        if (api.imageStatus && api.imageStatus !== 200) return route.fulfill({ status: api.imageStatus, body: '' })
        return route.fulfill({ status: api.has ? 200 : 404, contentType: 'image/webp', body: api.image ?? Buffer.alloc(0) })
      }
      if (r.method() === 'POST') {
        if (api.failNext) {
          const f = api.failNext
          api.failNext = undefined
          return json(f.status, { error: f.error })
        }
        const raw = r.postDataBuffer() ?? Buffer.alloc(0)
        const start = raw.indexOf('\r\n\r\n') + 4
        const end = raw.lastIndexOf('\r\n--')
        const file = raw.subarray(start, end)
        const m = await sharp(file).metadata().catch(() => null)
        api.posts.push({ type: m?.format ?? 'unknown', bytes: file.length, square: m ? [m.width!, m.height!] : undefined })
        api.version += 1
        api.has = true
        api.image = await sharp(file).resize(64, 64).webp().toBuffer()
        return json(200, { version: api.version, hasPicture: true })
      }
      if (r.method() === 'DELETE') {
        api.deletes += 1
        api.version += 1
        api.has = false
        api.image = null
        return json(200, { version: api.version, hasPicture: false })
      }
    }
    if (r.method() === 'POST' && (r.headers()['next-action'] || url.includes('/api/'))) return route.abort()
    return route.continue()
  })
}

async function startGame(page: Page) {
  await page.addInitScript((ids) => { try { localStorage.setItem('nivenxa.chess.coachIntro.v1', JSON.stringify(ids)); localStorage.setItem('nivenxa.chess.test.replyMinMs', '500') } catch {} }, INTRO_DONE)
  await page.goto('/chess/play', { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: /^Beginner/ }).click()
  await page.getByRole('button', { name: 'White', exact: true }).click()
  await page.getByRole('button', { name: 'Start Game' }).click()
  await page.waitForSelector('cg-board')
  await expect(page.getByText('Loading engine…')).toHaveCount(0, { timeout: 40000 })
}
const png = (w = 300, h = 200) => sharp({ create: { width: w, height: h, channels: 3, background: { r: 200, g: 80, b: 40 } } }).png().toBuffer()
const avatar = (p: Page) => p.getByTestId('player-avatar')
const dialog = (p: Page) => p.getByTestId('profile-picture-dialog')

async function choose(page: Page, buffer: Buffer, name = 'me.png', mimeType = 'image/png') {
  await page.getByTestId('profile-picture-file').setInputFiles({ name, mimeType, buffer })
}

test('guest: the default knight, no upload control, a sign-in prompt that does not interrupt the game', async ({ page }) => {
  await mock(page, newApi())
  await startGame(page)
  await expect(avatar(page)).toHaveAttribute('data-avatar-id', 'plum')
  await expect(page.getByTestId('player-avatar-image')).toHaveCount(0)
  await expect(page.getByTestId('player-avatar-change')).toHaveCount(0)
  await page.getByTestId('player-avatar-signin').click()
  await expect(page.locator('cg-board')).toBeVisible()
})

test('signed in: dedicated dialog (not over the board) with limits, upload, crop, circular preview, Save/Cancel', async ({ page, context }) => {
  await signIn(context)
  const api = newApi()
  await mock(page, api)
  await startGame(page)
  const board = (await page.locator('cg-board').first().boundingBox())!
  await page.getByTestId('player-avatar-change').click()
  await expect(dialog(page)).toBeVisible()
  await expect(dialog(page)).toHaveAttribute('aria-modal', 'true')
  await expect(page.getByTestId('profile-picture-limits')).toContainText('JPEG, PNG or WebP, up to 5 MB')
  await expect(page.getByTestId('profile-picture-save')).toBeDisabled() // nothing chosen yet
  await expect(page.getByTestId('profile-picture-remove')).toHaveCount(0) // no picture to remove
  await choose(page, await png())
  await expect(page.getByTestId('profile-picture-crop').locator('img')).toBeVisible()
  await expect(page.getByTestId('profile-picture-preview').locator('img')).toBeVisible()
  await expect(page.getByTestId('profile-picture-save')).toBeEnabled()
  // circular crop and preview
  for (const id of ['profile-picture-crop', 'profile-picture-preview']) {
    expect(await page.getByTestId(id).evaluate((el) => getComputedStyle(el).borderRadius)).toBe('50%')
  }
  await page.getByTestId('profile-picture-zoom').fill('2')
  await page.getByTestId('profile-picture-crop').press('ArrowLeft')
  await page.getByTestId('profile-picture-save').click()
  await expect(dialog(page)).toHaveCount(0)
  await expect(page.getByTestId('player-avatar-toast')).toHaveText('Profile picture updated.')
  await expect(page.getByTestId('player-avatar-image')).toHaveAttribute('src', /profile-picture\?u=.*&v=1$/)
  expect(api.posts).toHaveLength(1)
  expect(api.posts[0].square).toEqual([512, 512]) // the crop is exported as a square
  // the game is untouched and nothing permanent is left under the header
  expect(await page.locator('cg-board').first().boundingBox()).toEqual(board)
  await expect(page.getByText('Avatar saved')).toHaveCount(0)
  await expect(page.getByTestId('player-avatar-toast')).toHaveCount(0, { timeout: 8000 }) // brief
})

test('Cancel saves nothing; Escape closes; focus returns to the opener', async ({ page, context }) => {
  await signIn(context)
  const api = newApi()
  await mock(page, api)
  await startGame(page)
  await page.getByTestId('player-avatar-change').click()
  await choose(page, await png())
  await page.getByTestId('profile-picture-cancel').click()
  await expect(dialog(page)).toHaveCount(0)
  expect(api.posts).toHaveLength(0)
  await expect(avatar(page)).toHaveAttribute('data-avatar-id', 'plum')
  await expect(page.getByTestId('player-avatar-change')).toBeFocused()
  await page.getByTestId('player-avatar-change').click()
  await page.keyboard.press('Escape')
  await expect(dialog(page)).toHaveCount(0)
})

test('replace shows the new picture at once (versioned URL); Remove restores the default knight', async ({ page, context }) => {
  await signIn(context)
  const api = newApi()
  await mock(page, api)
  await startGame(page)
  for (const v of [1, 2]) {
    await page.getByTestId('player-avatar-change').click()
    await choose(page, await png(200 + v * 10, 200))
    await page.getByTestId('profile-picture-save').click()
    await expect(page.getByTestId('player-avatar-image')).toHaveAttribute('src', new RegExp(`&v=${v}$`))
  }
  await page.getByTestId('player-avatar-change').click()
  await page.getByTestId('profile-picture-remove').click()
  await expect(dialog(page)).toHaveCount(0)
  expect(api.deletes).toBe(1)
  await expect(page.getByTestId('player-avatar-image')).toHaveCount(0)
  await expect(avatar(page)).toHaveAttribute('data-avatar-id', 'plum')
})

test('invalid files are refused with a clear message and nothing is sent', async ({ page, context }) => {
  await signIn(context)
  const api = newApi()
  await mock(page, api)
  await startGame(page)
  await page.getByTestId('player-avatar-change').click()
  const err = page.getByTestId('profile-picture-error')
  await choose(page, Buffer.from('hello, not an image'), 'notes.txt', 'text/plain')
  await expect(err).toContainText('JPEG, PNG or WebP')
  await choose(page, Buffer.from('<?php echo 1; ?>'), 'evil.png', 'image/png') // right type, wrong content
  await expect(err).toContainText('could not be read as an image')
  await choose(page, Buffer.alloc(5 * 1024 * 1024 + 10, 1), 'huge.png', 'image/png')
  await expect(err).toContainText('larger than 5 MB')
  await choose(page, await png(40, 40))
  await expect(err).toContainText('too small')
  await expect(page.getByTestId('profile-picture-save')).toBeDisabled()
  expect(api.posts).toHaveLength(0)
})

test('a failed save shows the reason and keeps the previous picture', async ({ page, context }) => {
  await signIn(context)
  const api = newApi()
  await mock(page, api)
  await startGame(page)
  await page.getByTestId('player-avatar-change').click()
  await choose(page, await png())
  await page.getByTestId('profile-picture-save').click()
  await expect(page.getByTestId('player-avatar-image')).toHaveAttribute('src', /&v=1$/)
  await page.getByTestId('player-avatar-change').click()
  await choose(page, await png(260, 260))
  api.failNext = { status: 500, error: 'Your picture could not be saved. Your previous picture is unchanged.' }
  await page.getByTestId('profile-picture-save').click()
  await expect(page.getByTestId('profile-picture-error')).toContainText('previous picture is unchanged')
  await expect(dialog(page)).toBeVisible() // stays open so the player can retry or cancel
  await page.getByTestId('profile-picture-cancel').click()
  await expect(page.getByTestId('player-avatar-image')).toHaveAttribute('src', /&v=1$/)
  // a server-side rejection (e.g. invalid content) is shown the same way
  await page.getByTestId('player-avatar-change').click()
  await choose(page, await png(300, 300))
  api.failNext = { status: 422, error: 'That file is not a valid image.' }
  await page.getByTestId('profile-picture-save').click()
  await expect(page.getByTestId('profile-picture-error')).toContainText('not a valid image')
})

test('the picture persists across a reload and on another device (shared account state); signing in restores it', async ({ browser }) => {
  const api = newApi()
  const make = async () => {
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } })
    await signIn(ctx)
    const page = await ctx.newPage()
    await mock(page, api)
    return { ctx, page }
  }
  const a = await make()
  await startGame(a.page)
  await a.page.getByTestId('player-avatar-change').click()
  await choose(a.page, await png())
  await a.page.getByTestId('profile-picture-save').click()
  await expect(a.page.getByTestId('player-avatar-image')).toBeVisible()
  await a.page.reload({ waitUntil: 'networkidle' })
  await a.page.getByRole('button', { name: /^Beginner/ }).click()
  await a.page.getByRole('button', { name: 'Start Game' }).click()
  await expect(a.page.getByTestId('player-avatar-image')).toBeVisible()
  const b = await make() // "another device"
  await startGame(b.page)
  await expect(b.page.getByTestId('player-avatar-image')).toHaveAttribute('src', /&v=1$/)
  await a.ctx.close()
  await b.ctx.close()
})

test('an image that fails to load falls back to the default knight without moving the board', async ({ page, context }) => {
  await signIn(context)
  const api = newApi()
  api.has = true
  api.version = 3
  api.imageStatus = 500
  await mock(page, api)
  await startGame(page)
  const before = (await page.locator('cg-board').first().boundingBox())!
  await expect(avatar(page)).toHaveAttribute('data-avatar-id', 'plum')
  expect(await page.locator('cg-board').first().boundingBox()).toEqual(before)
  const box = (await avatar(page).boundingBox())!
  expect([Math.round(box.width), Math.round(box.height)]).toEqual([64, 64])
})

test('changing the picture mid-game never discards the game', async ({ page, context }) => {
  await signIn(context)
  const api = newApi()
  await mock(page, api)
  await startGame(page)
  const sq = async (s: string) => {
    const b = (await page.locator('cg-board').first().boundingBox())!
    return { x: b.x + ((s.charCodeAt(0) - 97 + 0.5) * b.width) / 8, y: b.y + ((7 - (Number(s[1]) - 1) + 0.5) * b.height) / 8 }
  }
  for (const s of ['e2', 'e4']) { const p = await sq(s); await page.mouse.click(p.x, p.y) }
  await expect(page.getByTestId('insight-reply')).toHaveAttribute('data-move', /./, { timeout: 15000 })
  await page.getByTestId('player-avatar-change').click()
  await choose(page, await png())
  await page.getByTestId('profile-picture-save').click()
  await expect(page.getByTestId('player-avatar-image')).toBeVisible()
  await expect(page.getByTestId('insight-you')).toHaveAttribute('data-move', 'e4')
  await expect(page.getByRole('button', { name: /^Undo/ })).toBeEnabled()
})

test('accessibility: the dialog has an accessible name, takes focus, keeps Tab inside it and labels every control', async ({ page, context }) => {
  await signIn(context)
  await mock(page, newApi())
  await startGame(page)
  await page.getByTestId('player-avatar-change').click()
  const dlg = page.getByRole('dialog', { name: 'Change profile picture' })
  await expect(dlg).toBeVisible()
  await expect(page.getByLabel('Zoom')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Save' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible()
  expect(await page.evaluate(() => !!document.activeElement?.closest('[role=dialog]'))).toBe(true) // focus moved inside
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press('Tab')
    expect(await page.evaluate(() => !!document.activeElement?.closest('[role=dialog]')), `Tab ${i}`).toBe(true) // never escapes behind the dialog
  }
  await page.keyboard.press('Escape')
  await expect(dlg).toHaveCount(0)
  await expect(page.getByTestId('player-avatar-change')).toBeFocused()
})
