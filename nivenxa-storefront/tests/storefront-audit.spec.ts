import { test, expect, Page, ConsoleMessage } from '@playwright/test'

const BASE = 'http://localhost:3000'

// ── Helpers ──────────────────────────────────────────────────────────────────

async function collectConsoleErrors(page: Page): Promise<string[]> {
  const errors: string[] = []
  page.on('console', (msg: ConsoleMessage) => {
    if (msg.type() === 'error') errors.push(msg.text())
  })
  page.on('pageerror', (err: Error) => errors.push(`[pageerror] ${err.message}`))
  return errors
}

async function getBrokenImages(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const imgs = Array.from(document.querySelectorAll('img'))
    return imgs
      .filter(img => !img.naturalWidth || img.naturalWidth === 0)
      .map(img => img.src || img.getAttribute('src') || '(no src)')
  })
}

async function checkHorizontalScroll(page: Page): Promise<boolean> {
  return page.evaluate(() => document.body.scrollWidth > window.innerWidth)
}

async function waitForPageLoad(page: Page) {
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {
    // fallback to domcontentloaded if networkidle times out
  })
}

// ── Test suite ────────────────────────────────────────────────────────────────

test.describe('Nivenxa Storefront Audit', () => {

  // ── 1. Homepage ──────────────────────────────────────────────────────────
  test('1. Homepage — /', async ({ page }) => {
    const consoleErrors: string[] = []
    page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()) })
    page.on('pageerror', e => consoleErrors.push(`[pageerror] ${e.message}`))

    const res = await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' })
    await waitForPageLoad(page)

    // 1a. Status
    expect(res?.status(), `Homepage 404`).not.toBe(404)
    console.log(`  status: ${res?.status()}`)

    // 1b. Console errors
    if (consoleErrors.length) {
      console.log(`  CONSOLE ERRORS (${consoleErrors.length}):`)
      consoleErrors.forEach(e => console.log(`    • ${e}`))
    } else {
      console.log(`  console errors: none`)
    }
    expect(consoleErrors, `Homepage console errors`).toEqual([])

    // 1c. Broken images (wait for images to load)
    await page.waitForTimeout(2000)
    const broken = await getBrokenImages(page)
    if (broken.length) console.log(`  BROKEN IMAGES: ${broken.join(', ')}`)
    expect(broken, 'Homepage broken images').toEqual([])

    // 1d. SHOP nav link visible
    const shopNav = page.locator('nav').filter({ hasText: /shop/i }).first()
    const shopLink = page.locator('a[href*="/shop"]').first()
    await expect(shopLink, 'SHOP nav link').toBeVisible({ timeout: 5000 })
    console.log(`  SHOP nav: visible`)

    // 1e. EDITS nav link visible
    const editsLink = page.locator('a[href*="/edits"]').first()
    await expect(editsLink, 'EDITS nav link').toBeVisible({ timeout: 5000 })
    console.log(`  EDITS nav: visible`)

    // 1f. Newsletter form
    const emailInput = page.locator('input[type="email"]').first()
    const hasNewsletter = await emailInput.isVisible().catch(() => false)
    if (hasNewsletter) {
      await emailInput.fill('test@example.com')
      const submitBtn = page.locator('button[type="submit"], form button').first()
      const btnVisible = await submitBtn.isVisible().catch(() => false)
      console.log(`  newsletter form: present, submit button visible=${btnVisible}`)
    } else {
      console.log(`  newsletter form: NOT FOUND on homepage`)
    }

    // 1g. No horizontal scroll at 375px
    await page.setViewportSize({ width: 375, height: 812 })
    await page.waitForTimeout(500)
    const hasHScroll = await checkHorizontalScroll(page)
    if (hasHScroll) console.log(`  HORIZONTAL SCROLL at 375px: YES`)
    else console.log(`  horizontal scroll at 375px: none`)
    expect(hasHScroll, 'Homepage horizontal scroll at 375px').toBe(false)
  })

  // ── 2. Product page ──────────────────────────────────────────────────────
  test('2. Product page — /en/shop/over-tee-shirts/raw-oat', async ({ page }) => {
    const consoleErrors: string[] = []
    page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()) })
    page.on('pageerror', e => consoleErrors.push(`[pageerror] ${e.message}`))

    const url = `${BASE}/en/shop/over-tee-shirts/raw-oat`
    const res = await page.goto(url, { waitUntil: 'domcontentloaded' })
    await waitForPageLoad(page)
    await page.waitForTimeout(1500)

    // 2a. Status
    const status = res?.status()
    expect(status, `Product page 404`).not.toBe(404)
    console.log(`  status: ${status}`)

    // 2b. Console errors
    if (consoleErrors.length) {
      console.log(`  CONSOLE ERRORS (${consoleErrors.length}):`)
      consoleErrors.forEach(e => console.log(`    • ${e}`))
    }

    // 2c. Broken images
    const broken = await getBrokenImages(page)
    if (broken.length) console.log(`  BROKEN IMAGES (${broken.length}): ${broken.slice(0, 3).join(', ')}`)
    else console.log(`  broken images: none`)

    // 2d. Colour swatches visible
    const swatches = page.locator('[class*="swatch"], [class*="Swatch"], button[aria-label]').filter({ hasNot: page.locator('nav') })
    const swatchCount = await swatches.count()
    console.log(`  colour swatches found: ${swatchCount}`)
    expect(swatchCount, 'No colour swatches found').toBeGreaterThan(0)

    // 2e. Swatch click updates hero image
    if (swatchCount > 1) {
      const heroImgBefore = await page.locator('[class*="hero"] img, [class*="Hero"] img, [class*="product"] img').first().getAttribute('src').catch(() => null)
      await swatches.nth(1).click()
      await page.waitForTimeout(800)
      const heroImgAfter = await page.locator('[class*="hero"] img, [class*="Hero"] img, [class*="product"] img').first().getAttribute('src').catch(() => null)
      const urlAfter = page.url()
      console.log(`  swatch click: image before=${heroImgBefore?.slice(-40)}, after=${heroImgAfter?.slice(-40)}`)
      console.log(`  URL after swatch click: ${urlAfter}`)
      if (heroImgBefore === heroImgAfter) {
        console.log(`  WARNING: swatch click did NOT update hero image`)
      }
    }

    // 2f. Zoom icon visible
    const zoomBtn = page.locator('[class*="zoom"], [class*="Zoom"], button[aria-label*="zoom" i], [class*="expand"]').first()
    const zoomVisible = await zoomBtn.isVisible().catch(() => false)
    console.log(`  zoom icon visible: ${zoomVisible}`)
    if (!zoomVisible) console.log(`  WARNING: zoom icon not found`)

    // 2g. Zoom window opens on click
    if (zoomVisible) {
      await zoomBtn.click()
      await page.waitForTimeout(600)
      const zoomModal = page.locator('[class*="modal"], [class*="Modal"], [class*="lightbox"], [class*="Lightbox"], [class*="overlay"], [role="dialog"]').first()
      const modalVisible = await zoomModal.isVisible().catch(() => false)
      console.log(`  zoom modal opened: ${modalVisible}`)

      // 2h. Scroll in zoom window
      if (modalVisible) {
        const zoomImgs = zoomModal.locator('img')
        const zoomImgCount = await zoomImgs.count()
        console.log(`  images in zoom modal: ${zoomImgCount}`)

        // 2i. Thumbnail click
        const thumbnails = zoomModal.locator('[class*="thumb"], [class*="Thumb"]')
        const thumbCount = await thumbnails.count()
        console.log(`  thumbnails in zoom modal: ${thumbCount}`)

        // 2j. Close zoom
        const closeBtn = zoomModal.locator('[class*="close"], [class*="Close"], button[aria-label*="close" i]').first()
        const closeVisible = await closeBtn.isVisible().catch(() => false)
        if (closeVisible) {
          await closeBtn.click()
          await page.waitForTimeout(500)
          const modalGone = await zoomModal.isVisible().catch(() => false)
          console.log(`  zoom closed: ${!modalGone}`)
        } else {
          // Try Escape key
          await page.keyboard.press('Escape')
          await page.waitForTimeout(500)
          console.log(`  zoom closed via Escape`)
        }
      }
    }

    // 2k. "Choose Your Size" button
    const sizeBtn = page.locator('button, [class*="size"]').filter({ hasText: /choose.*size|select.*size|size/i }).first()
    const sizeBtnVisible = await sizeBtn.isVisible().catch(() => false)
    console.log(`  "Choose Your Size" visible: ${sizeBtnVisible}`)

    // 2l. Size selection → ADD TO BAG
    if (sizeBtnVisible) {
      await sizeBtn.click().catch(() => {})
      await page.waitForTimeout(500)
      // Try clicking a size option
      const sizeOption = page.locator('[class*="size"] button, [class*="Size"] button, button[data-size]').first()
      const sizeOptVisible = await sizeOption.isVisible().catch(() => false)
      if (sizeOptVisible) {
        await sizeOption.click()
        await page.waitForTimeout(400)
      }
      const addToBag = page.locator('button').filter({ hasText: /add to bag|add to cart/i }).first()
      const addVisible = await addToBag.isVisible().catch(() => false)
      console.log(`  ADD TO BAG visible after size select: ${addVisible}`)
    }

    // 2m. No horizontal scroll at 375px
    await page.setViewportSize({ width: 375, height: 812 })
    await page.waitForTimeout(500)
    const hasHScroll = await checkHorizontalScroll(page)
    if (hasHScroll) console.log(`  HORIZONTAL SCROLL at 375px: YES`)
    else console.log(`  horizontal scroll at 375px: none`)

    // 2n. Console errors summary
    expect(consoleErrors.filter(e => !e.includes('Warning')), 'Product page console errors').toEqual([])
  })

  // ── 3. Collection page ───────────────────────────────────────────────────
  test('3. Collection — /en/shop/mens', async ({ page }) => {
    const consoleErrors: string[] = []
    page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()) })
    page.on('pageerror', e => consoleErrors.push(`[pageerror] ${e.message}`))

    const res = await page.goto(`${BASE}/en/shop/mens`, { waitUntil: 'domcontentloaded' })
    await waitForPageLoad(page)
    await page.waitForTimeout(1500)

    const status = res?.status()
    expect(status, 'Collection 404').not.toBe(404)
    console.log(`  status: ${status}`)

    if (consoleErrors.length) {
      console.log(`  CONSOLE ERRORS (${consoleErrors.length}):`)
      consoleErrors.forEach(e => console.log(`    • ${e}`))
    }

    const broken = await getBrokenImages(page)
    if (broken.length) console.log(`  BROKEN IMAGES (${broken.length}): ${broken.slice(0, 3).join(', ')}`)
    else console.log(`  broken images: none`)

    // Product cards visible
    const productCards = page.locator('a[href*="/shop/mens/"]')
    const cardCount = await productCards.count()
    console.log(`  product cards found: ${cardCount}`)

    // FeaturedProductCard (single product) or grid
    const featuredCard = page.locator('[class*="featured"], [class*="Featured"]').first()
    const hasFeatured = await featuredCard.isVisible().catch(() => false)
    console.log(`  featured card layout: ${hasFeatured}`)

    // Check swatches exist in featured card
    if (hasFeatured) {
      const swatches = featuredCard.locator('button[style*="background"]')
      const swatchCount = await swatches.count()
      console.log(`  swatches in featured card: ${swatchCount}`)
    }

    // No horizontal scroll at 375px
    await page.setViewportSize({ width: 375, height: 812 })
    await page.waitForTimeout(500)
    const hasHScroll = await checkHorizontalScroll(page)
    if (hasHScroll) console.log(`  HORIZONTAL SCROLL at 375px: YES`)
    else console.log(`  horizontal scroll at 375px: none`)

    expect(consoleErrors.filter(e => !e.includes('Warning')), 'Collection console errors').toEqual([])
  })

  // ── 4. Colour page ───────────────────────────────────────────────────────
  test('4. Colour page — /en/shop/mens/oversized-tee', async ({ page }) => {
    const consoleErrors: string[] = []
    page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()) })
    page.on('pageerror', e => consoleErrors.push(`[pageerror] ${e.message}`))

    const res = await page.goto(`${BASE}/en/shop/mens/oversized-tee`, { waitUntil: 'domcontentloaded' })
    await waitForPageLoad(page)
    await page.waitForTimeout(1500)

    const status = res?.status()
    expect(status, 'Colour page 404').not.toBe(404)
    console.log(`  status: ${status}`)

    if (consoleErrors.length) {
      console.log(`  CONSOLE ERRORS (${consoleErrors.length}):`)
      consoleErrors.forEach(e => console.log(`    • ${e}`))
    }

    const broken = await getBrokenImages(page)
    if (broken.length) console.log(`  BROKEN IMAGES (${broken.length}): ${broken.slice(0, 3).join(', ')}`)
    else console.log(`  broken images: none`)

    // Colour swatches
    const swatches = page.locator('[class*="swatch"], [class*="Swatch"], button[aria-label]')
    const swatchCount = await swatches.count()
    console.log(`  colour swatches: ${swatchCount}`)

    // Breadcrumb
    const breadcrumb = page.locator('[class*="breadcrumb"], [class*="Breadcrumb"], nav[aria-label*="breadcrumb" i]').first()
    const hasBreadcrumb = await breadcrumb.isVisible().catch(() => false)
    console.log(`  breadcrumb visible: ${hasBreadcrumb}`)

    // No horizontal scroll at 375px
    await page.setViewportSize({ width: 375, height: 812 })
    await page.waitForTimeout(500)
    const hasHScroll = await checkHorizontalScroll(page)
    if (hasHScroll) console.log(`  HORIZONTAL SCROLL at 375px: YES`)
    else console.log(`  horizontal scroll at 375px: none`)

    expect(consoleErrors.filter(e => !e.includes('Warning')), 'Colour page console errors').toEqual([])
  })

  // ── 5. Edit landing ──────────────────────────────────────────────────────
  test('5. Edit landing — /en/edits/utility-edit', async ({ page }) => {
    const consoleErrors: string[] = []
    page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()) })
    page.on('pageerror', e => consoleErrors.push(`[pageerror] ${e.message}`))

    const res = await page.goto(`${BASE}/en/edits/utility-edit`, { waitUntil: 'domcontentloaded' })
    await waitForPageLoad(page)
    await page.waitForTimeout(1500)

    const status = res?.status()
    expect(status, 'Edit landing 404').not.toBe(404)
    console.log(`  status: ${status}`)

    if (consoleErrors.length) {
      console.log(`  CONSOLE ERRORS (${consoleErrors.length}):`)
      consoleErrors.forEach(e => console.log(`    • ${e}`))
    }

    const broken = await getBrokenImages(page)
    if (broken.length) console.log(`  BROKEN IMAGES (${broken.length}): ${broken.slice(0, 3).join(', ')}`)
    else console.log(`  broken images: none`)

    // Sub-nav links
    const subNavLinks = page.locator('[class*="subNav"] a, [class*="sub-nav"] a, [class*="subnav"] a')
    const subNavCount = await subNavLinks.count()
    console.log(`  sub-nav links found: ${subNavCount}`)

    // Hero image
    const heroImg = page.locator('[class*="hero"] img, [class*="Hero"] img').first()
    const heroVisible = await heroImg.isVisible().catch(() => false)
    console.log(`  hero image visible: ${heroVisible}`)

    // No horizontal scroll at 375px
    await page.setViewportSize({ width: 375, height: 812 })
    await page.waitForTimeout(500)
    const hasHScroll = await checkHorizontalScroll(page)
    if (hasHScroll) console.log(`  HORIZONTAL SCROLL at 375px: YES`)
    else console.log(`  horizontal scroll at 375px: none`)

    expect(consoleErrors.filter(e => !e.includes('Warning')), 'Edit landing console errors').toEqual([])
  })

  // ── 6. Edit sub-item page ────────────────────────────────────────────────
  test('6. Sub-item — /en/edits/utility-edit/heavyweight-canvas', async ({ page }) => {
    const consoleErrors: string[] = []
    page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()) })
    page.on('pageerror', e => consoleErrors.push(`[pageerror] ${e.message}`))

    const res = await page.goto(`${BASE}/en/edits/utility-edit/heavyweight-canvas`, { waitUntil: 'domcontentloaded' })
    await waitForPageLoad(page)
    await page.waitForTimeout(1500)

    const status = res?.status()
    expect(status, 'Sub-item 404').not.toBe(404)
    console.log(`  status: ${status}`)

    if (consoleErrors.length) {
      console.log(`  CONSOLE ERRORS (${consoleErrors.length}):`)
      consoleErrors.forEach(e => console.log(`    • ${e}`))
    }

    const broken = await getBrokenImages(page)
    if (broken.length) console.log(`  BROKEN IMAGES (${broken.length}): ${broken.slice(0, 3).join(', ')}`)
    else console.log(`  broken images: none`)

    // Back link / breadcrumb
    const backLink = page.locator('a[href*="/edits"], [class*="back"], [class*="Back"]').first()
    const backVisible = await backLink.isVisible().catch(() => false)
    console.log(`  back/breadcrumb link: ${backVisible}`)

    // Product grid or featured card
    const productLinks = page.locator('[class*="productCard"], [class*="product-card"], [class*="featured"]')
    const productCount = await productLinks.count()
    console.log(`  product items found: ${productCount}`)

    // No horizontal scroll at 375px
    await page.setViewportSize({ width: 375, height: 812 })
    await page.waitForTimeout(500)
    const hasHScroll = await checkHorizontalScroll(page)
    if (hasHScroll) console.log(`  HORIZONTAL SCROLL at 375px: YES`)
    else console.log(`  horizontal scroll at 375px: none`)

    // Newsletter form (check if it exists on this page)
    const emailInput = page.locator('input[type="email"]').first()
    const hasNewsletter = await emailInput.isVisible().catch(() => false)
    if (hasNewsletter) {
      await emailInput.fill('test@example.com')
      console.log(`  newsletter form: present`)
    } else {
      console.log(`  newsletter form: not on this page`)
    }

    expect(consoleErrors.filter(e => !e.includes('Warning')), 'Sub-item console errors').toEqual([])
  })

  // ── 7. Nav smoke test — SHOP menu ────────────────────────────────────────
  test('7. Nav — SHOP menu opens and links resolve', async ({ page }) => {
    await page.goto(`${BASE}/en`, { waitUntil: 'domcontentloaded' })
    await waitForPageLoad(page)

    // Try to open SHOP dropdown
    const shopTrigger = page.locator('nav a, nav button').filter({ hasText: /^shop$/i }).first()
    const shopTriggerVisible = await shopTrigger.isVisible().catch(() => false)
    console.log(`  SHOP nav trigger visible: ${shopTriggerVisible}`)

    if (shopTriggerVisible) {
      await shopTrigger.hover()
      await page.waitForTimeout(400)
      // Check dropdown appeared
      const dropdown = page.locator('[class*="dropdown"], [class*="Dropdown"], [class*="mega"], [class*="menu"]').last()
      const dropdownVisible = await dropdown.isVisible().catch(() => false)
      console.log(`  SHOP dropdown visible after hover: ${dropdownVisible}`)
    }

    // Click SHOP link directly
    const shopLink = page.locator('a[href*="/shop"]').first()
    if (await shopLink.isVisible()) {
      await shopLink.click()
      await page.waitForLoadState('domcontentloaded')
      const url = page.url()
      console.log(`  after SHOP click: ${url}`)
      expect(url).toContain('/shop')
    }
  })

  // ── 8. Nav smoke test — EDITS menu ──────────────────────────────────────
  test('8. Nav — EDITS menu opens and links resolve', async ({ page }) => {
    await page.goto(`${BASE}/en`, { waitUntil: 'domcontentloaded' })
    await waitForPageLoad(page)

    const editsTrigger = page.locator('nav a, nav button').filter({ hasText: /^edits$/i }).first()
    const editsVisible = await editsTrigger.isVisible().catch(() => false)
    console.log(`  EDITS nav trigger visible: ${editsVisible}`)

    if (editsVisible) {
      await editsTrigger.hover()
      await page.waitForTimeout(400)
      const dropdown = page.locator('[class*="dropdown"], [class*="Dropdown"], [class*="mega"], [class*="menu"]').last()
      const dropdownVisible = await dropdown.isVisible().catch(() => false)
      console.log(`  EDITS dropdown visible after hover: ${dropdownVisible}`)
    }

    const editsLink = page.locator('a[href*="/edits"]').first()
    if (await editsLink.isVisible()) {
      await editsLink.click()
      await page.waitForLoadState('domcontentloaded')
      const url = page.url()
      console.log(`  after EDITS click: ${url}`)
      expect(url).toContain('/edits')
    }
  })

})
