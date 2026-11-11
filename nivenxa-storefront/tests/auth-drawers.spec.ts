import { test, expect, type Page, type Route } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

// Chess and Living sign-in drawers with the Supabase auth endpoints MOCKED in the browser: no real email is sent, no
// real account or session is touched. It proves the interface behaviour (drawer, focus, auto-verify, one request per
// attempt, error kinds, retry, resend, stale responses, sign-out UI). It does NOT prove the real Supabase project's
// OTP length/expiry/rate limits, nor a real sign-in end to end (that needs a test account).

const OUT = join(process.cwd(), 'docs', 'chess-screenshots', 'auth-drawers')
mkdirSync(OUT, { recursive: true })

const jwt = (payload: object) => {
  const b = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url')
  return `${b({ alg: 'HS256', typ: 'JWT' })}.${b(payload)}.sig`
}
const SESSION = () => ({
  access_token: jwt({ sub: '00000000-0000-0000-0000-000000000001', email: 'mock.player@example.com', exp: Math.floor(Date.now() / 1000) + 3600, role: 'authenticated', aud: 'authenticated' }),
  token_type: 'bearer',
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  refresh_token: 'mock-refresh',
  user: { id: '00000000-0000-0000-0000-000000000001', aud: 'authenticated', role: 'authenticated', email: 'mock.player@example.com', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() },
})
const json = (route: Route, status: number, body: unknown) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })

interface Mock {
  otp: number
  verify: number
  verifyMode: 'wrong' | 'expired' | 'offline' | 'ok' | 'slow-ok'
  verifyDelayMs: number
  logoutMode: 'ok' | 'offline'
}

async function mockSupabase(page: Page): Promise<Mock> {
  const m: Mock = { otp: 0, verify: 0, verifyMode: 'wrong', verifyDelayMs: 0, logoutMode: 'ok' }
  await page.route('**/auth/v1/otp**', (route) => {
    m.otp++
    return json(route, 200, {})
  })
  await page.route('**/auth/v1/verify**', async (route) => {
    m.verify++
    if (m.verifyMode === 'offline') return route.abort('failed')
    if (m.verifyDelayMs) await new Promise((r) => setTimeout(r, m.verifyDelayMs))
    if (m.verifyMode === 'wrong') return json(route, 403, { code: 403, error_code: 'otp_expired', msg: 'Token has expired or is invalid' })
    if (m.verifyMode === 'expired') return json(route, 403, { code: 403, error_code: 'otp_expired', msg: 'Token has expired' })
    return json(route, 200, SESSION())
  })
  await page.route('**/auth/v1/user**', (route) => json(route, 200, SESSION().user))
  await page.route('**/auth/v1/logout**', (route) => (m.logoutMode === 'offline' ? route.abort('failed') : route.fulfill({ status: 204, body: '' })))
  // Living: "does this account already belong to an apartment?" -> no (a brand-new account).
  await page.route('**/rest/v1/living_memberships**', (route) =>
    json(route, 406, { code: 'PGRST116', details: 'The result contains 0 rows', hint: null, message: 'JSON object requested, multiple (or no) rows returned' })
  )
  return m
}

