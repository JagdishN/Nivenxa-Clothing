// Fit check: is the whole playing area (board, both headers, controls) inside the viewport? Screenshots go to the PRIVATE folder.
import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
const BASE = process.env.BASE_URL ?? 'http://localhost:3100'
const OUT = process.env.OUT ?? 'D:/Nivenxa Clothing/Private-Assets/avatars/layout-review'
const TAG = process.env.TAG ?? 'now'
mkdirSync(OUT, { recursive: true })
const VIEWS = [
  ['1366x768', { width: 1366, height: 768 }],
  ['1440x900', { width: 1440, height: 900 }],
  ['1920x1080', { width: 1920, height: 1080 }],
  ['1280x720', { width: 1280, height: 720 }],
  ['mobile', { width: 390, height: 844 }, { deviceScaleFactor: 2, isMobile: true, hasTouch: true }],
]
const browser = await chromium.launch()
for (const [name, vp, extra] of VIEWS) {
  const page = await (await browser.newContext({ viewport: vp, ...(extra ?? {}) })).newPage()
  await page.route('**/*', (r) => { const q = r.request(); return q.method() === 'POST' && (q.headers()['next-action'] || q.url().includes('/api/')) ? r.abort() : r.continue() })
  await page.goto(`${BASE}/chess/play`, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: /^Beginner/ }).click()
  await page.getByRole('button', { name: 'White', exact: true }).click()
  await page.getByRole('button', { name: 'Start Game' }).click()
  await page.waitForSelector('cg-board')
  await page.waitForFunction(() => !document.body.innerText.includes('Loading engine'), undefined, { timeout: 90000 })
  await page.waitForTimeout(800)
  const m = await page.evaluate(() => {
    const r = (sel) => { const e = document.querySelector(sel); if (!e) return null; const b = e.getBoundingClientRect(); return { top: Math.round(b.top), bottom: Math.round(b.bottom), w: Math.round(b.width), h: Math.round(b.height) } }
    const rs = (id) => r(`[data-testid=${id}]`)
    const btn = (t) => { const e = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === t); if (!e) return null; const b = e.getBoundingClientRect(); return { top: Math.round(b.top), bottom: Math.round(b.bottom) } }
    return { vh: innerHeight, docH: document.documentElement.scrollHeight, board: r('cg-board'), opp: rs('opponent-header'), you: rs('player-avatar'), resign: btn('Resign'), undo: btn('Undo'), nav: r('header') ?? r('nav'), footer: r('footer') }
  })
  console.log(name, JSON.stringify(m))
  await page.screenshot({ path: join(OUT, `${TAG}-${name}.png`) })
  await page.close()
}
await browser.close()
