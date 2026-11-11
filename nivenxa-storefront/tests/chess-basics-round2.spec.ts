import { test, expect, type Page } from '@playwright/test'
import { mkdirSync } from 'node:fs'

// Round 2 of the Chess Basics refinement: the independent set-up exercise (layout, orientation, pattern feedback, recovery, tray,
// success state), the lesson-settings dialog, status messages, and Finish lesson / onward navigation for all four lessons.
// NORMAL build, narration faked in the page (no real audio or microphone). Run:
//   BASE_URL=http://localhost:3100 npx playwright test tests/chess-basics-round2.spec.ts --workers=1
const SHOTS = 'D:/Nivenxa Clothing/Private-Assets/avatars/basics-review/round2'
mkdirSync(SHOTS, { recursive: true })
test.setTimeout(180000)
test.use({ viewport: { width: 1366, height: 768 } })

type SpeechMode = 'hang' | 'normal'
async function fakeSpeech(page: Page, mode: SpeechMode = 'normal') {
  await page.addInitScript((m) => {
    const log = { spoken: [] as string[], active: 0, cancels: 0 }
    ;(window as unknown as { __speech: typeof log }).__speech = log
    class U {
      text: string
      rate = 1
      onstart: (() => void) | null = null
      onend: (() => void) | null = null
      onerror: (() => void) | null = null
      constructor(t: string) {
        this.text = t
      }
    }
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: U, configurable: true })
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: {
        speaking: false,
        paused: false,
        speak(u: U) {
          log.spoken.push(u.text)
          log.active += 1
          setTimeout(() => u.onstart?.(), 0)
          if (m === 'normal')
            setTimeout(() => {
              log.active -= 1
              u.onend?.()
            }, 50)
        },
        cancel() {
          log.cancels += 1
          log.active = 0
        },
        pause() {},
        resume() {},
      },
    })
  }, mode)
}
const speech = (page: Page) => page.evaluate(() => (window as unknown as { __speech: { spoken: string[]; active: number; cancels: number } }).__speech)
const shot = (page: Page, name: string) => page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: false })

async function seed(page: Page, slug: string, step: number, total: number, results?: Record<number, string>) {
  await page.addInitScript(
    ([s, st, t, r]) => {
      localStorage.setItem('nivenxa-chess-basics-progress', JSON.stringify({ [s as string]: { status: 'started', step: st, total: t } }))
      if (r) localStorage.setItem('nivenxa-chess-basics-results-v1', JSON.stringify({ [s as string]: r }))
    },
    [slug, step, total, results ?? null] as const
  )
}
async function openBuild(page: Page, mode: SpeechMode = 'normal') {
  await fakeSpeech(page, mode)
  await seed(page, 'set-up-the-pieces', 15, 17)
  await page.goto('/chess/learn/basics/set-up-the-pieces', { waitUntil: 'networkidle' })
  await page.getByTestId('lesson-continue').click()
  await expect(page.getByTestId('setup-board')).toBeVisible()
}
const cell = (page: Page, sq: string) => page.locator(`[data-testid=setup-board] [data-square=${sq}]`)
const next = (page: Page) => page.getByTestId('lesson-next')

const START: Record<string, string> = {}
'abcdefgh'.split('').forEach((f, i) => {
  const back = 'rnbqkbnr'[i]
  START[`${f}1`] = back.toUpperCase()
  START[`${f}2`] = 'P'
  START[`${f}7`] = 'p'
  START[`${f}8`] = back
})
const ORDER = ['R', 'N', 'B', 'Q', 'K', 'P', 'r', 'n', 'b', 'q', 'k', 'p']
/** Place pieces by choosing a tray entry and then squares. Only squares whose letter matches are used. */
async function place(page: Page, plan: Record<string, string>, letters: string[] = ORDER) {
  for (const letter of letters) {
    const squares = Object.entries(plan).filter(([, p]) => p === letter).map(([s]) => s)
    if (!squares.length) continue
    const todo: string[] = []
    for (const sq of squares) if ((await cell(page, sq).getAttribute('data-piece')) !== letter) todo.push(sq)
    if (!todo.length) continue
    await page.getByTestId(`tray-${letter}`).click()
    for (const sq of todo) await cell(page, sq).click()
  }
}
const mirror = (p: Record<string, string>) => Object.fromEntries(Object.entries(p).map(([sq, v]) => [`${sq[0]}${9 - Number(sq[1])}`, v]))
const count = (page: Page, pred: 'white' | 'black' | 'all') =>
  page.locator('[data-testid=setup-board] [data-piece]').evaluateAll((els, p) => els.filter((e) => { const v = e.getAttribute('data-piece') ?? ''; return v && (p === 'all' || (p === 'white') === (v === v.toUpperCase())) }).length, pred)
