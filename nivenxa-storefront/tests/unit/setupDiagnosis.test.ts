import { test } from 'node:test'
import assert from 'node:assert/strict'
import { START_PLACEMENT, diagnoseSetup, piecesLeft, removeSide, type Placement } from '../../src/app/chess/learn/_shared/lessonPlacement'

const clone = (p: Placement): Placement => ({ ...p })
const flipRanks = (p: Placement): Placement => {
  // Same pieces, but White at the top and Black at the bottom (the arrangement seen in the walkthrough).
  const out: Placement = {}
  for (const [sq, piece] of Object.entries(p)) out[`${sq[0]}${9 - Number(sq[1])}`] = piece
  return out
}

test('the standard start is accepted; nothing is left over', () => {
  const d = diagnoseSetup(clone(START_PLACEMENT), START_PLACEMENT)
  assert.equal(d.complete, true)
  assert.equal(d.groups.length, 0)
  assert.equal(d.individual.length, 0)
})

test('a fully reversed board is ONE pattern, not 32 unrelated failures', () => {
  const d = diagnoseSetup(flipRanks(START_PLACEMENT), START_PLACEMENT)
  assert.equal(d.complete, false)
  assert.equal(d.groups[0].id, 'sides-swapped')
  assert.match(d.groups[0].message, /each other’s sides|each other's sides/)
  assert.match(d.groups[0].message, /ranks 1 and 2/)
  assert.equal(d.individual.length, 0, 'no leftover single-square errors once the pattern is named')
})

test('only White on the wrong side names White, not both teams', () => {
  const p = clone(START_PLACEMENT)
  const white = Object.entries(p).filter(([, v]) => v === v.toUpperCase())
  for (const [sq] of white) delete p[sq]
  for (const [sq, v] of white) p[`${sq[0]}${9 - Number(sq[1])}`] = v // White now on ranks 7/8 where Black stands
  for (const sq of Object.keys(p)) if (p[sq] === p[sq].toLowerCase() && Number(sq[1]) >= 7) delete p[sq] // Black removed to make room
  const d = diagnoseSetup(p, START_PLACEMENT)
  assert.equal(d.groups[0].id, 'white-wrong-side')
})

test('king and queen swapped is its own pattern, per side', () => {
  const p = clone(START_PLACEMENT)
  p.d1 = 'K'
  p.e1 = 'Q'
  const d = diagnoseSetup(p, START_PLACEMENT)
  assert.deepEqual(
    d.groups.map((g) => g.id),
    ['white-king-queen']
  )
  assert.deepEqual(d.groups[0].squares.sort(), ['d1', 'e1'])
  assert.match(d.groups[0].message, /own colour/)
  p.d8 = 'k'
  p.e8 = 'q'
  assert.deepEqual(diagnoseSetup(p, START_PLACEMENT).groups.map((g) => g.id).sort(), ['black-king-queen', 'white-king-queen'])
})

test('pawns on the wrong rank are one pattern that names the rank they should be on', () => {
  const p = clone(START_PLACEMENT)
  for (const f of 'abcdefgh') {
    delete p[`${f}2`]
    p[`${f}3`] = 'P'
  }
  const d = diagnoseSetup(p, START_PLACEMENT)
  assert.equal(d.groups[0].id, 'white-pawn-rank')
  assert.match(d.groups[0].message, /rank 3/)
  assert.match(d.groups[0].message, /rank 2/)
  assert.equal(d.groups[0].squares.length, 8)
})

test('a mix: one pattern plus an isolated mistake keeps the isolated one separate and keeps correct pieces', () => {
  const p = clone(START_PLACEMENT)
  p.d1 = 'K'
  p.e1 = 'Q'
  p.b8 = 'b' // a bishop where the knight belongs
  const d = diagnoseSetup(p, START_PLACEMENT)
  assert.equal(d.groups[0].id, 'white-king-queen')
  assert.deepEqual(d.individual, ['b8'])
  assert.equal(d.correct, 29)
})

test('a partly built board is not mistaken for a pattern', () => {
  const d = diagnoseSetup({ a1: 'R', h1: 'R', b1: 'B' }, START_PLACEMENT)
  assert.equal(d.groups.length, 0)
  assert.deepEqual(d.individual, ['b1'])
  assert.equal(d.correct, 2)
  assert.equal(d.missing.length, 29)
})

test('the diagnosis judges the displayed coordinates only: a rotated arrangement is never accepted', () => {
  assert.equal(diagnoseSetup(flipRanks(START_PLACEMENT), START_PLACEMENT).complete, false)
})

test('inventory and side removal', () => {
  const p = clone(START_PLACEMENT)
  assert.equal(piecesLeft({}, 'P'), 8)
  assert.equal(piecesLeft({ a2: 'P', b2: 'P' }, 'P'), 6)
  assert.equal(piecesLeft(p, 'P'), 0)
  assert.equal(piecesLeft({ e1: 'K' }, 'k'), 1, 'colour matters: a white king does not use up the black king')
  const noWhite = removeSide(p, 'white')
  assert.equal(Object.keys(noWhite).length, 16)
  assert.ok(Object.values(noWhite).every((v) => v === v.toLowerCase()))
  assert.equal(Object.keys(removeSide(p, 'black')).length, 16)
  assert.equal(Object.keys(p).length, 32, 'the original is untouched')
})