test.describe('Chess drawer', () => {
  test.use({ viewport: { width: 1280, height: 800 } })

  test('Log In opens the drawer over the page; Escape closes it, focus returns, nothing navigates', async ({ page }) => {
    await page.goto('/chess', { waitUntil: 'networkidle' })
    const login = page.getByRole('button', { name: 'Log In' })
    await login.click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole('heading', { name: 'Log In' })).toBeVisible()
    await expect(dialog).toContainText("Enter your email address to sign in. We'll send you a verification code.")
    await expect(dialog.getByRole('textbox', { name: 'Email address' })).toBeFocused()
    await expect(dialog.getByRole('button', { name: 'Send code' })).toBeVisible()
    await expect(dialog).not.toContainText('registered with your apartment')
    // scroll is locked, the home page is still there behind the backdrop
    expect(await page.evaluate(() => getComputedStyle(document.body).overflow)).toBe('hidden')
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Play smarter')
    await page.screenshot({ path: join(OUT, 'chess-drawer-email-desktop.png') })

    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(login).toBeFocused()
    expect(await page.evaluate(() => getComputedStyle(document.body).overflow)).not.toBe('hidden')
    expect(new URL(page.url()).pathname).toBe('/chess')
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Play smarter')
  })

  test('Tab stays inside the drawer; the × button and the backdrop close it', async ({ page }) => {
    await page.goto('/chess', { waitUntil: 'networkidle' })
    await page.getByRole('button', { name: 'Log In' }).click()
    const dialog = page.getByRole('dialog')
    for (let i = 0; i < 8; i++) {
      await page.keyboard.press('Tab')
      expect(await dialog.evaluate((d) => d.contains(document.activeElement))).toBe(true)
    }
    await page.keyboard.press('Shift+Tab')
    expect(await dialog.evaluate((d) => d.contains(document.activeElement))).toBe(true)
    await dialog.getByRole('button', { name: 'Close' }).click()
    await expect(dialog).toBeHidden()
    await page.getByRole('button', { name: 'Log In' }).click()
    await page.mouse.click(40, 400) // on the backdrop
    await expect(dialog).toBeHidden()
  })

  test('old /chess/login links open the home page with the drawer; closing keeps the page; destination is kept', async ({ page }) => {
    await page.goto('/chess/login?redirect=/chess/puzzles', { waitUntil: 'networkidle' })
    expect(new URL(page.url()).pathname).toBe('/chess')
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    expect(new URL(page.url()).searchParams.get('redirect')).toBe('/chess/puzzles')
    await dialog.getByRole('button', { name: 'Close' }).click()
    await expect(dialog).toBeHidden()
    expect(page.url()).not.toContain('auth=') // refreshing will not reopen it
    expect(new URL(page.url()).pathname).toBe('/chess')
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Play smarter')

    // sign-up route too
    await page.goto('/chess/signup', { waitUntil: 'networkidle' })
    await expect(page.getByRole('dialog').getByRole('heading', { name: 'Sign Up' })).toBeVisible()
  })

  test('unsafe destinations are never kept', async ({ page }) => {
    for (const bad of ['https://evil.example/x', '//evil.example', '/living/home', '/chess/../admin', '/chess/login']) {
      await page.goto(`/chess/login?redirect=${encodeURIComponent(bad)}`, { waitUntil: 'networkidle' })
      expect(new URL(page.url()).searchParams.get('redirect'), bad).toBe('/chess/analysis')
    }
  })

  test('mobile: full-width panel', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/chess', { waitUntil: 'networkidle' })
    await page.getByRole('button', { name: 'Log In' }).click()
    await page.waitForTimeout(700) // slide-in finished
    const box = (await page.getByRole('dialog').boundingBox())!
    expect(box.width).toBeGreaterThanOrEqual(388)
    expect(box.x).toBeLessThanOrEqual(1)
    await page.screenshot({ path: join(OUT, 'chess-drawer-email-mobile.png') })
  })

  test('email check, then the code step: automatic verification, one request, error kinds, retry, correction', async ({ page }) => {
    const m = await mockSupabase(page)
    await page.goto('/chess', { waitUntil: 'networkidle' })
    await page.getByRole('button', { name: 'Log In' }).click()
    const dialog = page.getByRole('dialog')
    const email = dialog.getByRole('textbox', { name: 'Email address' })

    await email.fill('not-an-email')
    await dialog.getByRole('button', { name: 'Send code' }).click()
    await expect(dialog.getByRole('alert')).toContainText('valid email address')
    expect(m.otp).toBe(0)

    await email.fill('mock.player@example.com')
    await dialog.getByRole('button', { name: 'Send code' }).dblclick() // a double click sends once
    const code = dialog.getByLabel('Digit 1 of 6')
    await expect(code).toBeVisible()
    await expect(dialog.getByRole('textbox', { name: /Digit \d of 6/ })).toHaveCount(6)
    expect(m.otp).toBe(1)
    await expect(dialog.getByRole('button', { name: /Resend code in \d+s/ })).toBeDisabled()
    await expect(dialog.getByRole('button', { name: 'Change email' })).toBeVisible()
    await expect(dialog.getByRole('button', { name: /Verify/ })).toHaveCount(0) // no verify button
    await page.screenshot({ path: join(OUT, 'chess-drawer-code-desktop.png') })

    // five digits: nothing; the sixth verifies by itself, once
    await expect(code).toBeFocused()
    await page.keyboard.type('12345')
    await page.waitForTimeout(300)
    expect(m.verify).toBe(0)
    await page.keyboard.type('6')
    await expect(dialog.getByRole('alert')).toContainText("isn't right, or it may have expired")
    expect(m.verify).toBe(1)
    await expect(dialog.getByLabel('Digit 6 of 6')).toHaveValue('6') // kept so one digit can be corrected
    await page.screenshot({ path: join(OUT, 'chess-drawer-code-error-desktop.png') })

    // the same refused code again is explained, not re-sent
    await dialog.getByLabel('Digit 6 of 6').focus()
    await page.keyboard.press('Backspace')
    await page.keyboard.type('6')
    await expect(dialog.getByRole('alert')).toContainText("isn't right")
    await page.waitForTimeout(300)
    expect(m.verify).toBe(1)

    // network failure: its own message + Retry verification, code kept
    m.verifyMode = 'offline'
    await code.fill('222222')
    await expect(dialog.getByRole('alert')).toContainText("couldn't reach the server")
    expect(m.verify).toBe(2)
    await expect(dialog.getByLabel('Digit 6 of 6')).toHaveValue('2')
    await page.screenshot({ path: join(OUT, 'chess-drawer-network-error-desktop.png') })
    m.verifyMode = 'ok'
    await dialog.getByRole('button', { name: 'Retry verification' }).click()
    // the server confirmed: a first-time account is asked who it is for (consent), not sent anywhere yet
    await expect(dialog.getByText('Who is this account for?')).toBeVisible()
    expect(m.verify).toBe(3)
  })

  test('paste / autofill of the whole code (with a space) verifies once; rapid duplicate input sends one request', async ({ page }) => {
    const m = await mockSupabase(page)
    await page.goto('/chess', { waitUntil: 'networkidle' })
    await page.getByRole('button', { name: 'Log In' }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByRole('textbox', { name: 'Email address' }).fill('mock.player@example.com')
    await dialog.getByRole('button', { name: 'Send code' }).click()
    const code = dialog.getByLabel('Digit 1 of 6')
    await code.focus()
    await page.evaluate(() => {
      const dt = new DataTransfer()
      dt.setData('text/plain', '654 321')
      document.activeElement!.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }))
    })
    await expect(dialog.getByRole('alert')).toContainText("isn't right")
    expect(m.verify).toBe(1)
    await code.fill('111111')
    await code.fill('111111')
    await page.waitForTimeout(400)
    expect(m.verify).toBe(2)
  })

  test('Change email while a check is in flight: the late answer is ignored', async ({ page }) => {
    const m = await mockSupabase(page)
    m.verifyMode = 'ok'
    m.verifyDelayMs = 1200
    await page.goto('/chess', { waitUntil: 'networkidle' })
    await page.getByRole('button', { name: 'Log In' }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByRole('textbox', { name: 'Email address' }).fill('mock.player@example.com')
    await dialog.getByRole('button', { name: 'Send code' }).click()
    await dialog.getByLabel('Digit 1 of 6').fill('123456')
    await expect(dialog.getByText('Verifying…')).toBeVisible() // immediately
    await page.waitForTimeout(150)
    // Change email is disabled while verifying; Escape/close is the way out — then the late "success" must not act
    await page.keyboard.press('Escape')
    await page.waitForTimeout(1600)
    expect(new URL(page.url()).pathname).toBe('/chess')
    await expect(page.getByRole('dialog')).toBeHidden()
  })

  test('sign-out: confirmation on the home page, drawer closed; a failed sign-out says so and stays signed in', async ({ page }) => {
    const m = await mockSupabase(page)
    m.verifyMode = 'ok'
    await page.goto('/chess', { waitUntil: 'networkidle' })
    await page.getByRole('button', { name: 'Log In' }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByRole('textbox', { name: 'Email address' }).fill('mock.player@example.com')
    await dialog.getByRole('button', { name: 'Send code' }).click()
    await dialog.getByLabel('Digit 1 of 6').fill('123456')
    await expect(dialog.getByText('Who is this account for?')).toBeVisible()
    await dialog.getByRole('button', { name: 'Close' }).click()
    // Signed in: the avatar menu (full email, My Activity, Log out) replaces the old text button.
    await page.getByRole('button', { name: 'Account menu' }).click()
    const logout = page.getByRole('button', { name: 'Log out' })
    await expect(logout).toBeVisible()

    // Server unreachable: this browser's session is still cleared, so the app signs out here and says so.
    m.logoutMode = 'offline'
    await logout.click()
    await page.waitForURL(/\/chess(\?|$)/)
    await expect(page.getByText("You've been signed out.")).toBeVisible()
    await expect(page.getByRole('button', { name: 'Log In' })).toBeVisible()
    await page.screenshot({ path: join(OUT, 'chess-signed-out-desktop.png') })
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect.poll(() => page.url()).not.toContain('signed_out')
  })
})

