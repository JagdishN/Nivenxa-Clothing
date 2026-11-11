// Guided-play feedback latency and board responsiveness on the real Play page (production build made with
// NEXT_PUBLIC_CHESS_AVATAR_PROTOTYPE=1, served on BASE_URL). Real gameplay engine and real analysis engine; commentary is either
//   - "real endpoint": whatever /api/chess/explain-* does on this machine (it fails fast locally: no model key), or
//   - "simulated 800 ms": a mocked endpoint with a fixed delay, to show the pipeline adds nothing on top of it.
// Each run: fresh load, Beginner as White, 6 pawn moves, animations on or off. Desktop 1366x768 only.
//   BASE_URL=http://localhost:3100 RUNS=4 node scripts/measure-feedback.mjs
import { chromium } from '@playwright/test'
import { writeFileSync } from 'node:fs'

const BASE = process.env.BASE_URL ?? 'http://localhost:3100'
const RUNS = Number(process.env.RUNS ?? 4)
const MOVES = [['a2', 'a3'], ['b2', 'b3'], ['c2', 'c3'], ['g2', 'g3'], ['h2', 'h3'], ['d2', 'd3']]
const conditions = {
  'real endpoint, animations on': { mock: null, anim: 'on' },
  'real endpoint, animations off': { mock: null, anim: 'off' },
  'simulated 800 ms commentary, animations on': { mock: 800, anim: 'on' },
  'simulated 800 ms commentary, animations off': { mock: 800, anim: 'off' },
}
const med = (xs) => (xs.length ? [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)] : null)
const pct = (xs, p) => (xs.length ? [...xs].sort((a, b) => a - b)[Math.min(xs.length - 1, Math.floor(p * xs.length))] : null)
const r = (v) => (v == null ? null : Math.round(v * 10) / 10)
const stat = (xs) => ({ n: xs.length, median: r(med(xs)), p95: r(pct(xs, 0.95)), max: r(Math.max(...xs)), values: xs.map(r) })

