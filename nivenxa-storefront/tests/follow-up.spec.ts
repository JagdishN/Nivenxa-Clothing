import { test, expect, Page } from '@playwright/test'

const BASE = 'http://localhost:3000'

// Deep-dive into specific issues found in first run

test('INVESTIGATE: Product page zoom + size + swatch URL update', async ({ page }) => {
  const consoleErrors: string[] = []
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()) })

  await page.goto(`${BASE}/en/shop/over-tee-shirts/raw-oat`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(2000)

  // --- What's on the page? Dump key classes ---
  const classes = await page.evaluate(() => {
    const allEls = document.querySelectorAll('[class]')
    const cls = new Set<string>()
    allEls.forEach(el => {
      el.className.toString().split(/\s+/).forEach(c => { if (c) cls.add(c) })
    })
    return Array.from(cls).filter(c =>
      /zoom|modal|size|bag|cart|swatch|hero|thumb|close|overlay|lightbox|magnif/i.test(c)
    ).sort()
  })
  console.log('Relevant classes on product page:', classes.join(', '))

  // --- All buttons ---
  const buttons = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('button')).map(b => ({
      text: b.textContent?.trim().slice(0, 40),
      ariaLabel: b.getAttribute('aria-label'),
      className: b.className.toString().slice(0, 80),
    }))
  })
  console.log('Buttons found:')
  buttons.forEach(b => console.log(`  [${b.ariaLabel || b.text}] class="${b.className}"`))

  // --- All links ---
  const allLinks = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('a[href]'))
      .map(a => ({ text: a.textContent?.trim().slice(0, 30), href: a.getAttribute('href') }))
      .filter(l => l.href && !l.href.startsWith('http'))
  })
  console.log('Internal links:')
  allLinks.forEach(l => console.log(`  "${l.text}" → ${l.href}`))

  // --- Current URL ---
  console.log('Current URL:', page.url())

  // --- Check swatch click updates URL ---
  const swatchBtns = await page.locator('button[style*="background"]').all()
  console.log(`Swatch buttons with inline bg: ${swatchBtns.length}`)
  if (swatchBtns.length > 1) {
    const urlBefore = page.url()
    await swatchBtns[1].click()
    await page.waitForTimeout(800)
    const urlAfter = page.url()
    console.log(`URL before swatch: ${urlBefore}`)
    console.log(`URL after swatch:  ${urlAfter}`)
    console.log(`URL changed: ${urlBefore !== urlAfter}`)
  }

  // --- Size section ---
  const sizeSection = await page.evaluate(() => {
    const el = document.querySelector('[class*="size"], [class*="Size"]')
    return el ? el.outerHTML.slice(0, 400) : '(not found)'
  })
  console.log('Size section HTML:', sizeSection)

  // --- ADD TO BAG ---
  const addBag = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'))
    const found = btns.find(b => /add.*bag|add.*cart/i.test(b.textContent || ''))
    return found ? `text="${found.textContent?.trim()}" visible=${found.offsetParent !== null}` : '(not found)'
  })
  console.log('ADD TO BAG:', addBag)
})

test('INVESTIGATE: SHOP nav — what does clicking it do', async ({ page }) => {
  await page.goto(`${BASE}/en`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1500)

  // Dump all nav links
  const navLinks = await page.evaluate(() => {
    const nav = document.querySelector('nav, header')
    if (!nav) return []
    return Array.from(nav.querySelectorAll('a')).map(a => ({
      text: a.textContent?.trim().slice(0, 30),
      href: a.getAttribute('href'),
    }))
  })
  console.log('All nav links:')
  navLinks.forEach(l => console.log(`  "${l.text}" → ${l.href}`))

  // Look for SHOP specifically
  const shopLink = page.locator('header a, nav a').filter({ hasText: /^shop$/i }).first()
  const shopLinkHref = await shopLink.getAttribute('href').catch(() => null)
  console.log(`SHOP link href: ${shopLinkHref}`)

  // Hover to see dropdown
  await shopLink.hover().catch(() => {})
  await page.waitForTimeout(600)

  // Dump dropdown links
  const dropdownLinks = await page.evaluate(() => {
    // find any newly visible links
    return Array.from(document.querySelectorAll('a[href]'))
      .filter(a => {
        const rect = a.getBoundingClientRect()
        return rect.top > 60 && rect.width > 0 && rect.height > 0
      })
      .map(a => ({ text: a.textContent?.trim().slice(0, 30), href: a.getAttribute('href') }))
  })
  console.log('Visible links after SHOP hover:')
  dropdownLinks.forEach(l => console.log(`  "${l.text}" → ${l.href}`))
})

