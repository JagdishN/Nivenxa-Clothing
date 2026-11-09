import { test } from 'node:test'
import assert from 'node:assert/strict'
import { computeBands, filterByLevel, isBandAvailable, MIN_BAND_PUZZLES, RATING_BANDS, type PuzzleRow } from '../../src/lib/chess/puzzles'

const row = (rating: number, i: number): PuzzleRow => ({ id: `id${i}`, lichess_puzzle_id: `l${i}`, fen: '', moves: '', rating, themes: [], popularity: 0, created_at: '' })

// Ratings chosen around the band edges (≤1200 / 1201–1800 / >1800).
const RATINGS = [399, 1199, 1200, 1201, 1202, 1799, 1800, 1801, 1802, 2500, 3300, 800, 900, 1000, 1100, 1300, 1400, 1500, 1600, 1700, 1900, 2000]

test('the count a catalogue card shows equals the number of puzzles the topic page lists', () => {
  const puzzles = RATINGS.map(row)
  const bands = computeBands(RATINGS)
  for (const level of Object.keys(RATING_BANDS) as (keyof typeof RATING_BANDS)[]) {
    const listed = filterByLevel(puzzles, level)
    assert.equal(listed.length, bands[level]?.count ?? 0, level)
    // …and the advertised range is the real min/max of what is listed.
    if (listed.length) {
      assert.equal(bands[level]!.minRating, Math.min(...listed.map((p) => p.rating)))
      assert.equal(bands[level]!.maxRating, Math.max(...listed.map((p) => p.rating)))
    }
  }
  assert.equal(filterByLevel(puzzles, 'all').length, RATINGS.length)
})

test('band edges: 1200 is beginner, 1201 intermediate, 1800 intermediate, 1801 advanced', () => {
  const p = [1200, 1201, 1800, 1801].map(row)
  assert.deepEqual(filterByLevel(p, 'beginner').map((x) => x.rating), [1200])
  assert.deepEqual(filterByLevel(p, 'intermediate').map((x) => x.rating), [1201, 1800])
  assert.deepEqual(filterByLevel(p, 'advanced').map((x) => x.rating), [1801])
})

test('a band is only offered when it has enough puzzles, and every puzzle is in exactly one band', () => {
  const ratings = [400, 500, 600, 700, 800, 900, 1000, 1100, 1500, 2000]
  const bands = computeBands(ratings)
  assert.equal(isBandAvailable(bands, 'beginner'), 8 >= MIN_BAND_PUZZLES)
  assert.equal(isBandAvailable(bands, 'intermediate'), false)
  assert.equal(isBandAvailable(bands, 'all'), true)
  const total = (bands.beginner?.count ?? 0) + (bands.intermediate?.count ?? 0) + (bands.advanced?.count ?? 0)
  assert.equal(total, ratings.length)
})
