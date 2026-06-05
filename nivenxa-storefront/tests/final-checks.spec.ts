import { test, expect } from '@playwright/test'

const BASE = 'http://localhost:3000'

test('CHECK: /en/shop direct navigation', async ({ page }) => {
  const responses: Array<{ url: string; status: number }> = []
  page.on('response', r => responses.push({ url: r.url(), status: r.status() }))

  await page.goto(`${BASE}/en/shop`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(2000)

  console.log('Final URL:', page.url())
  console.log('Page title:', await page.title())
  const h1 = await page.locator('h1').first().textContent().catch(() => '(none)')
  console.log('H1:', h1)

  // Check for redirect
  const shopResponse = responses.find(r => r.url.includes('/en/shop'))
  console.log('Shop response:', shopResponse)

  // Count product items
  const productLinks = await page.locator('a[href*="/shop/"]').count()
  console.log('Product links on shop page:', productLinks)

  console.log('URL is /shop:', page.url().includes('/shop'))
})

test('CHECK: Size click → ADD TO BAG', async ({ page }) => {
  await page.goto(`${BASE}/en/shop/over-tee-shirts/raw-oat`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(2000)

  // Check CTA before size selection
  const ctaBefore = await page.locator('[class*="cta"], [class*="Cta"]').filter({ hasText: /choose|size|bag|cart/i }).first().textContent().catch(() => null)
  console.log('CTA before size click:', ctaBefore)

  // Click size S
  const sBtn = page.locator('button[aria-label="S size"]')
  const sBtnVisible = await sBtn.isVisible().catch(() => false)
  console.log('S size button visible:', sBtnVisible)
  if (sBtnVisible) {
    await sBtn.click()
    await page.waitForTimeout(500)
    const ctaAfter = await page.locator('[class*="cta"], [class*="Cta"]').filter({ hasText: /choose|size|bag|cart/i }).first().textContent().catch(() => null)
    console.log('CTA after size click:', ctaAfter)
    const addToBag = page.locator('button').filter({ hasText: /add.*bag|add.*cart/i }).first()
    const addVisible = await addToBag.isVisible().catch(() => false)
    console.log('ADD TO BAG visible:', addVisible)
  }

  // Mobile sticky bar
  const mobileBar = await page.locator('[class*="stickyBar"], [class*="sticky"], [class*="MobileSticky"]').first().textContent().catch(() => null)
  console.log('Mobile sticky bar text:', mobileBar?.trim().slice(0, 60))
})

test('CHECK: Swatch click updates URL on product page', async ({ page }) => {
  await page.goto(`${BASE}/en/shop/over-tee-shirts/raw-oat`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1500)

  const urlBefore = page.url()
  console.log('URL before:', urlBefore)

  // Click 'Bone' swatch (second tile)
  const boneSwatch = page.locator('button[aria-label="Bone"]')
  const boneVisible = await boneSwatch.isVisible().catch(() => false)
  console.log('Bone swatch visible:', boneVisible)

  if (boneVisible) {
    await boneSwatch.click()
    await page.waitForTimeout(1200)
    const urlAfter = page.url()
    console.log('URL after:', urlAfter)
    console.log('URL updated:', urlBefore !== urlAfter)

    // Hero image updated?
    const heroSrc = await page.locator('[class*="heroImage"]').first().getAttribute('src').catch(() => null)
    console.log('Hero img src after:', heroSrc?.slice(-50))
  }
})

test('CHECK: Newsletter form submit behaviour', async ({ page }) => {
  await page.goto(`${BASE}/en`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1000)

  // Scroll to find newsletter
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await page.waitForTimeout(800)

  const emailInput = page.locator('input[type="email"]').first()
  const isVisible = await emailInput.isVisible().catch(() => false)
  console.log('Newsletter input visible:', isVisible)

  if (isVisible) {
    await emailInput.fill('test@nivenxa.com')
    // Check submit method - does form have action or is it JS handled?
    const formInfo = await page.evaluate(() => {
      const form = document.querySelector('form')
      return form ? {
        action: form.action,
        method: form.method,
        onsubmit: !!form.onsubmit,
      } : null
    })
    console.log('Form info:', JSON.stringify(formInfo))

    // Press Enter instead of clicking submit to avoid navigation
    await emailInput.press('Enter')
    await page.waitForTimeout(1500)
    console.log('URL after submit:', page.url())
    const successText = await page.evaluate(() => {
      const els = Array.from(document.querySelectorAll('*'))
      const found = els.find(el =>
        el.children.length === 0 &&
        /thank|success|subscri|confirm/i.test(el.textContent || '')
      )
      return found?.textContent?.trim().slice(0, 80) || null
    })
    console.log('Success message:', successText)
  }
})
