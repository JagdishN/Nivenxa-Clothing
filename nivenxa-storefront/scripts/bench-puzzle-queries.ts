// READ-ONLY timing of the puzzle catalogue queries: the original per-theme loop vs the single paged query.
// Measures the data layer only (this machine -> Supabase), not rendering. Run: npx tsx scripts/bench-puzzle-queries.ts
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

for (const line of readFileSync(resolve(process.cwd(), '.env.local'), 'utf8').split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
}
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!)

const THEMES = ['fork', 'pin', 'skewer', 'discoveredAttack', 'hangingPiece', 'backRankMate', 'endgame', 'mateIn1', 'mateIn2', 'doubleCheck', 'deflection', 'sacrifice', 'capturingDefender', 'intermezzo', 'clearance', 'attraction', 'interference', 'trappedPiece']

/** The catalogue query as it was before this change: one request per theme, run one after another. */
async function before() {
  for (const t of THEMES) await supabase.from('puzzles').select('rating').contains('themes', [t])
}
/** The catalogue query now: one paged request for every curated theme. */
async function after() {
  for (let from = 0; ; from += 1000) {
    const { data } = await supabase.from('puzzles').select('rating, themes').overlaps('themes', THEMES).order('id').range(from, from + 999)
    if (!data || data.length < 1000) break
  }
}
/** Topic page, before: bands query then puzzles query (two round trips). After: one. */
async function topicBefore() {
  await supabase.from('puzzles').select('rating').contains('themes', ['mateIn1'])
  await supabase.from('puzzles').select('*').contains('themes', ['mateIn1']).order('rating', { ascending: true })
}
async function topicAfter() {
  await supabase.from('puzzles').select('*').contains('themes', ['mateIn1']).order('rating', { ascending: true }).order('id').range(0, 999)
}

async function time(fn: () => Promise<void>, n = 7) {
  await fn() // warm connection/DNS; not counted
  const ms: number[] = []
  for (let i = 0; i < n; i++) {
    const t = performance.now()
    await fn()
    ms.push(performance.now() - t)
  }
  ms.sort((a, b) => a - b)
  return { n, median: Math.round(ms[Math.floor(n / 2)]), slowest: Math.round(ms[n - 1]), fastest: Math.round(ms[0]) }
}

async function main() {
  const out = {
    conditions: `node ${process.version}, ${process.platform}, home network to Supabase, ${new Date().toISOString()}, 1 warm-up discarded`,
    catalogueBefore: await time(before),
    catalogueAfter: await time(after),
    topicBefore: await time(topicBefore),
    topicAfter: await time(topicAfter),
  }
  console.log(JSON.stringify(out, null, 2))
}
main()
