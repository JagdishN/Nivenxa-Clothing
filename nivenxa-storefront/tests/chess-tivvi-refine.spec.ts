import { test, expect, type Page } from '@playwright/test'

// Real Play page, TEST-ONLY TIVVI build (NEXT_PUBLIC_CHESS_AVATAR_PROTOTYPE=1).
//   BASE_URL=http://localhost:3100 npx playwright test tests/chess-tivvi-refine.spec.ts
// The engine and analysis run for real. The two explanation endpoints are MOCKED (text with Markdown markers, controllable delays)
// so insight timing, stale results and clean-text can be checked deterministically. Nothing is saved.

test.setTimeout(150000)
test.use({ viewport: { width: 1280, height: 900 } })

type Req = { url: string; body: Record<string, string> }
interface Mock {
  requests: Req[]
  /** ms to hold a response, by `${endpoint}:${move}`; default 0. */
  delays: Record<string, number>
}

async function setup(page: Page): Promise<Mock> {
  const mock: Mock = { requests: [], delays: {} }
  await page.route('**/*', async (route) => {
    const r = route.request()
    const url = r.url()
    if (r.method() === 'POST' && /\/api\/chess\/explain-(move|engine-purpose)/.test(url)) {
      const body = JSON.parse(r.postData() ?? '{}')
      const endpoint = url.includes('engine-purpose') ? 'purpose' : 'move'
      mock.requests.push({ url, body: { ...body, endpoint } })
      const wait = mock.delays[`${endpoint}:${body.move}`] ?? 0
      if (wait) await new Promise((res) => setTimeout(res, wait))
      const tag = `${endpoint}:${body.move}@${String(body.fen ?? body.fenBefore).slice(0, 24)}`
      return route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          headline: `${body.move} — **Solid ${body.move}**`,
          explanation: `**${body.move}** is _fine_. Nivenxa Engine likes it. More detail follows here. [${tag}]`,
          bullets: ['`Develops` a piece', '**Controls** the centre'],
        }),
      })
    }
    // anything else that would write is blocked
    if (r.method() === 'POST' && (r.headers()['next-action'] || url.includes('/api/'))) return route.abort()
    return route.continue()
  })
  return mock
}
async function square(page: Page, sq: string) {
  const box = (await page.locator('cg-board').first().boundingBox())!
  const black = await page.locator('.cg-wrap').first().evaluate((el) => el.classList.contains('orientation-black'))
  const f = sq.charCodeAt(0) - 97
  const r = Number(sq[1]) - 1
  return { x: box.x + (((black ? 7 - f : f) + 0.5) * box.width) / 8, y: box.y + (((black ? r : 7 - r) + 0.5) * box.height) / 8 }
}
async function move(page: Page, from: string, to: string) {
  const a = await square(page, from)
  await page.mouse.click(a.x, a.y)
  const b = await square(page, to)
  await page.mouse.click(b.x, b.y)
}
async function start(page: Page, opts: { tier?: string; color?: 'White' | 'Black' } = {}) {
  await page.addInitScript(() => { try { localStorage.setItem('nivenxa.chess.test.replyMinMs', '500'); localStorage.setItem('nivenxa.chess.coachIntro.v1', JSON.stringify(['00000000-0000-4000-8000-000000000a01','00000000-0000-4000-8000-000000000a02','00000000-0000-4000-8000-000000000a03'])) } catch {} }) // these suites are not about pace: shorten the level's minimum reply time (test-only hook, needs NEXT_PUBLIC_CHESS_TEST_HOOKS build)
  await page.goto('/chess/play', { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: new RegExp(`^${opts.tier ?? 'Beginner'}`) }).click()
  await page.getByRole('button', { name: opts.color ?? 'White', exact: true }).click()
  await page.getByRole('button', { name: 'Start Game' }).click()
  await page.waitForSelector('cg-board')
  await expect(page.getByText('Loading engine…')).toHaveCount(0, { timeout: 40000 })
}
const card = (page: Page) => page.getByTestId('insight-you')
const replyCard = (page: Page) => page.getByTestId('insight-reply')
const boardBox = (page: Page) => page.locator('cg-board').first().boundingBox()

