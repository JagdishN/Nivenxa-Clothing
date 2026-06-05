import { test, expect } from '@playwright/test'

const BASE = 'http://localhost:3000'

test('Newsletter: form is a real <form>, button has type=submit, submit shows confirmation', async ({ page }) => {
  await page.goto(`${BASE}/en`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1500)

  // Scroll to newsletter section
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await page.waitForTimeout(600)

  // Confirm <form> element exists
  const formEl = page.locator('form').first()
  await expect(formEl, 'form element should exist').toBeVisible({ timeout: 5000 })
  console.log('  <form> element: visible ✓')

  // Confirm button type=submit
  const submitBtn = page.locator('button[type="submit"]').first()
  await expect(submitBtn, 'button[type="submit"] should exist').toBeVisible({ timeout: 5000 })
  const btnText = await submitBtn.textContent()
  console.log(`  button[type="submit"] text: "${btnText?.trim()}" ✓`)

  // Fill email and submit
  const emailInput = page.locator('input[type="email"]').first()
  await emailInput.fill('test@nivenxa.com')
  await submitBtn.click()

  // Loading state briefly shows "Adding..."
  // Then confirmation appears
  await expect(
    page.locator('p').filter({ hasText: 'Noted. We will be in touch.' }),
    'Confirmation message should appear'
  ).toBeVisible({ timeout: 5000 })
  console.log('  Confirmation "Noted. We will be in touch." visible ✓')

  // No page navigation
  expect(page.url(), 'URL should not change').toBe(`${BASE}/en`)
  console.log('  URL unchanged ✓')
})

test('Newsletter: Enter key submits', async ({ page }) => {
  await page.goto(`${BASE}/en`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1500)
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await page.waitForTimeout(600)

  const emailInput = page.locator('input[type="email"]').first()
  await emailInput.fill('enter@nivenxa.com')
  await emailInput.press('Enter')

  await expect(
    page.locator('p').filter({ hasText: 'Noted. We will be in touch.' }),
    'Confirmation via Enter key'
  ).toBeVisible({ timeout: 5000 })
  console.log('  Enter key submit works ✓')
})
