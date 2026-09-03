import { test, expect } from '@playwright/test'

test.describe('Play — Strength sub-selector on the setup screen', () => {
  test('Master defaults to Strength 1 of 7, and updating it carries into the game meta row', async ({ page }) => {
    await page.goto('/chess/play', { waitUntil: 'networkidle' })

    await page.getByRole('button', { name: /^Master/ }).click()
    await expect(page.getByText('Strength: 1 of 7')).toBeVisible()

    const slider = page.locator('input[type="range"]')
    await expect(slider).toHaveAttribute('max', '7')
    await slider.fill('7')
    await expect(page.getByText('Strength: 7 of 7')).toBeVisible()

    await page.getByRole('button', { name: 'White' }).click()
    await page.getByRole('button', { name: 'Start Game' }).click()
    await page.waitForSelector('.cg-wrap')

    await expect(page.locator('[class*="metaText"]')).toContainText('Strength 7/7')
  })

  test('switching tiers resets Strength to that tier\'s own default (1 of N)', async ({ page }) => {
    await page.goto('/chess/play', { waitUntil: 'networkidle' })

    await page.getByRole('button', { name: /^Master/ }).click()
    await page.locator('input[type="range"]').fill('7')
    await expect(page.getByText('Strength: 7 of 7')).toBeVisible()

    await page.getByRole('button', { name: /^Intermediate/ }).click()
    await expect(page.getByText('Strength: 1 of 5')).toBeVisible()
  })
})