const rect = (page: Page, id: string) => page.getByTestId(id).first().boundingBox()
type Box = { x: number; y: number; width: number; height: number }
const overlaps = (a: Box, b: Box) => a.x < b.x + b.width - 1 && b.x < a.x + a.width - 1 && a.y < b.y + b.height - 1 && b.y < a.y + a.height - 1

test.describe('1. Step 15 layout and Lesson settings', () => {
  const sizes = [
    { name: '1366x768', width: 1366, height: 768 },
    { name: '1920x1080', width: 1920, height: 1080 },
    { name: '390x844', width: 390, height: 844 },
    { name: '1093x614-125pct', width: 1093, height: 614 },
    { name: '683x384-200pct', width: 683, height: 384 },
  ]
  for (const sz of sizes) {
    test(`no overlap, no clipping, no nested scrolling, Back/Next reachable (${sz.name})`, async ({ page }) => {
      await page.setViewportSize({ width: sz.width, height: sz.height })
      await openBuild(page)
      await page.getByTestId('tray-R').click()
      await cell(page, 'a1').click()
      await page.getByTestId('lesson-hint').click()
      await page.getByTestId('lesson-hint').click()
      const parts = ['setup-orientation', 'piece-tray', 'setup-status', 'setup-check', 'lesson-controls', 'lesson-nav']
      // all rectangles read in one go, so scrolling cannot skew the comparison
      const boxes = (await page.evaluate((ids) => Object.fromEntries(ids.map((id) => { const r = document.querySelector(`[data-testid=${id}]`)!.getBoundingClientRect(); return [id, { x: r.x, y: r.y, width: r.width, height: r.height }] })), parts)) as Record<string, Box>
      for (let i = 0; i < parts.length; i++) for (let j = i + 1; j < parts.length; j++) expect(overlaps(boxes[parts[i]], boxes[parts[j]]), `${parts[i]} overlaps ${parts[j]}`).toBe(false)
      // the panel does not scroll inside itself
      const panel = await page.getByTestId('lesson-nav').evaluate((nav) => {
        const p = nav.parentElement as HTMLElement
        const cs = getComputedStyle(p)
        return { overflowY: cs.overflowY, scrollable: p.scrollHeight > p.clientHeight + 1 && (cs.overflowY === 'auto' || cs.overflowY === 'scroll') }
      })
      expect(panel.scrollable, `panel overflow ${panel.overflowY}`).toBe(false)
      // no horizontal page scroll
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true)
      // Back and Next can be reached and are visible once scrolled to
      await page.getByTestId('lesson-back').scrollIntoViewIfNeeded()
      await expect(page.getByTestId('lesson-back')).toBeInViewport()
      await expect(next(page)).toBeInViewport()
      // empty space under the buttons is small: nothing but the panel padding
      const gap = await page.getByTestId('lesson-nav').evaluate((nav) => { const p = nav.parentElement as HTMLElement; return p.getBoundingClientRect().bottom - nav.getBoundingClientRect().bottom })
      expect(gap).toBeLessThan(40)
      await shot(page, `layout-step15-${sz.name}`)
    })
  }

  test('Lesson settings is a dialog: opening it does not move the lesson or the Back/Next row; Escape closes and focus returns', async ({ page }) => {
    await openBuild(page)
    const offset = () => page.evaluate(() => document.querySelector('[data-testid=lesson-nav]')!.getBoundingClientRect().y - document.querySelector('[data-testid=lesson-controls]')!.getBoundingClientRect().y)
    const before = await offset()
    const toggle = page.getByTestId('lesson-settings-toggle')
    await toggle.focus()
    await page.keyboard.press('Enter')
    const dialog = page.getByRole('dialog', { name: 'Lesson settings' })
    await expect(dialog).toBeVisible()
    await expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(await page.evaluate(() => !!document.activeElement?.closest('[data-testid=lesson-settings]'))).toBe(true) // focus moved into it
    expect(Math.abs((await offset()) - before)).toBeLessThan(1) // the lesson layout did not move when the dialog opened
    await shot(page, 'settings-dialog-open')
    // Tab stays inside while it is open
    for (let i = 0; i < 8; i++) await page.keyboard.press('Tab')
    expect(await page.evaluate(() => !!document.activeElement?.closest('[data-testid=lesson-settings]'))).toBe(true)
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(toggle).toBeFocused()
    await expect(toggle).toHaveAttribute('aria-expanded', 'false')
    // Close button also returns focus
    await toggle.click()
    await page.getByTestId('lesson-settings-close').click()
    await expect(toggle).toBeFocused()
    // voice, speed and the microphone are all in the one dialog
    await toggle.click()
    await expect(dialog.getByRole('button', { name: /Voice: On/ })).toBeVisible()
    await expect(dialog.getByRole('button', { name: 'Slow' })).toBeVisible()
    await expect(dialog.getByRole('button', { name: /Hold to talk/ })).toBeVisible()
  })
})

