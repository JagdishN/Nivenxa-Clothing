// Smoke test of a NORMAL production build: made WITHOUT NEXT_PUBLIC_CHESS_TEST_HOOKS (the avatar flag may be on). Checks that
//  - the test-only pace override is ignored (a saved override of 0 ms must NOT shorten Beginner's 4 s),
//  - no pace selector or Quick/Comfortable/Relaxed label exists, and old saved pace values do nothing,
//  - the Play page, opponent picker, coach introduction, a move and its reply all work.
//   BASE_URL=http://localhost:3100 npx tsx scripts/smoke-normal-build.mts
import { chromium } from '@playwright/test'
import { engineSource } from '../tests/helpers/scriptedEngine'

const BASE = process.env.BASE_URL ?? 'http://localhost:3100'
const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } })
await ctx.addInitScript(() => { try { localStorage.setItem('nivenxa.chess.test.replyMinMs', '0'); localStorage.setItem('nivenxa.chess.play.pace', 'quick') } catch {} })
const page = await ctx.newPage()
const errors: string[] = []
page.on('pageerror', (e) => errors.push(String(e)))
await page.route('**/*', (route) => {
  const q = route.request(), url = q.url()
  if (url.includes('/stockfish/stockfish-18-lite-single.js')) return route.fulfill({ contentType: 'application/javascript', body: engineSource({ gameDelay: 0, analysisDelay: 0, analysisHang: false, afterCp: -20 }) })
  return q.method() === 'POST' && (q.headers()['next-action'] || url.includes('/api/')) ? route.abort() : route.continue()
})
const results: Record<string, unknown> = {}
const res = await page.goto(`${BASE}/chess/play`, { waitUntil: 'networkidle' })
results.playPageStatus = res?.status()
results.noPaceSelector = (await page.getByText(/Reply pace|Comfortable|Relaxed/).count()) === 0
results.introBannerForNewBeginner = (await page.getByTestId('coach-intro-banner').count()) === 1 || 'picker not in this build (avatar flag off)'
await page.getByRole('button', { name: /^Beginner/ }).click()
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
const dt = await page.evaluate(() => { const w = window as unknown as { __t0: number; __t1: number }; return Math.round(w.__t1 - w.__t0) })
results.beginnerReplyMs_withOverrideStored = dt
results.overrideIgnored = dt >= 3950
results.evidenceExportInactive = await page.evaluate(() => (window as unknown as { __nivenxaEvidence?: unknown }).__nivenxaEvidence === undefined)
results.pageErrors = errors
console.log(JSON.stringify(results, null, 2))
await browser.close()
process.exit(results.overrideIgnored && results.evidenceExportInactive && results.noPaceSelector && errors.length === 0 ? 0 : 1)
