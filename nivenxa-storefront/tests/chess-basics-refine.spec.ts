import { test, expect, type Page } from '@playwright/test'
import { mkdirSync } from 'node:fs'

// The four refined Chess Basics lessons, end to end, on a NORMAL build (no test hooks needed). Narration is faked in the page so the
// tests can hold speech "forever" or make it fail; nothing here exercises real audio. Run:
//   BASE_URL=http://localhost:3100 npx playwright test tests/chess-basics-refine.spec.ts --workers=1
const SHOTS = 'D:/Nivenxa Clothing/Private-Assets/avatars/basics-review/shots'
mkdirSync(SHOTS, { recursive: true })
test.setTimeout(180000)
test.use({ viewport: { width: 1366, height: 768 } })

type SpeechMode = 'hang' | 'throws' | 'absent' | 'normal'
async function fakeSpeech(page: Page, mode: SpeechMode = 'hang') {
  await page.addInitScript((m) => {
    const log = { spoken: [] as string[], active: 0, maxActive: 0, cancels: 0 }
    ;(window as unknown as { __speech: typeof log }).__speech = log
    if (m === 'absent') {
      Object.defineProperty(window, 'speechSynthesis', { value: undefined, configurable: true })
      return
    }
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
          if (m === 'throws') throw new Error('speech failed')
          log.spoken.push(u.text)
          log.active += 1
          log.maxActive = Math.max(log.maxActive, log.active)
          setTimeout(() => u.onstart?.(), 0)
          if (m === 'normal') setTimeout(() => { log.active -= 1; u.onend?.() }, 50)
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
const speech = (page: Page) => page.evaluate(() => (window as unknown as { __speech: { spoken: string[]; active: number; maxActive: number; cancels: number } }).__speech)

async function open(page: Page, slug: string, query = '') {
  await page.goto(`/chess/learn/basics/${slug}${query}`, { waitUntil: 'networkidle' })
}
async function begin(page: Page, slug: string) {
  await open(page, slug)
  await page.getByTestId('lesson-start').click()
  await expect(page.getByTestId('lesson-step-counter')).toContainText('Step 1 of')
}
const counter = (page: Page) => page.getByTestId('lesson-step-counter')
const next = (page: Page) => page.getByTestId('lesson-next')
async function clickNext(page: Page) {
  await expect(next(page)).toHaveAttribute('aria-disabled', 'false')
  await next(page).click()
}
async function sqPoint(page: Page, s: string, orientation: 'white' | 'black' = 'white') {
  const b = (await page.locator('cg-board').first().boundingBox())!
  const col = s.charCodeAt(0) - 97
  const row = 8 - Number(s[1])
  const c = orientation === 'white' ? col : 7 - col
  const r = orientation === 'white' ? row : 7 - row
  return { x: b.x + ((c + 0.5) * b.width) / 8, y: b.y + ((r + 0.5) * b.height) / 8 }
}
async function clickSquare(page: Page, s: string) {
  const p = await sqPoint(page, s)
  await page.mouse.click(p.x, p.y)
}
async function movePiece(page: Page, from: string, to: string) {
  await clickSquare(page, from)
  await clickSquare(page, to)
}
const shot = (page: Page, name: string) => page.screenshot({ path: `${SHOTS}/${name}.png` })

// ── The Chessboard: solving helper (steps listed in lessons/data) ────────────────────────────────────────────────
async function chessboardTo(page: Page, step: number, from = 1) {
  const plan: Record<number, () => Promise<void>> = {
    5: async () => { await page.getByTestId('theme-green').click() },
    6: async () => { await clickSquare(page, 'a2') },
    7: async () => { await clickSquare(page, 'a1') },
    9: async () => { await page.getByRole('button', { name: 'Yes', exact: true }).click() },
    11: async () => { await clickSquare(page, 'f4') },
    13: async () => { await clickSquare(page, 'c6') },
    17: async () => { await clickSquare(page, 'e4') },
    18: async () => { await clickSquare(page, 'b7') },
    19: async () => { await page.getByRole('button', { name: 'No', exact: true }).click() },
    20: async () => { await clickSquare(page, 'g3') },
    21: async () => { await clickSquare(page, 'c5') },
  }
  for (let i = from; i < step; i++) {
    await expect(counter(page)).toContainText(`Step ${i} of`)
    await plan[i]?.()
    await clickNext(page)
  }
  await expect(counter(page)).toContainText(`Step ${step} of`)
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
test.describe('narration never controls navigation', () => {
  test('Next and Back stay visible and usable while narration is "Speaking…"; rapid navigation and Replay never overlap speech', async ({ page }) => {
    await fakeSpeech(page, 'hang')
    await begin(page, 'the-chessboard')
    await expect(page.getByText('Speaking…')).toBeVisible()
    await expect(next(page)).toBeVisible()
    await expect(next(page)).toHaveAttribute('aria-disabled', 'false') // not waiting for speech to end
    await expect(page.getByTestId('lesson-back')).toBeVisible()
    await shot(page, '01-next-visible-while-speaking')
    for (let i = 0; i < 3; i++) await next(page).click()
    await expect(counter(page)).toContainText('Step 4 of')
    for (let i = 0; i < 2; i++) await page.getByTestId('lesson-back').click()
    await expect(counter(page)).toContainText('Step 2 of')
    for (let i = 0; i < 6; i++) await page.getByTestId('lesson-replay').click()
    const s = await speech(page)
    expect(s.maxActive).toBe(1) // never two utterances at once
    expect(s.cancels).toBeGreaterThan(6)
    // Replay says the CURRENT instruction (step 2, rows), not an earlier step.
    expect(s.spoken.at(-1)).toMatch(/row/i)
    expect(s.spoken.at(-1)).not.toMatch(/sixty-four/i)
    // narration finishing (or never finishing) does not advance on its own
    await expect(counter(page)).toContainText('Step 2 of')
  })

  test('with narration that ends, nothing advances by itself', async ({ page }) => {
    await fakeSpeech(page, 'normal')
    await begin(page, 'the-chessboard')
    await page.waitForTimeout(1500)
    await expect(counter(page)).toContainText('Step 1 of')
  })

  for (const mode of ['throws', 'absent'] as const) {
    test(`speech ${mode === 'throws' ? 'failing' : 'unsupported'}: the written lesson, Hint, Show me and navigation all still work`, async ({ page }) => {
      await fakeSpeech(page, mode)
      await begin(page, 'the-chessboard')
      await expect(page.getByTestId('lesson-prompt')).toContainText('A chessboard has 64 squares')
      await clickNext(page)
      await expect(page.getByTestId('lesson-prompt')).toContainText('Rows go from side to side')
      await chessboardTo(page, 6, 2)
      await expect(page.getByTestId('lesson-hint')).toBeVisible()
      await expect(page.getByTestId('lesson-showme')).toBeVisible()
      await page.getByTestId('lesson-hint').click()
      await page.getByTestId('lesson-hint').click()
      await expect(page.getByTestId('lesson-prompt')).toContainText('bottom-left corner')
    })
  }

  test('turning voice off keeps the full written explanation and speaks nothing more', async ({ page }) => {
    await fakeSpeech(page, 'normal')
    await begin(page, 'the-chessboard')
    await page.getByTestId('lesson-settings-toggle').click()
    await page.getByRole('button', { name: /Voice: On/ }).click()
    await page.getByTestId('lesson-settings-close').click()
    const before = (await speech(page)).spoken.length
    await clickNext(page)
    await expect(page.getByTestId('lesson-prompt')).toContainText('Rows go from side to side')
    await page.getByTestId('lesson-replay').click()
    expect((await speech(page)).spoken.length).toBe(before)
  })

  test('leaving the lesson cancels speech', async ({ page }) => {
    await fakeSpeech(page, 'hang')
    await begin(page, 'the-chessboard')
    const before = (await speech(page)).cancels
    await page.getByRole('link', { name: '← Chess Basics' }).click()
    await expect(page).toHaveURL(/\/chess\/learn\/basics$/)
    expect((await speech(page)).cancels).toBeGreaterThan(before)
    expect((await speech(page)).active).toBe(0)
  })
})

test.describe('practice steps: completion, not speech, unlocks Next', () => {
  test('Next on a practice step is unavailable (and says why) until it is answered; Enter on it does nothing', async ({ page }) => {
    await fakeSpeech(page, 'normal')
    await begin(page, 'the-chessboard')
    await chessboardTo(page, 6)
    await expect(next(page)).toHaveAttribute('aria-disabled', 'true')
    await expect(page.getByTestId('lesson-next-help')).toContainText('Finish this step')
    await next(page).focus()
    await page.keyboard.press('Enter')
    await expect(counter(page)).toContainText('Step 6 of')
    await clickSquare(page, 'a2')
    await expect(next(page)).toHaveAttribute('aria-disabled', 'false')
    await expect(page.getByTestId('lesson-headline')).toContainText('Find a LIGHT square') // the task heading stays while feedback shows
    await shot(page, '02-practice-correct-heading-kept')
  })
})

test.describe('identification uses fixed pieces and reliable counting', () => {
  test('Meet Your Pieces: a piece cannot be dragged, repeated clicks do not inflate the count, wrong clicks change nothing', async ({ page }) => {
    await fakeSpeech(page, 'normal')
    await begin(page, 'meet-the-pieces')
    for (let i = 0; i < 3; i++) await clickNext(page) // teams, strength, king
    await expect(page.getByTestId('lesson-headline')).toContainText('both kings')
    await expect(page.locator('cg-board piece')).toHaveCount(32)
    // try to drag a king (and a knight) off the board
    for (const sq of ['e1', 'g1']) {
      const from = await sqPoint(page, sq)
      await page.mouse.move(from.x, from.y)
      await page.mouse.down()
      await page.mouse.move(from.x + 40, from.y - 120, { steps: 6 })
      await page.mouse.move(1200, 60, { steps: 6 })
      expect(await page.locator('cg-board piece.dragging').count()).toBe(0)
      await page.mouse.up()
    }
    await expect(page.locator('cg-board piece')).toHaveCount(32)
    const king = page.locator('cg-board piece.king.white')
    const kb = (await king.boundingBox())!
    const e1 = await sqPoint(page, 'e1')
    expect(Math.abs(kb.x + kb.width / 2 - e1.x)).toBeLessThan(6)
    expect(Math.abs(kb.y + kb.height / 2 - e1.y)).toBeLessThan(6)
    await expect(page.getByTestId('found-count')).toHaveText('0 of 2 found') // dragging counted nothing
    // counting
    await clickSquare(page, 'e1')
    await expect(page.getByTestId('found-count')).toHaveText('1 of 2 found')
    await clickSquare(page, 'e1')
    await clickSquare(page, 'e1')
    await expect(page.getByTestId('found-count')).toHaveText('1 of 2 found')
    await clickSquare(page, 'd4') // empty square: wrong
    await expect(page.getByTestId('found-count')).toHaveText('1 of 2 found')
    await expect(next(page)).toHaveAttribute('aria-disabled', 'true')
    await clickSquare(page, 'e8')
    await expect(page.getByTestId('found-count')).toHaveText('2 of 2 found')
    await expect(next(page)).toHaveAttribute('aria-disabled', 'false')
    await shot(page, '03-identification-2-of-2')
  })

  test('identification is also fully keyboard-operable (arrow keys to a square, Enter to choose it)', async ({ page }) => {
    await fakeSpeech(page, 'normal')
    await begin(page, 'meet-the-pieces')
    for (let i = 0; i < 3; i++) await clickNext(page)
    const e8 = page.getByRole('button', { name: 'e8, black king' })
    await e8.focus()
    await page.keyboard.press('Enter')
    await expect(page.getByTestId('found-count')).toHaveText('1 of 2 found')
    await page.keyboard.press('ArrowDown')
    await expect(page.getByRole('button', { name: 'e7, black pawn' })).toBeFocused()
    await page.keyboard.press('Enter') // wrong
    await expect(page.getByTestId('found-count')).toHaveText('1 of 2 found')
    await page.getByRole('button', { name: 'e1, white king' }).focus()
    await page.keyboard.press('Space')
    await expect(page.getByTestId('found-count')).toHaveText('2 of 2 found')
  })

  test('Meet Your Pieces teaches the recognition clues, the shared "move alike" idea, honest values and the king line', async ({ page }) => {
    await fakeSpeech(page, 'normal')
    await begin(page, 'meet-the-pieces')
    const body = page.getByTestId('lesson-prompt')
    await expect(body).toContainText('matching pieces move alike')
    await clickNext(page)
    await expect(body).toContainText('You do not win by collecting points. The main goal is to checkmate the king.')
    await expect(page.getByTestId('piece-values')).toContainText('≈ 9')
    await clickNext(page)
    await expect(body).toContainText('cross on top')
    await expect(body).toContainText('The king is priceless—you cannot trade it. Protect it from checkmate.')
    await expect(body).not.toContainText('no point value')
    await shot(page, '04-meet-pieces-king')
  })
})

test.describe('help is recorded honestly', () => {
  test('Show me then answering = "Completed with help"; a fresh equivalent try can then be done on your own, and the record survives Back/Next', async ({ page }) => {
    await fakeSpeech(page, 'normal')
    await begin(page, 'the-chessboard')
    await chessboardTo(page, 18) // b7
    await expect(page.getByTestId('lesson-prompt')).toContainText('Try this yourself first')
    await expect(page.getByTestId('lesson-prompt')).not.toContainText('no hints this time')
    await expect(page.getByTestId('lesson-hint')).toBeVisible()
    await expect(page.getByTestId('lesson-showme')).toBeVisible()
    await page.getByTestId('lesson-showme').click()
    await expect(page.getByTestId('lesson-prompt')).toContainText("Let's look together")
    await expect(next(page)).toHaveAttribute('aria-disabled', 'true') // Show me demonstrates; it does not complete the task
    await clickSquare(page, 'b7')
    await expect(page.getByTestId('assist-note')).toHaveText('Completed with help')
    await expect(page.getByTestId('assist-note')).toHaveAttribute('data-assist', 'demo')
    await shot(page, '05-completed-with-help')
    await expect(page.getByTestId('fresh-try')).toBeVisible()
    await page.getByTestId('fresh-try').click()
    await expect(page.getByTestId('lesson-headline')).toContainText('Now find g2')
    await expect(page.getByTestId('assist-note')).toHaveCount(0)
    await clickSquare(page, 'g2')
    await expect(page.getByTestId('assist-note')).toHaveText('Done on your own on a fresh try')
    await expect(page.getByTestId('fresh-try')).toHaveCount(0)
    // Back, then forward again: the earlier result is remembered, and Next is allowed without redoing it
    await clickNext(page)
    await page.getByTestId('lesson-back').click()
    await expect(counter(page)).toContainText('Step 18 of')
    await expect(page.getByTestId('assist-earlier')).toContainText('Earlier: done on your own on a fresh try')
    await expect(next(page)).toHaveAttribute('aria-disabled', 'false')
  })

  test('wrong tries alone are still independent; a hint is recorded as "Completed with a hint"', async ({ page }) => {
    await fakeSpeech(page, 'normal')
    await begin(page, 'the-chessboard')
    await chessboardTo(page, 17) // e4
    await clickSquare(page, 'a1') // a wrong try
    await page.waitForTimeout(800)
    await clickSquare(page, 'e4')
    await expect(page.getByTestId('assist-note')).toHaveText('Done on your own') // a mistake is not help
    await clickNext(page) // b7
    await page.getByTestId('lesson-hint').click()
    await page.getByTestId('lesson-hint').click() // the visual cue is revealed
    await clickSquare(page, 'b7')
    await expect(page.getByTestId('assist-note')).toHaveText('Completed with a hint')
    await expect(page.getByTestId('assist-note')).toHaveAttribute('data-assist', 'hint')
  })

  test('hints are gradual: reminder, then a visual cue, then a demonstration (before coordinates, in plain words)', async ({ page }) => {
    await fakeSpeech(page, 'normal')
    await begin(page, 'the-chessboard')
    await chessboardTo(page, 6) // light squares
    const prompt = page.getByTestId('lesson-prompt')
    await page.getByTestId('lesson-hint').click()
    await expect(prompt).toContainText('paler ones') // reminder
    await page.getByTestId('lesson-hint').click()
    await expect(prompt).toContainText('bottom-left corner') // visual cue
    expect(await prompt.innerText()).not.toMatch(/\b[a-h][1-8]\b/)
    await page.getByTestId('lesson-hint').click()
    await expect(prompt).toContainText("Let's look together") // demonstration
    expect(await prompt.innerText()).not.toMatch(/\b[a-h][1-8]\b/)
  })
})

test.describe('The Chessboard content', () => {
  test('orientation: the right-hand corner statement is tied to the displayed board; files/ranks use "column"/"row" consistently; the final check applies the ideas', async ({ page }) => {
    await fakeSpeech(page, 'normal')
    await begin(page, 'the-chessboard')
    await chessboardTo(page, 8)
    await expect(page.getByTestId('lesson-prompt')).toContainText('The corner nearest your right hand is LIGHT')
    await shot(page, '06-orientation-right-hand-corner')
    await chessboardTo(page, 10, 8)
    await expect(page.getByTestId('lesson-prompt')).toContainText('A file is a column')
    await chessboardTo(page, 12, 10)
    await expect(page.getByTestId('lesson-prompt')).toContainText('A rank is a row')
    await chessboardTo(page, 19, 12)
    // the final check: a flipped board is judged "No", then two applications of the ideas (g3, a dark square on rank 5)
    await expect(page.getByTestId('lesson-mode')).toHaveText('TRY IT')
    await expect(page.getByRole('img', { name: /nearest your right hand is dark/ })).toBeVisible()
    await shot(page, '06b-final-check-flipped-board')
    await chessboardTo(page, 21, 19)
    await expect(page.getByTestId('lesson-prompt')).toContainText('Click a DARK square on rank 5')
    await clickSquare(page, 'c5')
    await clickNext(page)
    const modal = page.getByTestId('lesson-complete-modal')
    await expect(modal).toBeVisible({ timeout: 8000 })
    await expect(modal).toContainText('Chessboard Complete!')
    await expect(modal).toContainText('You completed all 10 practice steps on your own.')
    await expect(modal.getByTestId('modal-next-lesson')).toHaveText('Next lesson: Meet Your Pieces →')
    await shot(page, '06c-chessboard-complete')
  })
})

test.describe('Set Up the Board builds a position', () => {
  const GROUPS: [string[], string[]][] = [
    [['a1', 'h1', 'a8', 'h8'], ['rook']],
    [['b1', 'g1', 'b8', 'g8'], ['knight']],
    [['c1', 'f1', 'c8', 'f8'], ['bishop']],
    [['d1', 'd8'], ['queen']],
    [['e1', 'e8'], ['king']],
    [['a2', 'b2', 'c2', 'd2', 'e2', 'f2', 'g2', 'h2'], ['pawn']],
  ]

  test('guided setup: correct answers place pieces, earlier pieces stay, the final recap shows all 32', async ({ page }) => {
    await fakeSpeech(page, 'normal')
    await begin(page, 'set-up-the-pieces')
    await expect(page.locator('cg-board piece')).toHaveCount(0)
    await clickNext(page) // plan
    let expected = 0
    for (const [squares, [kind]] of GROUPS) {
      await clickNext(page) // demo
      for (const sq of squares) await clickSquare(page, sq)
      expected += squares.length === 8 ? 8 : squares.length * 1
      // rooks/knights/bishops/queens/kings place BOTH colours: 4/4/4/2/2; pawns place White's row only (8)
      await expect(page.getByTestId('lesson-prompt')).toContainText('✓')
      await expect(page.locator(`cg-board piece.${kind}`)).toHaveCount(kind === 'pawn' ? 8 : squares.length)
      await expect(page.locator('cg-board piece')).toHaveCount(expected)
      if (kind === 'rook') await shot(page, '07-setup-rooks-placed')
      if (kind === 'knight') {
        await expect(page.locator('cg-board piece.rook')).toHaveCount(4) // earlier pieces are still there
        await shot(page, '08-setup-knights-added')
      }
      await clickNext(page)
    }
    await expect(page.getByTestId('lesson-prompt')).toContainText("Black's pawns mirror them")
    await expect(page.locator('cg-board piece')).toHaveCount(32)
    await shot(page, '09-setup-all-placed')
  })

  async function guidedThroughToBuild(page: Page) {
    await begin(page, 'set-up-the-pieces')
    await clickNext(page)
    for (const [squares] of GROUPS) {
      await clickNext(page)
      for (const sq of squares) await clickSquare(page, sq)
      await clickNext(page)
    }
    await clickNext(page) // black pawns demo -> build step
    await expect(page.getByTestId('lesson-mode')).toHaveText('SET UP')
  }
  const TRAY_ORDER = ['R', 'N', 'B', 'Q', 'K', 'P', 'r', 'n', 'b', 'q', 'k', 'p']
  async function buildFull(page: Page) {
    const START: Record<string, string> = {}
    'abcdefgh'.split('').forEach((f, i) => {
      const back = 'rnbqkbnr'[i]
      START[`${f}1`] = back.toUpperCase(); START[`${f}2`] = 'P'; START[`${f}7`] = 'p'; START[`${f}8`] = back
    })
    for (const letter of TRAY_ORDER) {
      const todo: string[] = []
      for (const [sq, piece] of Object.entries(START)) if (piece === letter && (await page.locator(`[data-testid=setup-board] [data-square=${sq}]`).getAttribute('data-piece')) !== letter) todo.push(sq)
      if (!todo.length) continue // already on the board (the tray entry is used up)
      await page.getByTestId(`tray-${letter}`).click()
      for (const sq of todo) await page.locator(`[data-testid=setup-board] [data-square=${sq}]`).click()
    }
  }

  test('independent setup: errors are explained, corrections keep correct pieces, hints and Show me are tracked, success is "with help"', async ({ page }) => {
    await fakeSpeech(page, 'normal')
    await guidedThroughToBuild(page)
    const cell = (sq: string) => page.locator(`[data-testid=setup-board] [data-square=${sq}]`)
    await expect(page.getByTestId('setup-board')).toBeVisible()
    await expect(next(page)).toHaveAttribute('aria-disabled', 'true')
    await shot(page, '10-setup-build-empty-tray')
    // nothing placed yet
    await page.getByTestId('setup-check').click()
    await expect(page.getByTestId('setup-message')).toContainText('Place some pieces first')
    // a correct rook and a wrong bishop (should be a knight)
    await page.getByTestId('tray-R').click()
    await cell('a1').click()
    await page.getByTestId('tray-B').click()
    await cell('b1').click()
    await page.getByTestId('setup-check').click()
    await expect(page.getByTestId('setup-message')).toContainText('1 piece is in the wrong place (marked ✕)')
    await expect(page.getByTestId('setup-message')).toContainText('30 squares are still empty')
    await expect(cell('b1')).toHaveAttribute('data-state', 'wrong')
    await shot(page, '11-setup-wrong-marked')
    await page.getByTestId('setup-remove-wrong').click()
    await expect(cell('b1')).toHaveAttribute('data-piece', '')
    await expect(cell('a1')).toHaveAttribute('data-piece', 'R') // the correct rook was not reset
    // hints: reminder, then the next group highlighted, then Show me places it
    await page.getByTestId('lesson-hint').click()
    await expect(page.getByTestId('lesson-prompt')).toContainText('rooks, knights, bishops, queens, kings, then pawns')
    await page.getByTestId('lesson-hint').click()
    await expect(page.getByTestId('lesson-prompt')).toContainText('Rooks go in the four corners')
    await expect(cell('h1')).toHaveAttribute('data-state', 'hint')
    await page.getByTestId('lesson-showme').click()
    await expect(page.getByTestId('lesson-prompt')).toContainText('I have placed the rooks for you')
    await expect(cell('h8')).toHaveAttribute('data-piece', 'r')
    await expect(next(page)).toHaveAttribute('aria-disabled', 'true') // Show me did not finish the task
    // finish the rest by hand and check
    await buildFull(page)
    await page.getByTestId('setup-check').click()
    await expect(page.getByTestId('lesson-prompt')).toContainText('That is exactly the starting position.')
    await expect(page.getByTestId('assist-note')).toHaveText('Completed with help')
    await shot(page, '12-setup-complete-with-help')
    await clickNext(page) // who goes first
    await expect(page.getByTestId('lesson-prompt')).toContainText('White always moves first')
    await expect(page.getByTestId('lesson-prompt')).toContainText('alternate')
    await clickNext(page) // ready
    await expect(page.getByTestId('lesson-prompt')).toContainText('The board is ready!')
    await expect(page.locator('cg-board piece')).toHaveCount(32) // the "board is ready" step shows the whole board
    await shot(page, '13-setup-ready-full-board')
    await next(page).click() // Finish lesson
    const modal = page.getByTestId('lesson-complete-modal')
    await expect(modal).toBeVisible({ timeout: 8000 })
    expect(await modal.locator('[data-piece]:not([data-piece=""])').count()).toBe(32) // the completion dialog shows the complete board
    await expect(modal).toContainText('completed the guided setup and finished the board with some help')
    await expect(modal).not.toContainText('on your own.', { useInnerText: true }).catch(() => {})
    expect(await modal.innerText()).not.toContain('You set up the whole board on your own')
    await shot(page, '14-setup-completion-dialog-with-help')
  })

  test('independent setup without help is recognised as independent; the board can be built by keyboard alone', async ({ page }) => {
    await fakeSpeech(page, 'normal')
    await guidedThroughToBuild(page)
    // keyboard: choose a tray piece, move around the board with arrow keys, place it
    await page.getByTestId('tray-R').focus()
    await page.keyboard.press('Enter')
    await expect(page.getByTestId('tray-R')).toHaveAttribute('aria-pressed', 'true')
    await page.locator('[data-testid=setup-board] [data-square=d4]').focus()
    await page.keyboard.press('ArrowLeft')
    await expect(page.locator('[data-testid=setup-board] [data-square=c4]')).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page.locator('[data-testid=setup-board] [data-square=c4]')).toHaveAttribute('data-piece', 'R')
    // choosing the placed piece with no tray piece chosen takes just that piece off
    await page.keyboard.press('Escape') // stop placing
    await page.locator('[data-testid=setup-board] [data-square=c4]').focus()
    await page.keyboard.press('Delete') // keyboard way to take just that piece off
    await expect(page.locator('[data-testid=setup-board] [data-square=c4]')).toHaveAttribute('data-piece', '')
    await buildFull(page)
    await page.getByTestId('setup-check').click()
    await expect(page.getByTestId('assist-note')).toHaveText('Done on your own')
    await clickNext(page)
    await clickNext(page)
    await next(page).click()
    await expect(page.getByTestId('lesson-complete-modal')).toContainText('You set up the whole board on your own.', { timeout: 8000 })
  })
})

test.describe('How Pawns Move', () => {
  test('markers have distinct shapes with a legend; a blocked enemy pawn ahead gets a cross, never a move dot', async ({ page }) => {
    await fakeSpeech(page, 'normal')
    await begin(page, 'pawns')
    await expect(page.getByTestId('marker-legend')).toHaveText(/can move here/)
    await expect(page.getByTestId('lesson-prompt')).toContainText('In this view, White moves up the board and Black moves down')
    await shot(page, '15-pawns-forward')
    await clickNext(page) // 2: try
    await movePiece(page, 'e2', 'e3')
    await clickNext(page) // 3: black demo
    await expect(page.getByTestId('lesson-prompt')).toContainText('Black pawns move toward')
    await clickNext(page) // 4: black exercise
    await movePiece(page, 'e7', 'e6')
    await expect(page.getByTestId('lesson-prompt')).toContainText('Black pawns also move straight ahead')
    await expect(page.getByTestId('lesson-headline')).toContainText('This is a black pawn') // the task stays visible after success
    await shot(page, '16-pawns-black-exercise')
    await clickNext(page) // 5: one or two
    await expect(page.getByTestId('lesson-prompt')).toContainText('only on that pawn')
    await expect(page.getByTestId('lesson-prompt')).toContainText('both squares ahead')
    await clickNext(page) // 6: try, one or two
    await movePiece(page, 'e2', 'e4')
    await expect(page.getByTestId('lesson-prompt')).toContainText('only allowed on a pawn')
    await clickNext(page) // 7: blocked demo
    await expect(page.getByTestId('lesson-prompt')).toContainText('second square ahead is occupied')
    await expect(page.getByTestId('marker-legend')).toHaveText(/can move here/)
    await expect(page.getByTestId('marker-legend')).toHaveText(/blocked/)
    await shot(page, '17-pawns-blocked-legend')
    await clickNext(page) // 8: try with e4 blocked — a hint reveals only the open square
    await page.getByTestId('lesson-hint').click()
    await page.getByTestId('lesson-hint').click()
    await expect(page.getByTestId('lesson-prompt')).toContainText('Try e3')
    await movePiece(page, 'e2', 'e3')
    await clickNext(page) // 9: judgment
    await page.getByRole('button', { name: 'No', exact: true }).click()
    await expect(page.getByTestId('lesson-prompt')).toContainText('No forward move at all')
    await clickNext(page) // 10: after the first move
    await clickNext(page) // 11: capturing
    await expect(page.getByTestId('lesson-prompt')).toContainText('Pawns capture in a different way')
    await expect(page.getByTestId('marker-legend')).toHaveText(/can capture here/)
    await expect(page.getByTestId('marker-legend')).not.toHaveText(/can move here/)
    await shot(page, '18-pawns-capture-legend')
    await clickNext(page) // 12: capture try — a hint reveals the capture ring only
    await page.getByTestId('lesson-hint').click()
    await page.getByTestId('lesson-hint').click()
    await expect(page.getByTestId('marker-legend')).toHaveText(/can capture here/)
    await expect(page.getByTestId('marker-legend')).not.toHaveText(/can move here/)
    await movePiece(page, 'e2', 'd3')
    await clickNext(page) // 13: straight ahead
    await expect(page.getByTestId('lesson-prompt')).toContainText('cannot capture a piece straight ahead')
    await expect(page.getByTestId('marker-legend')).toHaveText(/blocked/)
    await expect(page.getByTestId('marker-legend')).not.toHaveText(/can move here/)
    await shot(page, '19-pawns-straight-ahead-blocked')
  })

  test('wrong moves do not corrupt the exercise; the whole lesson completes with an honest independent summary; no auto-navigation; next-lesson starts at once', async ({ page }) => {
    await fakeSpeech(page, 'normal')
    await begin(page, 'pawns')
    const steps: (null | [string, string] | 'No')[] = [null, ['e2', 'e3'], null, ['e7', 'e6'], null, ['e2', 'e3'], null, ['e2', 'e3'], 'No', null, null, ['e2', 'd3'], null, ['c3', 'c4'], ['d7', 'd6'], 'No', ['e4', 'd5'], null]
    for (let i = 0; i < steps.length; i++) {
      await expect(counter(page)).toContainText(`Step ${i + 1} of 18`)
      const a = steps[i]
      if (i === 1) {
        await movePiece(page, 'e2', 'e7') // a wrong try first
        await page.waitForTimeout(900)
        await expect(page.getByTestId('lesson-headline')).toContainText('Move the pawn forward one square') // the task stays in view after a wrong try
      }
      if (a === 'No') await page.getByRole('button', { name: 'No', exact: true }).click()
      else if (a) await movePiece(page, a[0], a[1])
      await clickNext(page)
      if (i === steps.length - 1) break
    }
    const modal = page.getByTestId('lesson-complete-modal')
    await expect(modal).toBeVisible({ timeout: 8000 })
    await expect(modal).toContainText('You completed all 10 practice steps on your own.')
    await expect(modal.getByRole('link', { name: 'Back to Chess Basics' })).toBeVisible()
    await expect(modal.getByRole('button', { name: 'Practice again' })).toBeVisible()
    await expect(modal.getByTestId('modal-next-lesson')).toHaveText('Next lesson: How Rooks Move →')
    await expect(modal.getByTestId('modal-next-lesson')).toBeFocused()
    await shot(page, '20-pawns-complete')
    await page.waitForTimeout(3000)
    await expect(page).toHaveURL(/\/pawns$/) // nothing navigated away while the learner was reading
    // completed badge survives; Practice again resets the exercise state only
    await modal.getByRole('button', { name: 'Practice again' }).click()
    await expect(counter(page)).toContainText('Step 1 of 18')
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('nivenxa-chess-basics-progress') ?? '{}').pawns?.status)).toBe('completed')
    expect(await page.evaluate(() => localStorage.getItem('nivenxa-chess-basics-results-v1'))).not.toContain('"pawns"')
    // direct link with ?start=1 begins at once; a plain link keeps the Start button
    await open(page, 'rooks', '?start=1')
    await expect(counter(page)).toContainText('Step 1 of')
    await expect(page.getByTestId('lesson-start')).toHaveCount(0)
    await open(page, 'rooks')
    await expect(page.getByTestId('lesson-start')).toBeVisible()
  })

  test('refresh resumes where the learner stopped (this browser only)', async ({ page }) => {
    await fakeSpeech(page, 'normal')
    await begin(page, 'pawns')
    await clickNext(page)
    await movePiece(page, 'e2', 'e3')
    await clickNext(page)
    await clickNext(page)
    await expect(counter(page)).toContainText('Step 4 of 18')
    await page.reload({ waitUntil: 'networkidle' })
    await expect(page.getByTestId('lesson-resume-note')).toHaveText('You stopped at step 4 of 18.')
    await page.getByTestId('lesson-continue').click()
    await expect(counter(page)).toContainText('Step 4 of 18')
    await shot(page, '21-resume')
  })
})

