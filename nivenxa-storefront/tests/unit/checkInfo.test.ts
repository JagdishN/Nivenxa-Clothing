import { test } from 'node:test'
import assert from 'node:assert/strict'
import { checkInfoFor, describeCheck, describeReplies } from '../../src/lib/chess/checkInfo'

// White king e1, black bishop b4 checks along the diagonal b4-c3-d2-e1.
const BISHOP_CHECK = 'rnbqk1nr/pppp1ppp/8/4p3/1b2P3/8/PPP2PPP/RNBQKBNR w KQkq - 1 3'
const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

test('no check, no info', () => {
  assert.equal(checkInfoFor(START), null)
  assert.equal(checkInfoFor('not a fen'), null)
})

test('a bishop check names the piece, the king and the diagonal', () => {
  const info = checkInfoFor(BISHOP_CHECK)!
  assert.equal(info.side, 'w')
  assert.equal(info.kingSquare, 'e1')
  assert.deepEqual(info.checkers.map((c) => [c.piece, c.square, c.line]), [['b', 'b4', 'diagonal']])
  assert.deepEqual(info.checkers[0].path, ['c3', 'd2'])
  assert.equal(describeCheck(info, true, 'TIVVI'), "TIVVI's bishop on b4 gives check to your king on e1, along the diagonal.")
  assert.equal(describeCheck(info, false, 'TIVVI'), "Your bishop on b4 gives check to TIVVI's king on e1, along the diagonal.")
})

test('legal ways out come from the generated legal moves (here: block on c3 or d2 only)', () => {
  const info = checkInfoFor(BISHOP_CHECK)!
  assert.deepEqual(info.replies.king, ['Ke2'])
  assert.ok(info.replies.block.includes('c3') && info.replies.block.includes('Bd2') && info.replies.block.includes('Nc3'))
  assert.equal(info.replies.capture.length, 0)
  assert.match(describeReplies(info), /^Ways out: move the king \(Ke2\); block the line \(/)
})

test('checkmate says there is no way out', () => {
  const mate = checkInfoFor('rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3')!
  assert.equal(mate.checkmate, true)
  assert.equal(describeReplies(mate), 'There is no legal way out of this check.')
})

test('knight check has no line; double check is reported as such', () => {
  const knight = checkInfoFor('4k3/8/3N4/8/8/8/8/4K3 b - - 0 1')!
  assert.equal(knight.checkers[0].line, 'knight')
  assert.match(describeCheck(knight, false, 'TIVVI'), /knight on d6 gives check to TIVVI's king on e8, with a knight jump/)
  const dbl = checkInfoFor('4k3/8/3N4/8/8/8/4R3/4K3 b - - 0 1')!
  assert.equal(dbl.checkers.length, 2)
  assert.match(describeCheck(dbl, false, 'TIVVI'), /^Double check:/)
  assert.deepEqual(dbl.replies.capture, []) // only king moves can answer a double check
  assert.deepEqual(dbl.replies.block, [])
})