test('identity: TIVVI · side, a secondary label, and the human player has an avatar with a sign-in prompt', async ({ page }) => {
  await setup(page)
  await start(page)
  await expect(page.getByTestId('opponent-name')).toHaveText('TIVVI · Black')
  await expect(page.getByTestId('opponent-sub')).toHaveText('Friendly partner')
  await expect(page.locator('main')).not.toContainText('Nivenxa · ')
  await expect(page.getByText('You · White')).toBeVisible()
  const me = page.getByTestId('player-avatar')
  await expect(me).toBeVisible()
  await expect(me).toHaveAttribute('data-avatar-id', 'plum') // the default
  await expect(page.getByTestId('player-avatar-signin')).toHaveText('Sign in to change your picture')
  await expect(page.getByTestId('player-avatar-change')).toHaveCount(0) // guests cannot change it
  // same footprint as the opponent's avatar, so the two headers line up
  const a = await page.getByTestId('player-avatar').boundingBox()
  const b = await page.getByTestId('tivvi-avatar').locator('xpath=..').boundingBox()
  expect(Math.abs(a!.width - b!.width)).toBeLessThan(1)
  expect(Math.abs(a!.height - b!.height)).toBeLessThan(1)
  // no analysis or reaction hooks exist on the player's avatar
  await expect(me.locator('[data-state]')).toHaveCount(0)
})

test('guest: "Sign in to change your avatar" opens the drawer without ending the game', async ({ page }) => {
  await setup(page)
  await start(page)
  await move(page, 'e2', 'e4')
  await page.getByTestId('player-avatar-signin').click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.locator('cg-board')).toBeVisible()
  await expect(page.getByTestId('insight-panel')).toContainText('1.') // the game carried on underneath
})

test('assistance is labelled "Guided play" and character/strength stay separate', async ({ page }) => {
  await setup(page)
  await start(page)
  await expect(page.getByTestId('assistance-label')).toHaveText('Guided play')
  await expect(page.locator('main')).toContainText('Guided play')
  await expect(page.getByTestId('game-meta')).toContainText('Beginner')
})