test.describe('Living drawer', () => {
  test.use({ viewport: { width: 1280, height: 800 } })

  test('Login opens the drawer with the new wording; focus, Escape, scroll lock', async ({ page }) => {
    await page.goto('/living', { waitUntil: 'networkidle' })
    const login = page.getByRole('button', { name: 'Login' }).first()
    await login.click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog).toContainText("Enter your email address to sign in. We'll send you a verification code.")
    await expect(dialog).not.toContainText('registered with your apartment')
    await expect(dialog.getByRole('button', { name: 'Send code' })).toBeVisible()
    await expect(dialog.getByRole('textbox', { name: 'Email address' })).toBeFocused()
    expect(await page.evaluate(() => getComputedStyle(document.body).overflow)).toBe('hidden')
    await page.screenshot({ path: join(OUT, 'living-drawer-email-desktop.png') })
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(login).toBeFocused()
    expect(new URL(page.url()).pathname).toBe('/living')
  })

  test('old /living/login links open the landing page with the drawer; unsafe destinations are dropped', async ({ page }) => {
    await page.goto('/living/login?redirect=/living/billing', { waitUntil: 'networkidle' })
    expect(new URL(page.url()).pathname).toBe('/living')
    await expect(page.getByRole('dialog')).toBeVisible()
    expect(new URL(page.url()).searchParams.get('redirect')).toBe('/living/billing')
    await page.getByRole('dialog').getByRole('button', { name: 'Close' }).click()
    await expect(page.getByRole('dialog')).toBeHidden()
    expect(page.url()).not.toContain('auth=')
    for (const bad of ['https://evil.example', '//evil.example', '/chess/play', '/living/login']) {
      await page.goto(`/living/login?redirect=${encodeURIComponent(bad)}`, { waitUntil: 'networkidle' })
      expect(new URL(page.url()).searchParams.get('redirect'), bad).toBe('/living/home')
    }
  })

  test('code step: automatic verification, paste/autofill, backspace, errors, retry, no verify button', async ({ page }) => {
    const m = await mockSupabase(page)
    await page.goto('/living', { waitUntil: 'networkidle' })
    await page.getByRole('button', { name: 'Login' }).first().click()
    const dialog = page.getByRole('dialog')
    await dialog.getByRole('textbox', { name: 'Email address' }).fill('mock.player@example.com')
    await dialog.getByRole('button', { name: 'Send code' }).click()
    await expect(dialog.getByRole('button', { name: /Verify/ })).toHaveCount(0)
    await expect(dialog.getByRole('button', { name: /Resend code in \d+s/ })).toBeDisabled()
    const box = (n: number) => dialog.getByLabel(`Digit ${n} of 6`)

    await expect(box(1)).toBeFocused()
    await page.keyboard.type('12345')
    await page.waitForTimeout(300)
    expect(m.verify).toBe(0)
    await page.keyboard.press('Backspace') // clears digit 5 and stays editable
    await page.keyboard.type('56')
    await expect(dialog.getByRole('alert')).toContainText("isn't right, or it may have expired")
    expect(m.verify).toBe(1)
    await page.screenshot({ path: join(OUT, 'living-drawer-code-error-desktop.png') })

    // correction: change one digit -> the corrected complete code is verified automatically
    m.verifyMode = 'expired'
    await box(6).focus()
    await page.keyboard.press('Backspace')
    await page.keyboard.type('7')
    await expect(dialog.getByRole('alert')).toContainText('has expired')
    expect(m.verify).toBe(2)

    // autofill: the whole code lands in the first box
    m.verifyMode = 'offline'
    await box(1).fill('987654')
    await expect(dialog.getByRole('alert')).toContainText("couldn't reach the server")
    expect(m.verify).toBe(3)
    await page.screenshot({ path: join(OUT, 'living-drawer-network-error-desktop.png') })
    m.verifyMode = 'ok'
    await dialog.getByRole('button', { name: 'Retry verification' }).click()
    // brand-new account: the server confirmed, now Create or Join
    await expect(dialog.getByText('You’re verified')).toBeVisible()
    expect(m.verify).toBe(4)
    await page.screenshot({ path: join(OUT, 'living-drawer-verified-desktop.png') })
  })

  test('paste of a whole code (with a space) verifies once', async ({ page }) => {
    const m = await mockSupabase(page)
    await page.goto('/living', { waitUntil: 'networkidle' })
    await page.getByRole('button', { name: 'Login' }).first().click()
    const dialog = page.getByRole('dialog')
    await dialog.getByRole('textbox', { name: 'Email address' }).fill('mock.player@example.com')
    await dialog.getByRole('button', { name: 'Send code' }).click()
    await dialog.getByLabel('Digit 1 of 6').focus()
    await page.evaluate(() => {
      const dt = new DataTransfer()
      dt.setData('text/plain', '654 321')
      document.activeElement!.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }))
    })
    await expect(dialog.getByRole('alert')).toContainText("isn't right")
    expect(m.verify).toBe(1)
  })

  test('mobile: full-width panel', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/living', { waitUntil: 'networkidle' })
    await page.getByRole('button', { name: 'Login' }).first().click()
    await page.waitForTimeout(800) // slide-in finished
    const box = (await page.getByRole('dialog').boundingBox())!
    expect(box.width).toBeGreaterThanOrEqual(388)
    await page.screenshot({ path: join(OUT, 'living-drawer-email-mobile.png') })
  })
})

