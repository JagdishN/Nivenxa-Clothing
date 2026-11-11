// GENUINE background tab: a normally launched Edge driven over RAW Chrome DevTools Protocol (no Playwright, so nothing emulates focus or
// visibility). The Play tab is sent to the background by activating a second tab; the browser itself must then report
// document.visibilityState === 'hidden'. It uses the REAL gameplay engine (no stub). Checks that after returning, exactly one reply was
// applied to the right position. BASE_URL=http://localhost:3100 npx tsx scripts/verify-background-tab-raw.mts
import { spawn } from 'node:child_process'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'

const BASE = process.env.BASE_URL ?? 'http://localhost:3100'
const exe = process.env.BROWSER_EXE ?? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const port = 9335
const proc = spawn(exe, [`--remote-debugging-port=${port}`, `--user-data-dir=${mkdtempSync(`${tmpdir()}/bgraw-`)}`, '--no-first-run', '--no-default-browser-check', '--window-size=1366,800', 'about:blank'], { stdio: 'ignore' })
await new Promise((r) => setTimeout(r, 3500))
const ver = (await (await fetch(`http://127.0.0.1:${port}/json/version`)).json()) as { webSocketDebuggerUrl: string }
const ws = new WebSocket(ver.webSocketDebuggerUrl)
await new Promise((r) => (ws.onopen = r))
let id = 0
const pending = new Map<number, (v: any) => void>()
ws.onmessage = (m) => { const d = JSON.parse(String(m.data)); if (d.id && pending.has(d.id)) { pending.get(d.id)!(d); pending.delete(d.id) } }
const send = (method: string, params: object = {}, sessionId?: string) => new Promise<any>((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params, sessionId })) })
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function openTab(url: string) {
  const { result } = await send('Target.createTarget', { url: 'about:blank' })
  const targetId = result.targetId as string
  const { result: a } = await send('Target.attachToTarget', { targetId, flatten: true })
  const sid = a.sessionId as string
  await send('Page.enable', {}, sid)
  return { targetId, sid }
}
const ev = async (sid: string, expression: string) => (await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }, sid)).result?.result?.value
const results: Record<string, unknown> = {}

const play = await openTab('about:blank')
await send('Page.addScriptToEvaluateOnNewDocument', { source: "try{localStorage.setItem('nivenxa.chess.coachIntro.v1',JSON.stringify(['00000000-0000-4000-8000-000000000a01','00000000-0000-4000-8000-000000000a02','00000000-0000-4000-8000-000000000a03']))}catch(e){}" }, play.sid)
await send('Emulation.setDeviceMetricsOverride', { width: 1366, height: 700, deviceScaleFactor: 1, mobile: false }, play.sid)
await send('Page.navigate', { url: `${BASE}/chess/play` }, play.sid)
await sleep(5000)
const clickText = (t: string) => ev(play.sid, `(()=>{const b=[...document.querySelectorAll('button')].find(x=>x.textContent.trim().startsWith(${JSON.stringify(t)}));if(!b)return false;b.click();return true})()`)
await clickText('Beginner'); await sleep(300)
await ev(play.sid, `(()=>{const b=[...document.querySelectorAll('button')].find(x=>x.textContent.trim()==='White');b&&b.click()})()`); await sleep(300)
await clickText('Start Game')
for (let i = 0; i < 80; i++) { await sleep(500); if (await ev(play.sid, `!!document.querySelector('cg-board') && !document.body.innerText.includes('Loading engine')`)) break }
await sleep(1500)
const sqXY = async (s: string) => ev(play.sid, `(()=>{const b=document.querySelector('cg-board').getBoundingClientRect();const f=${s.charCodeAt(0) - 97},r=${Number(s[1]) - 1};return {x:b.x+(f+.5)*b.width/8,y:b.y+(7-r+.5)*b.height/8}})()`)
const click = async (s: string) => { const p = await sqXY(s); for (const t of ['mousePressed', 'mouseReleased']) await send('Input.dispatchMouseEvent', { type: t, x: p.x, y: p.y, button: 'left', clickCount: 1 }, play.sid) }
await click('d2'); await sleep(200); await click('d4')
await sleep(800)
results.statusBeforeBackground = await ev(play.sid, `document.querySelector('[data-testid=game-status]')?.textContent`)
const other = await openTab('about:blank')
await send('Target.activateTarget', { targetId: other.targetId })
await sleep(7000) // longer than the 4 s minimum while the Play tab is in the background
results.visibilityWhileInBackground = await ev(play.sid, 'document.visibilityState')
await send('Target.activateTarget', { targetId: play.targetId })
await sleep(2500)
results.visibilityAfterReturn = await ev(play.sid, 'document.visibilityState')
results.replySections = await ev(play.sid, `document.querySelectorAll('[data-testid=insight-reply]').length`)
results.replyMove = await ev(play.sid, `document.querySelector('[data-testid=insight-reply]')?.getAttribute('data-ply') + ':' + document.querySelector('[data-testid=insight-reply]')?.getAttribute('data-move')`)
results.status = await ev(play.sid, `document.querySelector('[data-testid=game-status]')?.textContent`)
// the next move is accepted normally and gets exactly one reply of its own
await click('a2'); await sleep(200); await click('a3')
await sleep(6500)
results.afterNextMove = await ev(play.sid, `document.querySelector('[data-testid=insight-reply]')?.getAttribute('data-ply') + ':' + document.querySelector('[data-testid=insight-reply]')?.getAttribute('data-move')`)
console.log(JSON.stringify(results, null, 2))
proc.kill()
const ok = results.visibilityWhileInBackground === 'hidden' && results.replySections === 1 && results.status === 'Your move' && String(results.replyMove).startsWith('1:')
process.exit(ok ? 0 : 1)
