import { test } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

// Where the board and the main puzzle controls sit on a laptop-height screen (C4).
//   LABEL=puzzle-before npx playwright test tests/puzzle-layout-measure.spec.ts
const LABEL = process.env.LABEL ?? 'puzzle-layout'
const OUT = join(process.cwd(), 'docs', 'chess-screenshots', LABEL)

test.setTimeout(120000)

test('puzzle page: board and controls vs viewport', async ({ browser }) => {
  mkdirSync(OUT, { recursive: true })
  const results: Record<string, unknown>[] = []
  for (const vp of [
    { name: 'laptop-1280x720', width: 1280, height: 720 },
    { name: 'laptop-1366x768', width: 1366, height: 768 },
    { name: 'mobile-390x844', width: 390, height: 844 },
  ]) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } })
    const page = await ctx.newPage()
    await page.goto('/chess/puzzles/mateIn1', { waitUntil: 'networkidle' })
    await page.waitForSelector('cg-board')
    await page.waitForTimeout(400)
    const m = await page.evaluate(() => {
      const r = (el: Element | null) => (el ? el.getBoundingClientRect() : null)
      const board = r(document.querySelector('cg-board'))
      const hint = Array.from(document.querySelectorAll('button')).find((b) => /hint/i.test(b.textContent ?? ''))
      const hintR = r(hint ?? null)
      const h1 = r(document.querySelector('h1'))
      return {
        h1Bottom: h1 ? Math.round(h1.bottom) : null,
        boardTop: board ? Math.round(board.top) : null,
        boardBottom: board ? Math.round(board.bottom) : null,
        boardSize: board ? Math.round(board.width) : null,
        hintBottom: hintR ? Math.round(hintR.bottom) : null,
        viewportHeight: window.innerHeight,
      }
    })
    const fitsBoard = Number(m.boardBottom) <= vp.height
    const fitsControls = Number(m.hintBottom) <= vp.height
    results.push({ viewport: vp.name, ...m, wholeBoardVisible: fitsBoard, hintButtonVisible: fitsControls })
    await page.screenshot({ path: join(OUT, `puzzle-${vp.name}.png`) })
    await ctx.close()
  }
  writeFileSync(join(OUT, 'puzzle-layout.json'), JSON.stringify(results, null, 2))
  console.table(results)
})
