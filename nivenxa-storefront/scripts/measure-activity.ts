// READ-ONLY measurement of the existing Chess storage that My Activity builds on. Prints/saves AGGREGATES only
// (counts, sizes in bytes, timings): no row content, no names, no user ids, no moves.
//   npx tsx scripts/measure-activity.ts
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { Chess } from 'chess.js'

for (const line of readFileSync(resolve(process.cwd(), '.env.local'), 'utf8').split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
}
const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!)

const bytes = (v: unknown) => Buffer.byteLength(JSON.stringify(v ?? null), 'utf8')
const stats = (xs: number[]) => {
  if (!xs.length) return null
  const s = [...xs].sort((a, b) => a - b)
  const q = (p: number) => s[Math.min(s.length - 1, Math.floor(p * s.length))]
  return { n: xs.length, min: s[0], median: q(0.5), p90: q(0.9), max: s[s.length - 1], mean: Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) }
}
async function timed<T>(fn: () => PromiseLike<T>, reps = 7): Promise<{ medianMs: number; minMs: number }> {
  const t: number[] = []
  for (let i = 0; i < reps; i++) {
    const a = performance.now()
    await fn()
    t.push(performance.now() - a)
  }
  t.sort((a, b) => a - b)
  return { medianMs: Math.round(t[Math.floor(t.length / 2)]), minMs: Math.round(t[0]) }
}

async function main() {
  const out: Record<string, unknown> = { measuredAt: new Date().toISOString() }

  const games = await sb.from('analysis_games').select('id, source, moves, analysis, move_count, accuracy_white').limit(300)
  if (games.error) throw new Error(games.error.message)
  const rows = games.data ?? []
  const movesB = rows.map((r) => bytes(r.moves))
  const analysisB = rows.filter((r) => r.analysis).map((r) => bytes(r.analysis))
  const sanB = rows.map((r) => Buffer.byteLength(((r.moves ?? []) as { san: string }[]).map((m) => m.san).join(' '), 'utf8'))
  out.analysis_games = {
    rowsSampled: rows.length,
    withAnalysis: analysisB.length,
    withAccuracyButNoAnalysis: rows.filter((r) => r.accuracy_white !== null && !r.analysis).length,
    movesJsonBytes: stats(movesB),
    analysisJsonBytes: stats(analysisB),
    sanTextBytes_ifStoredCompactly: stats(sanB),
    bySource: rows.reduce<Record<string, number>>((a, r) => ((a[r.source] = (a[r.source] ?? 0) + 1), a), {}),
  }

  // Query timings: a list that pulls the big columns vs the summary-only list My Activity uses.
  const SUMMARY = 'id, source, white, black, event, played_on, result, move_count, accuracy_white, accuracy_black, created_at'
  out.analysisListTiming_20rows = {
    withPayload_movesAndAnalysis: await timed(() => sb.from('analysis_games').select('*').order('created_at', { ascending: false }).limit(20)),
    summaryOnly: await timed(() => sb.from('analysis_games').select(SUMMARY).order('created_at', { ascending: false }).limit(20)),
  }

  const attempts = await sb.from('puzzle_attempts').select('id', { count: 'exact', head: true })
  out.puzzle_attempts = { totalRows: attempts.count ?? null, error: attempts.error?.message ?? null }
  const p1 = await sb.from('puzzle_attempts').select('id, puzzle_id, solved, attempted_at, puzzles(rating, themes)').order('attempted_at', { ascending: false }).limit(21)
  out.puzzleHistoryJoinWorks = !p1.error
  if (!p1.error) out.puzzleHistoryTiming_21rows = await timed(() => sb.from('puzzle_attempts').select('id, puzzle_id, solved, attempted_at, puzzles(lichess_puzzle_id, rating, themes)').order('attempted_at', { ascending: false }).limit(21))
  const outcomeCols = await sb.from('puzzle_attempts').select('outcome').limit(1)
  out.puzzle_attempts_outcome_columns_present = !outcomeCols.error

  // (A HEAD request does not report a missing table, so probe with a real select.)
  const cg = await sb.from('chess_games').select('id').limit(1)
  out.chess_games_table_present = !cg.error
  out.chess_games_probe = cg.error ? cg.error.code : 'ok'

  // The live table is empty, so the per-game cost is measured on SYNTHETIC games: a deterministic 40-move game replayed
  // with chess.js and serialised in the two shapes. This measures the shapes, not real user data.
  const sans = ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4', 'Nf6', 'O-O', 'Be7', 'Re1', 'b5', 'Bb3', 'd6', 'c3', 'O-O', 'h3', 'Nb8', 'd4', 'Nbd7', 'c4', 'c6', 'cxb5', 'axb5', 'Nc3', 'Bb7', 'Bg5', 'b4', 'Nb1', 'h6', 'Bh4', 'c5', 'dxe5', 'Nxe4', 'Bxe7', 'Qxe7', 'exd6', 'Qf6', 'Nbd2', 'Nxd6']
  const g = new Chess()
  const normalized = sans.map((san, i) => {
    const fenBefore = g.fen()
    const m = g.move(san)
    return { ply: i + 1, color: m.color, san: m.san, fenBefore, fenAfter: g.fen(), resolutionStatus: 'confirmed' }
  })
  out.syntheticGame_40plies = {
    normalizedMovesJsonBytes_existingShape: bytes(normalized),
    sanTextBytes_chessGamesShape: Buffer.byteLength(sans.join(' '), 'utf8'),
    ratio: Number((bytes(normalized) / Buffer.byteLength(sans.join(' '), 'utf8')).toFixed(1)),
  }

  console.log(JSON.stringify(out, null, 2))
  writeFileSync(resolve(process.cwd(), 'docs', 'chess-activity-measurements.json'), JSON.stringify(out, null, 2))
}
main().catch((e) => {
  console.error('measurement failed:', e.message)
  process.exit(1)
})
