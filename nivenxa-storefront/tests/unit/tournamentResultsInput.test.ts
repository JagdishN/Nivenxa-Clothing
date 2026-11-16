import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseResults } from '../../src/lib/chess/tournamentResultsInput'

const ok = (x: unknown) => JSON.stringify(x)

test('valid results are accepted and ranked in row order', () => {
  const r = parseResults(ok([{ category: ' U-14 Open ', totalRounds: 4, standings: [{ rank: 9, name: ' Asha ', points: 4 }, { rank: 9, name: 'Ravi', points: 3.5 }] }]))
  assert.ok('results' in r)
  if ('results' in r) {
    assert.equal(r.results[0].category, 'U-14 Open')
    assert.deepEqual(r.results[0].standings, [{ rank: 1, name: 'Asha', points: 4 }, { rank: 2, name: 'Ravi', points: 3.5 }])
  }
})

test('an empty list clears the results', () => {
  assert.deepEqual(parseResults('[]'), { results: [] })
})

test('every kind of bad input is refused with a plain message', () => {
  const bad = (x: unknown) => parseResults(ok(x))
  assert.match(('error' in bad([{ category: '', totalRounds: 4, standings: [{ name: 'A', points: 1 }] }]) && (bad([{ category: '', totalRounds: 4, standings: [{ name: 'A', points: 1 }] }]) as { error: string }).error) as string, /category name/)
  assert.ok('error' in bad([{ category: 'U7', totalRounds: 0, standings: [{ name: 'A', points: 1 }] }]))
  assert.ok('error' in bad([{ category: 'U7', totalRounds: 2.5, standings: [{ name: 'A', points: 1 }] }]))
  assert.ok('error' in bad([{ category: 'U7', totalRounds: 4, standings: [] }]))
  assert.ok('error' in bad([{ category: 'U7', totalRounds: 4, standings: [{ name: '  ', points: 1 }] }]))
  assert.ok('error' in bad([{ category: 'U7', totalRounds: 4, standings: [{ name: 'A', points: '' }] }]))
  assert.ok('error' in bad([{ category: 'U7', totalRounds: 4, standings: [{ name: 'A', points: -1 }] }]))
  assert.ok('error' in parseResults('not json'))
  assert.ok('error' in parseResults('{"a":1}'))
})