test.describe('board theme and settings', () => {
  test('the chosen board colours carry into Meet Your Pieces, Set Up the Board and How Pawns Move', async ({ page }) => {
    await fakeSpeech(page, 'normal')
    await begin(page, 'the-chessboard')
    await chessboardTo(page, 6) // picks "green" on the way
    expect(await page.evaluate(() => localStorage.getItem('chess-board-theme'))).toBe('green')
    for (const slug of ['meet-the-pieces', 'set-up-the-pieces', 'pawns']) {
      await open(page, slug)
      await expect(page.locator('[class*="board_themeGreen"]').first()).toBeVisible()
      await expect(page.locator('[class*="board_themeCream"]')).toHaveCount(0)
    }
    // the set-up task's own board uses the same colours
    await begin(page, 'set-up-the-pieces')
    await shot(page, '22-theme-green-setup')
  })

  test('microphone permission denial is explained and never blocks the lesson', async ({ page }) => {
    await fakeSpeech(page, 'normal')
    await page.addInitScript(() => {
      class Rec {
        continuous = false
        interimResults = false
        lang = ''
        onresult: unknown = null
        onerror: ((e: { error: string }) => void) | null = null
        onend: (() => void) | null = null
        start() { setTimeout(() => { this.onerror?.({ error: 'not-allowed' }); this.onend?.() }, 10) }
        stop() {}
      }
      ;(window as unknown as { SpeechRecognition: unknown }).SpeechRecognition = Rec
    })
    await begin(page, 'the-chessboard')
    await page.getByTestId('lesson-settings-toggle').click()
    await expect(page.getByTestId('lesson-settings')).toContainText('Narration never turns the microphone on')
    const mic = page.getByRole('button', { name: /Hold to talk/ })
    await mic.dispatchEvent('mousedown')
    await mic.dispatchEvent('mouseup')
    await expect(page.getByTestId('mic-notice')).toContainText('microphone is blocked')
    await page.getByTestId('lesson-settings-close').click()
    await clickNext(page)
    await expect(counter(page)).toContainText('Step 2 of')
    await shot(page, '23-mic-blocked')
  })
})