test('INVESTIGATE: SWC error — is it a real app error or Turbopack artifact', async ({ page }) => {
  const allErrors: string[] = []
  const allWarnings: string[] = []

  page.on('console', m => {
    if (m.type() === 'error') allErrors.push(m.text())
    if (m.type() === 'warning') allWarnings.push(m.text())
  })
  page.on('pageerror', e => allErrors.push(`[pageerror] ${e.message}`))

  await page.goto(`${BASE}/en`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(2000)

  // Check if page is actually functional despite error
  const h1 = await page.locator('h1').first().textContent().catch(() => null)
  const isInteractive = await page.locator('a, button').count()

  console.log(`Page H1: "${h1}"`)
  console.log(`Interactive elements: ${isInteractive}`)
  console.log(`Errors (${allErrors.length}):`, allErrors)
  console.log(`Warnings (${allWarnings.length}):`, allWarnings.slice(0, 3))

  // Hard reload
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1500)
  const errorsAfterReload = allErrors.length
  console.log(`Errors after reload: ${errorsAfterReload}`)
})

test('INVESTIGATE: Newsletter form location', async ({ page }) => {
  // Check homepage for newsletter
  await page.goto(`${BASE}/en`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(2000)

  // Scroll to bottom
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await page.waitForTimeout(800)

  const emailInput = page.locator('input[type="email"]').first()
  const isVisible = await emailInput.isVisible().catch(() => false)
  const allForms = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('form')).map(f => ({
      id: f.id,
      className: f.className.toString().slice(0, 60),
      inputs: Array.from(f.querySelectorAll('input')).map(i => i.type),
    }))
  })

  console.log(`Newsletter input visible: ${isVisible}`)
  console.log('Forms on homepage:', JSON.stringify(allForms, null, 2))

  if (isVisible) {
    await emailInput.fill('test@nivenxa.com')
    const submitBtn = page.locator('form button[type="submit"], form button').first()
    await submitBtn.click().catch(() => {})
    await page.waitForTimeout(1000)
    const successMsg = await page.locator('[class*="success"], [class*="thank"]').first().isVisible().catch(() => false)
    console.log(`Submit success message shown: ${successMsg}`)
    const currentVal = await emailInput.inputValue().catch(() => '')
    console.log(`Input value after submit: "${currentVal}"`)
  }
})

test('INVESTIGATE: Breadcrumb on product + colour pages', async ({ page }) => {
  for (const [label, url] of [
    ['product page', '/en/shop/over-tee-shirts/raw-oat'],
    ['colour page', '/en/shop/mens/oversized-tee'],
    ['sub-item', '/en/edits/utility-edit/heavyweight-canvas'],
  ]) {
    await page.goto(`${BASE}${url}`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1000)

    const allLinks = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a[href]'))
        .filter(a => {
          const rect = a.getBoundingClientRect()
          return rect.top < 200 && rect.top > 0 && rect.width > 0
        })
        .map(a => ({ text: a.textContent?.trim().slice(0, 40), href: a.getAttribute('href') }))
    })
    console.log(`\n[${label}] Top links (breadcrumbs?):`)
    allLinks.forEach(l => console.log(`  "${l.text}" → ${l.href}`))
  }
})
