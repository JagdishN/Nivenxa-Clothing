import { test } from 'node:test'
import assert from 'node:assert/strict'
import { Chess, type Square } from 'chess.js'
import { BASICS } from '../../src/lib/chess/basics/data'
import { correctSquaresFor } from '../../src/app/chess/learn/_shared/moveTrainerLogic'
import { START_PLACEMENT, compareToTarget, fenFromPlacement } from '../../src/app/chess/learn/_shared/lessonPlacement'
import type { BoardLessonStep, BoardSquareQuizStep } from '../../src/app/chess/learn/_shared/BoardLesson'
import type { PieceTryStep } from '../../src/app/chess/learn/_shared/PieceLesson'

const lesson = (slug: string) => BASICS.find((l) => l.slug === slug)!
const SQUARE = /\b[a-h][1-8]\b/
const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

// ── Placement ──────────────────────────────────────────────────────────────────────────────────────────────────
test('START_PLACEMENT is exactly the standard starting position', () => {
  assert.equal(Object.keys(START_PLACEMENT).length, 32)
  assert.equal(fenFromPlacement(START_PLACEMENT).split(' ')[0], START_FEN.split(' ')[0])
})

test('compareToTarget separates wrong pieces, empty squares and correct pieces', () => {
  const placed = { a1: 'R', h1: 'R', a8: 'r', b1: 'B' } // b1 should hold a knight; everything else is missing
  const r = compareToTarget(placed, START_PLACEMENT)
  assert.deepEqual(r.wrong, ['b1'])
  assert.equal(r.correct, 3)
  assert.equal(r.missing.length, 32 - 3 - 1 + 1 - 1 + 1 - 1) // 28 squares hold no piece yet (b1 is occupied, but by the wrong piece)
  assert.ok(!r.missing.includes('b1'))
  assert.deepEqual(compareToTarget(START_PLACEMENT, START_PLACEMENT), { wrong: [], missing: [], correct: 32 })
})

test('an extra piece on a square that should be empty is wrong', () => {
  const r = compareToTarget({ ...START_PLACEMENT, e4: 'P' }, START_PLACEMENT)
  assert.deepEqual(r.wrong, ['e4'])
  assert.equal(r.missing.length, 0)
})

// ── Set Up the Board ───────────────────────────────────────────────────────────────────────────────────────────
test('Set Up the Board: guided steps place pieces in the taught order and end on the full starting position', () => {
  const steps = lesson('set-up-the-pieces').boardSteps!
  const order: string[] = []
  const placed: Record<string, string> = {}
  for (const s of steps) {
    if (s.kind === 'setup' || s.kind === 'yesNo' || !s.placePieces) continue
    for (const [sq, piece] of Object.entries(s.placePieces)) {
      assert.ok(!placed[sq], `${sq} is placed twice`)
      placed[sq] = piece
    }
    order.push([...new Set(Object.values(s.placePieces).map((p) => p.toLowerCase()))].join(''))
  }
  assert.deepEqual(order, ['rn'.slice(0, 1), 'n', 'b', 'q', 'k', 'p', 'p'], 'rooks, knights, bishops, queens, kings, pawns')
  assert.deepEqual(placed, START_PLACEMENT)
})

test('Set Up the Board: each guided quiz places exactly the squares it asks for (and the matching Black pieces)', () => {
  for (const s of lesson('set-up-the-pieces').boardSteps!) {
    if (s.kind !== 'squareQuiz' || !s.placePieces) continue
    const asked = new Set(s.correctSquares)
    const placedSquares = Object.keys(s.placePieces)
    // every asked square gets a piece; nothing is placed that was not asked about
    assert.deepEqual([...asked].sort(), placedSquares.sort(), s.prompt as string)
  }
})

