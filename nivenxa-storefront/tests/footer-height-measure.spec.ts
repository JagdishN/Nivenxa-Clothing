import { test } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

// Footer height, content->footer gap and horizontal overflow per page, at fixed viewports.
//   LABEL=footers-before npx playwright test tests/footer-height-measure.spec.ts
// Studio pages are included as the CONTROL: their numbers must be identical before and after.

const LABEL = process.env.LABEL ?? 'footers'
const OUT = join(process.cwd(), 'docs', 'chess-screenshots', LABEL)

const PAGES = [
  { name: 'chess-home', path: '/chess' },
  { name: 'chess-learn', path: '/chess/learn' },
  { name: 'chess-puzzles', path: '/chess/puzzles' },
  { name: 'chess-puzzle', path: '/chess/puzzles/mateIn1' },
  { name: 'chess-play', path: '/chess/play' },
  { name: 'chess-analysis', path: '/chess/analysis' },
  { name: 'chess-tournaments', path: '/chess/tournaments' },
  { name: 'chess-terms', path: '/chess/terms' },
  { name: 'chess-login', path: '/chess/login' },
  { name: 'living-landing', path: '/living' },
  { name: 'living-login', path: '/living/login' },
  { name: 'living-terms', path: '/living/terms' },
  { name: 'technologies', path: '/technologies' },
  { name: 'STUDIO-terms', path: '/studio/en/terms' },
  { name: 'STUDIO-shipping', path: '/studio/en/shipping' },
]

test.setTimeout(900000)

test('footer heights', async ({ browser }) => {
  mkdirSync(OUT, { recursive: true })
  const rows: Record<string, unknown>[] = []
  for (const vp of [
    { name: 'desktop', width: 1280, height: 800 },
    { name: 'mobile', width: 390, height: 844 },
  ]) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } })
    const page = await ctx.newPage()
    for (const p of PAGES) {
      const row: Record<string, unknown> = { page: p.name, viewport: vp.name }
      try {
        const res = await page.goto(p.path, { waitUntil: 'networkidle', timeout: 90000 })
        row.status = res?.status()
        await page.waitForTimeout(500)
        Object.assign(row, await page.evaluate(() => {
          const feet = Array.from(document.querySelectorAll('footer')).filter((f) => getComputedStyle(f).display !== 'none' && f.getBoundingClientRect().height > 0)
          const f = feet[feet.length - 1] ?? null
          if (!f) return { footer: false }
          const r = f.getBoundingClientRect()
          const scroller = document.scrollingElement ?? document.documentElement
          const top = r.top + scroller.scrollTop
          const sel = 'h1,h2,h3,h4,p,li,a,button,img,canvas,input,label,table,form,svg:not([aria-hidden="true"]),[class*="ard"],[class*="ile"]'
          let lowest = 0
          for (const el of Array.from(document.querySelectorAll(sel))) {
            if (f.contains(el) || el.closest('header,nav')) continue
            const b = el.getBoundingClientRect()
            const s = getComputedStyle(el)
            if (b.width === 0 || b.height === 0 || s.visibility === 'hidden' || s.display === 'none' || s.position === 'fixed') continue
            const bottom = b.bottom + scroller.scrollTop
            if (bottom <= top + 1) lowest = Math.max(lowest, bottom)
          }
          const cs = getComputedStyle(f)
          return {
            footer: true,
            footerHeight: Math.round(r.height),
            gapContentToFooter: Math.round(top - lowest),
            footerBg: cs.backgroundColor,
            footerMarginTop: cs.marginTop,
            footerPadding: `${cs.paddingTop} ${cs.paddingBottom}`,
            docHeight: Math.max(document.documentElement.scrollHeight, document.body.scrollHeight),
            hOverflow: document.documentElement.scrollWidth > window.innerWidth,
          }
        }))
        const h = Number(row.docHeight ?? vp.height)
        await page.setViewportSize({ width: vp.width, height: Math.min(Math.max(h, vp.height), 4500) })
        await page.waitForTimeout(150)
        await page.screenshot({ path: join(OUT, `${p.name}-${vp.name}.png`) })
        await page.setViewportSize({ width: vp.width, height: vp.height })
      } catch (e) {
        row.error = String(e).slice(0, 160)
      }
      rows.push(row)
    }
    await ctx.close()
  }
  writeFileSync(join(OUT, 'footer-heights.json'), JSON.stringify(rows, null, 2))
  console.table(rows.map((r) => ({ page: r.page, vp: r.viewport, status: r.status, h: r.footerHeight, gap: r.gapContentToFooter, mt: r.footerMarginTop, pad: r.footerPadding, bg: r.footerBg, overflow: r.hOverflow, err: r.error })))
})
