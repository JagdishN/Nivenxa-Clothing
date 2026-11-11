// REAL gameplay engine (the app's own Stockfish worker, no stub): time from the human move being accepted to the reply, per level.
// Shows how often the level's minimum (Beginner 4 s, Intermediate 2 s, Expert/Master 0.5 s) is the binding limit and how long the
// engine really takes. Analysis/commentary are blocked so only the gameplay engine runs. Windows 11 desktop Chromium, 1366x768.
//   BASE_URL=http://localhost:3100 RUNS=2 npx tsx scripts/measure-real-engine-pace.mts
import { chromium } from '@playwright/test'
import { writeFileSync } from 'node:fs'

const BASE = process.env.BASE_URL ?? 'http://localhost:3100'
const RUNS = Number(process.env.RUNS ?? 2)
const MOVES: [string, string][] = [['a2', 'a3'], ['h2', 'h3'], ['b2', 'b3'], ['g2', 'g3'], ['c2', 'c3'], ['d2', 'd3']]
const MIN: Record<string, number> = { Beginner: 4000, Intermediate: 2000, Expert: 500, Master: 500 }
const browser = await chromium.launch()
const out: Record<string, unknown> = {}
const med = (a: number[]) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)]
const p95 = (a: number[]) => [...a].sort((x, y) => x - y)[Math.min(a.length - 1, Math.floor(0.95 * a.length))]
for (const tier of ['Beginner', 'Intermediate', 'Expert', 'Master']) {
  const times: number[] = []
  for (let r = 0; r < RUNS; r++) {
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } })
    await ctx.addInitScript(() => { try { localStorage.setItem('nivenxa.chess.coachIntro.v1', JSON.stringify(['00000000-0000-4000-8000-000000000a01', '00000000-0000-4000-8000-000000000a02', '00000000-0000-4000-8000-000000000a03'])) } catch {} })
    const page = await ctx.newPage()
    await page.route('**/*', (route) => { const q = route.request(); return q.method() === 'POST' && (q.headers()['next-action'] || q.url().includes('/api/')) ? route.abort() : route.continue() })
    await page.goto(`${BASE}/chess/play`, { waitUntil: 'networkidle' })
    await page.getByRole('button', { name: new RegExp(`^${tier}`) }).click()
    await page.getByRole('button', { name: 'White', exact: true }).click()
    await page.getByRole('button', { name: 'Start Game' }).click()
    await page.waitForSelector('cg-board')
    await page.waitForFunction(() => !document.body.innerText.includes('Loading engine'), undefined, { timeout: 90000 })
    await page.waitForTimeout(1500)
    await page.evaluate(() => {
      const w = window as unknown as { __t1: number | null; __th: boolean }
      w.__t1 = null; w.__th = false
      new MutationObserver(() => {
        const t = document.querySelector('[data-testid=game-status]')?.textContent ?? ''
        if (/thinking/.test(t)) w.__th = true
        else if (w.__th && /Your move/.test(t) && w.__t1 == null) w.__t1 = performance.now()
      }).observe(document.body, { subtree: true, childList: true, characterData: true })
    })
    const sq = async (s: string) => { const b = (await page.locator('cg-board').first().boundingBox())!; return { x: b.x + ((s.charCodeAt(0) - 97 + 0.5) * b.width) / 8, y: b.y + ((7 - (Number(s[1]) - 1) + 0.5) * b.height) / 8 } }
    for (const [a, b] of MOVES) {
      await page.evaluate(() => { const w = window as unknown as { __t1: number | null; __th: boolean }; w.__t1 = null; w.__th = false })
      const p = await sq(a); await page.mouse.click(p.x, p.y)
      const q = await sq(b)
      await page.evaluate(() => ((window as unknown as { __t0: number }).__t0 = performance.now()))
      await page.mouse.click(q.x, q.y)
      try { await page.waitForFunction(() => (window as unknown as { __t1: number | null }).__t1 != null, undefined, { timeout: 25000 }) } catch { break }
      times.push(Math.round(await page.evaluate(() => { const w = window as unknown as { __t0: number; __t1: number }; return w.__t1 - w.__t0 })))
      await page.waitForTimeout(300)
    }
    await ctx.close()
  }
  out[tier] = { minimumMs: MIN[tier], replies: times.length, medianMs: med(times), p95Ms: p95(times), maxMs: Math.max(...times), minMs: Math.min(...times), repliesAboveMinimum: times.filter((t) => t > MIN[tier] + 150).length, allMs: times }
  console.error(tier, JSON.stringify(out[tier]))
}
await browser.close()
writeFileSync('docs/chess-real-engine-pace-measurements.json', JSON.stringify({ measuredAt: new Date().toISOString(), base: BASE, note: 'Real gameplay Stockfish worker, 6 pawn moves per run, desktop Chromium. repliesAboveMinimum = replies whose engine time exceeded the level minimum by >150 ms (the minimum was not the binding limit).', levels: out }, null, 2))