test('insight: loading state for THIS move, short observation, "Why?", clean text, history collapsed', async ({ page }) => {
  const mock = await setup(page)
  mock.delays['move:e4'] = 1500
  await start(page)
  await move(page, 'e2', 'e4')
  // while the explanation loads the section is about move 1 and says so; nothing older is shown as current
  await expect(card(page)).toHaveAttribute('data-ply', '0')
  await expect(page.getByTestId('insight-you-heading')).toContainText('Your last move · 1.e4')
  await expect(card(page)).toHaveAttribute('data-state', /pending|loading/)
  await expect(card(page)).toHaveAttribute('data-state', 'ready', { timeout: 15000 })
  await expect(page.getByTestId('insight-you-observation')).toHaveText('Solid e4') // headline verdict, markers removed
  // TIVVI replies in its OWN section; your feedback stays.
  await expect(replyCard(page)).toHaveAttribute('data-ply', '1', { timeout: 30000 })
  await expect(replyCard(page)).toHaveAttribute('data-state', 'ready', { timeout: 15000 })
  await expect(card(page)).toHaveAttribute('data-move', 'e4')
  await expect(page.getByText('Your move')).toBeVisible()
  const obs = page.getByTestId('insight-reply-observation')
  await expect(page.getByTestId('insight-reply-why')).toHaveCount(0)
  await replyCard(page).getByRole('button', { name: 'Why?' }).click()
  const why = page.getByTestId('insight-reply-why')
  await expect(why).toBeVisible()
  const text = (await why.innerText()) + (await obs.innerText())
  expect(text).not.toMatch(/\*\*|`|_fine_|\]\(/) // no raw Markdown
  expect(text).toContain('TIVVI likes it') // opponent named consistently
  await expect(page.locator('main')).not.toContainText('Nivenxa Engine')
  await replyCard(page).getByRole('button', { name: 'Hide why' }).click()
  await expect(page.getByTestId('insight-reply-why')).toHaveCount(0)
})

test('insight follows the game: your move and the reply are separate sections, earlier ones go to a collapsed history', async ({ page }) => {
  await setup(page)
  await start(page)
  await move(page, 'e2', 'e4')
  await expect(replyCard(page)).toHaveAttribute('data-ply', '1', { timeout: 30000 })
  await expect(page.getByTestId('insight-reply-heading')).toHaveText(/^TIVVI's reply · 1\.\.\./)
  await expect(replyCard(page)).toHaveAttribute('data-state', 'ready', { timeout: 15000 })
  await move(page, 'd2', 'd4')
  await expect(card(page)).toHaveAttribute('data-ply', '2', { timeout: 15000 })
  await expect(page.getByTestId('insight-you-heading')).toContainText('Your last move · 2.d4')
  await expect(card(page)).not.toContainText('e4 —')
  // earlier insights: collapsed by default, newest first, each with its move label
  const toggle = page.getByTestId('insight-history-toggle')
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')
  await expect(page.getByTestId('insight-history')).toHaveCount(0)
  await toggle.click()
  const items = page.getByTestId('insight-history').locator('li')
  await expect(items.first()).toContainText(/(You|TIVVI) · (White|Black) · \d/)
  await expect(items.last()).toContainText('You · White · 1.e4')
  // the section sits at the top of the panel (not scrolled away): it is inside the panel's visible area
  const c = await card(page).boundingBox()
  const p = await page.getByTestId('insight-panel').boundingBox()
  expect(c!.y).toBeGreaterThanOrEqual(p!.y - 1)
})

test('stale: a late explanation for an undone move never appears on the replayed move', async ({ page }) => {
  const mock = await setup(page)
  await start(page)
  await move(page, 'e2', 'e4')
  await expect(replyCard(page)).toHaveAttribute('data-ply', '1', { timeout: 30000 })
  // hold back the engine-note for whatever TIVVI played, undo, then play a different first move
  const reply = await page.getByTestId('insight-reply-heading').innerText()
  const san = reply.split(' · ').pop()!.replace(/^\d+\.+/, '')
  const oldFen = mock.requests.filter((r) => r.body.endpoint === 'purpose').at(-1)?.body.fenBefore ?? ''
  mock.delays[`purpose:${san}`] = 6000
  await expect(replyCard(page)).toHaveAttribute('data-state', 'ready', { timeout: 15000 })
  await page.getByRole('button', { name: /^Undo/ }).click()
  await expect(page.locator('main')).not.toContainText('1.e4')
  await move(page, 'd2', 'd4')
  await expect(page.getByTestId('insight-you-heading')).toContainText('Your last move · 1.d4', { timeout: 15000 })
  await page.waitForTimeout(8000) // any late response has now arrived
  expect(oldFen).not.toBe('')
  const html = await page.getByTestId('insight-panel').innerText()
  expect(html).not.toContain(oldFen.slice(0, 24)) // nothing tagged with the old position
  await expect(card(page)).toHaveAttribute('data-fen', /./)
})

test('layout is stable: the board does not move while poses and captions change', async ({ page }) => {
  await setup(page)
  await start(page)
  const first = await boardBox(page)
  const seen: { y: number; h: number }[] = []
  for (const [a, b] of [['e2', 'e4'], ['d2', 'd4']]) {
    await move(page, a, b)
    for (let i = 0; i < 12; i++) {
      const bb = await boardBox(page)
      seen.push({ y: bb!.y, h: bb!.height })
      await page.waitForTimeout(250)
    }
  }
  for (const s of seen) {
    expect(Math.abs(s.y - first!.y)).toBeLessThan(1)
    expect(Math.abs(s.h - first!.height)).toBeLessThan(1)
  }
})

test('Animations switch: labelled, persisted, motion stops; captions stay', async ({ page }) => {
  await setup(page)
  await start(page)
  await expect(page.getByText(/Animation: (on|off)/)).toHaveCount(0) // the old utility link is gone
  await page.getByTestId('game-settings').click()
  const sw = page.getByRole('switch', { name: 'Animations' })
  await expect(sw).toHaveAttribute('aria-checked', 'true')
  await sw.click()
  await expect(sw).toHaveAttribute('aria-checked', 'false')
  await expect(page.getByTestId('tivvi-avatar')).toHaveAttribute('data-anim', 'off')
  await expect(page.getByTestId('avatar-caption')).toHaveText(/TIVVI says hello/)
  await page.reload({ waitUntil: 'networkidle' })
  await start(page)
  await page.getByTestId('game-settings').click()
  await expect(page.getByRole('switch', { name: 'Animations' })).toHaveAttribute('aria-checked', 'false')
})

test('expressions are distinguishable: each state differs from the others in at least three face parts', async ({ page }) => {
  await setup(page)
  await start(page)
  const rows = await page.evaluate(async () => {
    const src = document.querySelector('[data-testid=tivvi-avatar]') as SVGElement
    const states = ['idle', 'selected', 'thinking', 'encourage', 'concern', 'ackwin', 'ackdraw']
    const out: Record<string, Record<string, string>> = {}
    const host = document.createElement('div')
    host.style.cssText = 'position:fixed;left:-9999px;top:0;width:64px'
    document.body.appendChild(host)
    for (const st of states) {
      const el = src.cloneNode(true) as SVGElement
      el.setAttribute('data-state', st)
      el.setAttribute('data-anim', 'off')
      host.appendChild(el)
      const t = (sel: string) => getComputedStyle(el.querySelector(sel)!).transform
      const mouthShown = [...el.querySelectorAll('path')].filter((p) => /^m/i.test(p.getAttribute('class')?.split(' ').find((c) => c.includes('_m')) ?? '') || p.getAttribute('class')?.includes('_m')).filter((p) => getComputedStyle(p).display !== 'none').map((p) => p.getAttribute('class')?.split(' ').pop()).join()
      out[st] = {
        browL: t('[class*=browL]'),
        browR: t('[class*=browR]'),
        lids: t('[class*=lid]'),
        eyes: t('[class*=eyes]'),
        head: t('[data-part=head]'),
        mouth: mouthShown,
      }
      host.removeChild(el)
    }
    host.remove()
    return out
  })
  const names = Object.keys(rows)
  const parts = ['browL', 'browR', 'lids', 'eyes', 'head', 'mouth']
  for (const key of ['thinking', 'encourage', 'concern', 'selected', 'idle'])
    for (const other of names) {
      if (other === key) continue
      const diff = parts.filter((p) => rows[key][p] !== rows[other][p]).length
      // idle vs ackdraw are intentionally close relatives (both calm); every other pair must differ clearly
      const calmPair = (key === 'idle' && other === 'ackdraw') || (key === 'ackdraw' && other === 'idle')
      if (!calmPair) expect(diff, `${key} vs ${other}: ${JSON.stringify([rows[key], rows[other]])}`).toBeGreaterThanOrEqual(3)
    }
})

test('game over: "TIVVI wins" with supportive language and two clearly different review actions', async ({ page }) => {
  await setup(page)
  await start(page)
  await move(page, 'e2', 'e4')
  await expect(replyCard(page)).toHaveAttribute('data-ply', '1', { timeout: 30000 })
  await page.getByRole('button', { name: /^Resign/ }).click()
  await page.getByRole('button', { name: /Resign|Yes|Confirm/ }).last().click()
  const dlg = page.getByRole('dialog')
  await expect(dlg).toContainText('TIVVI wins')
  await expect(dlg).toContainText('Good effort. Want to review it together?')
  await expect(page.getByTestId('avatar-caption')).toHaveText(/TIVVI: good effort\. Want to review it together\?/i)
  await expect(dlg.getByRole('button', { name: 'Review with explanations' })).toBeVisible()
  await expect(dlg.getByRole('button', { name: /Open full analysis/ })).toBeVisible()
  await dlg.getByRole('button', { name: 'Review with explanations' }).click()
  await expect(page.getByRole('heading', { name: 'Game Review' })).toBeVisible()
  await expect(page.locator('main')).not.toContainText('Nivenxa Engine')
})
