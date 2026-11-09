import { test, expect, type Page } from '@playwright/test'

// Play smoke test against the CURRENT setup screen (the older strength-slider/draw-resign specs target a
// range-slider UI that no longer exists). Covers: every level, strength selection, White/Black/Random,
// starting a game, tap-to-move (select a piece, then its square), and the engine replying.
// Writes are blocked: nothing is saved while this runs.

async function blockWrites(page: Page) {
  await page.route('**/*', (route) => {
    const req = route.request()
    const isWrite = req.method() === 'POST' && (req.headers()['next-action'] || req.url().includes('/api/'))
    return isWrite ? route.abort() : route.continue()
  })
}

async function squareCentre(page: Page, square: string) {
  const box = (await page.locator('cg-board').first().boundingBox())!
  const black = await page.locator('.cg-wrap').first().evaluate((el) => el.classList.contains('orientation-black'))
  const file = square.charCodeAt(0) - 97
  const rank = Number(square[1]) - 1
  const col = black ? 7 - file : file
  const row = black ? rank : 7 - rank
  return { x: box.x + ((col + 0.5) * box.width) / 8, y: box.y + ((row + 0.5) * box.height) / 8 }
}

test.use({ viewport: { width: 1280, height: 1100 } })

test('every level and strength can be chosen; colours can be chosen', async ({ page }) => {
  await blockWrites(page)
  await page.goto('/chess/play', { waitUntil: 'networkidle' })
  for (const tier of ['Beginner', 'Intermediate', 'Expert', 'Master']) {
    await page.getByRole('button', { name: new RegExp(`^${tier}`) }).click()
    await expect(page.getByText(new RegExp(`${tier} strength`, 'i'))).toBeVisible()
  }
  await page.getByRole('button', { name: /^Master/ }).click()
  await page.getByRole('button', { name: '7', exact: true }).click()
  await expect(page.getByText(/Strength 7/)).toBeVisible()
  for (const colour of ['White', 'Black', 'Random']) {
    await page.getByRole('button', { name: colour, exact: true }).click()
  }
})

test('Beginner as White: game starts, a tapped move is played, the engine replies', async ({ page }) => {
  await blockWrites(page)
  await page.goto('/chess/play', { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: /^Beginner/ }).click()
  await page.getByRole('button', { name: 'White', exact: true }).click()
  await page.getByRole('button', { name: 'Start Game' }).click()
  await page.waitForSelector('cg-board')
  await expect(page.getByText('Loading engine…')).toHaveCount(0, { timeout: 30000 })

  const from = await squareCentre(page, 'e2')
  await page.mouse.click(from.x, from.y)
  const to = await squareCentre(page, 'e4')
  await page.mouse.click(to.x, to.y)

  await expect(page.getByText(/1\.e4/).first()).toBeVisible({ timeout: 5000 })
  // The engine answers (black's 1... move appears) and the page stayed responsive while it thought.
  await expect(page.getByText(/1\.\.\.[a-zA-Z]/).first()).toBeVisible({ timeout: 20000 })
  await expect(page.getByText('Engine thinking…')).toHaveCount(0, { timeout: 20000 })
})
