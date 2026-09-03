import { test, expect, type Page } from '@playwright/test'

const FILES = 'abcdefgh'

// Both tests use Intermediate + Rapid deliberately: Intermediate keeps Offer
// Draw visible (Beginner hides it entirely) with a weak-enough opponent that
// a fixed, opponent-independent move script stays safe; Rapid keeps
// explanationMode at 'post-game' rather than 'live' (see skillTiers.ts /
// resolveExplanationMode) so this doesn't fire real Claude explain-move API
// calls on every move — a repeatable test file shouldn't spend real money
// each run.

async function boardBox(page: Page) {
  return page.locator('.cg-wrap').first().boundingBox()
}
function squareXY(box: { x: number; y: number; width: number }, square: string) {
  const file = FILES.indexOf(square[0])
  const rank = parseInt(square[1], 10)
  const size = box.width / 8
  return { x: box.x + file * size + size / 2, y: box.y + (8 - rank) * size + size / 2 }
}
async function dragMove(page: Page, from: string, to: string) {
  const box = await boardBox(page)
  if (!box) throw new Error('board not found')
  const a = squareXY(box, from)
  const b = squareXY(box, to)
  await page.mouse.move(a.x, a.y)
  await page.mouse.down()
  await page.mouse.move(b.x, b.y, { steps: 6 })
  await page.mouse.up()
}

async function startGame(page: Page) {
  await page.goto('/chess/play', { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: /^Intermediate/ }).click()
  await page.getByRole('button', { name: 'White' }).click()
  await page.getByRole('button', { name: 'Rapid' }).click()
  await page.getByRole('button', { name: 'Start Game' }).click()
  await page.waitForSelector('.cg-wrap')
}

test.describe('Play — Resign gating and confirm flow', () => {
  test('Resign and Offer Draw start disabled; Resign enables after the first move; confirm/cancel both work', async ({ page }) => {
    await startGame(page)

    const resignBtn = page.getByRole('button', { name: 'Resign' })
    const offerDrawBtn = page.getByRole('button', { name: 'Offer Draw' })

    await expect(resignBtn).toBeDisabled()
    await expect(offerDrawBtn).toBeDisabled()

    await dragMove(page, 'e2', 'e4')
    await expect(resignBtn).toBeEnabled({ timeout: 5000 })
    await expect(offerDrawBtn).toBeDisabled() // one move played, nowhere near the 10-full-move floor

    // Open confirmation, cancel — game must still be running.
    await resignBtn.click()
    await expect(page.locator('[class*="confirmModalTitle"]')).toHaveText('Resign this game?')
    await expect(page.locator('[class*="confirmModalText"]')).toHaveText('The game will end and Nivenxa will win.')
    await page.getByRole('button', { name: 'Cancel' }).click()
    await expect(page.locator('[class*="confirmModal"]')).toHaveCount(0)
    await expect(page.locator('[class*="resultPanel"]')).toHaveCount(0)

    // Open again, confirm — game ends as a player loss. The result copy
    // renders twice (the persistent panel + the dismissible overlay), so
    // scope to the first match.
    await resignBtn.click()
    await page.getByRole('button', { name: 'Resign Game' }).click()
    await expect(page.locator('[class*="resultHeadline"]').first()).toHaveText('You resigned.')
    await expect(page.locator('[class*="resultSub"]').first()).toHaveText('Nivenxa wins.')
  })
})

test.describe('Play — Offer Draw move-count gating and decision', () => {
  test('Offer Draw stays disabled until 10 full moves, then resolves and (if declined) enters cooldown', async ({ page }) => {
    test.setTimeout(120000)

    // Which way Nivenxa actually decides (accept vs. decline) isn't forced
    // here — both outcomes are branched on below. The exact threshold math
    // for both is already covered deterministically in
    // draw-decision-logic.spec.ts; this test is about the UI wiring
    // (move-count gating, and cooldown after a decline).
    await startGame(page)

    const offerDrawBtn = page.getByRole('button', { name: 'Offer Draw' })

    // A fixed 10-move script for White that stays legal regardless of
    // Black's actual replies: each pawn push targets a square that starts
    // empty and is never a plausible early target for a weak opponent, and
    // both knight moves land on squares White itself already vacated.
    const whiteMoves: [string, string][] = [
      ['a2', 'a3'],
      ['a3', 'a4'],
      ['h2', 'h3'],
      ['h3', 'h4'],
      ['b2', 'b3'],
      ['b3', 'b4'],
      ['g2', 'g3'],
      ['g3', 'g4'],
      ['b1', 'a3'],
      ['g1', 'h3'],
    ]

    for (let i = 0; i < whiteMoves.length; i++) {
      const [from, to] = whiteMoves[i]
      await dragMove(page, from, to)
      // Intermediate's movetime is 800ms — give the engine's reply plus
      // render time a comfortable margin before the next move.
      await page.waitForTimeout(1800)
      if (i < whiteMoves.length - 1) {
        await expect(offerDrawBtn).toBeDisabled()
      }
    }

    // 10 full moves (20 plies) played by both sides — now available. If any
    // scripted move above had silently failed to register, fewer than 20
    // plies would have been played and this would correctly still fail.
    await expect(offerDrawBtn).toBeEnabled({ timeout: 5000 })

    await offerDrawBtn.click()
    // The banner shows "Draw offered…" the instant the offer is made, then
    // updates once Nivenxa's decision resolves (an artificial pause plus a
    // real Stockfish evaluation) — wait for one of the two terminal texts
    // rather than reading the transient pending state.
    const banner = page.locator('[class*="drawBanner"]')
    await expect(banner).toHaveText(/accepts the draw|keep playing/, { timeout: 20000 })
    const bannerText = await banner.textContent()

    if (bannerText?.includes('keep playing')) {
      // Declined — cooldown should now block another immediate offer.
      await expect(offerDrawBtn).toBeDisabled()
      await expect(offerDrawBtn).toHaveAttribute('title', 'You can offer again in a few moves.')
    } else {
      // Accepted — the game should end as a draw.
      await expect(page.locator('[class*="resultHeadline"]').first()).toHaveText('Draw.', { timeout: 5000 })
    }
  })
})
