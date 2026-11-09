// READ-ONLY audit of the puzzles table. Uses only the publishable key and
// never writes — questionable rows are listed with evidence, never altered
// or deleted (that decision belongs to a person, see docs/chess-puzzle-audit.md).
//
//   npm run audit-puzzles
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { Chess } from 'chess.js'

for (const line of readFileSync(resolve(process.cwd(), '.env.local'), 'utf8').split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
}

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!)

interface Row {
  id: string
  lichess_puzzle_id: string
  fen: string
  moves: string
  rating: number
  themes: string[]
}

async function fetchAll(): Promise<Row[]> {
  const rows: Row[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from('puzzles')
      .select('id, lichess_puzzle_id, fen, moves, rating, themes')
      .order('id')
      .range(from, from + 999)
    if (error) throw new Error(error.message)
    rows.push(...(data as Row[]))
    if (!data || data.length < 1000) break
  }
  return rows
}

function uci(m: string) {
  return { from: m.slice(0, 2), to: m.slice(2, 4), promotion: m.length > 4 ? m.slice(4, 5) : undefined }
}

async function main() {
  const rows = await fetchAll()
  const issues: { id: string; lichess: string; kind: string; detail: string }[] = []
  const flag = (r: Row, kind: string, detail: string) => issues.push({ id: r.id, lichess: r.lichess_puzzle_id, kind, detail })

  const fenSeen = new Map<string, string>()
  let mateAltCount = 0
  const mateAlt: { lichess: string; theme: string; mating: number }[] = []

  for (const r of rows) {
    const prior = fenSeen.get(r.fen)
    if (prior) flag(r, 'duplicate-fen', `same FEN as ${prior}`)
    else fenSeen.set(r.fen, r.lichess_puzzle_id)

    const moves = r.moves.trim().split(/\s+/)
    let game: Chess
    try {
      game = new Chess(r.fen)
    } catch (e) {
      flag(r, 'illegal-fen', String(e))
      continue
    }
    let ok = true
    for (let i = 0; i < moves.length; i++) {
      const m = uci(moves[i])
      try {
        game.move({ from: m.from, to: m.to, promotion: m.promotion })
      } catch {
        flag(r, 'illegal-move', `move ${i} (${moves[i]}) is not legal in sequence`)
        ok = false
        break
      }
    }
    if (!ok) continue

    const isMate1 = r.themes.includes('mateIn1')
    const isMate2 = r.themes.includes('mateIn2')
    if (isMate1 && isMate2) flag(r, 'conflicting-mate-labels', 'tagged both mateIn1 and mateIn2')
    if ((isMate1 || isMate2) && !game.isCheckmate()) flag(r, 'mate-label-no-mate', `final position is not checkmate (${moves.length - 1} solution plies)`)
    if (isMate1 && moves.length !== 2) flag(r, 'mate1-length', `${moves.length - 1} solution plies, expected 1`)
    if (isMate2 && moves.length !== 4) flag(r, 'mate2-length', `${moves.length - 1} solution plies, expected 3`)

    // How many different first moves also mate? The solver today accepts only the stored one.
    if (isMate1 && moves.length === 2) {
      const pos = new Chess(r.fen)
      const s = uci(moves[0])
      pos.move({ from: s.from, to: s.to, promotion: s.promotion })
      let mating = 0
      for (const mv of pos.moves({ verbose: true })) {
        const t = new Chess(pos.fen())
        t.move(mv)
        if (t.isCheckmate()) mating++
      }
      if (mating > 1) {
        mateAltCount++
        mateAlt.push({ lichess: r.lichess_puzzle_id, theme: 'mateIn1', mating })
      }
    }
  }

  // Theme/rating/band summary + the 1000-row-cap check the catalogue query is exposed to.
  const byTheme: Record<string, number[]> = {}
  for (const r of rows) for (const t of r.themes) (byTheme[t] ??= []).push(r.rating)
  const band = (x: number) => (x <= 1200 ? 'beginner' : x <= 1800 ? 'intermediate' : 'advanced')
  const themeSummary = Object.entries(byTheme)
    .map(([theme, ratings]) => ({
      theme,
      count: ratings.length,
      min: Math.min(...ratings),
      max: Math.max(...ratings),
      beginner: ratings.filter((x) => band(x) === 'beginner').length,
      intermediate: ratings.filter((x) => band(x) === 'intermediate').length,
      advanced: ratings.filter((x) => band(x) === 'advanced').length,
    }))
    .sort((a, b) => b.count - a.count)

  const kinds: Record<string, number> = {}
  for (const i of issues) kinds[i.kind] = (kinds[i.kind] ?? 0) + 1

  const report = { total: rows.length, issueKinds: kinds, issues, mateInOneWithAlternativeMates: { count: mateAltCount, sample: mateAlt.slice(0, 20) }, themeSummary }
  writeFileSync(resolve(process.cwd(), 'docs/chess-puzzle-audit.json'), JSON.stringify(report, null, 2))
  console.log('puzzles:', rows.length)
  console.log('issue kinds:', kinds)
  console.log('mateIn1 puzzles with >1 mating move:', mateAltCount)
  console.table(themeSummary)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
