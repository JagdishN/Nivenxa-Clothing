import { test, expect, type Page } from '@playwright/test'
import { installScriptedEngine, type EngineOpts } from './helpers/scriptedEngine'

// Explanations are tied to their exact move and checked against the board before they are shown.
//   BASE_URL=http://localhost:3100 npx playwright test tests/chess-explanation-accuracy.spec.ts --workers=1
// The commentary endpoint is mocked to behave like the three reported failures (describing the previous move, admitting confusion,
// contradicting the board); the page must show a plain factual sentence for each, never the faulty text.

test.setTimeout(90000)
test.use({ viewport: { width: 1366, height: 768 } })

async function square(page: Page, sq: string) {
  const box = (await page.locator('cg-board').first().boundingBox())!
  const f = sq.charCodeAt(0) - 97
  const r = Number(sq[1]) - 1
  return { x: box.x + ((f + 0.5) * box.width) / 8, y: box.y + ((7 - r + 0.5) * box.height) / 8 }
}
async function click(page: Page, sq: string) {
  const p = await square(page, sq)
  await page.mouse.click(p.x, p.y)
}
async function start(page: Page, o: EngineOpts) {
  await page.addInitScript(() => { try { localStorage.setItem('nivenxa.chess.test.replyMinMs', '500'); localStorage.setItem('nivenxa.chess.coachIntro.v1', JSON.stringify(['00000000-0000-4000-8000-000000000a01','00000000-0000-4000-8000-000000000a02','00000000-0000-4000-8000-000000000a03'])) } catch {} })
  const h = await installScriptedEngine(page, o)
  await page.goto('/chess/play', { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: /^Beginner/ }).click()
  await page.getByRole('button', { name: 'White', exact: true }).click()
  await page.getByRole('button', { name: 'Start Game' }).click()
  await page.waitForSelector('cg-board')
  await expect(page.getByText('Loading engine…')).toHaveCount(0, { timeout: 40000 })
  return h
}
const you = (p: Page) => p.getByTestId('insight-you')
const reply = (p: Page) => p.getByTestId('insight-reply')

test('wrong or confused commentary is replaced by a plain factual sentence for the exact move', async ({ page }) => {
  await start(page, {
    explainText: {
      // the move is White's d4, but the text talks about Black's earlier ...e5 (reported with 16.dxe5)
      d4: { headline: 'd4 — Strong centre', explanation: "Black's ...e5 stakes a claim in the centre, so White answers it." },
      // exposes internal confusion (reported with 17.Bc3)
      e6: { explanation: 'The move list looks a bit jumbled, but this seems to be a pawn move.' },
      // contradicts the board: there is no pawn on e5 at this point
      a3: { explanation: 'The pawn on e5 is now under attack from the rook on the open file.' },
    },
  })
  await click(page, 'd2')
  await click(page, 'd4')
  await expect(you(page)).toHaveAttribute('data-state', 'ready', { timeout: 15000 })
  // A graded move whose text fails verification says so plainly. The factual description is shown SEPARATELY and does not pose as an explanation.
  await expect(page.getByTestId('insight-you-observation')).toHaveText('Explanation unavailable.')
  await expect(page.getByTestId('insight-you-move-fact')).toContainText("White's pawn moved from d2 to d4.")
  await expect(page.getByTestId('insight-you-grade')).toBeVisible()
  await expect(reply(page)).toHaveAttribute('data-state', 'ready', { timeout: 15000 })
  await expect(page.getByTestId('insight-reply-observation')).toHaveText("Black's pawn moved from e7 to e6.")
  await click(page, 'a2')
  await click(page, 'a3')
  await expect(you(page)).toHaveAttribute('data-move', 'a3', { timeout: 15000 })
  await expect(you(page)).toHaveAttribute('data-state', 'ready', { timeout: 15000 })
  await expect(page.getByTestId('insight-you-observation')).toHaveText('Explanation unavailable.')
  await expect(page.getByTestId('insight-you-move-fact')).toContainText("White's pawn moved from a2 to a3.")
  const text = await page.getByTestId('insight-panel').innerText()
  for (const bad of ['jumbled', "...e5", 'open file', 'pawn on e5']) expect(text).not.toContain(bad)
  // the engine grade is independent of the explanation: a grade label is still shown for your moves
  await expect(page.getByTestId('insight-you-grade')).toHaveText(/Best|Excellent|Good|Inaccuracy|Mistake|Blunder/)
})

test('correct commentary is kept; every request carries the canonical numbered history, side, move and both positions', async ({ page }) => {
  const h = await start(page, { explainText: { d4: { headline: 'd4 — Claims the centre', explanation: 'The pawn moves to d4 and controls e5 and c5.' } } })
  await click(page, 'd2')
  await click(page, 'd4')
  await expect(page.getByTestId('insight-you-observation')).toHaveText('Claims the centre', { timeout: 15000 })
  await expect(reply(page)).toHaveAttribute('data-move', 'e6', { timeout: 15000 })
  await click(page, 'a2')
  await click(page, 'a3')
  await expect(you(page)).toHaveAttribute('data-move', 'a3', { timeout: 15000 })
  await expect.poll(() => h.requests.some((r) => r.move === 'a3')).toBe(true)
  const a3 = h.requests.find((r) => r.move === 'a3')!.body as { ply: number; historySan: string[]; fenAfter: string; fen: string }
  expect(a3.ply).toBe(2)
  expect(a3.historySan).toEqual(['d4', 'e6']) // the game's own moves, in order, no gaps
  expect(a3.fenAfter.split(' ')[1]).toBe('b') // after White's move it is Black's turn
  expect(a3.fen.split(' ')[1]).toBe('w')
  const e6 = h.requests.find((r) => r.move === 'e6')!.body as { ply: number; historySan: string[] }
  expect(e6.ply).toBe(1)
  expect(e6.historySan).toEqual(['d4'])
})

