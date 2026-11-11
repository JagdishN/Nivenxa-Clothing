import { test } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

// Measures the space between each page's last visible content and its footer,
// and whether short pages reach the viewport bottom. Run once before and once
// after the layout fix:
//   LABEL=before npx playwright test tests/footer-gap-measure.spec.ts
//   LABEL=after  npx playwright test tests/footer-gap-measure.spec.ts
// Writes docs/chess-screenshots/<label>/measurements.json + one PNG per page.
// Read-only: it only loads pages, it never submits anything.

const LABEL = process.env.LABEL ?? 'run'
const OUT = join(process.cwd(), 'docs', 'chess-screenshots', LABEL)

const PAGES: { name: string; path: string }[] = [
  { name: 'chess-home', path: '/chess' },
  { name: 'chess-puzzles', path: '/chess/puzzles' },
  { name: 'chess-puzzle-topic', path: '/chess/puzzles/mateIn1' },
  { name: 'chess-learn', path: '/chess/learn' },
  { name: 'chess-tournaments', path: '/chess/tournaments' },
  { name: 'chess-terms', path: '/chess/terms' },
  { name: 'chess-login-short', path: '/chess/login' },
  { name: 'chess-404-short', path: '/chess/this-page-does-not-exist' },
  { name: 'living-login-short', path: '/living/login' },
  { name: 'living-landing', path: '/living' },
  { name: 'living-terms', path: '/living/terms' },
  { name: 'root-privacy', path: '/privacy' },
  { name: 'root-contact', path: '/contact' },
  { name: 'studio-terms', path: '/studio/en/terms' },
  { name: 'studio-shipping', path: '/studio/en/shipping' },
]

const VIEWPORTS = [
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'mobile', width: 390, height: 844 },
]

test.setTimeout(600000)

test('measure footer gap', async ({ browser }) => {
  mkdirSync(OUT, { recursive: true })
  const results: Record<string, unknown>[] = []

  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } })
    const page = await context.newPage()
    for (const p of PAGES) {
      const entry: Record<string, unknown> = { page: p.name, path: p.path, viewport: vp.name }
      try {
        const res = await page.goto(p.path, { waitUntil: 'networkidle', timeout: 90000 })
        entry.status = res?.status()
        await page.waitForTimeout(400)
        const m = await page.evaluate(() => {
          const footer = document.querySelector('footer')
          if (!footer) return { footer: false }
          const fr = footer.getBoundingClientRect()
          const scrollTop = window.scrollY
          const footerTop = fr.top + scrollTop
          const footerBottom = fr.bottom + scrollTop
          const docH = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight)
          // Last visible content above the footer: the lowest bottom edge of any
          // real content element that sits before it in the document.
          const sel = 'h1,h2,h3,h4,p,li,a,button,img,canvas,input,label,table,form,svg:not([aria-hidden="true"]),[class*="ard"],[class*="ile"]'
          let lowest = 0
          for (const el of Array.from(document.querySelectorAll(sel))) {
            if (footer.contains(el)) continue
            if (el.closest('header,nav')) continue
            const r = el.getBoundingClientRect()
            if (r.width === 0 || r.height === 0) continue
            const style = getComputedStyle(el)
            if (style.visibility === 'hidden' || style.display === 'none' || Number(style.opacity) === 0) continue
            if (style.position === 'fixed') continue
            const bottom = r.bottom + scrollTop
            if (bottom <= footerTop + 1) lowest = Math.max(lowest, bottom)
          }
          // Colour of the strip directly above the footer vs. the page's own background.
          const probe = document.elementFromPoint(window.innerWidth / 2, Math.max(0, Math.min(window.innerHeight - 1, footerTop - 4 - scrollTop)))
          return {
            footer: true,
            footerTop: Math.round(footerTop),
            footerBottom: Math.round(footerBottom),
            documentHeight: docH,
            viewportHeight: window.innerHeight,
            gapContentToFooter: Math.round(footerTop - lowest),
            footerMarginTop: getComputedStyle(footer).marginTop,
            shortPage: docH <= window.innerHeight + 1,
            footerBottomToViewportBottom: docH <= window.innerHeight + 1 ? Math.round(window.innerHeight - footerBottom) : null,
            bandProbe: probe ? { tag: probe.tagName, cls: String(probe.className).slice(0, 60), bg: getComputedStyle(probe).backgroundColor } : null,
            bodyBg: getComputedStyle(document.body).backgroundColor,
          }
        })
        Object.assign(entry, m)
        // <body> is the scroll container (app/globals.css: html,body{height:100%;overflow:auto}), so
        // Playwright's fullPage capture only sees one viewport. Grow the viewport to the document
        // height instead so the screenshot includes everything down to the footer.
        const docH = Number((m as { documentHeight?: number }).documentHeight ?? vp.height)
        await page.setViewportSize({ width: vp.width, height: Math.min(Math.max(docH, vp.height), 5000) })
        await page.waitForTimeout(150)
        await page.screenshot({ path: join(OUT, `${p.name}-${vp.name}.png`) })
        await page.setViewportSize({ width: vp.width, height: vp.height })
      } catch (e) {
        entry.error = String(e).slice(0, 200)
      }
      results.push(entry)
    }
    await context.close()
  }

  writeFileSync(join(OUT, 'measurements.json'), JSON.stringify(results, null, 2))
  console.table(
    results.map((r) => ({
      page: r.page,
      vp: r.viewport,
      status: r.status,
      gap: r.gapContentToFooter,
      mt: r.footerMarginTop,
      short: r.shortPage,
      footerToViewportBottom: r.footerBottomToViewportBottom,
      err: r.error,
    }))
  )
})
