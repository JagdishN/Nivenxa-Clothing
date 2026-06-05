/**
 * Verification suite for 4 fixes:
 *  Flow 1 — EditsSection card hrefs point to /edits/[slug]
 *  Flow 2 — Zoom scroll wheel navigates images (background doesn't scroll)
 *  Flow 3 — Zoom colour switch preserves image index
 *  Flow 4 — Newsletter submit shows confirmation (already verified; sanity check)
 */

import { test, expect, Page } from '@playwright/test'

const BASE = 'http://localhost:3000'

// ── Flow 1 — EditsSection navigation ─────────────────────────────────────────
test('Flow 1 — EditsSection: every card href points to /edits/[slug]', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', e => errors.push(e.message))

  await page.goto(`${BASE}/en`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1000)

  // Gather all <a> hrefs on the page
  const allHrefs = await page.locator('a[href]').evaluateAll(
    (els) => els.map(el => (el as HTMLAnchorElement).getAttribute('href') ?? '')
  )

  console.log('  All hrefs found:', allHrefs.filter(h => h.includes('edit') || h.includes('shop')).slice(0, 20))

  // Every edits-related href should point to /en/edits/... NOT to /en/shop/.../<product>
  const editHrefs = allHrefs.filter(h => h.includes('/edits/'))
  console.log('  Edit hrefs:', editHrefs)

  // Should find at least 4 distinct edit slugs
  const expectedSlugs = ['everyday-edit', 'utility-edit', 'rest-edit', 'womens-edit']
  for (const slug of expectedSlugs) {
    const found = editHrefs.some(h => h.includes(slug))
    expect(found, `href includes /edits/${slug}`).toBe(true)
    console.log(`  /edits/${slug}: ✓`)
  }

  // No edit card should link to a product colour page
  const wrongHrefs = allHrefs.filter(h =>
    h.includes('/shop/over-tee-shirts') ||
    h.includes('/shop/cargo-pants') ||
    h.includes('/shop/women-sleepwear') ||
    h.includes('/shop/a-line-kurta') ||
    h.includes('/shop/kids-sleepwear')
  )
  expect(wrongHrefs, 'no edit cards link to product pages').toHaveLength(0)
  console.log('  No product-page hrefs in edit cards: ✓')

  // Click The Everyday Edit card and confirm URL
  const everydayLink = page.locator(`a[href*="everyday-edit"]`).first()
  await expect(everydayLink, 'Everyday Edit card exists').toBeVisible()
  await everydayLink.click()
  await page.waitForURL(`${BASE}/en/edits/everyday-edit`, { timeout: 8000 })
  console.log('  Click → navigated to /en/edits/everyday-edit: ✓')
  expect(page.url()).not.toContain('/shop/')

  expect(errors).toEqual([])
})

// ── Flow 2 — Zoom scroll ───────────────────────────────────────────────────────
test('Flow 2 — Zoom scroll: wheel down advances image, background stays fixed', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', e => errors.push(e.message))

  await page.goto(`${BASE}/en/shop/over-tee-shirts/raw-oat`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1500)

  // Open zoom
  const zoomTrigger = page.locator('[aria-label="Open image zoom"]').first()
  await expect(zoomTrigger, 'zoom trigger visible').toBeVisible({ timeout: 5000 })
  await zoomTrigger.click()
  await page.waitForTimeout(600)

  // Confirm overlay opened
  const overlay = page.locator('[class*="overlay"]').first()
  await expect(overlay, 'zoom overlay opened').toBeVisible()
  console.log('  Zoom overlay opened: ✓')

  // Read starting counter
  const counter = page.locator('[class*="counter"]').first()
  const beforeText = await counter.textContent()
  console.log(`  Counter before scroll: "${beforeText}"`)

  // Get starting scroll position of page
  const scrollBefore = await page.evaluate(() => window.scrollY)

  // Scroll wheel down on the image col
  const imageCol = page.locator('[class*="imageCol"]').first()
  await imageCol.hover()
  await page.mouse.wheel(0, 300)
  await page.waitForTimeout(700)

  const afterText = await counter.textContent()
  console.log(`  Counter after scroll down: "${afterText}"`)

  // Counter should have changed
  expect(afterText, 'image counter changed after wheel down').not.toBe(beforeText)
  console.log('  Counter changed: ✓')

  // Background page scroll should NOT have changed
  const scrollAfter = await page.evaluate(() => window.scrollY)
  console.log(`  Page scrollY: before=${scrollBefore} after=${scrollAfter}`)
  expect(scrollAfter, 'background page did not scroll').toBe(scrollBefore)
  console.log('  Background page did not scroll: ✓')

  // Wheel up — counter should go back
  await page.mouse.wheel(0, -300)
  await page.waitForTimeout(700)
  const backText = await counter.textContent()
  console.log(`  Counter after scroll up: "${backText}"`)
  expect(backText, 'counter returns after scroll up').toBe(beforeText)
  console.log('  Counter back to start: ✓')

  expect(errors).toEqual([])
})

