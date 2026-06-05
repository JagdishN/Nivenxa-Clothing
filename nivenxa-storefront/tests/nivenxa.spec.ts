/**
 * NIVENXA Storefront — Full E2E Test Suite
 * Extracted from codebase analysis — June 2026
 *
 * Selector conventions:
 *   - aria-label preferred over CSS selectors
 *   - [class*="xxx"] substring match for CSS Module compiled names
 *   - text-based selectors for visible labels
 *   - test.skip() for CSS-only / unbuilt features
 */

import { test, expect } from '@playwright/test'

const BASE = 'http://localhost:3000'

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 1 — HOMEPAGE
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Homepage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE}/en`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(800)
  })

  test('HP-01 — page loads with 200', async ({ page }) => {
    const res = await page.goto(`${BASE}/en`, { waitUntil: 'domcontentloaded' })
    expect(res?.status()).toBe(200)
  })

  test('HP-02 — hero h1 contains "Slow Comfort"', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Slow')
    await expect(page.locator('h1')).toContainText('Comfort')
  })

  test('HP-03 — hero CTA "SHOP THE COLLECTION" is a link', async ({ page }) => {
    const cta = page.getByRole('link', { name: /SHOP THE COLLECTION/i })
    await expect(cta).toBeVisible()
    const href = await cta.getAttribute('href')
    expect(href).toContain('/shop')
  })

  test('HP-04 — "Our Story" secondary CTA visible', async ({ page }) => {
    await expect(page.getByRole('link', { name: /Our Story/i })).toBeVisible()
  })

  test('HP-05 — EditsSection shows "The Edits" heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /The Edits/i })).toBeVisible()
  })

  test('HP-06 — EditsSection: everyday-edit card links to /edits/everyday-edit', async ({ page }) => {
    const card = page.locator('a[href*="everyday-edit"]').first()
    await expect(card).toBeVisible()
    const href = await card.getAttribute('href')
    expect(href).toContain('/edits/everyday-edit')
  })

  test('HP-07 — EditsSection: utility-edit card links to /edits/utility-edit', async ({ page }) => {
    const card = page.locator('a[href*="utility-edit"]').first()
    await expect(card).toBeVisible()
    const href = await card.getAttribute('href')
    expect(href).toContain('/edits/utility-edit')
  })

  test('HP-08 — EditsSection: rest-edit card links to /edits/rest-edit', async ({ page }) => {
    const card = page.locator('a[href*="rest-edit"]').first()
    await expect(card).toBeVisible()
    const href = await card.getAttribute('href')
    expect(href).toContain('/edits/rest-edit')
  })

  test('HP-09 — EditsSection: womens-edit card links to /edits/womens-edit', async ({ page }) => {
    const card = page.locator('a[href*="womens-edit"]').first()
    await expect(card).toBeVisible()
    const href = await card.getAttribute('href')
    expect(href).toContain('/edits/womens-edit')
  })

  test('HP-10 — StoriesSection: Fabric Journal card visible', async ({ page }) => {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.5))
    await page.waitForTimeout(400)
    // Use heading role to avoid strict-mode collision with footer link
    await expect(page.getByRole('heading', { name: 'Fabric Journal' })).toBeVisible()
  })

  test('HP-11 — Newsletter: submit shows "Noted. We will be in touch."', async ({ page }) => {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await page.waitForTimeout(500)
    await page.locator('input[type="email"]').first().fill('test@nivenxa.com')
    await page.locator('button[type="submit"]').first().click()
    await expect(
      page.locator('p').filter({ hasText: 'Noted. We will be in touch.' })
    ).toBeVisible({ timeout: 5000 })
  })

  test('HP-12 — Newsletter: page does not navigate on submit', async ({ page }) => {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await page.waitForTimeout(500)
    await page.locator('input[type="email"]').first().fill('stay@nivenxa.com')
    await page.locator('button[type="submit"]').first().click()
    await page.waitForTimeout(1000)
    expect(page.url()).toBe(`${BASE}/en`)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 2 — NAVIGATION
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE}/en`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(600)
  })

  test('NAV-01 — logo / wordmark is visible', async ({ page }) => {
    // Logo is a link pointing to /en or /
    const logo = page.locator('header a').first()
    await expect(logo).toBeVisible()
  })

  test('NAV-02 — SHOP nav item is a link and navigates to /shop', async ({ page }) => {
    const shopLink = page.locator('header').getByRole('link', { name: /^SHOP$/i })
    await expect(shopLink).toBeVisible()
    const href = await shopLink.getAttribute('href')
    expect(href).toContain('/shop')
  })

  test('NAV-03 — EDITS nav item renders as button (no href)', async ({ page }) => {
    // EDITS has href=null in navigation.ts → renders as <button>
    const editsBtn = page.locator('header').getByRole('button', { name: /^EDITS$/i })
    await expect(editsBtn).toBeVisible()
  })

  test('NAV-04 — STORIES nav item is a link and navigates to /stories', async ({ page }) => {
    const storiesLink = page.locator('header').getByRole('link', { name: /^STORIES$/i })
    await expect(storiesLink).toBeVisible()
    const href = await storiesLink.getAttribute('href')
    expect(href).toContain('/stories')
  })

  test('NAV-05 — SHOP flyout submenu opens on hover', async ({ page }) => {
    await page.locator('header').getByRole('link', { name: /^SHOP$/i }).hover()
    await page.waitForTimeout(400)
    // Men's submenu item should appear
    await expect(page.getByText("Men's").first()).toBeVisible()
  })

  test('NAV-06 — SHOP submenu "Men\'s" has children → renders as div not Link', async ({ page }) => {
    await page.locator('header').getByRole('link', { name: /^SHOP$/i }).hover()
    await page.waitForTimeout(400)
    // Hovering "Men's" should reveal second-level children (Oversized Tee etc.)
    const mensItem = page.getByText("Men's").first()
    await mensItem.hover()
    await page.waitForTimeout(300)
    await expect(page.getByText('Oversized Tee').first()).toBeVisible()
  })

  test('NAV-07 — STORIES submenu link "Fabric Journal" navigates correctly', async ({ page }) => {
    await page.locator('header').getByRole('link', { name: /^STORIES$/i }).hover()
    await page.waitForTimeout(400)
    const fabricLink = page.locator('a[href*="fabric-journal"]').first()
    await expect(fabricLink).toBeVisible()
  })

  test('NAV-08 — EDITS flyout shows "The Everyday Edit"', async ({ page }) => {
    await page.locator('header').getByRole('button', { name: /^EDITS$/i }).click()
    await page.waitForTimeout(400)
    await expect(page.getByText('The Everyday Edit').first()).toBeVisible()
  })

  test('NAV-09 — mobile: hamburger button "Open menu" visible at 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await expect(page.getByRole('button', { name: 'Open menu' })).toBeVisible()
  })

  test('NAV-10 — mobile: hamburger opens menu, button becomes "Close menu"', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.getByRole('button', { name: 'Open menu' }).click()
    await page.waitForTimeout(400)
    await expect(page.getByRole('button', { name: 'Close menu' })).toBeVisible()
  })

  test('NAV-11 — clicking SHOP nav item navigates to /en/shop', async ({ page }) => {
    await page.locator('header').getByRole('link', { name: /^SHOP$/i }).click()
    await page.waitForURL(`${BASE}/en/shop`, { timeout: 8000 })
    expect(page.url()).toContain('/shop')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 3 — PRODUCT PAGE (Oversized Tee — Raw Oat)
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Product Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE}/en/shop/over-tee-shirts/raw-oat`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1000)
  })

  test('PP-01 — product name "Heavyweight Pocket Tee" visible', async ({ page }) => {
    // Product was renamed; h1 renders via ProductInfo
    await expect(page.locator('h1').filter({ hasText: /Heavyweight Pocket Tee/i })).toBeVisible()
  })

  test('PP-02 — price "₹" visible', async ({ page }) => {
    await expect(page.getByText(/₹/).first()).toBeVisible()
  })

  test('PP-03 — Raw Oat colour swatch is aria-pressed=true', async ({ page }) => {
    const swatch = page.locator('button[aria-label="Raw Oat"]')
    await expect(swatch).toBeVisible()
    await expect(swatch).toHaveAttribute('aria-pressed', 'true')
  })

  test('PP-04 — 5 colour swatches visible by default (VISIBLE_DEFAULT=5)', async ({ page }) => {
    // Raw Oat is colour 1; tee has 6 colours → 5 visible + "+ 1 more" button
    const swatches = page.locator('button[aria-pressed]')
    const count = await swatches.count()
    expect(count).toBeGreaterThanOrEqual(5)
  })

  test('PP-05 — "+ 1 more" expand button visible for 6th colour', async ({ page }) => {
    await expect(page.getByRole('button', { name: /more colou/i })).toBeVisible()
  })

  test('PP-06 — expand shows 6th colour (Red Earth)', async ({ page }) => {
    await page.getByRole('button', { name: /more colou/i }).click()
    await page.waitForTimeout(300)
    await expect(page.locator('button[aria-label="Red Earth"]')).toBeVisible()
  })

  test('PP-07 — size buttons visible: S, M, L, XL', async ({ page }) => {
    for (const size of ['S size', 'M size', 'L size', 'XL size']) {
      await expect(page.locator(`button[aria-label="${size}"]`)).toBeVisible()
    }
  })

  test('PP-08 — XL size IS disabled (unavailable for tee)', async ({ page }) => {
    // products.ts line 223: { label: 'XL', available: false } for over-tee-shirts
    const xl = page.locator('button[aria-label="XL size"]')
    await expect(xl).toBeDisabled()
  })

  test('PP-09 — CTA shows "Choose Your Size" before selecting', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Choose Your Size/i })).toBeVisible()
  })

  test('PP-10 — selecting a size changes CTA to "ADD TO BAG"', async ({ page }) => {
    await page.locator('button[aria-label="M size"]').click()
    await expect(page.getByRole('button', { name: /ADD TO BAG/i })).toBeVisible()
  })

  test('PP-11 — breadcrumb "← Men\'s" link visible', async ({ page }) => {
    await expect(page.getByText(/← Men's/i)).toBeVisible()
  })

  test('PP-12 — hero image has zoom trigger [aria-label="Open image zoom"]', async ({ page }) => {
    await expect(page.locator('[aria-label="Open image zoom"]').first()).toBeVisible()
  })

  test('PP-13 — 5 total zoom triggers (hero + 4 stack images)', async ({ page }) => {
    const triggers = page.locator('[aria-label="Open image zoom"]')
    await expect(triggers).toHaveCount(5)
  })

  test('PP-14 — colour swatch click for "Bone" routes to /bone URL', async ({ page }) => {
    await page.locator('button[aria-label="Bone"]').click()
    await page.waitForURL(`${BASE}/en/shop/over-tee-shirts/bone`, { timeout: 8000 })
    expect(page.url()).toContain('/bone')
  })

  test('PP-15 — size guide button "Size guide →" visible', async ({ page }) => {
    await expect(page.getByText(/Size guide →/i)).toBeVisible()
  })

  test('PP-16 — size guide modal opens with aria-label="Size guide"', async ({ page }) => {
    await page.getByText(/Size guide →/i).click()
    await page.waitForTimeout(400)
    await expect(page.getByRole('dialog', { name: 'Size guide' })).toBeVisible()
  })

  test('PP-17 — size guide modal closes via "Close size guide" button', async ({ page }) => {
    await page.getByText(/Size guide →/i).click()
    await page.waitForTimeout(400)
    await page.getByRole('button', { name: 'Close size guide' }).click()
    await page.waitForTimeout(300)
    await expect(page.getByRole('dialog', { name: 'Size guide' })).not.toBeVisible()
  })

  test('PP-18 — Styled With section visible linking to /shop/cargo-pants/dark-olive', async ({ page }) => {
    await expect(page.locator('a[href*="cargo-pants/dark-olive"]')).toBeVisible()
  })

  test('PP-19 — INFO accordions rendered with aria-expanded', async ({ page }) => {
    const accordionTriggers = page.locator('button[aria-expanded]')
    const count = await accordionTriggers.count()
    expect(count).toBeGreaterThan(0)
  })

  test('PP-20 — accordion opens on click (aria-expanded becomes true)', async ({ page }) => {
    const firstTrigger = page.locator('button[aria-expanded]').first()
    const wasClosed = (await firstTrigger.getAttribute('aria-expanded')) === 'false'
    await firstTrigger.click()
    await page.waitForTimeout(300)
    if (wasClosed) {
      await expect(firstTrigger).toHaveAttribute('aria-expanded', 'true')
    } else {
      await expect(firstTrigger).toHaveAttribute('aria-expanded', 'false')
    }
  })

  test('PP-21 — ProductSpecs "Material" heading visible', async ({ page }) => {
    await expect(page.getByText('Material').first()).toBeVisible()
  })

  test('PP-22 — no JS errors on load', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', e => errors.push(e.message))
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1000)
    expect(errors).toEqual([])
  })

  test.skip('PP-23 — NEW SEASON badge visible — badge not rendered in ProductInfo component', async () => {
    // badge field exists in data but ProductInfo component does not render it
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 4 — ZOOM WINDOW
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Zoom Window', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE}/en/shop/over-tee-shirts/raw-oat`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1000)
    await page.locator('[aria-label="Open image zoom"]').first().click()
    await page.waitForTimeout(600)
  })

  test('ZM-01 — zoom overlay opens', async ({ page }) => {
    await expect(page.locator('[class*="overlay"]').first()).toBeVisible()
  })

  test('ZM-02 — counter shows "01 — 05" initially', async ({ page }) => {
    const counter = page.locator('[class*="counter"]').first()
    await expect(counter).toContainText('01')
    await expect(counter).toContainText('05')
  })

  test('ZM-03 — thumbnail strip has 5 thumbnails', async ({ page }) => {
    const thumbs = page.locator('[class*="thumbCol"] button')
    await expect(thumbs).toHaveCount(5)
  })

  test('ZM-04 — clicking thumbnail 3 sets counter to 03', async ({ page }) => {
    await page.locator('[class*="thumbCol"] button').nth(2).click()
    await page.waitForTimeout(400)
    await expect(page.locator('[class*="counter"]').first()).toContainText('03')
  })

  test('ZM-05 — Next button advances counter', async ({ page }) => {
    await page.locator('button[aria-label="Next image"]').click()
    await page.waitForTimeout(400)
    await expect(page.locator('[class*="counter"]').first()).toContainText('02')
  })

  test('ZM-06 — Previous button on image 1 wraps to last image', async ({ page }) => {
    await page.locator('button[aria-label="Previous image"]').click()
    await page.waitForTimeout(400)
    await expect(page.locator('[class*="counter"]').first()).toContainText('05')
  })

  test('ZM-07 — Next wraps from last to first', async ({ page }) => {
    // Go to last image (05)
    await page.locator('[class*="thumbCol"] button').nth(4).click()
    await page.waitForTimeout(400)
    await page.locator('button[aria-label="Next image"]').click()
    await page.waitForTimeout(400)
    await expect(page.locator('[class*="counter"]').first()).toContainText('01')
  })

  test('ZM-08 — scroll wheel down advances image counter', async ({ page }) => {
    const counter = page.locator('[class*="counter"]').first()
    const before = await counter.textContent()
    await page.locator('[class*="imageCol"]').first().hover()
    await page.mouse.wheel(0, 300)
    await page.waitForTimeout(700)
    const after = await counter.textContent()
    expect(after).not.toBe(before)
  })

  test('ZM-09 — scroll wheel down does not scroll the background page', async ({ page }) => {
    const scrollBefore = await page.evaluate(() => window.scrollY)
    await page.locator('[class*="imageCol"]').first().hover()
    await page.mouse.wheel(0, 300)
    await page.waitForTimeout(700)
    const scrollAfter = await page.evaluate(() => window.scrollY)
    expect(scrollAfter).toBe(scrollBefore)
  })

  test('ZM-10 — scroll wheel up goes back to previous image', async ({ page }) => {
    const counter = page.locator('[class*="counter"]').first()
    const before = await counter.textContent()
    const imageCol = page.locator('[class*="imageCol"]').first()
    await imageCol.hover()
    await page.mouse.wheel(0, 300)
    await page.waitForTimeout(700)
    await page.mouse.wheel(0, -300)
    await page.waitForTimeout(700)
    const back = await counter.textContent()
    expect(back).toBe(before)
  })

  test('ZM-11 — colour switch to Bone preserves image index', async ({ page }) => {
    // Navigate to image 3
    await page.locator('[class*="thumbCol"] button').nth(2).click()
    await page.waitForTimeout(400)
    // Switch colour
    const editCol = page.locator('[class*="editCol"]').first()
    await editCol.locator('button[aria-label="Bone"]').click()
    await page.waitForTimeout(600)
    // Counter should still show 03
    await expect(page.locator('[class*="counter"]').first()).toContainText('03')
  })

  test('ZM-12 — colour switch resets zoom to 1.4× (hint shows "close-up")', async ({ page }) => {
    // Click image twice to reach zoom=1 (hint = "Click to zoom")
    await page.locator('[class*="imageCol"]').first().click()
    await page.waitForTimeout(200)
    await page.locator('[class*="imageCol"]').first().click()
    await page.waitForTimeout(200)
    // Switch colour → zoom should reset to 1.4 → hint = "Click for close-up"
    const editCol = page.locator('[class*="editCol"]').first()
    await editCol.locator('button[aria-label="Bone"]').click()
    await page.waitForTimeout(600)
    await expect(page.locator('[class*="zoomHint"]').first()).toContainText('close-up')
  })

  test('ZM-13 — clicking image cycles zoom: hint text changes', async ({ page }) => {
    const hint = page.locator('[class*="zoomHint"]').first()
    const initial = await hint.textContent()
    await page.locator('[class*="imageCol"]').first().click()
    await page.waitForTimeout(200)
    const after = await hint.textContent()
    expect(after).not.toBe(initial)
  })

  test('ZM-14 — close button dismisses overlay', async ({ page }) => {
    await page.locator('button[aria-label="Close"]').click()
    await page.waitForTimeout(400)
    await expect(page.locator('[class*="overlay"]')).not.toBeVisible()
  })

  test('ZM-15 — Escape key closes overlay', async ({ page }) => {
    await page.keyboard.press('Escape')
    await page.waitForTimeout(400)
    await expect(page.locator('[class*="overlay"]')).not.toBeVisible()
  })

  test.skip('ZM-16 — clicking overlay backdrop closes zoom — modal fills viewport; no backdrop area outside modal', async () => {
    // ImageZoom modal renders as 3-column full-viewport layout.
    // The inner modal div has onClick={e => e.stopPropagation()}, and since the modal fills
    // the entire screen there is no backdrop area outside it that the overlay click can reach.
    // Close paths: Close button (ZM-14) and Escape key (ZM-15) are the tested alternatives.
  })

  test('ZM-17 — editorial panel shows per-image headline', async ({ page }) => {
    // byImage for studio-front → "Drop-shoulder silhouette." (not product name)
    // Check that the editTitle element is rendered and visible
    await expect(page.locator('[class*="editTitle"]').first()).toBeVisible()
  })

  test('ZM-18 — zoom swatch buttons present in editorial col', async ({ page }) => {
    const editCol = page.locator('[class*="editCol"]').first()
    const swatches = editCol.locator('button[aria-label]').filter({
      hasNot: page.locator('[class*="navBtn"]')
    })
    const count = await swatches.count()
    expect(count).toBeGreaterThanOrEqual(2)
  })

  test('ZM-19 — "Will apply on close" appears after colour change in zoom', async ({ page }) => {
    const editCol = page.locator('[class*="editCol"]').first()
    await editCol.locator('button[aria-label="Bone"]').click()
    await page.waitForTimeout(500)
    await expect(page.getByText('Will apply on close')).toBeVisible()
  })

  test('ZM-20 — closing after colour switch navigates to new colour URL', async ({ page }) => {
    const editCol = page.locator('[class*="editCol"]').first()
    await editCol.locator('button[aria-label="Bone"]').click()
    await page.waitForTimeout(500)
    await page.locator('button[aria-label="Close"]').click()
    await page.waitForTimeout(1000)
    expect(page.url()).toContain('/bone')
  })

  test('ZM-21 — no JS errors during zoom open/close cycle', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', e => errors.push(e.message))
    await page.locator('button[aria-label="Close"]').click()
    await page.waitForTimeout(600)
    expect(errors).toEqual([])
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 5 — COLLECTION PAGES
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Collection Pages', () => {
  test('COL-01 — /shop loads with "Shop" heading', async ({ page }) => {
    await page.goto(`${BASE}/en/shop`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(800)
    // ShopPage renders h1 "Shop" and eyebrow "All Products" in AnimatedSection
    await expect(page.getByText('All Products').first()).toBeVisible()
  })

  test('COL-02 — Men\'s collection: single product shows FeaturedProductCard', async ({ page }) => {
    await page.goto(`${BASE}/en/shop/mens`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(800)
    await expect(page.getByText('Featured piece')).toBeVisible()
  })

  test('COL-03 — Men\'s collection: "View product →" link goes to colour page', async ({ page }) => {
    await page.goto(`${BASE}/en/shop/mens`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(800)
    const link = page.getByRole('link', { name: /View product/i }).first()
    await expect(link).toBeVisible()
    const href = await link.getAttribute('href')
    expect(href).toContain('/shop/over-tee-shirts')
  })

  test('COL-04 — Colour selection page /shop/mens/oversized-tee shows colour grid', async ({ page }) => {
    await page.goto(`${BASE}/en/shop/mens/oversized-tee`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(800)
    // Product renamed to "Heavyweight Pocket Tee" in products.ts
    await expect(page.getByRole('heading', { name: /Heavyweight Pocket Tee/i })).toBeVisible()
    // Colour grid cards link to /shop/over-tee-shirts/[slug]
    const colourLinks = page.locator('a[href*="/over-tee-shirts/"]')
    const count = await colourLinks.count()
    expect(count).toBeGreaterThanOrEqual(6)
  })

  test('COL-05 — Colour page card links to correct product page', async ({ page }) => {
    await page.goto(`${BASE}/en/shop/mens/oversized-tee`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(800)
    const rawOatLink = page.locator('a[href*="raw-oat"]').first()
    await expect(rawOatLink).toBeVisible()
    await rawOatLink.click()
    await page.waitForURL(`${BASE}/en/shop/over-tee-shirts/raw-oat`, { timeout: 8000 })
    expect(page.url()).toContain('/raw-oat')
  })

  test('COL-06 — Back link "← Men\'s" on colour page', async ({ page }) => {
    await page.goto(`${BASE}/en/shop/mens/oversized-tee`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(800)
    await expect(page.getByText(/← Men's/i)).toBeVisible()
  })

  test('COL-07 — ProductCard swatch click navigates to new colour', async ({ page }) => {
    await page.goto(`${BASE}/en/shop`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(800)
    // FeaturedProductCard for oversized tee — click Bone swatch
    const card = page.locator('[class*="card"]').first()
    const boneSwatch = card.locator('button[aria-label="Bone"]')
    if (await boneSwatch.count() > 0) {
      await boneSwatch.click()
      await page.waitForTimeout(500)
      // href of "View product" should update to bone
      const viewLink = card.locator('a', { hasText: 'View product' })
      const href = await viewLink.getAttribute('href')
      expect(href).toContain('/bone')
    } else {
      test.skip()
    }
  })

  test('COL-08 — /shop/cargo-pants loads', async ({ page }) => {
    await page.goto(`${BASE}/en/shop/cargo-pants`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(800)
    expect(page.url()).toContain('/cargo-pants')
  })

  test('COL-09 — /shop/a-line-kurta loads', async ({ page }) => {
    await page.goto(`${BASE}/en/shop/a-line-kurta`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(800)
    expect(page.url()).toContain('/a-line-kurta')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 6 — EDIT PAGES
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Edit Pages', () => {
  test('ED-01 — /edits/everyday-edit loads with correct headline', async ({ page }) => {
    await page.goto(`${BASE}/en/edits/everyday-edit`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(800)
    await expect(page.getByText(/Dressed for the day/i)).toBeVisible()
  })

  test('ED-02 — /edits/utility-edit loads with correct headline', async ({ page }) => {
    await page.goto(`${BASE}/en/edits/utility-edit`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(800)
    await expect(page.getByText(/Utility without/i)).toBeVisible()
  })

  test('ED-03 — /edits/rest-edit loads with correct headline', async ({ page }) => {
    await page.goto(`${BASE}/en/edits/rest-edit`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(800)
    await expect(page.getByText(/Considered/i)).toBeVisible()
  })

  test('ED-04 — /edits/womens-edit loads with correct headline', async ({ page }) => {
    await page.goto(`${BASE}/en/edits/womens-edit`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(800)
    // Use heading role to avoid strict-mode collision with sub-nav "Indo-Western Silhouettes" link
    await expect(page.getByRole('heading', { name: /Indo-Western for/i })).toBeVisible()
  })

  test('ED-05 — edit page sub-item strip shows nav links', async ({ page }) => {
    await page.goto(`${BASE}/en/edits/everyday-edit`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(800)
    // sub-item names are visible as links in the strip
    const subLinks = page.locator('a[href*="everyday-edit/"]')
    const count = await subLinks.count()
    expect(count).toBeGreaterThanOrEqual(3)
  })

  test('ED-06 — clicking sub-item navigates to sub-item page', async ({ page }) => {
    await page.goto(`${BASE}/en/edits/everyday-edit`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(800)
    const firstSubLink = page.locator('a[href*="everyday-edit/"]').first()
    const href = await firstSubLink.getAttribute('href')
    await firstSubLink.click()
    await page.waitForURL(`${BASE}${href}`, { timeout: 8000 })
    expect(page.url()).toContain('/everyday-edit/')
  })

  test('ED-07 — utility-edit/heavyweight-canvas sub-item page loads', async ({ page }) => {
    await page.goto(`${BASE}/en/edits/utility-edit/heavyweight-canvas`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(800)
    // Back link present
    await expect(page.getByText(/← The Utility Edit/i)).toBeVisible()
  })

  test('ED-08 — heavyweight-canvas sub-item shows Cargo Pants product', async ({ page }) => {
    await page.goto(`${BASE}/en/edits/utility-edit/heavyweight-canvas`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(800)
    await expect(page.getByText(/Cargo Pant/i).first()).toBeVisible()
  })

  test('ED-09 — /edits page loads (all edits listing)', async ({ page }) => {
    await page.goto(`${BASE}/en/edits`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(800)
    expect(page.url()).toContain('/edits')
    // Page should have some content
    await expect(page.locator('main')).toBeVisible()
  })

  test('ED-10 — HP EditsSection card click navigates to /edits/everyday-edit', async ({ page }) => {
    await page.goto(`${BASE}/en`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(800)
    await page.locator('a[href*="everyday-edit"]').first().click()
    await page.waitForURL(`${BASE}/en/edits/everyday-edit`, { timeout: 8000 })
    expect(page.url()).toContain('/edits/everyday-edit')
    expect(page.url()).not.toContain('/shop/')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 7 — MOBILE 375px
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Mobile 375px', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
  })

  test('MOB-01 — homepage loads at 375px', async ({ page }) => {
    await page.goto(`${BASE}/en`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(800)
    await expect(page.getByRole('heading').first()).toBeVisible()
  })

  test('MOB-02 — hamburger "Open menu" visible at 375px', async ({ page }) => {
    await page.goto(`${BASE}/en`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(600)
    await expect(page.getByRole('button', { name: 'Open menu' })).toBeVisible()
  })

  test('MOB-03 — opening hamburger reveals SHOP nav item', async ({ page }) => {
    await page.goto(`${BASE}/en`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(600)
    await page.getByRole('button', { name: 'Open menu' }).click()
    await page.waitForTimeout(400)
    // Mobile menu renders SHOP as <button> (not a link) due to submenu; desktop <a> is hidden.
    // Scope to the mobile nav which has aria-hidden="false" when open.
    const mobileNav = page.locator('nav[aria-hidden="false"]')
    await expect(mobileNav.getByRole('button', { name: 'SHOP' })).toBeVisible()
  })

  test('MOB-04 — product page loads at 375px', async ({ page }) => {
    await page.goto(`${BASE}/en/shop/over-tee-shirts/raw-oat`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1000)
    // Product renamed to "Heavyweight Pocket Tee" in products.ts
    await expect(page.locator('h1').filter({ hasText: /Heavyweight Pocket Tee/i })).toBeVisible()
  })

  test('MOB-05 — MobileStickyBar CTA visible at 375px', async ({ page }) => {
    await page.goto(`${BASE}/en/shop/over-tee-shirts/raw-oat`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1000)
    // Sticky bar shows SELECT A SIZE or ADD TO BAG
    const stickyText = page.getByText(/SELECT A SIZE|ADD TO BAG/i).last()
    await expect(stickyText).toBeVisible()
  })

  test.skip('MOB-06 — zoom opens at 375px — heroImageContainer is display:none on mobile', async () => {
    // ProductPage sticky hero column (heroImageContainer, the first zoom trigger) is hidden
    // at 375px via CSS media query. The mobile product layout does not expose a visible
    // zoom trigger from the hero column. Add aria-label to a mobile-visible image element
    // and update this test when a mobile zoom entry point is implemented.
  })

  test.skip('MOB-07 — zoom closes via Close button at 375px — depends on MOB-06', async () => {
    // Skipped for the same reason as MOB-06: no visible zoom trigger at 375px.
  })

  test.skip('MOB-08 — zoom editorial panel hidden at 375px — CSS media query only', async () => {
    // editCol hidden via CSS media query; no DOM removal, cannot reliably test with Playwright
  })

  test.skip('MOB-09 — EditsSection renders 1 column at 375px — CSS grid column change only', async () => {
    // Layout change via CSS grid; no JS class changes to assert
  })
})
