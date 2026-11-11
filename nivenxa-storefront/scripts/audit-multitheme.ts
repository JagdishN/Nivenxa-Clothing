// READ-ONLY: for every puzzle listed under a topic whose objective differs from its mate tag (e.g. Hanging Pieces
// + mateIn1), verify from the board itself that the stored first solver move really is checkmate, and count them.
//   npx tsx scripts/audit-multitheme.ts
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { Chess } from 'chess.js'

for (const line of readFileSync(resolve(process.cwd(), '.env.local'), 'utf8').split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
}
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!)

async function main() {
  const rows: { lichess_puzzle_id: string; fen: string; moves: string; rating: number; themes: string[] }[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from('puzzles').select('lichess_puzzle_id, fen, moves, rating, themes').order('id').range(from, from + 999)
    if (error) throw new Error(error.message)
    rows.push(...(data ?? []))
    if (!data || data.length < 1000) break
  }
  const out: Record<string, { total: number; withMateTag: number; mateTagVerified: number; badExamples: string[] }> = {}
  for (const r of rows) {
    const mate = r.themes.find((t) => /^mateIn[1-5]$/.test(t))
    for (const t of r.themes) {
      const e = (out[t] ??= { total: 0, withMateTag: 0, mateTagVerified: 0, badExamples: [] })
      e.total++
      if (!mate) continue
      e.withMateTag++
      if (mate !== 'mateIn1') {
        e.mateTagVerified++
        continue
      }
      // mateIn1: fen is the position BEFORE the opponent's setup move; moves[0] is that move, moves[1] the solver's.
      const g = new Chess(r.fen)
      const mv = r.moves.split(' ')
      try {
        g.move({ from: mv[0].slice(0, 2), to: mv[0].slice(2, 4), promotion: mv[0][4] })
        g.move({ from: mv[1].slice(0, 2), to: mv[1].slice(2, 4), promotion: mv[1][4] })
        if (g.isCheckmate()) e.mateTagVerified++
        else if (e.badExamples.length < 5) e.badExamples.push(r.lichess_puzzle_id)
      } catch {
        if (e.badExamples.length < 5) e.badExamples.push(r.lichess_puzzle_id)
      }
    }
  }
  const hp = out['hangingPiece']
  console.log('hangingPiece', hp)
  writeFileSync(resolve(process.cwd(), 'docs', 'chess-multitheme-audit.json'), JSON.stringify(out, null, 2))
}
main()
