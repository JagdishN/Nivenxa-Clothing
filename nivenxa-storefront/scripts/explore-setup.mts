import { chromium } from '@playwright/test'
const BASE = process.env.BASE_URL ?? 'http://localhost:3100'
const OUT = 'D:/Nivenxa Clothing/Private-Assets/avatars/basics-review/explore'
const browser = await chromium.launch()
const page = await (await browser.newContext({ viewport: { width: 1366, height: 768 } })).newPage()
page.on('pageerror', (e) => console.log('PAGEERR', String(e)))
await page.goto(`${BASE}/chess/learn/basics/set-up-the-pieces`, { waitUntil: 'networkidle' })
await page.getByTestId('lesson-start').click()
const next = page.getByTestId('lesson-next')
await next.click() // plan -> rooks demo
await next.click() // -> rooks quiz
console.log(await page.getByTestId('lesson-step-counter').innerText(), '|', await page.getByTestId('lesson-prompt').innerText())
const b = (await page.locator('cg-board').first().boundingBox())!
for (const s of ['a1', 'h1', 'a8', 'h8']) {
  const c = s.charCodeAt(0) - 97
  const r = 8 - Number(s[1])
  await page.mouse.click(b.x + ((c + 0.5) * b.width) / 8, b.y + ((r + 0.5) * b.height) / 8)
  await page.waitForTimeout(300)
  console.log(s, 'count', await page.getByTestId('found-count').innerText().catch(() => '-'), 'pieces', await page.locator('cg-board piece').count())
}
await page.waitForTimeout(500)
console.log('after:', await page.getByTestId('lesson-prompt').innerText(), '| rooks', await page.locator('cg-board piece.rook').count())
await page.screenshot({ path: `${OUT}/setup-rooks.png` })
await next.click()
await next.click()
console.log('knights step:', await page.getByTestId('lesson-step-counter').innerText(), '|', await page.getByTestId('lesson-prompt').innerText())
const b2 = (await page.locator('cg-board').first().boundingBox())!
for (const s of ['b1', 'g1', 'b8', 'g8']) {
  const c = s.charCodeAt(0) - 97
  const r = 8 - Number(s[1])
  await page.mouse.click(b2.x + ((c + 0.5) * b2.width) / 8, b2.y + ((r + 0.5) * b2.height) / 8)
  await page.waitForTimeout(300)
  console.log(s, 'count', await page.getByTestId('found-count').innerText().catch(() => '-'), 'prompt', await page.getByTestId('lesson-prompt').innerText())
}
await page.screenshot({ path: `${OUT}/setup-knights.png` })
await browser.close()