test('graded blunder + enthusiastic text: the praise is rejected and the engine-verified downside is shown (13.hxg4-style)', async ({ page }) => {
  await start(page, {
    afterCp: 600, // every move is graded a blunder by the scripted analysis
    explainText: { 'Qxg6+': { headline: 'Qxg6+ — A nice piece won!', explanation: 'The queen takes the pawn with check, a nice piece won!' } },
  })
  await click(page, 'e2'); await click(page, 'e4') // 1.e4 f6
  await expect(reply(page)).toHaveAttribute('data-move', 'f6', { timeout: 15000 })
  await click(page, 'd1'); await click(page, 'h5') // 2.Qh5+ g6
  await expect(reply(page)).toHaveAttribute('data-move', 'g6', { timeout: 15000 })
  await click(page, 'h5'); await click(page, 'g6') // 3.Qxg6+ : ...hxg6 wins the queen
  await expect(you(page)).toHaveAttribute('data-move', 'Qxg6+', { timeout: 15000 })
  await expect(you(page)).toHaveAttribute('data-state', 'ready', { timeout: 15000 })
  await expect(page.getByTestId('insight-you-grade')).toHaveText(/Blunder/)
  await expect(page.getByTestId('insight-you-observation')).toHaveText("Black's pawn on h7 can capture your queen on g6 (hxg6). In the engine's best line (hxg6 d4) you end up 8 points of material behind.")
  expect(await page.getByTestId('insight-panel').innerText()).not.toContain('nice piece')
})

test('a graded move with no proven downside keeps its grade and says "Explanation unavailable" (no praise shown, and no commentary request is even made)', async ({ page }) => {
  const h = await start(page, { afterCp: 600, explainText: { b3: { headline: 'b3 — Making a home for the bishop', explanation: 'The pawn makes a nice home for the bishop.' } } })
  await click(page, 'b2'); await click(page, 'b3')
  await expect(you(page)).toHaveAttribute('data-state', 'ready', { timeout: 15000 })
  await expect(page.getByTestId('insight-you-grade')).toHaveText(/Blunder|Mistake|Inaccuracy/)
  await expect(page.getByTestId('insight-you-observation')).toHaveText('Explanation unavailable.')
  expect(await page.getByTestId('insight-panel').innerText()).not.toContain('home for the bishop')
  expect(h.requests.some((r) => r.move === 'b3')).toBe(false) // nothing checkable could come back, so the model is not asked
})

test('plain-language downside is the COLLAPSED summary (not hidden behind Why?); "Show reply on board" draws only on its own position', async ({ page }) => {
  await start(page, { afterCp: 600, explainText: { 'Qxg6+': { headline: 'Qxg6+ — A nice idea', explanation: 'The queen takes the pawn with check and Black replies hxg6 and wins the queen for a pawn.' } } })
  await click(page, 'e2'); await click(page, 'e4')
  await expect(reply(page)).toHaveAttribute('data-move', 'f6', { timeout: 15000 })
  await click(page, 'd1'); await click(page, 'h5')
  await expect(reply(page)).toHaveAttribute('data-move', 'g6', { timeout: 15000 })
  await click(page, 'h5'); await click(page, 'g6')
  await expect(you(page)).toHaveAttribute('data-state', 'ready', { timeout: 15000 })
  const summary = page.getByTestId('insight-you-observation')
  await expect(summary).toContainText("Black's pawn on h7 can capture your queen on g6 (hxg6)") // plain language beside the notation
  await expect(summary).toContainText('8 points of material behind') // the loss is in the summary itself
  await expect(summary).not.toContainText('nice idea')
  // the accepted model text is the inline "Why?" detail
  await page.getByRole('button', { name: 'Why?' }).first().click()
  await expect(page.getByTestId('insight-you-why')).toContainText('wins the queen for a pawn')
  // the engine reply can be drawn on the board for the position it belongs to
  const arrows = page.locator('cg-board svg.cg-shapes line, svg.cg-shapes line')
  expect(await arrows.count()).toBe(0)
  await page.getByTestId('insight-you-mark').click()
  await expect.poll(async () => arrows.count()).toBeGreaterThan(0)
  await expect(page.getByTestId('insight-you-mark')).toHaveText('Hide reply on board')
  // once the opponent has replied the board shows a DIFFERENT position: the arrow is gone and the card says it is about an earlier one
  await expect(reply(page)).toHaveAttribute('data-move', 'hxg6', { timeout: 15000 })
  await expect.poll(async () => arrows.count()).toBe(0)
  await expect(page.getByTestId('insight-you-historical')).toContainText('not the one on the board')
  await expect(page.getByTestId('insight-you-mark')).toHaveText('Show that position and reply')
  // explicit review of that position, with a clear way back to the live game
  await page.getByTestId('insight-you-mark').click()
  await expect(page.getByRole('button', { name: '← Back to moves' })).toBeVisible()
  await expect.poll(async () => arrows.count()).toBeGreaterThan(0)
  await page.getByRole('button', { name: '← Back to moves' }).click()
  await expect.poll(async () => arrows.count()).toBe(0)
})
