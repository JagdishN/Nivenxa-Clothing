import { test } from 'node:test'
import assert from 'node:assert/strict'
import { assistFromTier, describeSummary, isIndependent, mergeResult, summarize } from '../../src/app/chess/learn/_shared/lessonAssist'

test('assistFromTier: mistakes alone are still independent; a revealed cue is a hint; a demonstration is help', () => {
  assert.equal(assistFromTier(0), 'independent')
  assert.equal(assistFromTier(1), 'independent') // a nudge after a wrong try reveals nothing
  assert.equal(assistFromTier(2), 'hint')
  assert.equal(assistFromTier(3), 'demo')
})

test('a revealed answer is not independent mastery', () => {
  assert.equal(isIndependent('demo'), false)
  assert.equal(isIndependent('hint'), false)
  assert.equal(isIndependent('independent'), true)
  assert.equal(isIndependent('retry'), true)
})

test('mergeResult: an independent retry upgrades help; later help never downgrades independence', () => {
  assert.equal(mergeResult(undefined, 'demo'), 'demo')
  assert.equal(mergeResult('demo', 'independent'), 'retry')
  assert.equal(mergeResult('demo', 'hint'), 'demo', 'repeated help keeps the first record')
  assert.equal(mergeResult('independent', 'demo'), 'independent', 'already shown independently')
  assert.equal(mergeResult('retry', 'demo'), 'retry')
})

test('summaries never claim more than the results show', () => {
  const steps = [1, 2, 3, 4]
  assert.equal(describeSummary(summarize({ 1: 'independent', 2: 'independent', 3: 'retry', 4: 'independent' }, steps)), 'You completed all 4 practice steps on your own.')
  const mixed = describeSummary(summarize({ 1: 'independent', 2: 'demo', 3: 'hint', 4: 'independent' }, steps))
  assert.match(mixed, /2 of 4 practice steps on your own and 2 with help/)
  const helped = describeSummary(summarize({ 1: 'demo', 2: 'hint', 3: 'demo', 4: 'demo' }, steps))
  assert.match(helped, /with some help/)
  assert.ok(!/on your own\./.test(helped.replace('Use Practice again to try them on your own.', '')), 'no independence claim')
  assert.equal(describeSummary(summarize({}, steps)), '', 'nothing recorded, nothing claimed')
  assert.match(describeSummary(summarize({ 1: 'independent' }, steps)), /Practice again to see the rest/)
})