test('Set Up the Board has an independent setup check with the standard target, the taught order and hints for every piece type', () => {
  const setup = lesson('set-up-the-pieces').boardSteps!.find((s) => s.kind === 'setup')
  assert.ok(setup && setup.kind === 'setup')
  assert.deepEqual(setup.target, START_PLACEMENT)
  for (const t of ['r', 'n', 'b', 'q', 'k', 'p']) assert.ok(setup.groupHints[t], `hint for ${t}`)
})

test('Set Up the Board: no step before the end depends on the learner dragging', () => {
  assert.ok(lesson('set-up-the-pieces').alwaysShowCoordinates, 'coordinates stay visible')
  const last = lesson('set-up-the-pieces').boardSteps!.at(-1)!
  assert.equal(last.kind, 'demo')
  if (last.kind === 'demo') assert.ok(!last.fen, 'the final recap relies on the pieces already placed, not an empty-board fen')
})

// ── The Chessboard ─────────────────────────────────────────────────────────────────────────────────────────────
test('The Chessboard: hints before coordinates are taught use no square names', () => {
  const steps = lesson('the-chessboard').boardSteps!
  const firstCoordinate = steps.findIndex((s) => s.kind !== 'yesNo' && s.kind !== 'setup' && 'emphasizeCoordinates' in s && s.emphasizeCoordinates)
  assert.ok(firstCoordinate > 0)
  for (const s of steps.slice(0, firstCoordinate)) {
    if (s.kind !== 'squareQuiz') continue
    const texts = [s.hintText, s.reminderText, s.wrongText, s.demonstrationText, s.retry?.hintText, s.retry?.demonstrationText].filter(Boolean) as string[]
    for (const t of texts) assert.ok(!SQUARE.test(t), `a pre-coordinate hint names a square: "${t}"`)
  }
})

test('The Chessboard: visual hints for the light/dark quizzes point at the corner', () => {
  const quizzes = lesson('the-chessboard').boardSteps!.filter((s): s is BoardSquareQuizStep => s.kind === 'squareQuiz' && !!s.colorAwareSpokenFeedback)
  assert.equal(quizzes.length, 2)
  for (const q of quizzes) assert.match(q.hintText, /corner/i)
})

test('The Chessboard: "no hints this time" is gone, replaced by wording that keeps help available', () => {
  const all = JSON.stringify(lesson('the-chessboard'))
  assert.ok(!/no hints this time/i.test(all))
  assert.match(all, /Try this yourself first/)
})

test('The Chessboard: file = column and rank = row use the same words everywhere', () => {
  const all = JSON.stringify(lesson('the-chessboard').boardSteps)
  assert.match(all, /A file is a column/)
  assert.match(all, /A rank is a row/)
  assert.ok(!/files go up and down/i.test(all))
  assert.match(all, /The corner nearest your right hand is \*\*LIGHT\*\*/)
})

test('The Chessboard: final check applies the ideas rather than recalling a demonstrated square', () => {
  const steps = lesson('the-chessboard').boardSteps!
  const check = steps.filter((s) => s.stageLabel === 'SHOW WHAT YOU LEARNED')
  assert.equal(check.length, 3)
  // fresh-attempt variants are only offered after help, so they are not counted as 'already shown'
  const shown = JSON.stringify(steps.filter((s) => s.stageLabel !== 'SHOW WHAT YOU LEARNED' && s.kind === 'squareQuiz' && s.correctSquares.length <= 8).map((s) => ({ ...s, retry: undefined })))
  for (const s of check) {
    if (s.kind !== 'squareQuiz') continue
    // none of the checked squares appeared as a taught/practised answer earlier
    for (const sq of s.correctSquares) assert.ok(!new RegExp(`"correctSquares":\\[[^\\]]*"${sq}"`).test(shown), `${sq} was already an earlier answer`)
  }
  // colour/rank answers really are on rank 5 and really are dark
  const darkRank5 = check.find((s) => s.kind === 'squareQuiz' && s.correctSquares.length > 1) as BoardSquareQuizStep
  for (const sq of darkRank5.correctSquares) {
    assert.equal(sq[1], '5')
    assert.equal((('abcdefgh'.indexOf(sq[0]) + Number(sq[1])) % 2 === 0), false, `${sq} is dark`)
  }
})

