import { chromium } from '@playwright/test'
const [w,h]=[Number(process.argv[2]),Number(process.argv[3])]
const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: w, height: h } })).newPage()
await p.addInitScript(() => { localStorage.setItem('nivenxa-chess-basics-progress', JSON.stringify({ 'set-up-the-pieces': { status: 'started', step: 15, total: 17 } })) })
await p.goto('http://localhost:3100/chess/learn/basics/set-up-the-pieces', { waitUntil: 'networkidle' })
await p.getByTestId('lesson-continue').click()
for (const id of ['setup-orientation','piece-tray','setup-status','setup-check','lesson-controls','lesson-nav']) {
  console.log(id, await p.getByTestId(id).evaluate((el) => { const r = el.getBoundingClientRect(); return [Math.round(r.y+scrollY), Math.round(r.height), el.tagName] }))
}
await b.close()
