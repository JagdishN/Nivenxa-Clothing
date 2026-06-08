import { test, expect } from '@playwright/test'

const BASE = 'http://localhost:3000'

// Each test gets a fresh browser context → no stale chunk cache
test.use({ storageState: undefined })

test('SWC: fresh context — homepage', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', e => errors.push(e.message))
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()) })
  await page.goto(`${BASE}/en`, { waitUntil: 'networkidle' })
  console.log(`  errors: ${errors.length}`, errors)
  expect(errors.filter(e => !e.includes('Warning'))).toEqual([])
})

test('SWC: fresh context — product page', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', e => errors.push(e.message))
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()) })
  await page.goto(`${BASE}/en/shop/over-tee-shirts/raw-oat`, { waitUntil: 'networkidle' })
  console.log(`  errors: ${errors.length}`, errors)
  expect(errors.filter(e => !e.includes('Warning'))).toEqual([])
})

test('SWC: navigate homepage → product (simulates real user flow)', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', e => errors.push(e.message))
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()) })

  await page.goto(`${BASE}/en`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1000)
  await page.goto(`${BASE}/en/shop/over-tee-shirts/raw-oat`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1000)

  console.log(`  errors after navigation: ${errors.length}`, errors)
  expect(errors.filter(e => !e.includes('Warning'))).toEqual([])
})