test.describe('2. Orientation', () => {
  test('persistent side labels outside the board, and the orientation is explained', async ({ page }) => {
    await openBuild(page)
    const black = (await rect(page, 'side-label-black'))!
    const white = (await rect(page, 'side-label-white'))!
    const board = (await rect(page, 'setup-board'))!
    expect(black.y + black.height).toBeLessThanOrEqual(board.y + 1) // above the board, not inside it
    expect(white.y).toBeGreaterThanOrEqual(board.y + board.height - 1) // below the board
    await expect(page.getByTestId('side-label-black')).toContainText('Black’s side')
    await expect(page.getByTestId('side-label-white')).toContainText('White’s side')
    await expect(page.getByTestId('setup-orientation')).toContainText('White starts nearest you')
    await expect(cell(page, 'a1')).toHaveAttribute('aria-label', /a1, empty/)
    await shot(page, 'orientation-labels')
  })
})

test.describe('3. Pattern feedback and recovery', () => {
  test('a fully reversed arrangement is explained as one pattern, never silently rotated or accepted', async ({ page }) => {
    await openBuild(page)
    await place(page, mirror(START))
    expect(await count(page, 'all')).toBe(32)
    await shot(page, 'reversed-before-check')
    await page.getByTestId('setup-check').click()
    const msg = page.getByTestId('setup-message')
    await expect(msg).toContainText(/each other.s sides/)
    await expect(msg).toContainText('ranks 1 and 2')
    expect(await msg.innerText()).not.toMatch(/32 pieces are in the wrong place/)
    await expect(page.getByTestId('setup-success')).toHaveCount(0)
    await expect(next(page)).toHaveAttribute('aria-disabled', 'true')
    // the board is not covered in marks: only one side is marked while the pattern is explained
    expect(await page.locator('[data-testid=setup-board] [data-state=wrong]').count()).toBe(0)
    expect(await page.locator('[data-testid=setup-board] [data-state=focus]').count()).toBeLessThanOrEqual(16)
    // nothing was rotated or moved
    await expect(cell(page, 'a8')).toHaveAttribute('data-piece', 'R')
    await expect(page.getByTestId('setup-retry')).toBeVisible()
    await expect(page.getByTestId('setup-retry-note')).toContainText('takes off the 16 White pieces')
    await expect(page.getByTestId('setup-retry-note')).toContainText('takes off the 16 Black pieces')
    await expect(page.getByTestId('setup-retry-note')).toContainText('Nothing is placed for you')
    await shot(page, 'reversed-feedback')
    // a failed check is not a hint
    await expect(page.getByTestId('assist-note')).toHaveCount(0)
  })

  test('Retry White’s side removes only White; Black stays; then both are rebuilt and the result is independent', async ({ page }) => {
    await openBuild(page)
    await place(page, mirror(START))
    await page.getByTestId('setup-check').click()
    await page.getByTestId('setup-retry-white').click()
    expect(await count(page, 'white')).toBe(0)
    expect(await count(page, 'black')).toBe(16)
    await expect(page.getByTestId('setup-message')).toContainText('16 White pieces came off')
    await expect(page.getByTestId('setup-message')).toContainText('all the Black pieces stayed')
    await expect(page.getByTestId('setup-progress')).toHaveText('16 of 32 placed')
    await shot(page, 'retry-white-cleared')
    // Nothing is placed for us, and Black still stands on White's squares, so those squares are not silently replaced.
    await page.getByTestId('tray-R').click()
    await cell(page, 'a1').click()
    await expect(page.getByTestId('setup-message')).toContainText('a1 already has a Black rook')
    await page.getByTestId('setup-cancel').click()
    await page.getByTestId('setup-check').click()
    await expect(page.getByTestId('setup-retry-black')).toBeVisible()
    await expect(page.getByTestId('setup-retry-white')).toHaveCount(0)
    await page.getByTestId('setup-retry-black').click()
    expect(await count(page, 'all')).toBe(0)
    await place(page, START)
    await page.getByTestId('setup-check').click()
    await expect(page.getByTestId('setup-success')).toHaveText('✓ All 32 pieces are correctly placed.')
    await expect(page.getByTestId('assist-note')).toHaveText('Done on your own') // validation failures and retries are not help
  })

  test('king and queen swapped: named as a pattern, marked, and only the marked pieces come off', async ({ page }) => {
    await openBuild(page)
    await place(page, { ...START, d1: 'K', e1: 'Q' })
    await page.getByTestId('setup-check').click()
    await expect(page.getByTestId('setup-message')).toContainText('king and queen have swapped places')
    await expect(page.getByTestId('setup-message')).toContainText('30 pieces are already right and will stay')
    await expect(cell(page, 'd1')).toHaveAttribute('data-state', 'focus')
    await expect(cell(page, 'e1')).toHaveAttribute('data-state', 'focus')
    expect(await page.locator('[data-testid=setup-board] [data-state=wrong]').count()).toBe(0)
    await shot(page, 'king-queen-swapped')
    await page.getByTestId('setup-remove-wrong').click()
    expect(await count(page, 'all')).toBe(30)
    await expect(cell(page, 'a1')).toHaveAttribute('data-piece', 'R')
    await page.getByTestId('tray-K').click()
    await cell(page, 'e1').click()
    await page.getByTestId('tray-Q').click()
    await cell(page, 'd1').click()
    await page.getByTestId('setup-check').click()
    await expect(page.getByTestId('setup-success')).toBeVisible()
  })

  test('pawns on the wrong rank are one pattern that names the right rank', async ({ page }) => {
    await openBuild(page)
    const plan = { ...START }
    for (const f of 'abcdefgh') {
      delete plan[`${f}2`]
      plan[`${f}3`] = 'P'
    }
    await place(page, plan)
    await page.getByTestId('setup-check').click()
    await expect(page.getByTestId('setup-message')).toContainText('The White pawns are on rank 3. They start on rank 2')
    expect(await page.locator('[data-testid=setup-board] [data-state=focus]').count()).toBe(8)
  })

  test('mixed: one wrong piece is marked on its own; correct pieces are kept; a piece can be taken off or moved individually', async ({ page }) => {
    await openBuild(page)
    const plan = { ...START }
    delete plan.b1
    await place(page, plan)
    await page.getByTestId('tray-N').click()
    await cell(page, 'b3').click() // a knight on the wrong square
    await page.getByTestId('setup-check').click()
    await expect(page.getByTestId('setup-message')).toContainText('1 piece is in the wrong place (marked ✕)')
    await expect(page.getByTestId('setup-message')).toContainText('1 square is still empty')
    await expect(page.getByTestId('setup-message')).toContainText('31 pieces are already right')
    await expect(cell(page, 'b3')).toHaveAttribute('data-state', 'wrong')
    // take that one piece off (select it, then Take it off); everything else stays
    await cell(page, 'b3').click()
    await expect(page.getByTestId('setup-status')).toContainText('Selected on the board: White knight on b3')
    await page.getByTestId('setup-takeoff').click()
    await expect(cell(page, 'b3')).toHaveAttribute('data-piece', '')
    await expect(page.getByTestId('setup-message')).toContainText('Took the White knight off b3')
    expect(await count(page, 'all')).toBe(31)
    // place it wrongly again, then MOVE it (no dragging) to the right square
    await page.getByTestId('tray-N').click()
    await cell(page, 'a3').click()
    await cell(page, 'a3').click()
    await page.getByTestId('setup-move').click()
    await expect(page.getByTestId('setup-status')).toContainText('Moving: White knight from a3')
    await cell(page, 'b1').click() // an empty square: the piece moves there, nothing is duplicated
    await expect(cell(page, 'a3')).toHaveAttribute('data-piece', '')
    await expect(cell(page, 'b1')).toHaveAttribute('data-piece', 'N')
    expect(await count(page, 'all')).toBe(32)
    await page.getByTestId('setup-check').click()
    await expect(page.getByTestId('setup-success')).toBeVisible()
  })
})