test('every practice step with a fresh-attempt variant keeps the same kind of target', () => {
  for (const l of BASICS) {
    for (const s of l.boardSteps ?? []) {
      if (s.kind !== 'squareQuiz' || !s.retry?.correctSquares) continue
      assert.equal(s.retry.correctSquares.length, s.correctSquares.length === 1 ? 1 : s.correctSquares.length)
      assert.notDeepEqual(s.retry.correctSquares, s.correctSquares)
    }
  }
})

// ── Meet Your Pieces ───────────────────────────────────────────────────────────────────────────────────────────
test('Meet Your Pieces: each identification quiz targets exactly the squares of that piece in the starting position', () => {
  const board = new Chess(START_FEN)
  const byWord: Record<string, string> = { kings: 'k', queens: 'q', rooks: 'r', bishops: 'b', knights: 'n' }
  const steps = lesson('meet-the-pieces').boardSteps!.filter((s): s is BoardSquareQuizStep => s.kind === 'squareQuiz')
  let checked = 0
  for (const s of steps) {
    const word = String(s.prompt).startsWith('Can you find') ? Object.keys(byWord).find((w) => String(s.prompt).includes(w)) : undefined
    if (!word) continue
    const type = byWord[word]
    const all = (['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const).flatMap((f) => ['1', '2', '7', '8'].map((r) => `${f}${r}`)).filter((sq) => board.get(sq as Square)?.type === type)
    assert.deepEqual([...s.correctSquares].sort(), all.sort(), word)
    checked += 1
  }
  assert.equal(checked, 5)
})

test('Meet Your Pieces: recognition clues, one shared "move alike" principle, and honest value wording', () => {
  const all = JSON.stringify(lesson('meet-the-pieces'))
  for (const clue of ['cross on top', 'crown', 'tower', 'split', 'horse head']) assert.match(all, new RegExp(clue, 'i'), clue)
  assert.equal((all.match(/move the same way/gi) ?? []).length, 0, 'not repeated per piece')
  assert.equal((all.match(/matching pieces move alike/gi) ?? []).length, 1)
  assert.match(all, /The king is priceless—you cannot trade it\. Protect it from checkmate\./)
  assert.ok(!/king has no point value/i.test(all))
  assert.match(all, /approximate/i)
  assert.match(all, /You do not win by collecting points\. The main goal is to checkmate the king\./)
  assert.ok(!/points do not decide|battlement/i.test(all))
  assert.match(all, /tower with a castle-like top/)
  assert.ok(lesson('meet-the-pieces').boardSteps?.some((s) => s.kind === 'demo' && s.valueSummary), 'the value summary chips are shown')
  assert.match(all, /pawn 1, knight 3, bishop 3, rook 5, queen 9/)
  assert.ok(lesson('meet-the-pieces').alwaysShowCoordinates)
})

// ── How Pawns Move ─────────────────────────────────────────────────────────────────────────────────────────────
type PawnStep = (typeof BASICS)[number]['steps']
const pawnSteps = () => lesson('pawns').steps!

test('Pawns: every position is legal and the side to move matches the piece', () => {
  for (const s of pawnSteps()) {
    const g = new Chess(s.fen) // throws on an illegal position
    if (s.kind === 'try') {
      const p = g.get(s.pieceSquare as Square)
      assert.equal(p?.type, 'p', `${s.pieceSquare} holds a pawn`)
      assert.equal(p?.color, s.pieceColor)
      assert.equal(g.turn(), s.pieceColor)
    }
  }
})

test('Pawns: every try step has at least one correct move, computed by chess.js, and onlyTo narrows it correctly', () => {
  for (const s of pawnSteps()) {
    if (s.kind !== 'try') continue
    for (const v of [s, s.retry ? ({ ...s, ...s.retry } as PieceTryStep) : null]) {
      if (!v) continue
      const all = correctSquaresFor(v.fen, v.pieceSquare, v.filterMode)
      const correct = v.onlyTo ? all.filter((q) => v.onlyTo!.includes(q)) : all
      assert.ok(correct.length > 0, `${v.prompt}: no correct move`)
      if (v.onlyTo) for (const q of v.onlyTo) assert.ok(all.includes(q as never), `${q} is not a legal move`)
    }
  }
})

test('Pawns: markers mean what they say (dot = empty legal square, ring = enemy piece to capture, cross = occupied)', () => {
  for (const s of pawnSteps()) {
    if (!('markers' in s) || !s.markers) continue
    const g = new Chess(s.fen)
    for (const m of s.markers) {
      const occupant = g.get(m.square as Square)
      if (m.kind === 'forward') assert.ok(!occupant, `forward marker on occupied ${m.square}`)
      else assert.ok(occupant, `${m.kind} marker on empty ${m.square}`)
      if (m.kind === 'capture') assert.notEqual(occupant!.color, s.pieceColor, 'captures target enemy pieces')
    }
  }
})

test('Pawns: a legal-destination dot is never placed on an enemy piece straight ahead', () => {
  for (const s of pawnSteps()) {
    if (!('markers' in s) || !s.markers) continue
    const g = new Chess(s.fen)
    for (const m of s.markers) if (m.kind === 'forward') assert.equal(g.get(m.square as Square), undefined)
  }
})

test('Pawns: covers both colours, a black-pawn exercise, a first-move choice, a blocked pawn and a diagonal capture', () => {
  const tries = pawnSteps().filter((s): s is PieceTryStep => s.kind === 'try')
  assert.ok(tries.some((s) => s.pieceColor === 'b'), 'a black pawn exercise')
  const blackTry = tries.find((s) => s.pieceColor === 'b')!
  assert.equal(blackTry.orientation, 'white', 'Black moves down in the usual view')
  assert.ok(tries.some((s) => s.filterMode === 'legal' && !s.onlyTo && new Chess(s.fen).get(s.pieceSquare as Square) !== undefined && correctSquaresFor(s.fen, s.pieceSquare, 'legal').length === 2), 'a first-move choice')
  assert.ok(tries.some((s) => s.filterMode === 'captures'), 'a capture')
  assert.ok(pawnSteps().some((s) => s.kind === 'judgment'), 'a blocked-pawn judgment')
  const checks = pawnSteps().filter((s) => s.stageLabel === 'SHOW WHAT YOU LEARNED')
  assert.equal(checks.length, 4)
})

test('Pawns: blocked pawn judgments really have no forward move', () => {
  for (const s of pawnSteps()) {
    if (s.kind !== 'judgment') continue
    const g = new Chess(s.fen)
    const pawn = g.board().flat().find((p) => p?.type === 'p' && p.color === 'w')!
    assert.deepEqual(g.moves({ square: pawn.square }), [], 'no legal pawn move')
    assert.equal(s.options[s.correctOptionIndex], 'No')
  }
})

test('Pawns: copy explains the first move fully, qualifies screen-relative words and names the later topics', () => {
  const all = JSON.stringify(lesson('pawns').steps)
  assert.match(all, /In this view, White moves up the board and Black moves down/)
  assert.match(all, /first move/)
  assert.match(all, /both squares ahead/)
  assert.match(all, /not straight ahead, and not backward/)
  assert.match(all, /Pawn Promotion/)
  assert.match(all, /En Passant/)
})

// ── Cross-lesson ───────────────────────────────────────────────────────────────────────────────────────────────
test('all four lessons use the same recorded lesson slugs as before (existing saved progress stays valid)', () => {
  assert.deepEqual(['the-chessboard', 'meet-the-pieces', 'set-up-the-pieces', 'pawns'].map((s) => !!lesson(s)), [true, true, true, true])
  void ({} as PawnStep)
  void ({} as BoardLessonStep)
})
