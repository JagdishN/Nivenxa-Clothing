// Real-game measurement of the TEST-ONLY Tivvi avatar on the Play page (production build made with
// NEXT_PUBLIC_CHESS_AVATAR_PROTOTYPE=1, served on BASE_URL). Compares: avatar hidden (baseline), avatar static (animations off), avatar animated.
// Each run: fresh page load, Beginner as White, 6 pawn moves (a3 b3 c3 g3 h3 d3: always legal), engine + analysis running for real, writes blocked.
//   BASE_URL=http://localhost:3100 RUNS=3 node scripts/measure-avatar-play.mjs
// Mobile = Chromium device emulation (390x844, 2x DPR, touch) WITH 4x CPU throttling on this desktop. That is emulation, NOT a real phone.
import { chromium } from '@playwright/test'
import { writeFileSync } from 'node:fs'

const BASE = process.env.BASE_URL ?? 'http://localhost:3100'
const RUNS = Number(process.env.RUNS ?? 3)
const MOVES = [['a2', 'a3'], ['b2', 'b3'], ['c2', 'c3'], ['g2', 'g3'], ['h2', 'h3'], ['d2', 'd3']]
const profiles = {
  desktop: { viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1, isMobile: false, hasTouch: false, throttle: 1 },
  'mobile-emulated-4x-cpu': { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, throttle: 4 },
}
const conditions = { 'avatar hidden (baseline)': { hide: true, anim: 'on' }, 'avatar static (animation off)': { hide: false, anim: 'off' }, 'avatar animated': { hide: false, anim: 'on' } }

const med = (xs) => (xs.length ? [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)] : null)
const pct = (xs, p) => (xs.length ? [...xs].sort((a, b) => a - b)[Math.min(xs.length - 1, Math.floor(p * xs.length))] : null)
const r = (v) => (v == null ? null : Math.round(v * 10) / 10)

async function runOnce(browser, profile, cond) {
  const ctx = await browser.newContext({ viewport: profile.viewport, deviceScaleFactor: profile.deviceScaleFactor, isMobile: profile.isMobile, hasTouch: profile.hasTouch })
  await ctx.addInitScript(([hide, anim]) => {
    try {
      localStorage.setItem('nivenxa.chess.avatar.test.hidden', hide ? '1' : '0')
      localStorage.setItem('nivenxa.chess.avatar.animation', anim)
    } catch {}
  }, [cond.hide, cond.anim])
  const page = await ctx.newPage()
  await page.route('**/*', (route) => {
    const q = route.request()
    return q.method() === 'POST' && (q.headers()['next-action'] || q.url().includes('/api/')) ? route.abort() : route.continue()
  })
  await page.goto(`${BASE}/chess/play`, { waitUntil: 'networkidle' })
  const cdp = await ctx.newCDPSession(page)
  if (profile.throttle > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: profile.throttle })
  await page.getByRole('button', { name: /^Beginner/ }).click()
  await page.getByRole('button', { name: 'White', exact: true }).click()
  await page.getByRole('button', { name: 'Start Game' }).click()
  await page.waitForSelector('cg-board')
  await page.waitForFunction(() => !document.body.innerText.includes('Loading engine'), undefined, { timeout: 90000 })
  await page.waitForTimeout(2500) // greeting pose and caption settle before measuring

  await page.evaluate(() => {
    const w = window
    w.__long = []
    w.__frames = []
    w.__think = []
    w.__states = []
    new PerformanceObserver((l) => l.getEntries().forEach((e) => w.__long.push(e.duration))).observe({ entryTypes: ['longtask'] })
    let last = performance.now()
    const f = (n) => { w.__frames.push(n - last); last = n; requestAnimationFrame(f) }
    requestAnimationFrame(f)
    const main = document.querySelector('main')
    let was = false
    new MutationObserver(() => {
      const now = main.textContent.includes('TIVVI is thinking…')
      if (now !== was) { w.__think.push([now ? 'start' : 'end', performance.now()]); was = now }
    }).observe(main, { childList: true, subtree: true, characterData: true })
    const av = document.querySelector('[data-testid=tivvi-avatar]')
    if (av) new MutationObserver(() => w.__states.push([av.getAttribute('data-state'), performance.now()])).observe(av, { attributes: true, attributeFilter: ['data-state'] })
  })
  const m0 = Object.fromEntries((await (await cdp.send('Performance.enable'), cdp.send('Performance.getMetrics'))).metrics.map((x) => [x.name, x.value]))
  const t0 = Date.now()

  const sq = async (s) => {
    const box = await page.locator('cg-board').first().boundingBox()
    const f = s.charCodeAt(0) - 97
    const rk = Number(s[1]) - 1
    return { x: box.x + ((f + 0.5) * box.width) / 8, y: box.y + ((7 - rk + 0.5) * box.height) / 8 }
  }
  const tap = async (p) => (profile.hasTouch ? page.touchscreen.tap(p.x, p.y) : page.mouse.click(p.x, p.y))
  const moveLat = []
  const replyLat = []
  let n = 0
  for (const [from, to] of MOVES) {
    n++
    await tap(await sq(from))
    const before = await page.evaluate(() => window.__think.length)
    await page.evaluate(() => (window.__t0 = performance.now()))
    await tap(await sq(to))
    await page.waitForFunction(([num, sq2]) => document.querySelector('main').textContent.includes(`${num}.${sq2}`), [n, to], { timeout: 20000 })
    moveLat.push(await page.evaluate(() => performance.now() - window.__t0))
    // engine reply: wait for a full start->end cycle of "TIVVI is thinking…"
    await page.waitForFunction((n) => window.__think.length >= n + 2 && window.__think.at(-1)[0] === 'end', before, { timeout: 60000 })
    replyLat.push(await page.evaluate((n) => { const c = window.__think.slice(n); return c.at(-1)[1] - window.__t0 }, before))
    await page.waitForTimeout(400)
  }
  const wall = (Date.now() - t0) / 1000
  const m1 = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((x) => [x.name, x.value]))
  const out = await page.evaluate(() => ({ long: window.__long, frames: window.__frames, think: window.__think, states: window.__states }))
  const frames = out.frames.slice(5)
  // avatar pose vs engine activity alignment (animated condition only)
  let align = null
  if (out.states.length) {
    const thinkIntervals = []
    for (let i = 0; i + 1 < out.think.length; i += 2) thinkIntervals.push([out.think[i][1], out.think[i + 1][1]])
    const sThink = []
    for (let i = 0; i < out.states.length; i++) if (out.states[i][0] === 'thinking') sThink.push([out.states[i][1], (out.states[i + 1] ?? [null, out.states[i][1]])[1]])
    align = thinkIntervals.map(([a, b]) => { const hit = sThink.find(([s]) => s >= a - 300 && s <= b + 300); return hit ? { startLagMs: Math.round(hit[0] - a), endLagMs: Math.round(hit[1] - b) } : null })
  }
  await ctx.close()
  const per = (k) => ((m1[k] - m0[k]) / wall) * 1000
  return {
    moveToPieceMs: moveLat, moveToReplyMs: replyLat, engineThinkingMs: out.think.reduce((a, x, i) => (x[0] === 'end' ? a.concat(x[1] - out.think[i - 1][1]) : a), []),
    longTasks: out.long.length, longTaskTotalMs: out.long.reduce((a, b) => a + b, 0), longTaskMaxMs: Math.max(0, ...out.long),
    frameMedianMs: med(frames), frameP95Ms: pct(frames, 0.95), frameOver50ms: frames.filter((f) => f > 50).length, frameCount: frames.length,
    cpuMsPerSec: { task: per('TaskDuration'), script: per('ScriptDuration'), layout: per('LayoutDuration'), styleRecalc: per('RecalcStyleDuration') }, layoutCountPerSec: (m1.LayoutCount - m0.LayoutCount) / wall, wallSeconds: wall, align,
  }
}

