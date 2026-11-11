// Records three short videos + screenshots on the real Play page (production build with NEXT_PUBLIC_CHESS_AVATAR_PROTOTYPE=1):
//   A. coach introduction + opponent selection (+ automatic Beginner pacing), B. custom profile-picture upload, C. accurate feedback.
// The engine WORKER is a scripted UCI stub, commentary and the picture/progress APIs are mocked, and "signed in" is a SIMULATED
// session (no real account, nothing leaves the machine). Output stays OUTSIDE the repo (it shows character artwork).
//   BASE_URL=http://localhost:3100 npx tsx scripts/record-bots-profile.mts
import { chromium, type Page, type BrowserContext } from '@playwright/test'
import { mkdirSync, renameSync, readdirSync } from 'node:fs'
import sharp from 'sharp'
import { REPLIES, engineSource, keyAfter } from '../tests/helpers/scriptedEngine'

const BASE = process.env.BASE_URL ?? 'http://localhost:3100'
const OUT = process.env.OUT ?? 'D:/Nivenxa Clothing/Private-Assets/avatars/bots-review'
mkdirSync(OUT, { recursive: true })
REPLIES[keyAfter(['d4'])] = 'e7e6'

const browser = await chromium.launch()
const INTRO3 = JSON.stringify(['00000000-0000-4000-8000-000000000a01', '00000000-0000-4000-8000-000000000a02', '00000000-0000-4000-8000-000000000a03'])
const b64url = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url')

async function session(ctx: BrowserContext) {
  const exp = Math.floor(Date.now() / 1000) + 3600
  const id = '00000000-0000-4000-8000-000000000001'
  const user = { id, aud: 'authenticated', role: 'authenticated', email: 'simulated@example.test', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' }
  await ctx.addCookies([{ name: 'sb-chess-auth', value: `base64-${b64url({ access_token: `${b64url({ alg: 'none' })}.${b64url({ sub: id, exp, role: 'authenticated' })}.sig`, refresh_token: 'simulated', expires_in: 3600, expires_at: exp, token_type: 'bearer', user })}`, domain: 'localhost', path: '/' }])
}

async function newPage(name: string, o: { intro?: string; signedIn?: boolean; explain?: Record<string, { headline?: string; explanation: string }>; afterCp?: number } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 }, recordVideo: { dir: `${OUT}/_tmp-${name}`, size: { width: 1366, height: 768 } } })
  if (o.signedIn) await session(ctx)
  const page = await ctx.newPage()
  if (o.intro) await page.addInitScript((v) => { try { localStorage.setItem('nivenxa.chess.coachIntro.v1', v) } catch {} }, o.intro)
  const pic = { version: 0, has: false, image: null as Buffer | null }
  await page.route('**/*', async (route) => {
    const q = route.request(), url = q.url()
    if (url.includes('/stockfish/stockfish-18-lite-single.js')) return route.fulfill({ contentType: 'application/javascript', body: engineSource({ gameDelay: 0, analysisDelay: 400, analysisHang: false, afterCp: o.afterCp ?? -20 }) })
    if (/supabase\.co\/auth\/v1\//.test(url)) return route.fulfill({ status: 204, body: '' })
    if (url.includes('/api/chess/coach-intro')) return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ ids: q.method() === 'POST' ? (JSON.parse(q.postData() ?? '{}').ids ?? []) : JSON.parse(o.intro ?? '[]') }) })
    if (url.includes('/api/chess/profile-picture')) {
      const json = (b: unknown) => route.fulfill({ contentType: 'application/json', body: JSON.stringify(b) })
      if (q.method() === 'GET' && url.includes('info=1')) return json({ version: pic.version, hasPicture: pic.has })
      if (q.method() === 'GET') return route.fulfill({ status: pic.has ? 200 : 404, contentType: 'image/webp', body: pic.image ?? Buffer.alloc(0) })
      if (q.method() === 'POST') {
        const raw = q.postDataBuffer() ?? Buffer.alloc(0)
        const file = raw.subarray(raw.indexOf('\r\n\r\n') + 4, raw.lastIndexOf('\r\n--'))
        pic.image = await sharp(file).resize(64, 64).webp().toBuffer()
        pic.version += 1; pic.has = true
        await new Promise((r) => setTimeout(r, 900)) // so the progress bar is visible
        return json({ version: pic.version, hasPicture: true })
      }
      if (q.method() === 'DELETE') { pic.has = false; pic.version += 1; pic.image = null; return json({ version: pic.version, hasPicture: false }) }
    }
    if (q.method() === 'POST' && /\/api\/chess\/explain-(move|engine-purpose)/.test(url)) {
      const body = JSON.parse(q.postData() ?? '{}')
      await new Promise((r) => setTimeout(r, 700))
      const t = o.explain?.[body.move] ?? { explanation: `${body.move} develops the position.` }
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ bullets: [], ...t }) })
    }
    return q.method() === 'POST' && (q.headers()['next-action'] || url.includes('/api/')) ? route.abort() : route.continue()
  })
  return { ctx, page }
}
const sq = async (page: Page, s: string) => {
  const b = (await page.locator('cg-board').first().boundingBox())!
  return { x: b.x + ((s.charCodeAt(0) - 97 + 0.5) * b.width) / 8, y: b.y + ((7 - (Number(s[1]) - 1) + 0.5) * b.height) / 8 }
}
const mv = async (page: Page, a: string, b: string) => { const p = await sq(page, a); await page.mouse.click(p.x, p.y); const q = await sq(page, b); await page.mouse.click(q.x, q.y) }
const ready = async (page: Page) => { await page.waitForSelector('cg-board'); await page.waitForFunction(() => !document.body.innerText.includes('Loading engine')) }
const shot = (page: Page, dir: string, n: string) => page.screenshot({ path: `${dir}/${n}.png` })
const finish = async (ctx: BrowserContext, name: string) => {
  await ctx.close()
  const d = `${OUT}/_tmp-${name}`
  const f = readdirSync(d).find((x) => x.endsWith('.webm'))
  if (f) renameSync(`${d}/${f}`, `${OUT}/${name}.webm`)
}

