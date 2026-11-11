import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mistakeReason } from '../../src/lib/chess/mistakeReason'

test('names an unprotected piece the move left capturable', () => {
  const before = '4k3/8/8/3n4/8/8/8/2B1K3 w - - 0 1'
  const after = '4k3/8/8/3n4/5B2/8/8/4K3 b - - 1 1' // Bf4: attacked by the knight, nothing protects it
  assert.equal(mistakeReason(before, after), 'That leaves your bishop on f4 unprotected.')
})

test('a protected piece with an even trade is not a reason', () => {
  const before = '4k3/8/8/3n4/8/4P3/8/2B1K3 w - - 0 1'
  const after = '4k3/8/8/3n4/5B2/4P3/8/4K3 b - - 1 1' // Nxf4 exf4: even trade
  assert.equal(mistakeReason(before, after), null)
})

test('a cheaper piece able to take a valuable one is named, even if protected', () => {
  const before = '4k3/8/8/4p3/8/4P3/8/2B1K3 w - - 0 1'
  const after = '4k3/8/8/4p3/5B2/4P3/8/4K3 b - - 1 1' // exf4 wins a bishop for a pawn
  assert.equal(mistakeReason(before, after), 'That lets a pawn capture your bishop on f4.')
})

test('a problem that already existed before the move is not blamed on it', () => {
  const before = '4k3/8/8/3n4/5B2/8/8/4K3 w - - 0 1' // the bishop was already hanging
  const after = '4k3/8/8/3n4/5B2/8/4K3/8 b - - 1 1' // king step does not change that
  assert.equal(mistakeReason(before, after), null)
})

test('quiet positions give no specific reason (neutral wording is used instead)', () => {
  const start = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
  const after = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1'
  assert.equal(mistakeReason(start, after), null)
})

test('unreadable positions never throw and never invent a reason', () => {
  assert.equal(mistakeReason('nonsense', 'also nonsense'), null)
})