const browser = await chromium.launch()
const outFile = process.env.OUT_FILE ?? 'docs/chess-avatar-play-measurements.json'
const result = { measuredAt: new Date().toISOString(), base: BASE, runsPerCondition: RUNS, notes: 'Beginner/White, 6 pawn moves, engine+analysis real, writes blocked. Mobile = emulation with 4x CPU throttle on a desktop, not a real phone.', profiles: {} }
for (const [pn, prof] of Object.entries(profiles)) {
  if (process.env.PROFILES && !process.env.PROFILES.split(',').includes(pn)) continue
  result.profiles[pn] = {}
  for (const [cn, cond] of Object.entries(conditions)) {
    const runs = []
    for (let i = 0; i < RUNS; i++) {
      try { runs.push(await runOnce(browser, prof, cond)) } catch (e) { runs.push({ error: String(e).slice(0, 200) }) }
      process.stderr.write(`${pn} / ${cn} run ${i + 1}/${RUNS}${runs.at(-1).error ? ' ERROR ' + runs.at(-1).error : ' ok'}\n`)
    }
    const ok = runs.filter((x) => !x.error)
    const flat = (k) => ok.flatMap((x) => x[k])
    result.profiles[pn][cn] = {
      okRuns: ok.length, errors: runs.filter((x) => x.error).map((x) => x.error),
      moveToPieceMs: { median: r(med(flat('moveToPieceMs'))), p95: r(pct(flat('moveToPieceMs'), 0.95)) },
      moveToReplyMs: { median: r(med(flat('moveToReplyMs'))), p95: r(pct(flat('moveToReplyMs'), 0.95)) },
      engineThinkingMs: { median: r(med(flat('engineThinkingMs'))) },
      longTasksPerRun: r(med(ok.map((x) => x.longTasks))), longTaskTotalMsPerRun: r(med(ok.map((x) => x.longTaskTotalMs))), longTaskMaxMs: r(Math.max(0, ...ok.map((x) => x.longTaskMaxMs))),
      frameMedianMs: r(med(ok.map((x) => x.frameMedianMs))), frameP95Ms: r(med(ok.map((x) => x.frameP95Ms))), framesOver50msPerRun: r(med(ok.map((x) => x.frameOver50ms))),
      cpuMsPerSec: Object.fromEntries(['task', 'script', 'layout', 'styleRecalc'].map((k) => [k, r(med(ok.map((x) => x.cpuMsPerSec[k])))])), layoutCountPerSec: r(med(ok.map((x) => x.layoutCountPerSec))),
      avatarAlignment: ok.map((x) => x.align).filter(Boolean),
      raw: runs,
    }
  }
}
await browser.close()
writeFileSync(outFile, JSON.stringify(result, null, 2))
const brief = (c) => ({ pieceMs: c.moveToPieceMs.median, replyMs: c.moveToReplyMs.median, thinkMs: c.engineThinkingMs.median, longTasks: c.longTasksPerRun, frameP95: c.frameP95Ms, cpuTask: c.cpuMsPerSec.task, layoutPerSec: c.layoutCountPerSec })
console.log(JSON.stringify(Object.fromEntries(Object.entries(result.profiles).map(([p, cs]) => [p, Object.fromEntries(Object.entries(cs).map(([c, v]) => [c, brief(v)]))])), null, 1))
