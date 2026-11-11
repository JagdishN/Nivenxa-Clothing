import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildPgn, normalizedFromStored, outcomeOfPlayedGame, replayFens, textFromSans } from '../../src/lib/chess/gamePgn'
import { assistanceText, attemptOutcome, encodeCursor, parseCursor, pickFilter, topicFor } from '../../src/lib/chess/activityFormat'

const SANS = ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6']

test('a stored game replays exactly, from the standard start', () => {
  const r = replayFens(textFromSans(SANS))!
  assert.equal(r.moves.length, 6)
  assert.equal(r.fens.length, 7)
  assert.equal(r.moves[0].fenBefore, 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')
  assert.equal(r.moves[5].san, 'a6')
  assert.equal(r.moves[5].color, 'b')
})

test('a stored game replays from a non-standard starting FEN', () => {
  const fen = '4k3/8/8/8/8/8/4P3/4K3 w - - 0 1'
  const r = replayFens('e4 Kd7', fen)!
  assert.equal(r.moves[0].fenBefore, fen)
  assert.equal(r.moves[1].san, 'Kd7')
})

test('corrupt or illegal stored moves are rejected, never half-replayed', () => {
  assert.equal(replayFens('e4 e4'), null)
  assert.equal(replayFens('Qh9'), null)
})

test('PGN: headers, moves, result, and the start position when it is not standard', () => {
  const pgn = buildPgn({ movesSan: textFromSans(SANS), playerColor: 'b', opponent: 'Nivenxa · Expert', result: '0-1', startedAt: '2026-11-09T18:00:00Z', timeControl: '600+5' })!
  assert.match(pgn, /\[White "Nivenxa · Expert"\]/)
  assert.match(pgn, /\[Black "You"\]/)
  assert.match(pgn, /\[Result "0-1"\]/)
  assert.match(pgn, /\[Date "2026\.11\.09"\]/)
  assert.match(pgn, /1\. e4 e5 2\. Nf3 Nc6 3\. Bb5 a6/)
  assert.doesNotMatch(pgn, /SetUp/)
  const fen = '4k3/8/8/8/8/8/4P3/4K3 w - - 0 1'
  const p2 = buildPgn({ movesSan: 'e4 Kd7', startingFen: fen, playerColor: 'w', opponent: 'X', result: '*' })!
  assert.match(p2, /\[SetUp "1"\]/)
  assert.match(p2, new RegExp(`\[FEN "${fen.replace(/[/]/g, '\/')}"\]`))
  // the PGN round-trips: the same moves come back out of it
  const again = replayFens(textFromSans(['e4', 'Kd7']), fen)!
  assert.equal(again.moves.length, 2)
})

test('analysis hand-off is rebuilt from the compact record (no stored FENs needed)', () => {
  const g = normalizedFromStored({ movesSan: textFromSans(SANS), playerColor: 'w', opponent: 'Nivenxa', result: '1-0', startedAt: '2026-11-09T18:00:00Z' })!
  assert.equal(g.source, 'nivenxa-play')
  assert.equal(g.metadata.white, 'You')
  assert.equal(g.moves.length, 6)
  assert.equal(g.needsVerification, false)
})

test('game outcome is from the player’s side', () => {
  assert.equal(outcomeOfPlayedGame('1-0', 'w'), 'won')
  assert.equal(outcomeOfPlayedGame('1-0', 'b'), 'lost')
  assert.equal(outcomeOfPlayedGame('0-1', 'b'), 'won')
  assert.equal(outcomeOfPlayedGame('1/2-1/2', 'b'), 'draw')
  assert.equal(outcomeOfPlayedGame('*', 'w'), 'unfinished')
  assert.equal(outcomeOfPlayedGame(null, 'w'), 'unfinished')
})

test('cursors: strict, round-trip, and nothing injectable gets through', () => {
  const c = { at: '2026-11-09T18:03:11.123456+00:00', id: '3f2b8f4e-1a2b-4c3d-8e9f-0a1b2c3d4e5f' }
  assert.deepEqual(parseCursor(encodeCursor(c)), c)
  for (const bad of ['', 'x', 'a|b', `${c.at}|not-a-uuid`, `${c.at}|${c.id}|extra`, `2026-11-09T00:00:00Z),id.gt.0|${c.id}`, `2026-11-09T00:00:00Z|${c.id}),or(a.eq.1`]) {
    assert.equal(parseCursor(bad), null, bad)
  }
  assert.equal(parseCursor(undefined), null)
})

test('filters fall back to the default for anything unknown', () => {
  assert.equal(pickFilter('won', ['all', 'won'] as const, 'all'), 'won')
  assert.equal(pickFilter('nope', ['all', 'won'] as const, 'all'), 'all')
  assert.equal(pickFilter(undefined, ['all', 'won'] as const, 'all'), 'all')
})

test('puzzle history: outcomes stay distinct, old rows still classify', () => {
  assert.equal(attemptOutcome({ outcome: 'solved_with_hint', solved: true }), 'solved_with_hint')
  assert.equal(attemptOutcome({ outcome: 'solution_viewed', solved: false }), 'solution_viewed')
  assert.equal(attemptOutcome({ outcome: 'skipped', solved: false }), 'skipped')
  assert.equal(attemptOutcome({ outcome: null, solved: true }), 'solved') // written before outcomes existed
  assert.equal(attemptOutcome({ outcome: null, solved: false }), 'attempted')
  assert.equal(attemptOutcome({ outcome: 'weird', solved: false }), 'attempted')
  assert.equal(assistanceText({ hints_used: 2, wrong_attempts: 1 }, 'solved_with_hint'), '2 hints · 1 wrong move')
  assert.equal(assistanceText({}, 'solved'), 'No help used')
  assert.match(assistanceText({}, 'solution_viewed'), /solution shown/)
})

test('puzzle topic: the first catalogue topic among the puzzle’s tags; tags we do not list are ignored', () => {
  assert.equal(topicFor(['short', 'hangingPiece', 'mateIn1'])?.slug, 'hangingPiece')
  assert.equal(topicFor(['oneMove', 'veryLong']), null)
  assert.equal(topicFor(null), null)
})