test.describe('4. Piece tray', () => {
  test('White and Black are labelled; selection, remaining counts, exhausted entries and occupied squares behave', async ({ page }) => {
    await openBuild(page)
    const tray = page.getByTestId('piece-tray')
    await expect(tray.getByText('White pieces')).toBeVisible()
    await expect(tray.getByText('Black pieces')).toBeVisible()
    await expect(page.getByTestId('tray-white').getByTestId('tray-B')).toBeVisible()
    await expect(page.getByTestId('tray-black').getByTestId('tray-b')).toBeVisible()
    await expect(page.getByTestId('tray-B')).toContainText('2 left')
    await expect(page.getByTestId('tray-B')).toHaveAttribute('aria-label', 'White bishop, 2 remaining')
    await page.getByTestId('tray-B').click()
    await expect(page.getByTestId('setup-status')).toHaveText('Selected: White bishop · 2 remaining. Choose a square.')
    await expect(page.getByTestId('tray-B')).toHaveAttribute('aria-pressed', 'true')
    await cell(page, 'c1').click()
    await expect(page.getByTestId('setup-status')).toHaveText('Selected: White bishop · 1 remaining. Choose a square.')
    await expect(page.getByTestId('setup-progress')).toHaveText('1 of 32 placed')
    await cell(page, 'c1').click() // an occupied square: no silent replacement, no duplicate
    await expect(page.getByTestId('setup-message')).toContainText('c1 already has a White bishop')
    await expect(cell(page, 'c1')).toHaveAttribute('data-piece', 'B')
    await expect(page.getByTestId('setup-progress')).toHaveText('1 of 32 placed')
    await cell(page, 'f1').click()
    await expect(page.getByTestId('tray-B')).toHaveAttribute('aria-disabled', 'true') // exhausted
    await expect(page.getByTestId('tray-B')).toContainText('placed ✓')
    await expect(page.getByTestId('tray-B')).toHaveAttribute('aria-label', 'White bishop, all 2 placed')
    await expect(page.getByTestId('setup-status')).not.toContainText('Selected: White bishop') // selection cleared when none are left
    await cell(page, 'a3').click() // nothing selected: a hint, no placement
    await expect(page.getByTestId('setup-message')).toContainText('Choose a piece from the tray first')
    expect(await count(page, 'all')).toBe(2)
    await page.getByTestId('tray-B').click({ force: true }) // choosing an exhausted entry never allows a third bishop
    await expect(page.getByTestId('setup-message')).toContainText('already placed')
    await cell(page, 'a3').click()
    expect(await count(page, 'all')).toBe(2)
    // a black bishop is a different entry from a white one
    await expect(page.getByTestId('tray-b')).toContainText('2 left')
    await shot(page, 'tray-labelled')
  })

  test('the correct position is accepted whatever order it is built in (pawns first, black first, keyboard only for a few)', async ({ page }) => {
    await openBuild(page)
    await place(page, START, ['p', 'P', 'k', 'q', 'b', 'n', 'r', 'K', 'Q', 'B', 'N', 'R'])
    await expect(page.getByTestId('setup-progress')).toHaveText('32 of 32 placed')
    await page.getByTestId('setup-check').click()
    await expect(page.getByTestId('setup-success')).toBeVisible()
  })

  test('keyboard alone: choose a piece, arrow to a square, place; Delete takes it off', async ({ page }) => {
    await openBuild(page)
    await page.getByTestId('tray-N').focus()
    await page.keyboard.press('Space')
    await expect(page.getByTestId('tray-N')).toHaveAttribute('aria-pressed', 'true')
    await cell(page, 'd4').focus()
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('ArrowDown')
    await expect(cell(page, 'd1')).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(cell(page, 'd1')).toHaveAttribute('data-piece', 'N')
    await page.keyboard.press('Escape')
    await page.keyboard.press('Delete')
    await expect(cell(page, 'd1')).toHaveAttribute('data-piece', '')
  })
})

