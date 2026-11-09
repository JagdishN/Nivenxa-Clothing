import { test } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

// In-page timing (performance.now) of: Start Game click -> board visible -> engine ready ("Loading engine…" gone)
// -> first engine reply after a tapped move, plus the longest main-thread stall while the engine thinks (Long Tasks API).
// Writes are blocked so no game is saved. Several fresh page loads = several cold starts; the browser cache is warm after the first.
//   BASE_URL=http://localhost:3100 npx playwright test tests/chess-engine-measure.spec.ts

const OUT = join(process.cwd(), 'docs', 'chess-screenshots', 'engine')
test.setTimeout(240000)

test('engine start-up and responsiveness', async ({ page }) => {
  mkdirSync(OUT, { recursive: true })
  await page.route('**/*', (route) => {
    const r = route.request()
    return r.method() === 'POST' && (r.headers()['next-action'] || r.url().includes('/api/')) ? route.abort() : route.continue()
  })
  const samples: Record<string, number>[] = []
  for (let i = 0; i < 5; i++) {
    await page.goto('/chess/play', { waitUntil: 'networkidle' })
    await page.getByRole('button', { name: /^Beginner/ }).click()
    await page.getByRole('button', { name: 'White', exact: true }).click()
    await page.evaluate(() => {
      const w = window as unknown as { __m: Record<string, number>; __long: number[] }
      w.__m = {}
      w.__long = []
      new PerformanceObserver((list) => list.getEntries().forEach((e) => w.__long.push(e.duration))).observe({ entryTypes: ['longtask'] })
      document.addEventListener('click', (e) => {
        if ((e.target as HTMLElement)?.textContent?.includes('Start Game')) w.__m.start = performance.now()
      }, { capture: true })
      new MutationObserver(() => {
        const body = document.body.innerText
        if (w.__m.start && !w.__m.board && document.querySelector('cg-board')) w.__m.board = performance.now()
        if (w.__m.board && !w.__m.ready && !body.includes('Loading engine')) w.__m.ready = performance.now()
        if (w.__m.moved && !w.__m.reply && /1\.\.\.[a-zA-Z]/.test(body)) w.__m.reply = performance.now()
      }).observe(document.body, { childList: true, subtree: true, characterData: true })
    })
    await page.getByRole('button', { name: 'Start Game' }).click()
    await page.waitForSelector('cg-board')
    await page.waitForFunction(() => !document.body.innerText.includes('Loading engine'), undefined, { timeout: 40000 })
    // Tap e2 then e4.
    const box = (await page.locator('cg-board').first().boundingBox())!
    const sq = (f: number, r: number) => ({ x: box.x + ((f + 0.5) * box.width) / 8, y: box.y + ((7 - r + 0.5) * box.height) / 8 })
    await page.evaluate(() => ((window as unknown as { __m: Record<string, number> }).__m.moved = performance.now()))
    const a = sq(4, 1)
    await page.mouse.click(a.x, a.y)
    const b = sq(4, 3)
    await page.mouse.click(b.x, b.y)
    await page.waitForFunction(() => /1\.\.\.[a-zA-Z]/.test(document.body.innerText), undefined, { timeout: 30000 })
    const m = await page.evaluate(() => {
      const w = window as unknown as { __m: Record<string, number>; __long: number[] }
      return {
        startToBoardMs: w.__m.board - w.__m.start,
        startToEngineReadyMs: w.__m.ready - w.__m.start,
        moveToReplyMs: w.__m.reply - w.__m.moved,
        longestMainThreadTaskMs: w.__long.length ? Math.max(...w.__long) : 0,
        longTasksOver50ms: w.__long.length,
      }
    })
    samples.push(Object.fromEntries(Object.entries(m).map(([k, v]) => [k, Math.round(v)])))
  }
  const med = (k: string) => {
    const v = samples.map((s) => s[k]).sort((x, y) => x - y)
    return v[Math.floor(v.length / 2)]
  }
  const summary = {
    conditions: 'Chromium (Playwright), 1280x720, Beginner/strength 1, White, page reloaded per sample, writes blocked',
    samples,
    median: Object.fromEntries(['startToBoardMs', 'startToEngineReadyMs', 'moveToReplyMs', 'longestMainThreadTaskMs'].map((k) => [k, med(k)])),
  }
  writeFileSync(join(OUT, 'engine-timing.json'), JSON.stringify(summary, null, 2))
  console.log(JSON.stringify(summary, null, 1))
})