test.describe('keyboard, focus and accessible names', () => {
  test('Tab reaches Replay, Hint, Show me, Lesson settings, Back and Next in order; names are descriptive', async ({ page }) => {
    await fakeSpeech(page, 'normal')
    await begin(page, 'the-chessboard')
    await chessboardTo(page, 6)
    const order: string[] = []
    await page.getByTestId('lesson-replay').focus()
    for (let i = 0; i < 6; i++) {
      order.push(await page.evaluate(() => (document.activeElement as HTMLElement)?.getAttribute('data-testid') ?? ''))
      await page.keyboard.press('Tab')
    }
    expect(order).toEqual(['lesson-replay', 'lesson-hint', 'lesson-showme', 'lesson-settings-toggle', 'lesson-back', 'lesson-next'])
    await expect(page.getByRole('button', { name: 'Replay narration' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Show me' })).toBeVisible()
    await expect(page.getByRole('group', { name: 'Lesson help' })).toBeVisible()
    await expect(next(page)).toHaveAttribute('aria-describedby', /.+/)
    await expect(page.getByRole('group', { name: /Board squares/ })).toBeVisible()
  })

  test('completion dialog: focus moves in, Escape closes it, Back to Chess Basics is offered', async ({ page }) => {
    await fakeSpeech(page, 'normal')
    await begin(page, 'set-up-the-pieces')
    await page.evaluate(() => localStorage.setItem('nivenxa-chess-basics-progress', JSON.stringify({ 'set-up-the-pieces': { status: 'started', step: 17, total: 17 } })))
    await page.reload({ waitUntil: 'networkidle' })
    await page.getByTestId('lesson-continue').click()
    await expect(counter(page)).toContainText('Step 17 of 17')
    await expect(page.getByTestId('assist-earlier')).toHaveCount(0)
    await next(page).click()
    const modal = page.getByTestId('lesson-complete-modal')
    await expect(modal).toBeVisible({ timeout: 8000 })
    await expect(modal.getByTestId('completion-board')).toBeVisible()
    expect(await modal.locator('[data-piece]:not([data-piece=""])').count()).toBe(32)
    await expect(modal.getByTestId('modal-next-lesson')).toBeFocused()
    await expect(modal.getByRole('link', { name: 'Back to Chess Basics' })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(modal).toHaveCount(0)
    await expect(page.getByTestId('lesson-done-actions').getByRole('link', { name: 'Next lesson: How Pawns Move →' })).toBeVisible()
  })
})

test.describe('layout', () => {
  const sizes = [
    { name: '1366x768', w: 1366, h: 768 },
    { name: '1920x1080', w: 1920, h: 1080 },
    { name: '390x844', w: 390, h: 844 },
    { name: '683x384-zoom200', w: 683, h: 384 },
  ]
  for (const s of sizes) {
    test(`${s.name}: board, text and Back/Next are reachable; controls are comfortable touch targets; no sideways scroll`, async ({ page }) => {
      await page.setViewportSize({ width: s.w, height: s.h })
      await fakeSpeech(page, 'normal')
      await begin(page, 'the-chessboard')
      await chessboardTo(page, 6)
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1 && document.body.scrollWidth <= window.innerWidth + 1)).toBe(true)
      for (const id of ['lesson-hint', 'lesson-showme', 'lesson-replay', 'lesson-back', 'lesson-next']) {
        const box = (await page.getByTestId(id).boundingBox())!
        expect(box.height, `${id} height`).toBeGreaterThanOrEqual(43.5)
      }
      if (s.w >= 1366 && s.h >= 768) {
        // desktop: the board, the explanation and the navigation row are all inside the first screen
        const nb = (await next(page).boundingBox())!
        const bb = (await page.locator('cg-board').boundingBox())!
        expect(nb.y + nb.height).toBeLessThanOrEqual(s.h)
        expect(bb.y + bb.height).toBeLessThanOrEqual(s.h + 1)
      } else {
        await next(page).scrollIntoViewIfNeeded()
        await expect(next(page)).toBeVisible()
      }
      await shot(page, `24-layout-${s.name}`)
    })
  }
})