test.describe('5. Success state', () => {
  test('placement status is cleared, the board is locked, help is switched off and cannot change the result; Edit setup reopens it', async ({ page }) => {
    await openBuild(page)
    await place(page, START, ['R', 'N', 'B', 'Q', 'K', 'P', 'r', 'n', 'b', 'q', 'p'])
    await page.getByTestId('tray-k').click() // the last piece is chosen but not yet placed
    await expect(page.getByTestId('setup-status')).toContainText('Selected: Black king · 1 remaining')
    await cell(page, 'e8').click()
    await page.getByTestId('setup-check').click()
    await expect(page.getByTestId('setup-success')).toHaveText('✓ All 32 pieces are correctly placed.')
    await expect(page.getByText(/Placing:|Selected: /)).toHaveCount(0)
    await expect(page.getByTestId('setup-status')).toHaveCount(0)
    await expect(page.getByTestId('piece-tray')).toHaveCount(0)
    await expect(page.getByTestId('assist-note')).toHaveText('Done on your own')
    await expect(cell(page, 'e4')).toBeDisabled() // locked
    await expect(page.getByTestId('lesson-hint')).toHaveAttribute('aria-disabled', 'true')
    await expect(page.getByTestId('lesson-showme')).toHaveAttribute('aria-disabled', 'true')
    await page.getByTestId('lesson-hint').click({ force: true })
    await page.getByTestId('lesson-showme').click({ force: true })
    await expect(page.getByTestId('assist-note')).toHaveText('Done on your own') // help clicked afterwards changes nothing
    expect(await count(page, 'all')).toBe(32)
    await expect(next(page)).toHaveAttribute('aria-disabled', 'false')
    await shot(page, 'setup-success-cleared')
    // Edit setup reopens editing but never erases the recorded result
    await page.getByTestId('setup-edit').click()
    await expect(page.getByTestId('piece-tray')).toBeVisible()
    await cell(page, 'e2').click()
    await expect(page.getByTestId('setup-status')).toContainText('Selected on the board: White pawn on e2')
    await page.getByTestId('setup-takeoff').click()
    await page.getByTestId('tray-P').click()
    await cell(page, 'e2').click()
    await page.getByTestId('setup-check').click()
    await expect(page.getByTestId('setup-success')).toBeVisible()
    await expect(page.getByTestId('assist-note')).toHaveText('Done on your own')
  })

  test('Back and return does not erase the recorded result; an earlier help result is not upgraded by looking again', async ({ page }) => {
    await openBuild(page)
    await page.getByTestId('lesson-showme').click() // places the rooks: assisted
    await place(page, START)
    await page.getByTestId('setup-check').click()
    await expect(page.getByTestId('assist-note')).toHaveText('Completed with help')
    await page.getByTestId('lesson-back').click()
    await next(page).click()
    await expect(page.getByTestId('assist-earlier')).toContainText('Earlier: completed with help')
    await expect(next(page)).toHaveAttribute('aria-disabled', 'false') // already completed, can continue
  })
})

