import { test } from 'node:test'
import assert from 'node:assert/strict'
import { Chess } from 'chess.js'
import { createReactionTracker, isFresh, playerJustMoved, liveReactionsAllowed, reactionCandidate, resultState, captionFor } from '../../src/lib/chess/avatarReaction'
import type { QualityMoveEntry } from '../../src/lib/chess/types'

const sev = (r: { severity: string } | null) => r?.severity ?? null

const START = new Chess().fen()
const q = (over: Partial<QualityMoveEntry> = {}): QualityMoveEntry => ({
  kind: 'quality', ply: 0, color: 'w', san: 'e4', fenBefore: START, fenAfter: START, explanation: null, explanationStatus: 'idle',
  bestMoveUci: 'd2d4', bestMoveSan: 'd4', evalBeforeCp: 30, evalAfterCp: -120, cpLoss: 150, classification: 'mistake', explanationRevealed: false, ...over,
} as QualityMoveEntry)

test('live reactions follow the tier and the coaching setting', () => {
  assert.equal(liveReactionsAllowed('beginner', 'live'), true)
  assert.equal(liveReactionsAllowed('beginner', 'post-game'), true)
  assert.equal(liveReactionsAllowed('intermediate', 'live'), true)
  assert.equal(liveReactionsAllowed('intermediate', 'post-game'), false) // Rapid defers coaching
  assert.equal(liveReactionsAllowed('expert', 'live'), false)
  assert.equal(liveReactionsAllowed('master', 'summary-only'), false)
})

test('only confirmed player mistakes/blunders react; inaccuracies and good moves do not', () => {
  assert.deepEqual(reactionCandidate(q(), 'w'), { react: true, severity: 'mistake' })
  assert.equal(reactionCandidate(q({ classification: 'blunder', cpLoss: 400 }), 'w').severity, 'blunder')
  assert.equal(reactionCandidate(q({ classification: 'inaccuracy', cpLoss: 70 }), 'w').skip, 'not-a-mistake')
  assert.equal(reactionCandidate(q({ classification: 'best', cpLoss: 0 }), 'w').skip, 'not-a-mistake')
  assert.equal(reactionCandidate(q({ color: 'b' }), 'w').skip, 'not-player-move')
  assert.equal(reactionCandidate({ kind: 'purpose', ply: 0, color: 'w', san: 'e4', fenBefore: START, fenAfter: START, explanation: null, explanationStatus: 'idle' }, 'w').skip, 'not-graded')
})

test('safeguards: no best move, mate range, forced move, already lost, still winning', () => {
  assert.equal(reactionCandidate(q({ bestMoveUci: '' }), 'w').skip, 'no-best-move')
  assert.equal(reactionCandidate(q({ evalBeforeCp: 100000 }), 'w').skip, 'mate-range')
  assert.equal(reactionCandidate(q({ evalAfterCp: -100000 }), 'w').skip, 'mate-range')
  assert.equal(reactionCandidate(q({ evalBeforeCp: -700 }), 'w').skip, 'already-lost')
  assert.equal(reactionCandidate(q({ evalBeforeCp: 900, evalAfterCp: 650 }), 'w').skip, 'still-winning')
  // a forced reply: black king in check with exactly one legal move
  const forced = new Chess('k7/8/1K6/8/8/8/8/R7 b - - 0 1')
  assert.equal(forced.moves().length, 1)
  assert.equal(reactionCandidate(q({ color: 'b', fenBefore: forced.fen() }), 'b').skip, 'forced-move')
})

test('freshness: undone, old, and replaced results are ignored', () => {
  const h = ['e4', 'e5']
  assert.equal(isFresh({ ply: 0, san: 'e4' }, h), true)
  assert.equal(isFresh({ ply: 1, san: 'e5' }, h), true)
  assert.equal(isFresh({ ply: 2, san: 'Nf3' }, h), false) // never played / undone
  assert.equal(isFresh({ ply: 0, san: 'e4' }, ['e4', 'e5', 'Nf3', 'Nc6']), false) // game moved on
  assert.equal(isFresh({ ply: 0, san: 'd4' }, ['e4', 'e5']), false) // different move now at that ply
})

const ctx = (over = {}) => ({ humanColor: 'w' as const, history: ['e4'], tier: 'beginner' as const, mode: 'live' as const, complete: false, ...over })

test('tracker: one reaction per ply, never repeated', () => {
  const t = createReactionTracker(); t.startGame(); t.onHistory(1)
  assert.equal(sev(t.consider([q()], ctx())), 'mistake')
  assert.equal(sev(t.consider([q()], ctx())), null) // same ply again
})