// ─── A. coach introduction, pacing, then bot selection ─────────────────────────
{
  const { ctx, page } = await newPage('A-coach-onboarding-and-bot-selection')
  await page.goto(`${BASE}/chess/play`, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: /^Beginner/ }).click()
  await page.waitForTimeout(1200)
  await page.getByTestId('bot-picker').scrollIntoViewIfNeeded()
  await shot(page, OUT, 'A1-beginner-coach-introduction-setup')
  await page.getByTestId('bot-zorvi').click({ force: true }) // a preview: cannot be chosen
  await page.waitForTimeout(900)
  await page.getByRole('button', { name: 'White', exact: true }).click()
  await page.getByRole('button', { name: 'Start Game' }).click()
  await ready(page)
  await page.waitForTimeout(800)
  await shot(page, OUT, 'A2-introduction-game-lumio')
  await mv(page, 'd2', 'd4')
  await page.waitForTimeout(1800)
  await shot(page, OUT, 'A3-lumio-thinking-4s-minimum')
  await page.waitForFunction(() => document.querySelector('[data-testid=insight-reply]')?.getAttribute('data-move') === 'e6', undefined, { timeout: 8000 })
  await page.waitForTimeout(1200)
  await shot(page, OUT, 'A4-reply-after-4s')
  await page.waitForTimeout(800)
  await finish(ctx, 'A-coach-onboarding-and-bot-selection')
  const c2 = await newPage('A2-bot-selection-after-three-games', { intro: INTRO3 })
  await c2.page.goto(`${BASE}/chess/play`, { waitUntil: 'networkidle' })
  await c2.page.waitForTimeout(1000)
  await c2.page.getByTestId('bot-picker').scrollIntoViewIfNeeded()
  await shot(c2.page, OUT, 'A5-all-characters-available')
  for (const id of ['zorvi', 'kelvo', 'lumio', 'piplo']) { await c2.page.getByTestId(`bot-${id}`).click(); await c2.page.waitForTimeout(700) }
  await shot(c2.page, OUT, 'A6-piplo-selected')
  await c2.page.getByRole('button', { name: 'White', exact: true }).click()
  await c2.page.getByRole('button', { name: 'Start Game' }).click()
  await ready(c2.page)
  await c2.page.waitForTimeout(800)
  await shot(c2.page, OUT, 'A7-game-with-piplo')
  await mv(c2.page, 'd2', 'd4')
  await c2.page.waitForTimeout(1500)
  await shot(c2.page, OUT, 'A8-piplo-thinking')
  await c2.page.waitForTimeout(3500)
  await finish(c2.ctx, 'A2-bot-selection-after-three-games')
}