test.describe('6. Guided feedback and counts', () => {
  async function guided(page: Page, slug: string, step: number, total: number) {
    await fakeSpeech(page, 'normal')
    await seed(page, slug, step, total)
    await page.goto(`/chess/learn/basics/${slug}`, { waitUntil: 'networkidle' })
    await page.getByTestId('lesson-continue').click()
  }
  async function click(page: Page, sq: string) {
    const b = (await page.locator('cg-board').first().boundingBox())!
    await page.mouse.click(b.x + ((sq.charCodeAt(0) - 97 + 0.5) * b.width) / 8, b.y + ((8 - Number(sq[1]) + 0.5) * b.height) / 8)
  }

  test('a mistake gives a relevant reminder (not a bare "Not quite"), keeps the heading and the found squares, and repeats do not count twice', async ({ page }) => {
    await guided(page, 'set-up-the-pieces', 5, 17) // "Click where the four knights belong."
    await expect(page.getByTestId('lesson-headline')).toContainText('four knights')
    await click(page, 'b1')
    await expect(page.getByTestId('found-count')).toHaveText('1 of 4 found')
    await click(page, 'b1')
    await click(page, 'b1')
    await expect(page.getByTestId('found-count')).toHaveText('1 of 4 found')
    await click(page, 'e4') // wrong
    await expect(page.getByTestId('lesson-prompt')).toHaveText('Knights start beside the rooks, on the back row.')
    await expect(page.getByTestId('lesson-headline')).toContainText('four knights') // heading kept alongside the feedback
    await expect(page.getByTestId('lesson-prompt')).not.toContainText('Not quite')
    await expect(page.getByTestId('found-count')).toHaveText('1 of 4 found') // found squares kept
    await page.waitForTimeout(1000)
    await click(page, 'g1')
    await expect(page.getByTestId('found-count')).toHaveText('2 of 4 found')
    await shot(page, 'guided-feedback-knights')
  })

  test('Back and Replay cannot inflate counts or erase assistance history', async ({ page }) => {
    await guided(page, 'set-up-the-pieces', 3, 17)
    await expect(page.getByTestId('found-count')).toHaveText('0 of 4 found')
    for (const sq of ['a1', 'h1']) await click(page, sq)
    await expect(page.getByTestId('found-count')).toHaveText('2 of 4 found')
    await page.getByTestId('lesson-replay').click()
    await page.getByTestId('lesson-replay').click()
    await expect(page.getByTestId('found-count')).toHaveText('2 of 4 found')
    await page.getByTestId('lesson-hint').click()
    await page.getByTestId('lesson-hint').click()
    for (const sq of ['a8', 'h8']) await click(page, sq)
    await expect(page.getByTestId('assist-note')).toHaveText('Completed with a hint')
    await page.getByTestId('lesson-back').click()
    await next(page).click()
    await expect(page.getByTestId('assist-earlier')).toContainText('completed with a hint')
    await expect(page.getByTestId('found-count')).toHaveText('0 of 4 found') // a fresh look, not an inflated one
  })
})

