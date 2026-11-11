import { test } from 'node:test'
import assert from 'node:assert/strict'
import { withOpponentName, cleanInsightText, currentInsight, earlierInsights, moveHeading, observationFor, sameMove } from '../../src/lib/chess/insightFeed'
import type { MoveAnalysisEntry } from '../../src/lib/chess/types'

const entry = (ply: number, over: Partial<MoveAnalysisEntry> = {}): MoveAnalysisEntry =>
  ({
    kind: 'quality', ply, color: ply % 2 === 0 ? 'w' : 'b', san: `m${ply}`, fenBefore: `a${ply}`, fenAfter: `a${ply + 1}`,
    explanation: null, explanationStatus: 'idle', bestMoveUci: '', bestMoveSan: '', evalBeforeCp: 0, evalAfterCp: 0, cpLoss: 0,
    classification: 'good', explanationRevealed: false, ...over,
  }) as MoveAnalysisEntry

test('Markdown markers are removed, the words are kept', () => {
  assert.equal(cleanInsightText('**Good move!** You _developed_ the `knight`.'), 'Good move! You developed the knight.')
  assert.equal(cleanInsightText('## Idea\n- control the centre\n- [read more](https://x.test)'), 'Idea\ncontrol the centre\nread more')
  assert.equal(cleanInsightText(null), '')
  assert.equal(cleanInsightText('2 * 3 and snake_case_name stay'), '2 * 3 and snake_case_name stay')
})

test('the insight is about the latest move; an older entry is never promoted to current', () => {
  const loaded = entry(0, { explanationStatus: 'loaded', explanation: 'Fine.' })
  assert.deepEqual(currentInsight([], 0, 'beginner'), { kind: 'none' })
  assert.deepEqual(currentInsight([loaded], 2, 'beginner'), { kind: 'pending', ply: 1 }) // move 2 played, its grade not here yet
  assert.equal(currentInsight([loaded, entry(1, { explanationStatus: 'loading' })], 2, 'beginner').kind, 'loading')
  assert.equal(currentInsight([loaded, entry(1, { explanationStatus: 'loaded' })], 2, 'beginner').kind, 'ready')
  assert.equal(currentInsight([loaded, entry(1, { explanationStatus: 'error' })], 2, 'beginner').kind, 'error')
})

test('after undo the removed move is not current', () => {
  const e0 = entry(0, { explanationStatus: 'loaded' })
  const e1 = entry(1, { explanationStatus: 'loaded' })
  const now = currentInsight([e0, e1], 1, 'beginner')
  assert.equal(now.kind, 'ready')
  assert.equal((now as { entry: MoveAnalysisEntry }).entry.ply, 0)
  assert.deepEqual(currentInsight([], 1, 'beginner'), { kind: 'pending', ply: 0 })
})

test('Intermediate: a move coaching skipped is "quiet", not an old insight and not a spinner', () => {
  assert.equal(currentInsight([entry(0, { classification: 'best' })], 1, 'intermediate').kind, 'quiet')
  assert.equal(currentInsight([entry(0, { classification: 'mistake' })], 1, 'intermediate').kind, 'loading')
})

test('earlier insights: newest first, loaded only, current move excluded', () => {
  const es = [0, 1, 2, 3].map((p) => entry(p, { explanationStatus: p === 1 ? 'idle' : 'loaded' }))
  assert.deepEqual(earlierInsights(es, 4).map((e) => e.ply), [2, 0])
})

test('short observation first, "Why?" only when there is more to say', () => {
  const withHeadline = entry(0, { explanationStatus: 'loaded', headline: 'e4 — **Good opening move**', explanation: 'It claims the centre.' })
  assert.deepEqual(observationFor(withHeadline), { observation: 'Good opening move', hasMore: true })
  const oneLine = entry(0, { explanationStatus: 'loaded', explanation: 'A solid developing move.' })
  assert.deepEqual(observationFor(oneLine), { observation: 'A solid developing move.', hasMore: false })
  const longer = entry(0, { explanationStatus: 'loaded', explanation: 'It develops a piece. It also eyes the centre.' })
  assert.deepEqual(observationFor(longer), { observation: 'It develops a piece.', hasMore: true })
})

