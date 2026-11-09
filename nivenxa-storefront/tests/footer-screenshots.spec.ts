import { test } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

// Footer-only screenshots (closed and Explore open) plus measured footer heights at identical viewports.
//   LABEL=footers-v2 npx playwright test tests/footer-screenshots.spec.ts
const ROOT = join(process.cwd(), 'docs', 'chess-screenshots', process.env.LABEL ?? 'footers-v2')

const PAGES = [
  ['chess-home', '/chess'],
  ['chess-play', '/chess/play'],
  ['chess-puzzle', '/chess/puzzles/mateIn1'],
  ['chess-analysis', '/chess/analysis'],
  ['chess-terms', '/chess/terms'],
  ['living-landing', '/living'],
  ['living-terms', '/living/terms'],
  ['technologies', '/technologies'],
  ['STUDIO-unchanged', '/studio/en/terms'],
] as const

const VIEWPORTS = [
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'mobile', width: 390, height: 844 },
  { name: 'zoom200', width: 640, height: 400 }, // a 1280×800 window at 200% browser zoom
]

test.setTimeout(400000)

test('footer screenshots and heights', async ({ browser }) => {
  mkdirSync(join(ROOT, 'footer-only'), { recursive: true })
  const heights: Record<string, Record<string, number | null>> = {}
  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } })
    const page = await ctx.newPage()
    for (const [name, path] of PAGES) {
      await page.goto(path, { waitUntil: path.startsWith('/studio') ? 'load' : 'networkidle' })
      await page.waitForTimeout(400)
      const footer = page.locator('footer:visible').last()
      await footer.scrollIntoViewIfNeeded()
      const h = await footer.evaluate((f) => Math.round(f.getBoundingClientRect().height))
      ;(heights[name] ??= {})[vp.name] = h
      await footer.screenshot({ path: join(ROOT, 'footer-only', `${name}-${vp.name}.png`) })
    }
    await ctx.close()
  }
  writeFileSync(join(ROOT, 'heights.json'), JSON.stringify(heights, null, 2))
  console.log(JSON.stringify(heights, null, 2))
})