test.describe('7. Meet Your Pieces content', () => {
  test('rook wording, value chips, king kept apart, and the checkmate sentence', async ({ page }) => {
    await fakeSpeech(page)
    await page.goto('/chess/learn/basics/meet-the-pieces', { waitUntil: 'networkidle' })
    await page.getByTestId('lesson-start').click()
    const prompt = page.getByTestId('lesson-prompt')
    await next(page).click()
    await expect(prompt).toContainText('approximate')
    await expect(prompt).toContainText('You do not win by collecting points. The main goal is to checkmate the king.')
    const values = page.getByTestId('piece-values')
    for (const t of ['pawn', '≈ 1', 'knight', 'bishop', '≈ 3', 'rook', '≈ 5', 'queen', '≈ 9']) await expect(values).toContainText(t)
    await expect(values).toContainText('King: priceless')
    expect(await values.locator('li').count()).toBe(5) // five trading pieces; the king is separate
    await shot(page, 'meet-pieces-values')
    // the rook step (step 7): seed straight to it
    await seed(page, 'meet-the-pieces', 7, 15)
    await page.reload({ waitUntil: 'networkidle' })
    await page.getByTestId('lesson-continue').click()
    await expect(page.getByTestId('lesson-prompt')).toContainText('A rook looks like a tower with a castle-like top.')
    await expect(page.getByTestId('lesson-prompt')).not.toContainText('battlement')
  })
})

test.describe('8. Status messages', () => {
  test('no "Ready to continue"; speaking is unobtrusive (not a live region) and never blocks Next', async ({ page }) => {
    await fakeSpeech(page, 'hang')
    await page.goto('/chess/learn/basics/the-chessboard', { waitUntil: 'networkidle' })
    await page.getByTestId('lesson-start').click()
    await expect(page.getByText('Speaking…')).toBeVisible()
    await expect(page.getByText('Speaking…')).not.toHaveAttribute('aria-live', /.+/)
    await expect(page.getByText('Ready to continue')).toHaveCount(0)
    await expect(page.getByText('Your turn')).toHaveCount(0)
    await expect(next(page)).toHaveAttribute('aria-disabled', 'false')
    await next(page).click()
    await expect(page.getByTestId('lesson-step-counter')).toContainText('Step 2 of')
    // the board's own tray status is not announced on every change; only validation messages are live
    await seed(page, 'set-up-the-pieces', 15, 17)
    await page.goto('/chess/learn/basics/set-up-the-pieces', { waitUntil: 'networkidle' })
    await page.getByTestId('lesson-continue').click()
    await expect(page.getByTestId('setup-status')).not.toHaveAttribute('role', 'status')
    await expect(page.getByTestId('setup-progress')).not.toHaveAttribute('aria-live', /.+/)
  })
})

