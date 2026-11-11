import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { Chess } from 'chess.js'
import { buildEvidence, buildMoveFacts, describeDownside, isWeakGrade, resolveExplanation } from '../../src/lib/chess/moveFacts'

// Captured review evidence replayed as regression fixtures (tests/fixtures/review-evidence/*.json). Each fixture is a move that was
// graded by REAL Stockfish and explained by the REAL configured model, saved by scripts/real-weak-moves-study.mts. They are SUBSTITUTE
// positions (the reviewed games themselves are not available), kept so a future change cannot silently start accepting a text it
// used to reject, or reject a text it used to accept, without the diff showing here.

interface Fixture {
  source: string
  fenBefore: string
  san: string
  ply: number
  historySan: string[]
  grade: 'inaccuracy' | 'mistake' | 'blunder'
  pvUci: string[]
  returned: { headline?: string; explanation?: string; bullets?: string[]; suggestion?: string; source?: string; reason?: string; rawText?: string }
  validation: { kind: string; reason?: string }
}

const dir = 'tests/fixtures/review-evidence'
const files = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.json')) : []
const fixtures: Fixture[] = files.flatMap((f) => JSON.parse(readFileSync(`${dir}/${f}`, 'utf8')) as Fixture[])

function replay(fx: Fixture) {
  const g = new Chess(fx.fenBefore)
  g.move(fx.san)
  const facts = buildMoveFacts({ fenBefore: fx.fenBefore, fenAfter: g.fen(), san: fx.san, ply: fx.ply, historySan: fx.historySan })!
  const ev = buildEvidence(facts, { grade: fx.grade, pvUci: fx.pvUci })
  // the text the page would have been given: the model's fields when it answered, otherwise nothing (rejected on the server)
  const r = fx.returned
  const fields = r.source === 'model' ? [r.headline, r.explanation, ...(r.bullets ?? []), r.suggestion] : null
  return { facts, ev, result: resolveExplanation(fields, facts, ev) }
}

test(`captured fixtures exist (${fixtures.length})`, () => {
  assert.ok(fixtures.length > 0, 'run scripts/real-weak-moves-study.mts to capture fixtures')
})

for (const [i, fx] of fixtures.entries()) {
  test(`fixture ${i + 1}: ${fx.san} (${fx.grade}) is replayed deterministically and obeys the invariants`, () => {
    const { facts, ev, result } = replay(fx)
    assert.ok(facts, 'the move replays from its own position')
    assert.ok(isWeakGrade(fx.grade))
    if (result.kind === 'model') {
      // an accepted weak-grade text always rests on a verified loss and names it
      assert.ok(describeDownside(facts, ev), 'accepted text needs a verified loss')
      const text = [fx.returned.headline, fx.returned.explanation, ...(fx.returned.bullets ?? []), fx.returned.suggestion].filter(Boolean).join(' ')
      assert.ok(text.includes((ev.replySan ?? '').replace(/[+#]/g, '')))
    } else if (result.kind === 'evidence') {
      assert.ok(describeDownside(facts, ev), 'the evidence sentence needs a verified loss')
    } else {
      assert.equal(describeDownside(facts, ev), null, 'unavailable means no verified loss')
    }
    // the outcome today must match the outcome when the fixture was captured (kind: model | evidence | unavailable)
    assert.equal(result.kind, fx.validation.kind)
  })
}
