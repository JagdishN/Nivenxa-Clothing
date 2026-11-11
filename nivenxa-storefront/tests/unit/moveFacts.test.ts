import { test } from 'node:test'
import assert from 'node:assert/strict'
import { Chess } from 'chess.js'
import { buildMoveFacts, describeFacts, factsForPrompt, vetExplanation, vetFields } from '../../src/lib/chess/moveFacts'

// Plays `sans` and returns the facts for the LAST one, exactly as the game would record it.
function factsAfter(sans: string[]) {
  const g = new Chess()
  let before = g.fen()
  for (const s of sans) {
    before = g.fen()
    g.move(s)
  }
  return buildMoveFacts({ fenBefore: before, fenAfter: g.fen(), san: sans.at(-1)!, ply: sans.length - 1, historySan: sans.slice(0, -1) })!
}

test('facts: side, number, notation, piece, capture and canonical numbered history', () => {
  const f = factsAfter(['d4', 'e5', 'dxe5'])
  assert.equal(f.color, 'w')
  assert.equal(f.notation, '2.dxe5')
  assert.equal(f.captured, 'p')
  assert.equal(f.recent, '1.d4 e5')
  assert.equal(describeFacts(f), "White's pawn on d4 captured Black's pawn on e5.")
  const b = factsAfter(['e4', 'e5', 'Nf3', 'Nc6'])
  assert.equal(b.notation, '2...Nc6')
  assert.equal(b.recent, '1.e4 e5 2.Nf3')
  assert.match(factsForPrompt(b), /Move to explain: 2\.\.\.Nc6 — played by Black/)
})

test('a move that is not legal or does not lead to the stated position gives no facts', () => {
  const g = new Chess()
  const before = g.fen()
  g.move('e4')
  assert.equal(buildMoveFacts({ fenBefore: before, fenAfter: g.fen(), san: 'd4' }), null) // different move
  assert.equal(buildMoveFacts({ fenBefore: before, fenAfter: before, san: 'e4' }), null) // wrong "after"
  assert.equal(buildMoveFacts({ fenBefore: 'nonsense', fenAfter: 'nonsense', san: 'e4' }), null)
})

test('reported error 1: explaining White\'s capture by talking about Black\'s earlier ...e5 is rejected', () => {
  const f = factsAfter(['d4', 'e5', 'dxe5'])
  assert.equal(vetExplanation("Black's ...e5 challenged the centre, and now the position is open.", f).ok, false)
  assert.equal(vetExplanation('Black pushed 1...e5 to grab space.', f).ok, false)
  assert.equal(vetExplanation('White captures the pawn on e5 and wins a pawn.', f).ok, true)
  // a capture explained without mentioning the capture is rejected too
  assert.equal(vetExplanation('This develops the position nicely.', f).reason, 'omits-capture')
})

test('reported error 2: internal confusion is never shown', () => {
  const f = factsAfter(['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Bc3'.replace('Bc3', 'Ba4')])
  for (const t of ['The move list looks a bit jumbled, so I am not sure.', 'This does not match the position.', 'The move seems invalid.', "I can't tell what happened."]) {
    assert.equal(vetExplanation(t, f).reason, 'confusion', t)
  }
  assert.equal(vetExplanation('The bishop retreats and keeps the pin option alive.', f).ok, true)
})

test('reported error 3: "open file" is rejected while a pawn is still on the file', () => {
  // white pawn on e4 stays on the e-file; Black's rook goes to e8
  const f = factsAfter(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'd3', 'Be7', 'O-O', 'O-O', 'Nc3', 'd6', 'a3', 'Re8'])
  assert.equal(f.piece, 'r')
  assert.equal(vetExplanation('The rook moves to the open file.', f).reason, 'open-e-file-has-pawns')
  assert.equal(vetExplanation('Rook to the open e-file puts pressure on e4.', f).ok, false)
  assert.equal(vetExplanation('The rook goes to e8 and lines up behind the e-pawn.', f).ok, true)
  // genuinely open file passes
  const g = factsAfter(['e4', 'd5', 'exd5', 'Qxd5', 'Nc3', 'Qa5', 'd4', 'Nf6', 'Nf3', 'c6', 'Bd2', 'Bf5', 'Bc4', 'e6', 'O-O', 'Bd6', 'Re1'])
  assert.equal(vetExplanation('White puts a rook on the open e-file.', g).ok, false) // e6 pawn is still on it
})

test('piece-on-square claims must be true, check claims must be true', () => {
  const f = factsAfter(['e4', 'e5', 'Nf3'])
  assert.equal(vetExplanation('The knight on f3 attacks the pawn on e5.', f).ok, true)
  assert.equal(vetExplanation('The bishop on f3 attacks e5.', f).reason, 'no-bishop-on-f3')
  assert.equal(vetExplanation('This gives check to the king.', f).reason, 'claims-check')
  const chk = factsAfter(['e4', 'f6', 'Qh5'])
  assert.equal(vetExplanation('The queen gives check along the diagonal.', chk).ok, true)
})

test('vetFields: checks each field and the whole', () => {
  const f = factsAfter(['d4', 'e5', 'dxe5'])
  assert.equal(vetFields(['dxe5 — Wins a pawn', 'White takes the pawn on e5.', null], f).ok, true)
  assert.equal(vetFields(['dxe5 — Wins a pawn', 'It echoes Black\'s 1...e5.'], f).ok, false)
  assert.equal(vetFields([], f).reason, 'empty')
})

import { isCheckmatePosition, MATE_CP } from '../../src/lib/chess/engineEval'
test('a position where the side to move is checkmated is recognised (the move that delivered it is never graded as a loss)', () => {
  assert.equal(isCheckmatePosition('rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3'), true) // fool's mate
  assert.equal(isCheckmatePosition('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'), false)
  assert.equal(MATE_CP, 100000)
})
