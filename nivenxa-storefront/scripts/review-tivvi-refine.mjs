// Visual review material for the TIVVI refinement. Writes PNGs to the PRIVATE folder (they show the artwork); nothing goes into the repo.
//   BASE_URL=http://localhost:3100 node scripts/review-tivvi-refine.mjs
import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

const BASE = process.env.BASE_URL ?? 'http://localhost:3100'
const OUT = process.env.OUT ?? 'D:/Nivenxa Clothing/Private-Assets/avatars/refine-review'
mkdirSync(OUT, { recursive: true })
const STATES = ['idle', 'selected', 'thinking', 'encourage', 'concern', 'ackwin', 'ackdraw']
const SIZES = [64, 48]

const browser = await chromium.launch()
async function startGame(page) {
  await page.route('**/*', (r) => {
    const q = r.request()
    return q.method() === 'POST' && (q.headers()['next-action'] || q.url().includes('/api/')) ? r.abort() : r.continue()
  })
  await page.goto(`${BASE}/chess/play`, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: /^Beginner/ }).click()
  await page.getByRole('button', { name: 'White', exact: true }).click()
  await page.getByRole('button', { name: 'Start Game' }).click()
  await page.waitForSelector('cg-board')
  await page.waitForFunction(() => !document.body.innerText.includes('Loading engine'), undefined, { timeout: 90000 })
}

// 1) expression sheet: the real avatar markup + real CSS, each state at 64 and 48 px (also shown 4x for review)
{
  const page = await (await browser.newContext({ viewport: { width: 1100, height: 700 }, deviceScaleFactor: 2 })).newPage()
  await startGame(page)
  await page.waitForTimeout(2500)
  await page.evaluate(({ STATES, SIZES }) => {
    const src = document.querySelector('[data-testid=tivvi-avatar]')
    const sheet = document.createElement('div')
    sheet.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#fff;padding:16px;font:12px sans-serif;overflow:auto'
    for (const scale of [1, 4]) {
      for (const size of SIZES) {
        const row = document.createElement('div')
        row.style.cssText = 'display:flex;gap:14px;margin:8px 0;align-items:flex-end'
        for (const st of STATES) {
          const cell = document.createElement('div')
          cell.style.cssText = 'text-align:center'
          const disc = document.createElement('div')
          const px = size * scale
          disc.style.cssText = `width:${px}px;height:${px}px;border-radius:50%;overflow:hidden;background:#e4d9f3;border:1px solid #bbb`
          const el = src.cloneNode(true)
          el.setAttribute('data-state', st)
          el.setAttribute('data-anim', 'off')
          el.setAttribute('data-min', size < 64 ? 'true' : 'false')
          disc.appendChild(el)
          cell.appendChild(disc)
          cell.appendChild(Object.assign(document.createElement('div'), { textContent: `${st} ${size}px` }))
          row.appendChild(cell)
        }
        sheet.appendChild(row)
      }
    }
    document.body.appendChild(sheet)
  }, { STATES, SIZES })
  await page.screenshot({ path: join(OUT, 'expression-sheet.png') })
  console.log('expression sheet done')
}

// 2) real game screens: desktop and phone width (guest), after one move
for (const [name, ctxOpts] of [
  ['desktop', { viewport: { width: 1280, height: 900 } }],
  ['mobile-emulated', { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }],
]) {
  const page = await (await browser.newContext(ctxOpts)).newPage()
  await startGame(page)
  await page.waitForTimeout(600)
  await page.screenshot({ path: join(OUT, `game-start-${name}.png`) })
  const box = await page.locator('cg-board').first().boundingBox()
  const sq = (f, r) => ({ x: box.x + ((f + 0.5) * box.width) / 8, y: box.y + ((7 - r + 0.5) * box.height) / 8 })
  const tap = async (p) => (ctxOpts.hasTouch ? page.touchscreen.tap(p.x, p.y) : page.mouse.click(p.x, p.y))
  await tap(sq(4, 1)); await tap(sq(4, 3))
  await page.waitForTimeout(4000)
  await page.screenshot({ path: join(OUT, `game-after-move-${name}.png`), fullPage: true })
  const header = await page.getByTestId('opponent-header').boundingBox()
  console.log(name, 'opponent header', Math.round(header.width), 'x', Math.round(header.height), 'board', Math.round(box.width))
}
await browser.close()
