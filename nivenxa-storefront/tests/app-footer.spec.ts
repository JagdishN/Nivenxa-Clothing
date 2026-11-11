import { test, expect, type Page } from '@playwright/test'

// One compact footer across Chess, Living and Technologies (Studio excluded and unchanged). Read-only.

const DESKTOP = { width: 1280, height: 800 }
const PHONE = { width: 390, height: 844 }

const APPS = {
  chess: { name: 'NIVENXA Chess', terms: '/chess/terms', privacy: '/chess/privacy', contact: /^mailto:/ },
  living: { name: 'NIVENXA Living', terms: '/living/terms', privacy: '/living/privacy', contact: /^mailto:/ },
  technologies: { name: 'NIVENXA Technologies', terms: '/terms', privacy: '/privacy', contact: '/contact' },
} as const

// Every public and working route we can open without an account.
const ROUTES: Array<[keyof typeof APPS, string]> = [
  ['chess', '/chess'],
  ['chess', '/chess/play'],
  ['chess', '/chess/learn'],
  ['chess', '/chess/learn/basics'],
  ['chess', '/chess/learn/tactics/forks'],
  ['chess', '/chess/analysis'],
  ['chess', '/chess/puzzles'],
  ['chess', '/chess/puzzles/mateIn1'],
  ['chess', '/chess/tournaments'],
  ['chess', '/chess/login'],
  ['chess', '/chess/terms'],
  ['chess', '/chess/privacy'],
  ['living', '/living'],
  ['living', '/living/login'],
  ['living', '/living/signup'],
  ['living', '/living/terms'],
  ['living', '/living/privacy'],
  ['technologies', '/technologies'],
]

async function visibleFooters(page: Page) {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll('footer'))
      .filter((f) => getComputedStyle(f).display !== 'none' && f.getBoundingClientRect().height > 0)
      .map((f) => ({
        label: f.getAttribute('aria-label'),
        height: Math.round(f.getBoundingClientRect().height),
        bg: getComputedStyle(f).backgroundColor,
        position: getComputedStyle(f).position,
      }))
  )
}

