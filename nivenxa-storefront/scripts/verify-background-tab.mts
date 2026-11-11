// REAL background-tab behaviour: a HEADED Chromium window with two tabs. The Play tab is really hidden (document.visibilityState
// === 'hidden', set by the browser because another tab is in front) while TIVVI's reply is pending, then brought back. Checks that
// exactly one reply is applied, to the right position, and that timers throttled in a hidden tab do not apply anything stale.
// The engine is the scripted stub (exact timing). BASE_URL=http://localhost:3100 npx tsx scripts/verify-background-tab.mts
import { chromium } from '@playwright/test'
import { spawn } from 'node:child_process'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { engineSource } from '../tests/helpers/scriptedEngine'

const BASE = process.env.BASE_URL ?? 'http://localhost:3100'
// A normally launched Edge/Chrome driven over the debugging port (no Playwright focus/visibility emulation), so the OS window state
// decides what the browser reports.
const exe = process.env.BROWSER_EXE ?? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const proc = spawn(exe, ['--remote-debugging-port=9333', `--user-data-dir=${mkdtempSync(`${tmpdir()}/bgtab-`)}`, '--no-first-run', '--window-size=1366,800', 'about:blank'], { stdio: 'ignore' })
await new Promise((r) => setTimeout(r, 3500))
const browser = await chromium.connectOverCDP('http://127.0.0.1:9333')
const ctx = browser.contexts()[0]
await ctx.addInitScript(() => { try { localStorage.setItem('nivenxa.chess.coachIntro.v1', JSON.stringify(['00000000-0000-4000-8000-000000000a01', '00000000-0000-4000-8000-000000000a02', '00000000-0000-4000-8000-000000000a03'])) } catch {} })
await ctx.route('**/*', (route) => {
  const q = route.request(), url = q.url()
  if (url.includes('/stockfish/stockfish-18-lite-single.js')) return route.fulfill({ contentType: 'application/javascript', body: engineSource({ gameDelay: 0, analysisDelay: 300, analysisHang: false, afterCp: -20 }) })
  return q.method() === 'POST' && (q.headers()['next-action'] || url.includes('/api/')) ? route.abort() : route.continue()
})
const page = ctx.pages()[0] ?? (await ctx.newPage())
await page.setViewportSize({ width: 1366, height: 768 }).catch(() => undefined)
await page.goto(`${BASE}/chess/play`, { waitUntil: 'networkidle' })
await page.getByRole('button', { name: /^Beginner/ }).click()
await page.getByRole('button', { name: 'White', exact: true }).click()
await page.getByRole('button', { name: 'Start Game' }).click()
await page.waitForSelector('cg-board')
await page.waitForFunction(() => !document.body.innerText.includes('Loading engine'))
const sq = async (s: string) => { const b = (await page.locator('cg-board').first().boundingBox())!; return { x: b.x + ((s.charCodeAt(0) - 97 + 0.5) * b.width) / 8, y: b.y + ((7 - (Number(s[1]) - 1) + 0.5) * b.height) / 8 } }
const mv = async (a: string, b: string) => { const p = await sq(a); await page.mouse.click(p.x, p.y); const q = await sq(b); await page.mouse.click(q.x, q.y) }
const results: Record<string, unknown> = {}
await mv('d2', 'd4')
await page.waitForTimeout(500)
const other = await ctx.newPage()
await other.goto('about:blank')
await other.bringToFront() // a different tab is now the active one: the Play tab is a background tab
await new Promise((r) => setTimeout(r, 7000)) // longer than the 4 s minimum, while the Play tab is hidden
results.visibilityWhileInBackground = await page.evaluate(() => document.visibilityState).catch(() => 'unreadable')
await page.bringToFront()
await page.waitForFunction(() => document.querySelector('[data-testid=insight-reply]')?.getAttribute('data-move') === 'e6', undefined, { timeout: 10000 })
await page.waitForTimeout(1500)
results.visibilityAfterReturn = await page.evaluate(() => document.visibilityState)
results.replySections = await page.evaluate(() => document.querySelectorAll('[data-testid=insight-reply]').length)
results.status = await page.getByTestId('game-status').innerText()
results.boardMoves = await page.evaluate(() => (document.querySelector('[data-testid=insight-history-toggle]') ? 'history-present' : 'two-plies'))
await mv('a2', 'a3')
await page.waitForFunction(() => document.querySelector('[data-testid=insight-reply]')?.getAttribute('data-move') === 'Bb4+', undefined, { timeout: 10000 })
results.nextMoveAndReplyOk = true
console.log(JSON.stringify(results, null, 2))
await browser.close().catch(() => undefined)
proc.kill()
process.exit(results.visibilityWhileInBackground === 'hidden' && results.replySections === 1 && results.status === 'Your move' ? 0 : 1)
