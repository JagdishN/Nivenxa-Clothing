// Measures the level-based reply pace in the page: ms from the human move being accepted to the opponent's reply appearing, for a scripted engine whose
// computation time is exact (so "shorter / longer than the minimum" is controlled). Production build on BASE_URL.
//   BASE_URL=http://localhost:3100 RUNS=5 npx tsx scripts/measure-pace.mts
import { chromium } from '@playwright/test'
import { writeFileSync } from 'node:fs'
import { engineSource } from '../tests/helpers/scriptedEngine'

const BASE = process.env.BASE_URL ?? 'http://localhost:3100'
const RUNS = Number(process.env.RUNS ?? 5)
const cases = [
  { tier: 'Beginner', engineMs: 0, expectMs: 4000 }, { tier: 'Beginner', engineMs: 1500, expectMs: 4000 },
  { tier: 'Beginner', engineMs: 3500, expectMs: 4000 }, { tier: 'Beginner', engineMs: 6000, expectMs: 6000 },
  { tier: 'Intermediate', engineMs: 0, expectMs: 2000 }, { tier: 'Intermediate', engineMs: 3000, expectMs: 3000 },
  { tier: 'Expert', engineMs: 0, expectMs: 500 }, { tier: 'Master', engineMs: 0, expectMs: 500 },
] as const
const med = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]
const browser = await chromium.launch()
const out: unknown[] = []
for (const c of cases) {
  const dts: number[] = []
  for (let i = 0; i < RUNS; i++) {
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } })
    await ctx.addInitScript(() => { try { localStorage.setItem('nivenxa.chess.play.pace', 'quick') } catch {} }) // the retired setting: ignored, the level decides
    const page = await ctx.newPage()
    await page.route('**/*', (route) => {
      const q = route.request(), url = q.url()
      if (url.includes('/stockfish/stockfish-18-lite-single.js')) return route.fulfill({ contentType: 'application/javascript', body: engineSource({ gameDelay: c.engineMs, analysisDelay: 0, analysisHang: false, afterCp: -20 }) })
      return q.method() === 'POST' && (q.headers()['next-action'] || url.includes('/api/')) ? route.abort() : route.continue()
    })
    await page.goto(`${BASE}/chess/play`, { waitUntil: 'networkidle' })
    await page.getByRole('button', { name: new RegExp(`^${c.tier}`) }).click()
    await page.getByRole('button', { name: 'White', exact: true }).click()
    await page.getByRole('button', { name: 'Start Game' }).click()
    await page.waitForSelector('cg-board')
    await page.waitForFunction(() => !document.body.innerText.includes('Loading engine'))
    const sq = async (s: string) => { const b = (await page.locator('cg-board').first().boundingBox())!; return { x: b.x + ((s.charCodeAt(0) - 97 + 0.5) * b.width) / 8, y: b.y + ((7 - (Number(s[1]) - 1) + 0.5) * b.height) / 8 } }
    await page.evaluate(() => {
      const w = window as unknown as { __t1: number | null }
      w.__t1 = null
      let thought = false
      new MutationObserver(() => {
        const t = document.querySelector('[data-testid=game-status]')?.textContent ?? ''
        if (/thinking/.test(t)) thought = true
        else if (thought && /Your move/.test(t) && w.__t1 == null) w.__t1 = performance.now()
      }).observe(document.body, { subtree: true, childList: true, characterData: true })
    })
    const a = await sq('d2'); await page.mouse.click(a.x, a.y)
    const b = await sq('d4')
    await page.evaluate(() => ((window as unknown as { __t0: number }).__t0 = performance.now()))
    await page.mouse.click(b.x, b.y)
    await page.waitForFunction(() => (window as unknown as { __t1: number | null }).__t1 != null, undefined, { timeout: 30000 })
    dts.push(Math.round(await page.evaluate(() => { const w = window as unknown as { __t0: number; __t1: number }; return w.__t1 - w.__t0 })))
    await ctx.close()
  }
  out.push({ ...c, runs: RUNS, replyMs: dts, min: Math.min(...dts), median: med(dts), max: Math.max(...dts), overshootMedianMs: med(dts) - c.expectMs })
  console.error(JSON.stringify(out.at(-1)))
}
await browser.close()
writeFileSync('docs/chess-pace-measurements.json', JSON.stringify({ measuredAt: new Date().toISOString(), base: BASE, note: 'Scripted engine (exact computation time), real page and real timers; Windows 11 desktop Chromium, 1366x768. Reply time = status chip going from thinking to Your move. expectMs = max(level minimum, engine time). A saved legacy pace preference is set on purpose and must be ignored.', cases: out }, null, 2))