const lum = (rgb: string) => {
  const [r, g, b] = (rgb.match(/[\d.]+/g) ?? ['0', '0', '0']).slice(0, 3).map((n) => {
    const c = Number(n) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const ratio = (a: string, b: string) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

test.describe('the same complete footer on every route', () => {
  test.use({ viewport: DESKTOP })

  for (const [app, path] of ROUTES) {
    test(`${path}`, async ({ page }) => {
      const cfg = APPS[app]
      await page.goto(path, { waitUntil: 'networkidle' })
      expect(await visibleFooters(page), 'exactly one footer').toHaveLength(1)
      const footer = page.locator('footer:visible')
      await expect(footer).toHaveAttribute('aria-label', `${cfg.name} footer`)
      // nothing hidden behind a control
      await expect(footer.locator('button, details, summary, [aria-expanded]')).toHaveCount(0)
      await expect(footer.getByRole('heading', { name: 'NIVENXA', exact: true })).toBeVisible()
      await expect(footer.getByText(/comfortwear and software/)).toBeVisible()
      await expect(footer.locator('p').filter({ hasText: /a NIVENXA (app|brand)/ }).getByText(cfg.name.replace('NIVENXA ', ''), { exact: true })).toBeVisible()
      const links = async (h: string) =>
        footer.getByRole('navigation', { name: h }).getByRole('link')
      expect(await (await links('Brands')).allInnerTexts()).toEqual(['NIVENXA Studio', 'NIVENXA Technologies'])
      expect(await (await links('Apps')).allInnerTexts()).toEqual(['NIVENXA Chess', 'NIVENXA Living'])
      expect(await (await links('Support & Legal')).allInnerTexts()).toEqual(['Contact', 'Privacy Policy', 'Terms of Use'])
      const hrefs = async (h: string) => (await links(h)).evaluateAll((a) => a.map((x) => x.getAttribute('href')))
      expect(await hrefs('Brands')).toEqual(['/studio/en', '/technologies'])
      expect(await hrefs('Apps')).toEqual(['/chess', '/living'])
      const legal = await hrefs('Support & Legal')
      expect(legal[0]).toMatch(cfg.contact as RegExp | string)
      expect(legal.slice(1)).toEqual([cfg.privacy, cfg.terms])
      await expect(footer.getByText(/© \d{4} NIVENXA · Hyderabad, India/)).toBeVisible()
      // four balanced columns side by side on desktop
      const tops = await footer.locator('h2').evaluateAll((hs) => hs.map((h) => Math.round(h.getBoundingClientRect().top)))
      expect(new Set(tops).size, 'four headings on one line').toBe(1)
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    })
  }
})

test.describe('narrow screens and zoom', () => {
  test('phone: everything visible, two-column links, 36px+ targets, no overflow', async ({ page }) => {
    await page.setViewportSize(PHONE)
    await page.goto('/chess/terms', { waitUntil: 'networkidle' })
    const footer = page.locator('footer:visible')
    await footer.scrollIntoViewIfNeeded()
    await expect(footer.locator('button, details, summary')).toHaveCount(0)
    for (const h of ['NIVENXA', 'Brands', 'Apps', 'Support & Legal']) await expect(footer.getByRole('heading', { name: h, exact: true })).toBeVisible()
    const boxes = await footer.getByRole('link').evaluateAll((as) => as.map((a) => a.getBoundingClientRect()))
    for (const b of boxes) {
      expect(b.height).toBeGreaterThanOrEqual(35.5)
      expect(b.right).toBeLessThanOrEqual(PHONE.width)
    }
    const headTops = await footer.locator('h2').evaluateAll((hs) => hs.map((h) => Math.round(h.getBoundingClientRect().left)))
    expect(new Set(headTops).size, 'two columns (not one long stack)').toBeGreaterThan(1)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  })

  test('no overflow, clipping or hidden links at 320px and at 640×400 (200% zoom) on any app', async ({ page }) => {
    for (const vp of [{ width: 320, height: 568 }, { width: 640, height: 400 }]) {
      await page.setViewportSize(vp)
      for (const path of ['/chess', '/chess/play', '/living', '/technologies']) {
        await page.goto(path, { waitUntil: 'networkidle' })
        const r = await page.evaluate(() => {
          const f = document.querySelector('footer')!
          const fb = f.getBoundingClientRect()
          const out = Array.from(f.querySelectorAll('a')).filter((a) => {
            const b = a.getBoundingClientRect()
            return b.right > fb.right + 1 || b.left < fb.left - 1
          }).length
          return { over: f.scrollWidth > f.clientWidth + 1 || document.documentElement.scrollWidth > window.innerWidth, out }
        })
        expect(r, `${path} @${vp.width}`).toEqual({ over: false, out: 0 })
      }
    }
  })
})

test.describe('accessibility basics', () => {
  test.use({ viewport: DESKTOP })

  for (const [app, path] of [['chess', '/chess/terms'], ['living', '/living/terms'], ['technologies', '/technologies']] as const) {
    test(`${app}: text contrast ≥ 4.5:1 and visible keyboard focus`, async ({ page }) => {
      await page.goto(path, { waitUntil: 'networkidle' })
      const footer = page.locator('footer:visible')
      await footer.scrollIntoViewIfNeeded()
      const bg = await footer.evaluate((f) => getComputedStyle(f).backgroundColor)
      const colours = await footer.evaluate((f) => {
        const c = (sel: string) => getComputedStyle(f.querySelector(sel)!).color
        return { appName: c('p span:first-child'), by: c('p span:last-child'), title: c('h2'), desc: c('p'), link: c('a'), copy: c('p:last-child') }
      })
      for (const [label, colour] of Object.entries(colours)) expect(ratio(colour, bg), `${app} ${label}`).toBeGreaterThanOrEqual(4.5)
      for (const el of [footer.getByRole('link').first()]) {
        await el.focus()
        const o = await el.evaluate((a) => {
          const s = getComputedStyle(a)
          return { style: s.outlineStyle, width: parseFloat(s.outlineWidth), colour: s.outlineColor }
        })
        expect(o.style).not.toBe('none')
        expect(o.width).toBeGreaterThanOrEqual(2)
        expect(ratio(o.colour, bg)).toBeGreaterThanOrEqual(3)
      }
    })
  }
})

test.describe('Studio is excluded', () => {
  test.use({ viewport: DESKTOP })

  test('Studio keeps the original shared footer (colour and height as before)', async ({ page }) => {
    await page.goto('/studio/en/terms', { waitUntil: 'load' })
    await page.waitForTimeout(800)
    const feet = await visibleFooters(page)
    expect(feet).toHaveLength(1)
    expect(feet[0].label).toBeNull() // not an AppFooter
    expect(feet[0].bg).toBe('rgba(255, 255, 255, 0.5)')
    expect(feet[0].height).toBe(327) // measured before the footer work started
    await expect(page.locator('footer')).not.toContainText(/a NIVENXA (app|brand)/)
  })
})
