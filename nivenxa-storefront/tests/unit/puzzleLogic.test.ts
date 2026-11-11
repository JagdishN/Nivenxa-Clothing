// Run: npm run test:unit   (node:test via tsx — no network, no database)
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { Chess } from 'chess.js'
import {
  buildHints,
  classifyOutcome,
  explainSolution,
  explainWrongMove,
  forcedMate,
  judgeMove,
  mateAnatomy,
  mateLength,
  objectiveText,
  outcomeCountsAsSolved,
  parseUci,
  type UciMove,
  topicRelation,
} from '../../src/lib/chess/puzzleLogic'

// Fixtures copied from the live puzzles table (Lichess puzzle ids in the names).
const MATE1_TWO_MATES = { id: 'oM7y3', fen: 'r1b5/pp3Qkp/6p1/6Nq/2P2P2/8/6P1/6K1 b - - 1 39', moves: 'g7h6 f7h7', themes: ['mateIn1', 'mate'] }
const MATE1_UNDERPROMO = { id: '02NvQ', fen: '2krr3/1pp3p1/p4p2/5P2/5P1B/7P/PPQp2R1/1R1KqB2 w - - 3 30', moves: 'h4e1 d2e1q', themes: ['mateIn1', 'mate'] }
const MATE2_A = { id: 'FNs5l', fen: '3qrQ1k/1p1b2pp/1p4p1/4r3/2p1P3/2P3PP/P4RB1/5RK1 b - - 5 26', moves: 'e8f8 f2f8 d8f8 f1f8', themes: ['mateIn2', 'mate'] }
const MATE2_B = { id: '00JET', fen: '3r2k1/5ppp/3Rp3/8/8/8/1P3PPP/2R3K1 b - - 0 34', moves: 'd8d6 c1c8 d6d8 c8d8', themes: ['mateIn2', 'mate'] }
const SCHOLARS_MATE = 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4' // Qxf7# is the only mate

/** The position the solver faces: the FEN with the setup (first) move played, plus the stored solution after it. */
function load(p: { fen: string; moves: string }) {
  const moves = p.moves.split(' ').map(parseUci)
  const g = new Chess(p.fen)
  g.move({ from: moves[0].from, to: moves[0].to, promotion: moves[0].promotion ?? 'q' })
  return { start: g.fen(), solution: moves.slice(1) }
}

const mv = (from: string, to: string): UciMove => ({ from, to })

test('mateLength reads mateInN labels and ignores others', () => {
  assert.equal(mateLength(['fork', 'mateIn1']), 1)
  assert.equal(mateLength(['mateIn3']), 3)
  assert.equal(mateLength(['fork', 'pin']), null)
})

test('the fixtures are legal and end in checkmate', () => {
  for (const p of [MATE1_TWO_MATES, MATE1_UNDERPROMO, MATE2_A, MATE2_B]) {
    const g = new Chess(p.fen)
    for (const m of p.moves.split(' ').map(parseUci)) g.move({ from: m.from, to: m.to, promotion: m.promotion ?? 'q' })
    assert.ok(g.isCheckmate(), `${p.id} should end in mate`)
  }
})

test('judgeMove: the stored move is correct', () => {
  const { start, solution } = load(MATE1_TWO_MATES)
  assert.equal(judgeMove(start, solution[0], solution[0], 1).kind, 'correct')
})

test('judgeMove: a different move that also mates is accepted, not called wrong', () => {
  const { start, solution } = load(MATE1_TWO_MATES)
  const g = new Chess(start)
  const mating = g.moves({ verbose: true }).filter((m) => {
    const t = new Chess(start)
    t.move(m)
    return t.isCheckmate()
  })
  assert.ok(mating.length >= 2, 'fixture should have more than one mating move')
  const alternatives = mating.filter((m) => !(m.from === solution[0].from && m.to === solution[0].to))
  for (const alt of alternatives) {
    assert.equal(judgeMove(start, solution[0], mv(alt.from, alt.to), 1).kind, 'alternative', alt.san)
  }
})

test('judgeMove: every non-mating move is wrong in a mate-in-one', () => {
  const { start, solution } = load(MATE1_TWO_MATES)
  const g = new Chess(start)
  for (const m of g.moves({ verbose: true })) {
    const t = new Chess(start)
    t.move(m)
    if (t.isCheckmate()) continue
    assert.equal(judgeMove(start, solution[0], mv(m.from, m.to), 1).kind, 'wrong', m.san)
  }
})

test('judgeMove: a promotion puzzle matches on squares (the board auto-queens)', () => {
  const { start, solution } = load(MATE1_UNDERPROMO)
  assert.equal(judgeMove(start, solution[0], solution[0], 1).kind, 'correct')
})

test('judgeMove: an illegal move is illegal, not wrong', () => {
  const { start, solution } = load(MATE1_TWO_MATES)
  assert.equal(judgeMove(start, solution[0], mv('a1', 'a8'), 1).kind, 'illegal')
})

test('judgeMove: a non-mate puzzle (no mate length) only accepts the stored move', () => {
  const { start, solution } = load(MATE1_TWO_MATES)
  const g = new Chess(start)
  const other = g.moves({ verbose: true }).find((m) => !(m.from === solution[0].from && m.to === solution[0].to))!
  assert.equal(judgeMove(start, solution[0], mv(other.from, other.to), null).kind, 'wrong')
})

