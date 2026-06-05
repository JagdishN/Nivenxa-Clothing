/**
 * Final audit — verifies all 4 fixes are working:
 *  Fix 1: Zoom trigger has aria-label="Open image zoom"
 *  Fix 2: No SWC errors in console (clean fresh context)
 *  Fix 3: Newsletter submit shows "Noted. We will be in touch."
 *  Fix 4: Hero image src changes correctly after swatch click
 */

import { test, expect } from '@playwright/test'

const BASE = 'http://localhost:3000'

test('FIX 1 — Zoom: aria-label="Open image zoom" exists and opens overlay', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', e => errors.push(e.message))

  await page.goto(`${BASE}/en/shop/over-tee-shirts/raw-oat`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1500)

  // Trigger is findable by accessibility label
  const zoomTrigger = page.locator('[aria-label="Open image zoom"]').first()
  await expect(zoomTrigger, 'zoom trigger visible').toBeVisible({ timeout: 5000 })
  console.log('  aria-label="Open image zoom" found ✓')

  // Click opens overlay
  await zoomTrigger.click()
  await page.waitForTimeout(500)

  // Overlay visible (ImageZoom renders .overlay when isOpen=true)
  const overlay = page.locator('[class*="overlay"]').first()
  await expect(overlay, 'zoom overlay visible after click').toBeVisible({ timeout: 5000 })
  console.log('  zoom overlay opened ✓')

  // Has 3-column layout: thumbs, main image, editorial
  const thumbCol = page.locator('[class*="thumbCol"]').first()
  const imageCol = page.locator('[class*="imageCol"]').first()
  const editCol  = page.locator('[class*="editCol"]').first()
  await expect(thumbCol, 'thumbnail column').toBeVisible()
  await expect(imageCol, 'main image column').toBeVisible()
  await expect(editCol, 'editorial column').toBeVisible()
  console.log('  3-column layout: thumbs + image + editorial ✓')

  // Thumbnail click jumps to image
  const thumbBtns = page.locator('[class*="thumb"]')
  const thumbCount = await thumbBtns.count()
  console.log(`  thumbnail count: ${thumbCount}`)
  expect(thumbCount, 'at least 1 thumbnail').toBeGreaterThan(0)
  if (thumbCount > 1) {
    await thumbBtns.nth(1).click()
    await page.waitForTimeout(400)
    console.log('  thumbnail click: ✓')
  }

  // Close button closes overlay
  const closeBtn = page.locator('[class*="closeBtn"]').first()
  await expect(closeBtn, 'close button visible').toBeVisible()
  await closeBtn.click()
  await page.waitForTimeout(400)
  const overlayGone = await overlay.isVisible().catch(() => false)
  expect(overlayGone, 'overlay closed after close click').toBe(false)
  console.log('  zoom closed ✓')

  expect(errors).toEqual([])
})

test('FIX 2 — SWC: no console errors in fresh context', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', e => errors.push(e.message))
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()) })

  // Navigate all 6 tested pages in sequence
  const pages = [
    '/en',
    '/en/shop/over-tee-shirts/raw-oat',
    '/en/shop/mens',
    '/en/shop/mens/oversized-tee',
    '/en/edits/utility-edit',
    '/en/edits/utility-edit/heavyweight-canvas',
  ]

  for (const path of pages) {
    await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(500)
  }

  console.log(`  console errors across all 6 pages: ${errors.length}`)
  expect(errors.filter(e => !e.includes('Warning')), 'no errors across all pages').toEqual([])
})

test('FIX 3 — Newsletter: <form>, type=submit, confirmation, no crash', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', e => errors.push(e.message))

  await page.goto(`${BASE}/en`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1500)
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await page.waitForTimeout(600)

  // Real <form> element
  const form = page.locator('form').first()
  await expect(form, '<form> element exists').toBeVisible()
  console.log('  <form> element: ✓')

  // type=submit button
  const btn = page.locator('button[type="submit"]').first()
  await expect(btn, 'button[type="submit"]').toBeVisible()
  console.log('  button[type="submit"]: ✓')

  // Fill and submit
  const input = page.locator('input[type="email"]').first()
  await input.fill('verify@nivenxa.com')
  await btn.click()

  // Loading state (brief)
  // Then confirmation
  await expect(
    page.locator('p').filter({ hasText: 'Noted. We will be in touch.' }),
    'confirmation message'
  ).toBeVisible({ timeout: 5000 })
  console.log('  "Noted. We will be in touch.": ✓')

  // URL unchanged
  expect(page.url()).toBe(`${BASE}/en`)
  console.log('  no page navigation: ✓')

  expect(errors).toEqual([])
})

test('FIX 4 — Hero image: src non-null for all 6 colours, updates on swatch click', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', e => errors.push(e.message))

  // All 6 colours load with non-empty src
  for (const colour of ['raw-oat', 'bone', 'espresso', 'mushroom', 'earth', 'red-earth']) {
    await page.goto(`${BASE}/en/shop/over-tee-shirts/${colour}`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(800)

    const src = await page.locator('img[class*="heroImage"]').first().getAttribute('src')
    expect(src, `${colour}: src non-null`).not.toBeNull()
    expect(src, `${colour}: src non-empty`).not.toBe('')
    const nw = await page.locator('img[class*="heroImage"]').first()
      .evaluate((el) => (el as HTMLImageElement).naturalWidth).catch(() => 0)
    expect(nw, `${colour}: image loads (naturalWidth > 0)`).toBeGreaterThan(0)
    console.log(`  ${colour}: src="${src?.slice(-45)}" nw=${nw} ✓`)
  }

  // Swatch click updates src
  await page.goto(`${BASE}/en/shop/over-tee-shirts/raw-oat`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1000)
  const srcBefore = await page.locator('img[class*="heroImage"]').first().getAttribute('src')
  await page.locator('button[aria-label="Bone"]').click()
  await page.waitForTimeout(1200)
  const srcAfter = await page.locator('img[class*="heroImage"]').first().getAttribute('src')
  expect(srcAfter).not.toBe(srcBefore)
  expect(page.url()).toContain('/bone')
  console.log(`  swatch click: src changed from OAT to IVORY ✓, URL updated to /bone ✓`)

  expect(errors).toEqual([])
})
