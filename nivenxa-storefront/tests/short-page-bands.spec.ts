import { test } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

// Short-page screenshots (footer at the viewport bottom): the area above the footer must be one continuous app background.
const OUT = join(process.cwd(), 'docs', 'chess-screenshots', process.env.LABEL ?? 'round3', 'short-pages')
test('short pages', async ({ page }) => {
  mkdirSync(OUT, { recursive: true })
  await page.setViewportSize({ width: 1280, height: 1100 })
  for (const [n, p] of [['puzzle', '/chess/puzzles/hangingPiece'], ['terms', '/chess/terms'], ['tournaments-archive', '/chess/tournaments/archive'], ['login-drawer-home', '/chess/learn']] as const) {
    await page.goto(p, { waitUntil: 'networkidle' })
    await page.screenshot({ path: join(OUT, `${n}.png`) })
  }
})