test.describe('9. Finish lesson and onward navigation', () => {
  const LESSONS = [
    { slug: 'the-chessboard', total: 21, practice: [5, 6, 8, 10, 12, 16, 17, 18, 19, 20], next: 'Meet Your Pieces', nextSlug: 'meet-the-pieces' },
    { slug: 'meet-the-pieces', total: 15, practice: [3, 5, 7, 9, 11, 13], next: 'Set Up the Board', nextSlug: 'set-up-the-pieces' },
    { slug: 'set-up-the-pieces', total: 17, practice: [2, 4, 6, 8, 10, 12, 14], next: 'How Pawns Move', nextSlug: 'pawns' },
    { slug: 'pawns', total: 18, practice: [1, 3, 5, 7, 8, 11, 13, 14, 15, 16], next: 'How Rooks Move', nextSlug: 'rooks' },
  ]
  for (const [li, L] of LESSONS.entries()) {
    test(`${L.slug}: Finish lesson during narration completes exactly once, cancels old speech, and onward navigation needs no second Start`, async ({ page }) => {
      await fakeSpeech(page, 'hang') // narration never ends: Finish must not wait for it
      const independent = Object.fromEntries(L.practice.map((i) => [i, 'independent']))
      const assisted = { ...independent, [L.practice[0]]: 'demo' }
      await seed(page, L.slug, L.total, L.total, li % 2 === 0 ? independent : assisted)
      await page.goto(`/chess/learn/basics/${L.slug}`, { waitUntil: 'networkidle' })
      await page.getByTestId('lesson-continue').click()
      await expect(page.getByTestId('lesson-step-counter')).toContainText(`Step ${L.total} of ${L.total}`)
      await expect(page.getByText('Speaking…')).toBeVisible() // narration is still going
      const before = await speech(page)
      await expect(next(page)).toHaveText(/Finish lesson/)
      await expect(next(page)).toHaveAttribute('aria-disabled', 'false')
      await next(page).dblclick() // a double click cannot complete the lesson twice
      const modal = page.getByTestId('lesson-complete-modal')
      await expect(modal).toBeVisible({ timeout: 8000 })
      expect(await page.getByTestId('lesson-complete-modal').count()).toBe(1)
      const after = await speech(page)
      expect(after.cancels).toBeGreaterThan(before.cancels) // the old narration was cancelled
      expect(after.active).toBe(1) // exactly the completion narration, nothing overlapping
      await page.waitForTimeout(600)
      expect((await speech(page)).spoken.filter((t) => /learned|met every|set up|pawns|board is set|You/.test(t) && t.includes('lesson') === false).length).toBeGreaterThan(0)
      // stored once, as completed
      const status = await page.evaluate((s) => JSON.parse(localStorage.getItem('nivenxa-chess-basics-progress') ?? '{}')[s]?.status, L.slug)
      expect(status).toBe('completed')
      // the recap says which it was
      const recap = await page.getByTestId('completion-assist-summary').innerText()
      if (li % 2 === 0) expect(recap).toMatch(/on your own/i)
      else expect(recap).toMatch(/help/i)
      // actions
      await expect(page.getByTestId('modal-next-lesson')).toHaveText(`Next lesson: ${L.next} →`)
      await expect(modal.getByRole('button', { name: 'Practice again' })).toBeVisible()
      await expect(modal.getByRole('link', { name: 'Back to Chess Basics' })).toBeVisible()
      await shot(page, `finish-${L.slug}`)
      // nothing navigated on its own
      expect(new URL(page.url()).pathname).toBe(`/chess/learn/basics/${L.slug}`)
      // onward: the next lesson starts at once
      await page.getByTestId('modal-next-lesson').click()
      await expect(page).toHaveURL(new RegExp(`/chess/learn/basics/${L.nextSlug}`))
      await expect(page.getByTestId('lesson-step-counter')).toContainText('Step 1 of')
      await expect(page.getByTestId('lesson-start')).toHaveCount(0)
    })
  }

  test('reload keeps the completed status (this browser only); Practice again resets exercise state but keeps the completed badge', async ({ page }) => {
    await fakeSpeech(page, 'normal')
    const L = LESSONS[1]
    await seed(page, L.slug, L.total, L.total, Object.fromEntries(L.practice.map((i) => [i, 'independent'])))
    await page.goto(`/chess/learn/basics/${L.slug}`, { waitUntil: 'networkidle' })
    await page.getByTestId('lesson-continue').click()
    await next(page).click()
    const modal = page.getByTestId('lesson-complete-modal')
    await expect(modal).toBeVisible({ timeout: 8000 })
    await modal.getByRole('button', { name: 'Practice again' }).click()
    await expect(page.getByTestId('lesson-step-counter')).toContainText('Step 1 of')
    const stored = await page.evaluate((s) => ({ progress: JSON.parse(localStorage.getItem('nivenxa-chess-basics-progress') ?? '{}')[s]?.status, results: JSON.parse(localStorage.getItem('nivenxa-chess-basics-results-v1') ?? '{}')[s] }), L.slug)
    expect(stored.progress === 'completed' || stored.progress === 'started').toBe(true)
    expect(stored.results).toBeUndefined() // exercise results cleared
    await page.reload({ waitUntil: 'networkidle' })
    const status = await page.evaluate((s) => JSON.parse(localStorage.getItem('nivenxa-chess-basics-progress') ?? '{}')[s]?.status, L.slug)
    expect(['completed', 'started']).toContain(status)
    await page.goto('/chess/learn/basics', { waitUntil: 'networkidle' })
    await expect(page.getByText(/lessons completed|Chess Basics complete/)).toBeVisible()
  })
})
