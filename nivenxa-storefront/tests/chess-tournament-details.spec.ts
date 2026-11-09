import { test, expect } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

// Event details: date & venue first, correct links, consistency with Home/listing, gallery access. Read-only.
const OUT = join(process.cwd(), 'docs', 'chess-screenshots', process.env.LABEL ?? 'round3')
mkdirSync(OUT, { recursive: true })

for (const vp of [
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'mobile', width: 390, height: 844 },
]) {
  test.describe(vp.name, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } })

    test('details page: Date & time and Venue sit above the fold, before registration and supporting facts', async ({ page }) => {
      await page.goto('/chess/tournaments', { waitUntil: 'networkidle' })
      const href = await page.locator('a[href^="/chess/tournaments/"]').evaluateAll((as) =>
        (as as HTMLAnchorElement[]).map((a) => a.getAttribute('href')!).find((h) => /^\/chess\/tournaments\/[0-9a-f-]{36}$/.test(h))
      )
      test.skip(!href, 'no upcoming tournament in the database')
      await page.screenshot({ path: join(OUT, `listing-${vp.name}.png`), fullPage: false })
      await page.goto(href!, { waitUntil: 'networkidle' })

      const when = page.locator('p', { hasText: 'Date & time' }).first()
      const where = page.locator('p', { hasText: /^\W*Venue$/ }).first()
      await expect(when).toBeVisible()
      await expect(where).toBeVisible()
      const geo = await page.evaluate(() => {
        const q = (t: string) => Array.from(document.querySelectorAll('p')).find((p) => p.textContent?.trim().endsWith(t))!.getBoundingClientRect()
        const reg = document.querySelector('[class*="regRow"]')?.getBoundingClientRect()
        const facts = document.querySelector('dl')?.getBoundingClientRect()
        return { when: q('Date & time').bottom, where: q('Venue').bottom, reg: reg?.top ?? null, facts: facts?.top ?? null, vh: window.innerHeight }
      })
      expect(geo.when).toBeLessThan(geo.vh)
      expect(geo.where).toBeLessThan(geo.vh)
      if (geo.reg !== null) expect(geo.reg).toBeGreaterThan(geo.where - 1)
      if (geo.facts !== null) expect(geo.facts).toBeGreaterThan(geo.where)

      // date reads as a long weekday date; venue name + address + directions
      const panel = page.locator('section', { has: page.locator('p', { hasText: 'Date & time' }) }).first()
      await expect(panel).toContainText(/(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday), \d{1,2} \w+ \d{4}/)
      const dir = page.getByRole('link', { name: /Get directions/ })
      await expect(dir).toHaveAttribute('href', /^https:\/\/www\.google\.com\/maps/)
      await expect(dir).toHaveAttribute('target', '_blank')
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
      // money is INR, time control is spelled out when present
      const facts = await page.locator('dl').first().innerText().catch(() => '')
      if (/Entry fee/.test(facts)) expect(facts).toMatch(/Entry fee\s*\n?\s*₹[\d,]+/)
      if (/Time control/.test(facts)) expect(facts).not.toMatch(/Time control\s*\n?\s*\d+\+\d+/)
      await page.screenshot({ path: join(OUT, `details-${vp.name}.png`), fullPage: false })
      await page.screenshot({ path: join(OUT, `details-${vp.name}-full.png`), fullPage: true }).catch(() => {})
    })

    test('home strip, listing and details agree on the date and venue', async ({ page }) => {
      await page.goto('/chess', { waitUntil: 'networkidle' })
      const card = page.getByRole('region', { name: 'Next tournament' })
      test.skip((await card.count()) === 0, 'no upcoming tournament')
      const title = (await card.getByRole('heading').innerText()).trim()
      const venueShort = (await card.locator('[title]').last().innerText()).trim()
      await card.getByRole('link', { name: /View details/ }).click()
      await page.waitForURL(/\/chess\/tournaments\/[0-9a-f-]{36}/)
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(title)
      await expect(page.locator('main')).toContainText(venueShort.split(',')[0])
      await page.screenshot({ path: join(OUT, `home-card-details-${vp.name}.png`) })
    })
  })
}

test('past tournaments link is readable and photos open from the keyboard', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/chess/tournaments', { waitUntil: 'networkidle' })
  const link = page.getByRole('link', { name: /Past Tournaments/ }).first()
  await expect(link).toBeVisible()
  const colour = await link.evaluate((a) => getComputedStyle(a).color)
  expect(colour).not.toMatch(/rgba\(.*0\.\d+\)/)
  const thumbs = page.getByRole('button', { name: /^Open photo:/ })
  test.skip((await thumbs.count()) === 0, 'no gallery photos')
  await thumbs.first().focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toBeHidden()
  await page.screenshot({ path: join(OUT, 'listing-gallery-desktop-full.png'), fullPage: true }).catch(() => {})
})

test('unknown tournament ids: malformed = real 404; well-formed but missing = not-found page, noindex', async ({ page }) => {
  const bad = await page.goto('/chess/tournaments/not-a-real-id')
  expect(bad?.status()).toBe(404)
  await page.goto('/chess/tournaments/00000000-0000-0000-0000-000000000000', { waitUntil: 'networkidle' })
  await expect(page.getByText(/could not be found|not found|404/i).first()).toBeVisible()
  expect(await page.locator('meta[name="robots"][content*="noindex"]').count()).toBeGreaterThan(0)
})