async function runOnce(browser, cond) {
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 }, deviceScaleFactor: 1 })
  await ctx.addInitScript((anim) => {
    try { localStorage.setItem('nivenxa.chess.avatar.animation', anim) } catch {}
  }, cond.anim)
  const page = await ctx.newPage()
  await page.route('**/*', async (route) => {
    const q = route.request()
    const url = q.url()
    if (cond.mock && q.method() === 'POST' && /\/api\/chess\/explain-(move|engine-purpose)/.test(url)) {
      const body = JSON.parse(q.postData() ?? '{}')
      await new Promise((res) => setTimeout(res, cond.mock))
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ headline: `${body.move} — A sensible move`, explanation: 'A sensible move. It follows a plan.', bullets: [] }) })
    }
    // PASS_EXPLAIN=1 lets the real explanation endpoint (the server's own model key) answer; otherwise it is blocked as before.
    if (process.env.PASS_EXPLAIN === '1' && !cond.mock && q.method() === 'POST' && /\/api\/chess\/explain-(move|engine-purpose)/.test(url)) return route.continue()
    return q.method() === 'POST' && (q.headers()['next-action'] || url.includes('/api/')) ? route.abort() : route.continue()
  })
  await page.goto(`${BASE}/chess/play`, { waitUntil: 'networkidle' })
  const cdp = await ctx.newCDPSession(page)
  await page.getByRole('button', { name: /^Beginner/ }).click()
  await page.getByRole('button', { name: 'White', exact: true }).click()
  await page.getByRole('button', { name: 'Start Game' }).click()
  await page.waitForSelector('cg-board')
  await page.waitForFunction(() => !document.body.innerText.includes('Loading engine'), undefined, { timeout: 90000 })
  await page.waitForTimeout(2500)

  await page.evaluate(() => {
    const w = window
    w.__long = []
    w.__frames = []
    w.__ev = []
    w.__tap = {}
    new PerformanceObserver((l) => l.getEntries().forEach((e) => w.__long.push(e.duration))).observe({ entryTypes: ['longtask'] })
    let last = performance.now()
    const f = (n) => { w.__frames.push(n - last); last = n; requestAnimationFrame(f) }
    requestAnimationFrame(f)
    const main = document.querySelector('main')
    const seen = new Map()
    const snap = () => {
      for (const id of ['insight-you', 'insight-reply']) {
        const el = document.querySelector(`[data-testid=${id}]`)
        if (!el) continue
        const s = { sec: id, ply: el.getAttribute('data-ply'), state: el.getAttribute('data-state'), grade: el.getAttribute('data-grade'), a: el.getAttribute('data-analysis-ms'), q: el.getAttribute('data-queue-ms'), c: el.getAttribute('data-commentary-ms') }
        const key = JSON.stringify(s)
        if (seen.get(id) !== key) { seen.set(id, key); w.__ev.push({ ...s, t: performance.now() }) }
      }
      const th = main.textContent.includes('TIVVI is thinking…')
      if (th !== w.__thinking) { w.__thinking = th; w.__ev.push({ sec: 'thinking', state: th ? 'start' : 'end', t: performance.now() }) }
    }
    new MutationObserver(snap).observe(main, { childList: true, subtree: true, attributes: true, characterData: true })
  })
  const m0 = Object.fromEntries((await (await cdp.send('Performance.enable'), cdp.send('Performance.getMetrics'))).metrics.map((x) => [x.name, x.value]))
  const t0 = Date.now()
  const sq = async (s) => {
    const box = await page.locator('cg-board').first().boundingBox()
    const f = s.charCodeAt(0) - 97
    const rk = Number(s[1]) - 1
    return { x: box.x + ((f + 0.5) * box.width) / 8, y: box.y + ((7 - rk + 0.5) * box.height) / 8 }
  }
  const moveToPiece = []
  let n = 0
  for (const [from, to] of MOVES) {
    n++
    const ply = (n - 1) * 2
    await page.mouse.click(...Object.values(await sq(from)))
    await page.evaluate((p) => (window.__tap[p] = performance.now()), ply)
    await page.mouse.click(...Object.values(await sq(to)))
    await page.waitForFunction(([num, s2]) => document.querySelector('main').textContent.includes(`${num}.${s2}`), [n, to], { timeout: 20000 })
    moveToPiece.push(await page.evaluate((p) => performance.now() - window.__tap[p], ply))
    // wait until TIVVI has replied (its section shows the reply ply) and both sections finished (ready/quiet/error)
    await page.waitForFunction((p) => {
      const y = document.querySelector('[data-testid=insight-you]')
      const rp = document.querySelector('[data-testid=insight-reply]')
      const done = (e) => e && /ready|quiet|error/.test(e.getAttribute('data-state'))
      return y && y.getAttribute('data-ply') === String(p) && done(y) && rp && rp.getAttribute('data-ply') === String(p + 1) && done(rp)
    }, ply, { timeout: 60000 })
    await page.waitForTimeout(300)
  }
  const wall = (Date.now() - t0) / 1000
  const m1 = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((x) => [x.name, x.value]))
  const out = await page.evaluate(() => ({ long: window.__long, frames: window.__frames, ev: window.__ev, tap: window.__tap }))
  await ctx.close()

  // per move: tap -> grade visible, tap -> your section final, tap -> TIVVI's reply visible, tap -> reply final
  const gradeMs = [], youFinalMs = [], replyShownMs = [], replyFinalMs = [], analysisMs = [], queueMs = [], commentaryMs = []
  for (let k = 0; k < MOVES.length; k++) {
    const ply = k * 2
    const tap = out.tap[ply]
    const first = (fn) => out.ev.find((e) => e.t >= tap && fn(e))
    const g = first((e) => e.sec === 'insight-you' && e.ply === String(ply) && e.grade)
    const yf = first((e) => e.sec === 'insight-you' && e.ply === String(ply) && /ready|quiet|error/.test(e.state))
    const rs = first((e) => e.sec === 'insight-reply' && e.ply === String(ply + 1))
    const rf = first((e) => e.sec === 'insight-reply' && e.ply === String(ply + 1) && /ready|quiet|error/.test(e.state))
    if (g) gradeMs.push(g.t - tap)
    if (yf) { youFinalMs.push(yf.t - tap); if (yf.a != null) analysisMs.push(Number(yf.a)); if (yf.q != null) queueMs.push(Number(yf.q)); if (yf.c != null) commentaryMs.push(Number(yf.c)) }
    if (rs) replyShownMs.push(rs.t - tap)
    if (rf) replyFinalMs.push(rf.t - tap)
  }
  const frames = out.frames.slice(5)
  const per = (key) => ((m1[key] - m0[key]) / wall) * 1000
  return {
    moveToPieceMs: moveToPiece, gradeVisibleMs: gradeMs, yourSectionFinalMs: youFinalMs, replyShownMs, replyFinalMs, analysisMs, queueMs, commentaryMs,
    longTasks: out.long.length, longTaskMaxMs: Math.max(0, ...out.long), frameP95Ms: pct(frames, 0.95), frameOver50ms: frames.filter((f) => f > 50).length,
    cpuTaskMsPerSec: per('TaskDuration'),
  }
}

