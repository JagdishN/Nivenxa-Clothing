import { test, expect } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

// The compact home tournament card. Real home page = whatever event the database has right now; every other
// state (deadline, live, long names, …) is checked on /chess/dev-preview/tournament-card, which only exists in
// development. Read-only.

const SHOTS = join(process.cwd(), 'docs', 'chess-screenshots', 'tournament-card')

for (const vp of [
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'mobile', width: 390, height: 844 },
]) {
  test.describe(vp.name, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } })

    test('home: the card is directly under the nav and above the hero, and links to that event', async ({ page }) => {
      mkdirSync(SHOTS, { recursive: true })
      await page.goto('/chess', { waitUntil: 'networkidle' })
      const card = page.getByRole('region', { name: 'Next tournament' })
      if ((await card.count()) === 0) {
        // No upcoming event in the database: the card must not exist and nothing else may stand in for it.
        await expect(page.getByText(/View details/)).toHaveCount(0)
        test.info().annotations.push({ type: 'note', description: 'no upcoming event in the database — card correctly absent' })
        return
      }
      const nav = (await page.locator('header').first().boundingBox())!
      const box = (await card.boundingBox())!
      const hero = (await page.getByRole('heading', { level: 1 }).boundingBox())!
      expect(box.y).toBeGreaterThanOrEqual(nav.y + nav.height - 1)
      expect(box.y + box.height).toBeLessThan(hero.y)
      expect(box.height).toBeLessThan(vp.name === 'mobile' ? 260 : 140)
      const details = card.getByRole('link', { name: /View details/ })
      await expect(details).toHaveAttribute('href', /^\/chess\/tournaments\/[0-9a-f-]{8,}/)
      // No horizontal overflow from the card.
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
      await page.screenshot({ path: join(SHOTS, `home-${vp.name}.png`), clip: { x: 0, y: 0, width: vp.width, height: Math.min(vp.height, 700) } })
      // The details link works.
      await details.click()
      await expect(page).toHaveURL(/\/chess\/tournaments\/[0-9a-f-]+$/)
    })

    test('every state, long names, and overflow (dev preview)', async ({ page }) => {
      mkdirSync(SHOTS, { recursive: true })
      const res = await page.goto('/chess/dev-preview/tournament-card', { waitUntil: 'networkidle' })
      test.skip(res?.status() === 404, 'preview route is development-only')
      const text = (label: string) => page.locator(`[data-case="${label}"]`)

      await expect(text('open, link').getByText('Registration open', { exact: true })).toBeVisible()
      await expect(text('open, link').getByRole('link', { name: 'Register' })).toHaveAttribute('href', 'https://example.com/register')
      await expect(text('open, link').getByText('15 Nov 2026 · Pragathi Nagar, Hyderabad')).toBeVisible()
      await expect(text('open, whatsapp only, 2 more').getByRole('link', { name: 'Register' })).toHaveAttribute('href', /wa\.me\/917416996665/)
      await expect(text('open, whatsapp only, 2 more').getByRole('link', { name: '+2 more · All tournaments' })).toHaveAttribute('href', '/chess/tournaments')
      await expect(text('open, link').getByRole('link', { name: /more · All tournaments/ })).toHaveCount(0)
      await expect(text('deadline in future').getByText('Registration open · closes 12 Nov')).toBeVisible()
      await expect(text('deadline today').getByText('Registration closes today')).toBeVisible()
      await expect(text('deadline passed').getByText('Registration closed')).toBeVisible()
      await expect(text('deadline passed').getByRole('link', { name: 'Register' })).toHaveCount(0)
      await expect(text('no way to register').getByText('Contact the organiser to register')).toBeVisible()
      await expect(text('no way to register').getByRole('link', { name: 'Register' })).toHaveCount(0)
      await expect(text('live now').getByText('Live now', { exact: true })).toBeVisible()
      await expect(text('live now').getByText('Event in progress')).toBeVisible()
      await expect(text('live now').getByRole('link', { name: 'Register' })).toHaveCount(0)
      await expect(text('starts today').getByText('Today', { exact: true })).toBeVisible()
      await expect(text('multi-day across months').getByText(/30 Nov.*2 Dec 2026/)).toBeVisible()

      // Every card has a "View details" link; none overflows the viewport sideways, even with the very long name.
      for (const label of ['open, link', 'very long name and venue', 'live now']) {
        await expect(text(label).getByRole('link', { name: /View details/ })).toBeVisible()
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
      const long = (await text('very long name and venue').getByRole('region').boundingBox())!
      expect(long.height).toBeLessThan(vp.name === 'mobile' ? 330 : 170)
      const title = text('very long name and venue').getByRole('heading')
      expect(await title.evaluate((el) => el.scrollHeight <= el.clientHeight + 1 || getComputedStyle(el).overflow === 'hidden')).toBe(true)
      await expect(title).toHaveAttribute('title', /Under-14 Players Across Telangana/)
      await page.screenshot({ path: join(SHOTS, `states-${vp.name}.png`), fullPage: true })
    })
  })
}
