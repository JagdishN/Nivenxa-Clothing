// Records a REAL Play game with the TEST-ONLY Tivvi avatar (desktop, and mobile emulation) and logs every avatar pose with timestamps.
// Videos show the artwork, so they are written to the private folder, not the repo.
//   BASE_URL=http://localhost:3100 node scripts/record-avatar-play.mjs
import { chromium } from '@playwright/test'
import { mkdirSync, readdirSync, renameSync, writeFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const BASE = process.env.BASE_URL ?? 'http://localhost:3100'
const OUT = process.env.OUT ?? 'D:/Nivenxa Clothing/Private-Assets/avatars/real-game'
mkdirSync(OUT, { recursive: true })
const profiles = {
  desktop: { viewport: { width: 1280, height: 860 }, deviceScaleFactor: 1, isMobile: false, hasTouch: false, throttle: 1 },
  'mobile-emulated': { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, throttle: 4 },
}
// A sensible start, then a deliberately weak king walk (the real analysis decides whether it earns a reaction).
const SCRIPT = [['e2', 'e4'], ['d2', 'd3'], ['f2', 'f3'], ['e1', 'f2'], ['f2', 'g3'], ['g3', 'h4']]
const report = {}

const browser = await chromium.launch()
for (const [name, prof] of Object.entries(profiles)) {
  const tmp = join(OUT, `tmp-${name}`)
  mkdirSync(tmp, { recursive: true })
  const ctx = await browser.newContext({ viewport: prof.viewport, deviceScaleFactor: prof.deviceScaleFactor, isMobile: prof.isMobile, hasTouch: prof.hasTouch, recordVideo: { dir: tmp, size: prof.isMobile ? { width: 390, height: 844 } : { width: 1280, height: 860 } } })
  const page = await ctx.newPage()
  await page.route('**/*', (route) => {
    const q = route.request()
    return q.method() === 'POST' && (q.headers()['next-action'] || q.url().includes('/api/')) ? route.abort() : route.continue()
  })
  await page.goto(`${BASE}/chess/play`, { waitUntil: 'networkidle' })
  const cdp = await ctx.newCDPSession(page)
  if (prof.throttle > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: prof.throttle })
  await page.getByRole('button', { name: /^Beginner/ }).click()
  await page.getByRole('button', { name: 'White', exact: true }).click()
  await page.getByRole('button', { name: 'Start Game' }).click()
  await page.waitForSelector('cg-board')
  await page.waitForFunction(() => !document.body.innerText.includes('Loading engine'), undefined, { timeout: 90000 })
  await page.evaluate(() => {
    const w = window
    w.__log = []
    const t0 = performance.now()
    const a = document.querySelector('[data-testid=tivvi-avatar]')
    const c = document.querySelector('[data-testid=avatar-caption]')
    const main = document.querySelector('main')
    const rec = () => w.__log.push([Math.round(performance.now() - t0), a.getAttribute('data-state'), c.textContent, main.textContent.includes('Engine thinking…')])
    new MutationObserver(rec).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['data-state'] })
  })
  await page.waitForTimeout(3500)
  const sq = async (s) => {
    const box = await page.locator('cg-board').first().boundingBox()
    const black = await page.locator('.cg-wrap').first().evaluate((el) => el.classList.contains('orientation-black'))
    const f = s.charCodeAt(0) - 97, rk = Number(s[1]) - 1
    return { x: box.x + (((black ? 7 - f : f) + 0.5) * box.width) / 8, y: box.y + (((black ? rk : 7 - rk) + 0.5) * box.height) / 8 }
  }
  const tap = async (p) => (prof.hasTouch ? page.touchscreen.tap(p.x, p.y) : page.mouse.click(p.x, p.y))
  const played = []
  let n = 0
  for (const [from, to] of SCRIPT) {
    n++
    await tap(await sq(from)); await tap(await sq(to))
    const ok = await page.waitForFunction(([num, sq2]) => document.querySelector('main').textContent.includes(`${num}.${sq2}`) || document.querySelector('main').textContent.includes(`${num}.K${sq2}`), [n, to], { timeout: 8000 }).then(() => true).catch(() => false)
    played.push([from + to, ok])
    if (!ok) continue
    await page.waitForFunction(() => !document.querySelector('main').textContent.includes('Engine thinking…'), undefined, { timeout: 60000 }).catch(() => {})
    await page.waitForTimeout(2800) // time to see any reaction pose and its caption
    if (n === 3) await page.screenshot({ path: join(OUT, `real-game-${name}-midgame.png`) })
  }
  await page.getByRole('button', { name: /^Resign/ }).click().catch(() => {})
  await page.getByRole('button', { name: /Resign|Yes|Confirm/ }).last().click().catch(() => {})
  await page.waitForTimeout(3500) // result pose + caption
  const log = await page.evaluate(() => window.__log)
  const seq = []
  for (const [t, s, c, th] of log) { const k = `${s}|${c}|${th}`; if (seq.at(-1)?.k !== k) seq.push({ k, t, state: s, caption: c, engineThinking: th }) }
  report[name] = { moves: played, poseTimeline: seq.map(({ t, state, caption, engineThinking }) => ({ tMs: t, state, caption, engineThinking })), concernObserved: seq.some((x) => x.state === 'concern') }
  await page.screenshot({ path: join(OUT, `real-game-${name}-end.png`) })
  await ctx.close()
  const vf = readdirSync(tmp).find((f) => f.endsWith('.webm'))
  if (vf) { renameSync(join(tmp, vf), join(OUT, `real-game-${name}.webm`)); report[name].video = { file: `real-game-${name}.webm`, bytes: statSync(join(OUT, `real-game-${name}.webm`)).size } }
  process.stderr.write(`${name}: recorded, concernObserved=${report[name].concernObserved}\n`)
}
await browser.close()
writeFileSync(join(OUT, 'real-game-recording-log.json'), JSON.stringify(report, null, 2))
console.log(JSON.stringify(Object.fromEntries(Object.entries(report).map(([k, v]) => [k, { moves: v.moves, concernObserved: v.concernObserved, states: [...new Set(v.poseTimeline.map((x) => x.state))], video: v.video }])), null, 1))