const browser = await chromium.launch()
const outFile = process.env.OUT_FILE ?? 'docs/chess-feedback-measurements.json'
const result = {
  measuredAt: new Date().toISOString(), base: BASE, runsPerCondition: RUNS, movesPerRun: MOVES.length, viewport: '1366x768 desktop',
  environment: 'Windows 11 desktop, Chromium (Playwright), production build, Beginner/White, real gameplay + analysis Stockfish, writes blocked. Commentary: see condition names.',
  conditions: {},
}
for (const [cn, cond] of Object.entries(conditions).filter(([n]) => !process.env.ONLY || n.includes(process.env.ONLY))) {
  const runs = []
  for (let i = 0; i < RUNS; i++) {
    try { runs.push(await runOnce(browser, cond)) } catch (e) { runs.push({ error: String(e).slice(0, 300) }) }
    process.stderr.write(`${cn} run ${i + 1}/${RUNS}${runs.at(-1).error ? ' ERROR ' + runs.at(-1).error : ' ok'}\n`)
  }
  const ok = runs.filter((x) => !x.error)
  const flat = (k) => ok.flatMap((x) => x[k])
  result.conditions[cn] = {
    okRuns: ok.length, errors: runs.filter((x) => x.error).map((x) => x.error),
    movesMeasured: ok.length * MOVES.length,
    moveToPieceMs: stat(flat('moveToPieceMs')),
    analysisMs: stat(flat('analysisMs')), analysisQueueWaitMs: stat(flat('queueMs')), commentaryMs: stat(flat('commentaryMs')),
    gradeVisibleAfterMoveMs: stat(flat('gradeVisibleMs')), yourSectionFinalMs: stat(flat('yourSectionFinalMs')),
    tivviReplyShownAfterMoveMs: stat(flat('replyShownMs')), tivviReplySectionFinalMs: stat(flat('replyFinalMs')),
    longTasksPerRun: r(med(ok.map((x) => x.longTasks))), longTaskMaxMs: r(Math.max(0, ...ok.map((x) => x.longTaskMaxMs))),
    frameP95Ms: r(med(ok.map((x) => x.frameP95Ms))), framesOver50msPerRun: r(med(ok.map((x) => x.frameOver50ms))), cpuTaskMsPerSec: r(med(ok.map((x) => x.cpuTaskMsPerSec))),
  }
}
await browser.close()
writeFileSync(outFile, JSON.stringify(result, null, 2))
console.log(JSON.stringify(result, (k, v) => (k === 'raw' ? undefined : v), 2))
