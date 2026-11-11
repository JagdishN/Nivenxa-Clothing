import { test } from 'node:test'
import assert from 'node:assert/strict'
import { Chess } from 'chess.js'
import { buildEvidence, buildMoveFacts, describeDownside, resolveExplanation, vetAgainstGrade, plainReply } from '../../src/lib/chess/moveFacts'
import type { Grade } from '../../src/lib/chess/moveFacts'

// Regression cases for commentary errors seen in review recordings.
// EXACT REPRODUCTIONS: none. The recordings (7.Be3, 9.Rb1, 9.Nc3, 25.Rc2, 27.b4 ...) and their games are not available, so every
// position below is a SUBSTITUTE of the same error type, not a reproduction of those games. Real captured sessions are kept as
// fixtures in tests/fixtures/review-evidence (see commentaryFixtures.test.ts).

function setup(fenBefore: string, san: string, grade: Grade, pvUci?: string[], bestSan?: string) {
  const g = new Chess(fenBefore)
  g.move(san)
  const facts = buildMoveFacts({ fenBefore, fenAfter: g.fen(), san, ply: 20 })!
  assert.ok(facts, 'the move replays from its own positions')
  const ev = buildEvidence(facts, { grade, pvUci, bestSan })
  return { facts, ev }
}
const resolve = (text: string, c: ReturnType<typeof setup>) => resolveExplanation([text], c.facts, c.ev)

// 3.Qxg6+ hxg6 then a quiet White move: the queen is lost for a pawn.
const QXG6 = 'rnbqkbnr/ppppp2p/5pp1/7Q/4P3/8/PPPP1PPP/RNB1KBNR w KQkq - 0 3'
const QXG6_PV = ['h7g6', 'd2d4']

test('a verified loss: queen for a pawn, in plain words, with the pieces named', () => {
  const c = setup(QXG6, 'Qxg6+', 'blunder', QXG6_PV)
  assert.equal(c.ev.netMaterial, -8)
  assert.deepEqual(c.ev.lostPieces, ['q'])
  assert.equal(plainReply(c.facts, c.ev), "Black's pawn on h7 can capture your queen on g6 (hxg6).")
  assert.match(describeDownside(c.facts, c.ev)!, /Black's pawn on h7 can capture your queen on g6 \(hxg6\)\. In the engine's best line \(hxg6 d4\) you end up 8 points of material behind\./)
  assert.deepEqual(c.ev.highlights, ['h7', 'g6'])
})

test('praise without the verified loss is rejected; the loss text is shown instead', () => {
  const c = setup(QXG6, 'Qxg6+', 'blunder', QXG6_PV)
  assert.equal(resolve('Great move! The queen takes the pawn with check, a nice piece won!', c).kind, 'evidence')
})

test('a text must name the reply, say something is lost AND name what is lost', () => {
  const c = setup(QXG6, 'Qxg6+', 'blunder', QXG6_PV)
  assert.equal(resolve('The queen takes the pawn with check, but Black replies hxg6 and wins the queen for a pawn.', c).kind, 'model')
  assert.equal(resolve('The queen gives check and gains space, and Black answers hxg6.', c).kind, 'evidence') // no loss, no piece named
  assert.equal(resolve('Black replies hxg6 and you lose material.', c).kind, 'evidence') // does not say WHAT is lost
  assert.equal(resolve('The queen takes the pawn with check and wins the queen for a pawn.', c).kind, 'evidence') // omits the reply
})

test('a capture that is recaptured is NOT a loss: a trade proves nothing, so the grade stays unexplained', () => {
  // 3.Nxe5 Nxe5 4.d4: a knight for a pawn then the pawn comes back: here the line ends level.
  const c = setup('r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3', 'Nxe5', 'mistake', ['c6e5', 'd2d4', 'e5g6', 'c1e3'])
  assert.ok((c.ev.netMaterial ?? 0) > -3)
  const down = describeDownside(c.facts, c.ev)
  // whatever the line proves, a text that merely says "Black takes the knight" without the net result is judged on the engine line
  if (down === null) assert.equal(resolve('Black can reply Nxe5, capturing your knight, so you lose a knight.', c).kind, 'unavailable')
})

test('a trade: capture, recapture, quiet move -> net zero -> nothing to explain', () => {
  // White takes a pawn, Black takes back: pawn for pawn
  const c = setup('4k3/8/3p4/4p3/3P4/8/8/4K3 w - - 0 9', 'dxe5', 'mistake', ['d6e5', 'e1d2'])
  assert.equal(c.ev.netMaterial, 0)
  assert.equal(describeDownside(c.facts, c.ev), null)
  assert.equal(resolve('Black can reply dxe5, capturing your pawn, so you lose a pawn.', c).kind, 'unavailable')
})

test('21.Qd7+ style: the queen CAN be captured, but the line recaptures: only the net result may be claimed', () => {
  // Qd7+ Qxd7 exd7+ Kxd7 Kd2: queens traded, the pawn ends up lost: one point down, NOT "the queen is lost".
  const c = setup('3qk3/8/4P3/3Q4/8/8/8/4K3 w - - 0 21', 'Qd7+', 'mistake', ['d8d7', 'e6d7', 'e8d7', 'e1d2'])
  assert.equal(c.ev.netMaterial, -1)
  assert.match(describeDownside(c.facts, c.ev)!, /a pawn \(1 point\) of material behind/)
  assert.equal(vetAgainstGrade('The queen is protected by the pawn, so the king cannot take it.', c.facts, c.ev).reason, 'claims-safe-but-capturable')
})

