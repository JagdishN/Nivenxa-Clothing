import { test } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

// Page height and scroll distance to key actions on the Chess home, before/after the C1 pass.
//   LABEL=home-before npx playwright test tests/chess-home-measure.spec.ts
// Distances are from the top of the document (px). <body> is the scroll container on this site, so
// "scroll distance" is measured with getBoundingClientRect + scrollTop, not window.scrollY.

const LABEL = process.env.LABEL ?? 'home'
const OUT = join(process.cwd(), 'docs', 'chess-screenshots', LABEL)

test.setTimeout(180000)

test('chess home height and key-action positions', async ({ browser }) => {
  mkdirSync(OUT, { recursive: true })
  const results: Record<string, unknown>[] = []
  for (const vp of [
    { name: 'desktop', width: 1280, height: 800 },
    { name: 'mobile', width: 390, height: 844 },
  ]) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } })
    const page = await ctx.newPage()
    await page.goto('/chess', { waitUntil: 'networkidle' })
    await page.waitForTimeout(1600) // entrance animations
    const m = await page.evaluate(() => {
      const scroller = document.scrollingElement ?? document.documentElement
      const top = (el: Element | null) => (el ? Math.round(el.getBoundingClientRect().top + scroller.scrollTop) : null)
      const bottom = (el: Element | null) => (el ? Math.round(el.getBoundingClientRect().bottom + scroller.scrollTop) : null)
      const byText = (re: RegExp, sel = 'a,button') => Array.from(document.querySelectorAll(sel)).find((e) => re.test((e.textContent ?? '').trim()))
      const footer = document.querySelector('footer')
      const start = Array.from(document.querySelectorAll('a')).filter((e) => /start playing/i.test(e.textContent ?? ''))
      return {
        documentHeight: Math.max(document.documentElement.scrollHeight, document.body.scrollHeight),
        viewportHeight: window.innerHeight,
        startPlayingLinks: start.length,
        startPlayingTop: top(start[0] ?? null),
        puzzleLinkTop: top(byText(/puzzle/i) ?? null),
        tournamentTop: top(document.querySelector('[class*="nivenxaHighlight"]')),
        tournamentHeight: (() => {
          const el = document.querySelector('[class*="nivenxaHighlight"]')
          return el ? bottom(el)! - top(el)! : null
        })(),
        featuresTop: top(document.querySelector('[class*="features"]')),
        footerTop: top(footer),
        footerHeight: footer ? bottom(footer)! - top(footer)! : null,
        heroHeight: (() => {
          const el = document.querySelector('[class*="hero"]')
          return el ? bottom(el)! - top(el)! : null
        })(),
        fontSizeSubtext: getComputedStyle(document.querySelector('[class*="subtext"]') ?? document.body).fontSize,
      }
    })
    results.push({ viewport: vp.name, ...m })
    await page.setViewportSize({ width: vp.width, height: Math.min(Number(m.documentHeight), 5000) })
    await page.waitForTimeout(200)
    await page.screenshot({ path: join(OUT, `chess-home-${vp.name}.png`) })
    await ctx.close()
  }
  writeFileSync(join(OUT, 'home-measurements.json'), JSON.stringify(results, null, 2))
  console.log(JSON.stringify(results, null, 1))
})
