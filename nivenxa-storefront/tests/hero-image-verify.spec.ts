import { test, expect } from '@playwright/test'

const BASE = 'http://localhost:3000'

test('Hero image: src is set and non-empty on raw-oat', async ({ page }) => {
  await page.goto(`${BASE}/en/shop/over-tee-shirts/raw-oat`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1500)

  // Correct selector: img element with heroImage class
  const heroImg = page.locator('img[class*="heroImage"]').first()
  const src = await heroImg.getAttribute('src')
  console.log('Hero img src (raw-oat):', src)
  expect(src, 'src should be non-null').not.toBeNull()
  expect(src, 'src should be non-empty').not.toBe('')
})

test('Hero image: src updates after swatch click to bone', async ({ page }) => {
  const consoleErrors: string[] = []
  page.on('pageerror', e => consoleErrors.push(e.message))
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()) })

  await page.goto(`${BASE}/en/shop/over-tee-shirts/raw-oat`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1500)

  const srcBefore = await page.locator('img[class*="heroImage"]').first().getAttribute('src')
  console.log('src before (raw-oat):', srcBefore)

  // Click Bone swatch
  const boneSwatch = page.locator('button[aria-label="Bone"]')
  await expect(boneSwatch, 'Bone swatch').toBeVisible()
  await boneSwatch.click()
  await page.waitForTimeout(1500)

  const urlAfter = page.url()
  console.log('URL after swatch click:', urlAfter)
  expect(urlAfter).toContain('/bone')

  const srcAfter = await page.locator('img[class*="heroImage"]').first().getAttribute('src')
  console.log('src after (bone):', srcAfter)
  expect(srcAfter, 'src after bone should be non-null').not.toBeNull()
  expect(srcAfter, 'src after bone should be non-empty').not.toBe('')
  expect(srcAfter, 'src should change after swatch click').not.toBe(srcBefore)

  // No console errors during the whole flow
  expect(consoleErrors, 'no console errors').toEqual([])
})

test('Hero image: all 6 colour srcs are non-empty', async ({ page }) => {
  const colours = ['raw-oat', 'bone', 'espresso', 'mushroom', 'earth', 'red-earth']

  for (const colour of colours) {
    await page.goto(`${BASE}/en/shop/over-tee-shirts/${colour}`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1000)

    const src = await page.locator('img[class*="heroImage"]').first().getAttribute('src')
    const alt = await page.locator('img[class*="heroImage"]').first().getAttribute('alt')
    const naturalWidth = await page.locator('img[class*="heroImage"]').first().evaluate(
      (img) => (img as HTMLImageElement).naturalWidth
    ).catch(() => 0)

    console.log(`  ${colour}: src="${src?.slice(-50)}" naturalWidth=${naturalWidth}`)
    expect(src, `${colour} src should exist`).not.toBeNull()
    expect(src, `${colour} src should not be empty`).not.toBe('')
  }
})