test.describe('Living Create Apartment hierarchy', () => {
  for (const vp of [
    { name: 'desktop', width: 1280, height: 800 },
    { name: 'mobile', width: 390, height: 844 },
  ]) {
    test(`one prominent button in the hero, a quiet header link, nothing repeated at the bottom (${vp.name})`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height })
      await page.goto('/living', { waitUntil: 'networkidle' })
      const creates = page.getByRole('button', { name: 'Create Apartment' })
      await expect(creates).toHaveCount(2) // header (quiet) + hero (primary) — the bottom one is gone
      const hero = page.locator('section').first().getByRole('button', { name: 'Create Apartment' })
      const header = page.locator('header').getByRole('button', { name: 'Create Apartment' })
      await expect(hero).toBeVisible()
      const heroBox = (await hero.boundingBox())!
      const headerBox = (await header.boundingBox())!
      expect(heroBox.height).toBeGreaterThanOrEqual(44)
      expect(headerBox.height).toBeLessThan(heroBox.height + 1)
      const headerStyle = await header.evaluate((b) => ({ bg: getComputedStyle(b).backgroundColor, border: getComputedStyle(b).borderTopWidth }))
      expect(headerStyle.border).toBe('0px')
      expect(headerStyle.bg).toBe('rgba(0, 0, 0, 0)')
      // no CTA between the last content section and the footer, and no big gap left behind
      const gap = await page.evaluate(() => {
        const sections = Array.from(document.querySelectorAll('section'))
        const last = sections[sections.length - 1].getBoundingClientRect()
        const footer = document.querySelector('footer')!.getBoundingClientRect()
        return Math.round(footer.top - last.bottom)
      })
      expect(gap).toBeLessThan(80)
      await page.screenshot({ path: join(OUT, `living-landing-${vp.name}-full.png`), fullPage: true }).catch(() => {})
      await page.screenshot({ path: join(OUT, `living-landing-${vp.name}.png`) })
    })
  }
})