// ─── B. custom profile-picture upload (simulated session) ─────────────────────
{
  const { ctx, page } = await newPage('B-profile-picture-upload', { intro: INTRO3, signedIn: true })
  const photo = await sharp({ create: { width: 640, height: 420, channels: 3, background: { r: 230, g: 160, b: 70 } } })
    .composite([{ input: Buffer.from('<svg width="640" height="420" xmlns="http://www.w3.org/2000/svg"><circle cx="360" cy="190" r="120" fill="#7b3fa6"/><rect x="0" y="330" width="640" height="90" fill="#2c5b4a"/></svg>'), top: 0, left: 0 }])
    .png().toBuffer()
  await page.goto(`${BASE}/chess/play`, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: /^Beginner/ }).click()
  await page.getByRole('button', { name: 'White', exact: true }).click()
  await page.getByRole('button', { name: 'Start Game' }).click()
  await ready(page)
  await page.waitForTimeout(700)
  await shot(page, OUT, 'B1-default-knight')
  await mv(page, 'e2', 'e4')
  await page.waitForTimeout(600)
  await page.getByTestId('player-avatar-change').click()
  await page.waitForTimeout(800)
  await shot(page, OUT, 'B2-dialog-limits-and-upload')
  await page.getByTestId('profile-picture-file').setInputFiles({ name: 'me.png', mimeType: 'image/png', buffer: photo })
  await page.waitForTimeout(900)
  await page.getByTestId('profile-picture-zoom').fill('1.6')
  await page.getByTestId('profile-picture-crop').press('ArrowLeft')
  await page.getByTestId('profile-picture-crop').press('ArrowLeft')
  await page.waitForTimeout(900)
  await shot(page, OUT, 'B3-crop-and-circular-preview')
  await page.getByTestId('profile-picture-save').click()
  await page.waitForTimeout(350)
  await shot(page, OUT, 'B4-upload-progress')
  await page.waitForTimeout(1200)
  await shot(page, OUT, 'B5-saved-toast-game-intact')
  await page.waitForTimeout(3500)
  await page.reload({ waitUntil: 'networkidle' })
  await page.getByRole('button', { name: /^Beginner/ }).click()
  await page.getByRole('button', { name: 'Start Game' }).click()
  await ready(page)
  await page.waitForTimeout(900)
  await shot(page, OUT, 'B6-restored-after-reload')
  await page.getByTestId('player-avatar-change').click()
  await page.waitForTimeout(600)
  await page.getByTestId('profile-picture-remove').click()
  await page.waitForTimeout(1500)
  await shot(page, OUT, 'B7-removed-default-restored')
  await finish(ctx, 'B-profile-picture-upload')
}

// ─── C. accurate feedback: praise for a graded blunder is rejected; the engine-verified downside is shown ───────
{
  const { ctx, page } = await newPage('C-accurate-feedback', {
    intro: INTRO3,
    afterCp: 600,
    explain: { 'Qxg6+': { headline: 'Qxg6+ — A nice piece won!', explanation: 'The queen takes the pawn with check, a nice piece won!' }, b3: { explanation: 'The pawn makes a nice home for the bishop.' } },
  })
  await page.goto(`${BASE}/chess/play`, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: /^Beginner/ }).click()
  await page.getByRole('button', { name: 'White', exact: true }).click()
  await page.getByRole('button', { name: 'Start Game' }).click()
  await ready(page)
  await page.waitForTimeout(600)
  await mv(page, 'e2', 'e4'); await page.waitForTimeout(4800)
  await mv(page, 'd1', 'h5'); await page.waitForTimeout(4800)
  await shot(page, OUT, 'C1-before-the-blunder')
  await mv(page, 'h5', 'g6')
  await page.waitForTimeout(2500)
  await shot(page, OUT, 'C2-blunder-praise-rejected-verified-downside')
  await page.waitForTimeout(3000)
  await shot(page, OUT, 'C3-reply-hxg6-matches-the-downside')
  await finish(ctx, 'C-accurate-feedback')
}
await browser.close()
console.log('saved to', OUT)