test('tracker: restart forgets everything; stale entries from the old game cannot react', () => {
  const t = createReactionTracker(); t.startGame(); t.onHistory(1)
  assert.equal(sev(t.consider([q()], ctx())), 'mistake')
  t.startGame(); t.onHistory(0)
  // old game's entry arrives after restart: history is empty now, so it is not fresh
  assert.equal(sev(t.consider([q()], ctx({ history: [] }))), null)
})

test('tracker: undo discards a late result; replaying the ply later is a new event', () => {
  const t = createReactionTracker(); t.startGame(); t.onHistory(1)
  t.onHistory(0) // undo before analysis finished
  assert.equal(sev(t.consider([q()], ctx({ history: [] }))), null) // late result for the undone move
  t.onHistory(1) // a different/replayed move at ply 0
  assert.equal(sev(t.consider([q({ san: 'd4' })], ctx({ history: ['d4'] }))), 'mistake')
})

test('tracker: Expert/Master and rapid-Intermediate never react live; game over never reacts', () => {
  for (const [tier, mode] of [['expert', 'live'], ['master', 'summary-only'], ['intermediate', 'post-game']] as const) {
    const t = createReactionTracker(); t.startGame(); t.onHistory(1)
    assert.equal(sev(t.consider([q()], ctx({ tier, mode }))), null, `${tier}/${mode}`)
  }
  const t = createReactionTracker(); t.startGame(); t.onHistory(1)
  assert.equal(sev(t.consider([q()], ctx({ complete: true }))), null)
})

test('results: friendly and role-appropriate; a loss is never a victory pose', () => {
  assert.equal(resultState('player-win'), 'ackwin')
  assert.equal(resultState('draw'), 'ackdraw')
  assert.equal(resultState('engine-win'), 'encourage')
  assert.equal(resultState('player-resigned'), 'encourage')
  assert.match(captionFor('encourage'), /good effort/)
  assert.doesNotMatch(Object.values({ a: captionFor('concern'), b: captionFor('encourage'), c: captionFor('ackwin') }).join(' '), /blunder|mistake|lost|wrong|bad/i)
})

test('caption lifetime: replaced by the next player move, not by the opponent reply', () => {
  assert.equal(playerJustMoved(1, 'w'), true) // white just played 1.e4
  assert.equal(playerJustMoved(2, 'w'), false) // black (engine) replied
  assert.equal(playerJustMoved(3, 'w'), true)
  assert.equal(playerJustMoved(1, 'b'), false)
  assert.equal(playerJustMoved(2, 'b'), true)
  assert.equal(playerJustMoved(0, 'w'), false)
})

import { assistanceLabel, resolveAvatarState, AVATAR_NAME } from '../../src/lib/chess/avatarReaction'

test('game-over reaction has precedence over a pending move reaction and over thinking', () => {
  assert.equal(resolveAvatarState({ resultPose: 'ackdraw', reaction: 'concern', engineThinking: true }), 'ackdraw')
  assert.equal(resolveAvatarState({ resultPose: null, reaction: 'concern', engineThinking: true }), 'concern')
  assert.equal(resolveAvatarState({ resultPose: null, reaction: 'selected', engineThinking: true }), 'thinking')
  assert.equal(resolveAvatarState({ resultPose: null, reaction: null, engineThinking: false }), 'idle')
})

test('assistance is labelled honestly and thinking says nothing about move quality', () => {
  assert.equal(assistanceLabel('live'), 'Guided play')
  assert.equal(assistanceLabel('post-game'), 'Review after the game')
  assert.equal(assistanceLabel('summary-only'), 'No assistance')
  assert.doesNotMatch(captionFor('thinking'), /good|bad|mistake|blunder|best|better|worse/i)
  assert.equal(AVATAR_NAME, 'TIVVI')
})

test('a specific reason is used when given, neutral wording otherwise, and neither shames', () => {
  assert.equal(captionFor('concern', 'That leaves your bishop on c4 unprotected.'), 'TIVVI: that leaves your bishop on c4 unprotected.')
  assert.equal(captionFor('concern'), "TIVVI: let's take another look at that move.")
  assert.doesNotMatch(captionFor('concern') + captionFor('concern', 'That leaves your rook on a1 unprotected.'), /blunder|stupid|oops|bad|wrong|lost/i)
})

test('no assistance: nothing is reacted to live', () => {
  const t = createReactionTracker()
  t.startGame()
  t.onHistory(1)
  for (const [tier, mode] of [['expert', 'live'], ['master', 'summary-only'], ['intermediate', 'post-game']] as const) {
    assert.equal(t.consider([q({ ply: 0 })], { humanColor: 'w', history: ['e4'], tier, mode, complete: false }), null)
  }
})