test('a single unanswered capture in the line is unsettled: no loss is claimed from it', () => {
  const c = setup(QXG6, 'Qxg6+', 'blunder', ['h7g6']) // the line stops on the capture: recaptures unknown
  assert.equal(c.ev.lineSettled, false)
  assert.equal(describeDownside(c.facts, c.ev), null)
  assert.equal(resolve('Black replies hxg6 and wins the queen.', c).kind, 'unavailable')
})

// ─── Substitutes for the latest recording: a developing move (9.Nc3 Mistake), a rook move (25.Rc2 Mistake), a pawn push (27.b4 Blunder).
// Their texts were positive ideas ("natural development", "sensible-looking", "chasing the queen and gaining space") with no loss. The
// reply they named was a legal capture/check/attack, which the previous rule treated as enough. A line that does not lose material now
// proves nothing.
test('substitute for 9.Nc3 / 25.Rc2 / 27.b4: idea-only text with a reply that only attacks or checks is "Explanation unavailable"', () => {
  const quiet = [
    setup('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 'Nc3', 'mistake', ['e7e5', 'g1f3', 'b8c6', 'f1c4']),
    setup('4k3/8/8/8/8/8/R7/4K3 w - - 0 25', 'Rc2', 'mistake', ['e8d7', 'e1d2']),
    setup('4k3/8/8/2q5/8/8/1P6/4K3 w - - 0 27', 'b4', 'blunder', ['c5c6', 'e1d2']),
  ]
  const ideas = [
    'The knight develops naturally to c3 and adds pressure on the centre. Black can reply e5, but White simply continues with Nf3.',
    'The rook slides to c2, a sensible-looking idea that prepares to double. Black can answer Kd7.',
    'The pawn pushes to b4, chasing the queen and gaining space. Black must answer Qc6.',
  ]
  quiet.forEach((c, i) => {
    assert.equal(describeDownside(c.facts, c.ev), null, `case ${i}`)
    const r = resolve(ideas[i], c)
    assert.equal(r.kind, 'unavailable', `case ${i}`)
    assert.match((r as { fact: string }).fact, /moved from/)
  })
})

test('the grade is kept and the move fact stays separate and factual', () => {
  const c = setup('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 'b3', 'mistake', ['e7e5', 'c1b2'])
  const r = resolve('The pawn makes a home for the bishop.', c)
  assert.equal(r.kind, 'unavailable')
  assert.equal((r as { fact: string }).fact, "White's pawn moved from b2 to b3.")
})

test('why earlier versions passed such texts: naming the reply was treated as "stating the downside"', () => {
  const c = setup('4k3/8/8/2q5/8/8/1P6/4K3 w - - 0 27', 'b4', 'blunder', ['c5c6', 'e1d2'])
  assert.equal(vetAgainstGrade("b4 chases the queen to c6 and gains space; Qc6 is Black's reply.", c.facts, c.ev).reason, 'weak-grade-without-verified-downside')
})

// ─── Other checks that must keep working ───
test('strong grade is never described as an error; confusion and wrong-side text are rejected', () => {
  const c = setup('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 'e4', 'best')
  assert.notEqual(resolve('This pawn move is a mistake that weakens the centre.', c).kind, 'model')
  assert.equal(resolve('The pawn takes space in the centre.', c).kind, 'model')
  assert.notEqual(resolve('The move list looks a bit jumbled, but the pawn moves.', c).kind, 'model')
  assert.notEqual(resolve("Black's knight arriving on e3 attacks the queen, so the pawn moves.", c).kind, 'model')
})

test('safety words: advice, negations and texts acknowledging the capture are not false claims; positive claims are', () => {
  const c = setup('3qk3/8/4P3/3Q4/8/8/8/4K3 w - - 0 21', 'Qd7+', 'blunder', ['d8d7', 'e6d7', 'e8d7', 'e1d2'])
  const ok = (t: string) => vetAgainstGrade(t, c.facts, c.ev).reason !== 'claims-safe-but-capturable'
  assert.equal(ok('The queen gives check, but Black can capture it with Qxd7. Always check that your queen is safe first.'), true)
  assert.equal(ok('A queen is not safe next to an enemy queen.'), true)
  assert.equal(ok('The queen on d7 is safe there.'), false)
  assert.equal(ok('The queen cannot be captured because the pawn protects it.'), false)
})

test('naming a different concrete move (an unverified tactic) rejects the text even when it also names the verified reply', () => {
  const c = setup(QXG6, 'Qxg6+', 'blunder', QXG6_PV)
  assert.equal(resolve('The queen takes the pawn, but Black replies hxg6, wins the queen and also has Rxe3 later.', c).kind, 'evidence')
})

test('an illegal or unrelated line never becomes evidence', () => {
  const c = setup(QXG6, 'Qxg6+', 'blunder', ['e2e4', 'd2d4'])
  assert.equal(c.ev.replySan, undefined)
  assert.equal(describeDownside(c.facts, c.ev), null)
})

test('a better move is shown only when allowed to be shown, and as a comparison', () => {
  const c = setup(QXG6, 'Qxg6+', 'blunder', QXG6_PV, 'Qxh7')
  assert.match(describeDownside(c.facts, c.ev)!, /The engine preferred Qxh7\.$/)
  const hidden = setup(QXG6, 'Qxg6+', 'blunder', QXG6_PV)
  assert.doesNotMatch(describeDownside(hidden.facts, hidden.ev)!, /preferred/)
})