test('every insight is labelled with move number, side and who played it', () => {
  assert.equal(moveHeading({ ply: 8, color: 'w', san: 'Nf3' }, 'w', 'TIVVI'), 'You · White · 5.Nf3')
  assert.equal(moveHeading({ ply: 9, color: 'b', san: 'Nc6' }, 'w', 'TIVVI'), 'TIVVI · Black · 5...Nc6')
})

test('a late response is only accepted by the same move', () => {
  const a = entry(3)
  assert.equal(sameMove(a, entry(3)), true)
  assert.equal(sameMove(a, entry(3, { san: 'other' })), false) // undo then a different move at the same ply
  assert.equal(sameMove(a, undefined), false) // undone / new game
})

test('the opponent is named consistently in commentary; the app name is untouched', () => {
  assert.equal(withOpponentName("Nivenxa Engine's move develops a knight. Nivenxa Chess says hi.", 'TIVVI'), "TIVVI's move develops a knight. Nivenxa Chess says hi.")
  assert.equal(withOpponentName('Nivenxa played Nc6', 'TIVVI'), 'TIVVI played Nc6')
  assert.equal(withOpponentName('Nivenxa played Nc6', 'Nivenxa'), 'Nivenxa played Nc6')
})

import { feedSections, sectionPlies } from '../../src/lib/chess/insightFeed'

test('sections: your move stays visible when the opponent replies, each resolves on its own', () => {
  const yours = entry(0, { explanationStatus: 'loaded', explanation: 'Nice.' })
  // White human, plies 0 (you) and 1 (reply) played; the reply is still loading, yours is ready.
  const s = feedSections([yours, entry(1, { kind: 'purpose', explanationStatus: 'loading' } as Partial<MoveAnalysisEntry>)], 2, 'w', 'beginner')
  assert.equal(s.yours!.kind, 'ready')
  assert.equal(s.reply!.kind, 'loading')
  // Your move graded late: the reply already exists, yours is pending (never an older insight, never the reply's).
  const late = feedSections([entry(1, { kind: 'purpose', explanationStatus: 'loaded' } as Partial<MoveAnalysisEntry>)], 2, 'w', 'beginner')
  assert.deepEqual(late.yours, { kind: 'pending', ply: 0 })
  assert.equal(late.reply!.kind, 'ready')
})

test('sections: before the opponent replies the reply section is empty and the previous reply moves to the history', () => {
  const es = [entry(0, { explanationStatus: 'loaded' }), entry(1, { explanationStatus: 'loaded' }), entry(2, { explanationStatus: 'loaded' })]
  const s = feedSections(es, 3, 'w', 'beginner') // you just played ply 2
  assert.equal(s.reply, null)
  assert.deepEqual(sectionPlies(s), [2])
  assert.deepEqual(earlierInsights(es, 3, sectionPlies(s)).map((e) => e.ply), [1, 0])
})

test('sections: playing Black, the opponent opened; nothing of yours yet', () => {
  const s = feedSections([], 1, 'b', 'beginner')
  assert.equal(s.yours, null)
  assert.deepEqual(s.reply, { kind: 'pending', ply: 0 })
})

import { captionStillValid, positionKey } from '../../src/lib/chess/avatarReaction'

test('a reaction caption is valid only for the position and ply it described', () => {
  const f1 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1'
  const f1b = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 5 9' // same position, other counters
  assert.equal(positionKey(f1), positionKey(f1b))
  assert.equal(captionStillValid(f1, f1b, 1, 1), true)
  assert.equal(captionStillValid(f1, f1, 1, 2), false) // any later move expires it
  assert.equal(captionStillValid(f1, 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 1, 1), false)
  assert.equal(captionStillValid(null, f1, 0, 0), true) // the greeting, until the first move
  assert.equal(captionStillValid(null, f1, 0, 1), false)
})
