import { test } from 'node:test'
import assert from 'node:assert/strict'
import { remainingHoldMs, replyMinMs, testOverrideMs } from '../../src/lib/chess/replyPace'

test('the level decides the minimum reply time', () => {
  assert.equal(replyMinMs('beginner'), 4000)
  assert.equal(replyMinMs('intermediate'), 2000)
  assert.equal(replyMinMs('expert'), 500)
  assert.equal(replyMinMs('master'), 500)
})

test('only the explicit test override can change it, and it is off in a normal build', () => {
  assert.equal(replyMinMs('beginner', 500), 500)
  assert.equal(replyMinMs('beginner', null), 4000)
  assert.equal(testOverrideMs(), null) // no NEXT_PUBLIC_CHESS_TEST_HOOKS, no window
})

test('hold time counts computation already spent and never adds a delay past the minimum', () => {
  assert.equal(remainingHoldMs(4000, 0), 4000)
  assert.equal(remainingHoldMs(4000, 600), 3400) // engine answered in 0.6 s: wait the other 3.4 s
  assert.equal(remainingHoldMs(4000, 3999), 1)
  assert.equal(remainingHoldMs(4000, 4000), 0)
  assert.equal(remainingHoldMs(4000, 6500), 0) // engine took 6.5 s: play when ready, no extra delay
  assert.equal(remainingHoldMs(500, 300), 200)
  assert.equal(remainingHoldMs(2000, -5), 2000)
})
