import { test } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

// Client-side navigation timing, measured INSIDE the page (rAF sampling from the instant of the click), never by
// automation command duration. Per navigation it records:
//   feedbackMs  click -> the destination's own <h1> is on screen under the destination URL
//   readyMs     click -> the destination's real content is on screen (route specific selector)
//   staleFrames frames showing the OLD route's heading under the NEW url
//   blankFrames frames on the new url with no heading at all
//   heroVisibleMs (home only) click -> hero heading at effective opacity >= 0.99
// Run against a production build (loading.tsx boundaries are only prefetched there):
//   BASE_URL=http://localhost:3100 CONDITION=normal|slow LABEL=after npx playwright test tests/chess-nav-measure.spec.ts
const CONDITION = process.env.CONDITION ?? 'normal'
const LABEL = process.env.LABEL ?? 'after'
const REPS = 5
const OUT = join(process.cwd(), 'docs', 'chess-screenshots', 'round3')
mkdirSync(OUT, { recursive: true })

interface Case {
  name: string
  from: string
  linkSelector: string
  ready: string // evaluated in page: truthy when real content is shown
  to: string
}

const CASES: Case[] = [
  { name: 'Home (from Learn)', from: '/chess/learn', linkSelector: 'header a[href="/chess"], nav a[href="/chess"]', to: '/chess', ready: `!!document.querySelector('[aria-label="Next tournament"]')` },
  { name: 'Login (from Home)', from: '/chess', linkSelector: 'a[href^="/chess/login"]', to: '/chess/login', ready: `!!document.querySelector('input[type="email"], input[inputmode="email"]')` },
  { name: 'Tournaments (from Home)', from: '/chess', linkSelector: 'nav a[href="/chess/tournaments"]', to: '/chess/tournaments', ready: `!!document.querySelector('article, [class*="emptyState"]')` },
  { name: 'Puzzle catalogue (from Home)', from: '/chess', linkSelector: 'nav a[href="/chess/puzzles"]', to: '/chess/puzzles', ready: `document.querySelectorAll('main a[href^="/chess/puzzles/"]').length > 3` },
  { name: 'Puzzle solver (from catalogue)', from: '/chess/puzzles', linkSelector: 'main a[href="/chess/puzzles/mateIn1"], main a[href^="/chess/puzzles/"]', to: '/chess/puzzles/', ready: `!!document.querySelector('[data-fen]')` },
]

const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]

test.setTimeout(600000)

test(`navigation timing — ${LABEL} — ${CONDITION}`, async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const page = await ctx.newPage()
  if (CONDITION === 'slow') {
    const cdp = await ctx.newCDPSession(page)
    await cdp.send('Network.enable')
    // ~ a slow 4G phone link: 400 ms RTT, 1.6 Mbit/s down, 750 kbit/s up
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 400, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 })
  }

  const results: Record<string, Record<string, number[]>> = {}
  for (const c of CASES) {
    const r: Record<string, number[]> = { feedbackMs: [], readyMs: [], staleFrames: [], blankFrames: [], heroVisibleMs: [] }
    for (let i = 0; i < REPS + 1; i++) {
      await page.goto(c.from, { waitUntil: 'load' })
      await page.waitForTimeout(CONDITION === 'slow' ? 3500 : 1500) // let prefetches land
      const out = await page.evaluate(
        async ({ sel, to, ready }) => {
          const link = Array.from(document.querySelectorAll<HTMLAnchorElement>(sel)).find((a) => a.offsetParent !== null)
          if (!link) return null
          const oldH1 = document.querySelector('h1')?.textContent?.trim() ?? ''
          const eff = (el: Element | null) => {
            let o = 1
            for (let n: Element | null = el; n; n = n.parentElement) o *= Number(getComputedStyle(n).opacity)
            return o
          }
          const samples: { t: number; ok: boolean; h1: string | null; op: number; ready: boolean }[] = []
          const t0 = performance.now()
          let done = false
          const tick = () => {
            const h1 = document.querySelector('h1')
            samples.push({
              t: performance.now() - t0,
              ok: location.pathname.startsWith(to),
              h1: h1?.textContent?.trim() ?? null,
              op: h1 ? eff(h1) : 0,
              ready: Boolean(new Function(`return ${ready}`)()),
            })
            if (!done) requestAnimationFrame(tick)
          }
          requestAnimationFrame(tick)
          link.click()
          await new Promise((r) => setTimeout(r, 6000))
          done = true
          const onNew = samples.filter((s) => s.ok)
          const first = (f: (s: (typeof samples)[number]) => boolean) => onNew.find(f)?.t ?? null
          return {
            feedbackMs: first((s) => !!s.h1 && s.h1 !== oldH1 && s.op > 0.99),
            readyMs: first((s) => s.ready && !!s.h1 && s.h1 !== oldH1),
            heroVisibleMs: first((s) => !!s.h1 && s.op >= 0.99),
            staleFrames: onNew.filter((s) => s.h1 === oldH1 && oldH1 !== '').length,
            blankFrames: onNew.filter((s) => !s.h1).length,
          }
        },
        { sel: c.linkSelector, to: c.to, ready: c.ready }
      )
      if (i === 0 || !out) continue // first pass warms (dev compile / cold cache)
      for (const k of Object.keys(r)) {
        const v = (out as Record<string, number | null>)[k]
        if (v !== null && v !== undefined) r[k].push(Math.round(v))
      }
    }
    results[c.name] = r
  }
  const summary = Object.fromEntries(
    Object.entries(results).map(([k, r]) => [
      k,
      Object.fromEntries(Object.entries(r).map(([m, xs]) => [m, xs.length ? { median: median(xs), max: Math.max(...xs), n: xs.length } : null])),
    ])
  )
  writeFileSync(join(OUT, `nav-${LABEL}-${CONDITION}.json`), JSON.stringify({ base: process.env.BASE_URL ?? 'dev', CONDITION, REPS, summary, results }, null, 2))
  console.log(JSON.stringify(summary, null, 1))
  await ctx.close()
})