// ── Flow 3 — Zoom colour + image index preserved ──────────────────────────────
test('Flow 3 — Zoom: colour switch preserves image index', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', e => errors.push(e.message))

  await page.goto(`${BASE}/en/shop/over-tee-shirts/raw-oat`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1500)

  // Open zoom
  const zoomTrigger = page.locator('[aria-label="Open image zoom"]').first()
  await zoomTrigger.click()
  await page.waitForTimeout(600)

  const counter = page.locator('[class*="counter"]').first()
  const startText = await counter.textContent()
  console.log(`  Starting counter: "${startText}"`)

  // Navigate to image 3 (index 2) via thumbnail
  const thumbBtns = page.locator('[class*="thumbCol"] button')
  const thumbCount = await thumbBtns.count()
  console.log(`  Thumbnail count: ${thumbCount}`)

  if (thumbCount >= 3) {
    await thumbBtns.nth(2).click()
    await page.waitForTimeout(500)
    const atImg3 = await counter.textContent()
    console.log(`  Counter at image 3: "${atImg3}"`)
    expect(atImg3, 'counter shows 03').toContain('03')

    // Swatches inside the zoom editCol are <button aria-label="ColourName">
    // Use the editCol scope to avoid matching product-page ColourSwatch spans
    const editCol = page.locator('[class*="editCol"]').first()
    const swatches = editCol.locator('button[aria-label]').filter({ hasNot: page.locator('[class*="navBtn"]') })
    const swatchCount = await swatches.count()
    console.log(`  Swatch count in zoom editCol: ${swatchCount}`)

    if (swatchCount >= 2) {
      // Click Bone swatch (guaranteed to exist on raw-oat page)
      const boneSwatch = editCol.locator('button[aria-label="Bone"]')
      await expect(boneSwatch, 'Bone swatch in zoom').toBeVisible({ timeout: 5000 })
      await boneSwatch.click()
      await page.waitForTimeout(500)

      const afterColourSwitch = await counter.textContent()
      console.log(`  Counter after colour switch: "${afterColourSwitch}"`)

      // Image index should NOT reset to 01
      expect(afterColourSwitch, 'image index preserved after colour switch').not.toContain('01')
      expect(afterColourSwitch, 'still on image 03').toContain('03')
      console.log('  Image index preserved after colour switch: ✓')

      // Zoom level should have reset to 1.4× (counter doesn't show this; check via hint text)
      const hint = page.locator('[class*="zoomHint"]').first()
      const hintText = await hint.textContent()
      console.log(`  Zoom hint: "${hintText}"`)
      expect(hintText, 'zoom reset to 1.4×').toContain('close-up')
    } else {
      console.log('  SKIP: fewer than 2 swatches in zoom panel')
    }
  } else {
    console.log('  SKIP: fewer than 3 thumbnails')
  }

  expect(errors).toEqual([])
})

// ── Flow 4 — Newsletter sanity check ─────────────────────────────────────────
test('Flow 4 — Newsletter: submit shows confirmation', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', e => errors.push(e.message))

  await page.goto(`${BASE}/en`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1000)
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await page.waitForTimeout(500)

  const form = page.locator('form').first()
  await expect(form, '<form> exists').toBeVisible()

  const input = page.locator('input[type="email"]').first()
  const btn = page.locator('button[type="submit"]').first()
  await input.fill('fix-verify@nivenxa.com')
  await btn.click()

  await expect(
    page.locator('p').filter({ hasText: 'Noted. We will be in touch.' }),
    'confirmation visible'
  ).toBeVisible({ timeout: 5000 })
  console.log('  "Noted. We will be in touch.": ✓')
  expect(page.url()).toBe(`${BASE}/en`)
  expect(errors).toEqual([])
})