test('mate-in-two: the stored first move forces mate; a random other move does not', () => {
  for (const p of [MATE2_A, MATE2_B]) {
    const { start, solution } = load(p)
    const g = new Chess(start)
    g.move({ from: solution[0].from, to: solution[0].to, promotion: solution[0].promotion ?? 'q' })
    assert.ok(forcedMate(g.fen(), 1), `${p.id}: stored first move should force mate`)
  }
  const { start, solution } = load(MATE2_B)
  const g = new Chess(start)
  const notMate = g.moves({ verbose: true }).filter((m) => {
    const t = new Chess(start)
    t.move(m)
    return !forcedMate(t.fen(), 1)
  })
  assert.ok(notMate.length > 0)
  for (const m of notMate) assert.equal(judgeMove(start, solution[0], mv(m.from, m.to), 2).kind, 'wrong')
})

test('explainWrongMove: check-but-not-mate names a real defence', () => {
  // Scholar's mate position: Bxf7+ gives check but Black simply plays Ke7.
  const text = explainWrongMove(SCHOLARS_MATE, mv('c4', 'f7'), true)
  assert.match(text, /check, but it is not mate/i)
  const reply = /can reply (\S+)\./.exec(text)?.[1]
  assert.ok(reply, 'should name a reply')
  const g = new Chess(SCHOLARS_MATE)
  g.move({ from: 'c4', to: 'f7' })
  assert.ok(g.moves().includes(reply!), `${reply} must be a legal reply`)
})

test('explainWrongMove: a quiet move says it is not check', () => {
  assert.match(explainWrongMove(SCHOLARS_MATE, mv('a2', 'a3'), true), /does not give check/i)
})

test('buildHints: tiers escalate and only the last gives the move', () => {
  const { start, solution } = load(MATE1_TWO_MATES)
  const h = buildHints(start, solution[0], MATE1_TWO_MATES.themes)!
  assert.match(h.idea, /checkmate in one/i)
  assert.ok(!h.idea.includes(h.from) && !h.idea.includes(h.to))
  assert.ok(h.piece.includes(h.from) && !h.piece.includes(h.to))
  assert.ok(h.move.includes(h.from) && h.move.includes(h.to) && h.move.includes('#'))
})

test('buildHints: a non-mate capture is described as a capture, from the board', () => {
  // 1.e4 d5 — exd5 is a capture
  const fen = 'rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 2'
  const h = buildHints(fen, mv('e4', 'd5'), ['fork'])!
  assert.match(h.idea, /capture/i)
})

test('mateAnatomy: back-rank mate says why the king cannot move', () => {
  const g = new Chess('6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1')
  g.move('Ra8#')
  const text = mateAnatomy(g.fen()).join(' ')
  assert.match(text, /own pieces are in the way/i)
  assert.match(text, /rook on a8 gives check/i)
})

test('explainSolution: a mate-in-two lists every defence with the mating reply', () => {
  const { start, solution } = load(MATE2_B)
  const out = explainSolution(start, solution, MATE2_B.themes, 'Back-Rank Mates')
  assert.ok(out.defences.length >= 1)
  for (const d of out.defences) assert.match(d.mate, /#$/)
  assert.match(out.line, /#$/)
})

test('objectiveText names the side and the mate length', () => {
  assert.equal(objectiveText(['mateIn1'], 'mateIn1', 'w', 'Find the best move.'), 'White to move — checkmate in one move.')
  assert.equal(objectiveText(['mateIn2'], 'mateIn2', 'b', 'x'), 'Black to move — checkmate in 2 moves.')
  assert.equal(objectiveText(['fork'], 'fork', 'w', 'Find the fork.'), 'White to move — find the fork.')
})

test('outcome classification: a viewed solution is never an independent solve', () => {
  assert.equal(classifyOutcome({ solved: true, hintsUsed: 0, solutionViewed: false, skipped: false }), 'solved')
  assert.equal(classifyOutcome({ solved: true, hintsUsed: 2, solutionViewed: false, skipped: false }), 'solved_with_hint')
  assert.equal(classifyOutcome({ solved: true, hintsUsed: 0, solutionViewed: true, skipped: false }), 'solution_viewed')
  assert.equal(classifyOutcome({ solved: false, hintsUsed: 0, solutionViewed: false, skipped: true }), 'skipped')
  assert.equal(classifyOutcome({ solved: false, hintsUsed: 0, solutionViewed: false, skipped: false }), null)
  assert.equal(outcomeCountsAsSolved('solution_viewed'), false)
  assert.equal(outcomeCountsAsSolved('skipped'), false)
  assert.equal(outcomeCountsAsSolved('solved_with_hint'), true)
})

test('explainSolution: a fork names both targets, read from the board', () => {
  // White knight on d5 forks the king on e8 and the rook on a8 with Nc7+.
  const out = explainSolution('r3k3/8/8/3N4/8/8/8/4K3 w - - 0 1', [parseUci('d5c7')], ['fork'], 'Forks')
  const text = out.lines.join(' ')
  assert.match(text, /knight on c7 attacks the king on e8 and the rook on a8 at the same time/)
})

test('explainSolution: a non-fork tactic does not invent a fork', () => {
  const out = explainSolution('r3k3/8/8/3N4/8/8/8/4K3 w - - 0 1', [parseUci('d5c7')], ['pin'], 'Pins')
  assert.ok(!out.lines.join(' ').includes('at the same time'))
})

test('topicRelation explains a mate puzzle filed under another topic, and stays silent otherwise', () => {
  const t = topicRelation(['hangingPiece', 'mateIn1', 'short'], 'hangingPiece', 'Hanging Pieces')
  assert.match(t!, /Hanging Pieces and Mate in 1/)
  assert.match(t!, /goal is the checkmate/)
  assert.equal(topicRelation(['mateIn1', 'short'], 'mateIn1', 'Mate in 1'), null)
  assert.equal(topicRelation(['fork', 'short'], 'fork', 'Forks'), null)
})
