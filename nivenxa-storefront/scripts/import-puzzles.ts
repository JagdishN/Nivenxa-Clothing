/**
 * One-time puzzle import from Lichess's open, CC0-licensed puzzle database
 * (https://database.lichess.org/#puzzles) into the `puzzles` table.
 *
 * NOT part of the app runtime — run by hand, once, after:
 *   1. Downloading the Lichess puzzle CSV yourself and placing it locally
 *      (this script never fetches it over the network).
 *   2. Running supabase/schema.sql against your Supabase project.
 *   3. Filling in real SUPABASE_URL / SUPABASE_SECRET_KEY in .env.local.
 *
 * The real Lichess dump is ~1GB / 6M+ rows, so this streams the file line by
 * line (readline over a read stream) rather than reading it into memory —
 * only rows that match one of the target themes are ever held in memory.
 *
 * Usage:
 *   npm run import-puzzles -- data/lichess_puzzles.csv
 *   (path defaults to data/lichess_puzzles.csv if omitted)
 */
import { createReadStream, existsSync, readFileSync } from 'node:fs'
import { createInterface } from 'node:readline'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = resolve(__dirname, '..')

// ─── Minimal .env.local loader ──────────────────────────────────────────
// This script runs standalone via `tsx`, outside the Next.js runtime, so
// nothing auto-loads .env.local the way `next dev`/`next build` do. Rather
// than pull in the `dotenv` package for one file, parse it directly.
function loadEnvLocal() {
  const envPath = resolve(PROJECT_ROOT, '.env.local')
  if (!existsSync(envPath)) return
  const raw = readFileSync(envPath, 'utf8')
  for (const line of raw.split('\n')) {
    // Tolerant of "KEY = value" spacing, not just "KEY=value".
    const match = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/)
    if (!match) continue
    const [, key, rawValue] = match
    const trimmed = rawValue.trim()
    // Strip one layer of matching surrounding quotes, e.g. PASSWORD="abc123".
    const value = /^(["']).*\1$/.test(trimmed) ? trimmed.slice(1, -1) : trimmed
    if (!(key in process.env)) process.env[key] = value
  }
}
loadEnvLocal()

// ─── Config ──────────────────────────────────────────────────────────────
const TARGET_THEMES = ['fork', 'pin', 'skewer', 'discoveredAttack', 'hangingPiece', 'backRankMate', 'endgame'] as const
type TargetTheme = (typeof TARGET_THEMES)[number]
const PUZZLES_PER_THEME = 8 // within the requested 5-10 spread
const PROGRESS_EVERY = 500_000

interface LichessPuzzleRow {
  PuzzleId: string
  FEN: string
  Moves: string
  Rating: string
  Popularity: string
  Themes: string
}

// ─── Streaming CSV scan ──────────────────────────────────────────────────
// Lichess's puzzle CSV has no embedded commas in any column we use (FEN uses
// spaces/slashes, Moves and Themes are space-separated, Rating/Popularity
// are plain numbers) — a plain split is sufficient here, this is not a
// general-purpose RFC4180 CSV parser.
//
// Rather than materialize all ~6M rows, we bucket each row into every
// target theme it matches as we read it. This reproduces the original
// per-theme `rows.filter(...)` semantics (a row lands in a theme's bucket
// iff its Themes column includes that theme) in a single pass.
async function scanCsv(csvPath: string): Promise<Map<TargetTheme, LichessPuzzleRow[]>> {
  const buckets = new Map<TargetTheme, LichessPuzzleRow[]>(TARGET_THEMES.map((t) => [t, []]))
  const targetSet = new Set<string>(TARGET_THEMES)

  const rl = createInterface({ input: createReadStream(csvPath, { encoding: 'utf8' }), crlfDelay: Infinity })

  let header: string[] | null = null
  let idxPuzzleId = -1
  let idxFen = -1
  let idxMoves = -1
  let idxRating = -1
  let idxPopularity = -1
  let idxThemes = -1
  let lineNo = 0
  let matched = 0

  for await (const line of rl) {
    lineNo++
    if (!header) {
      header = line.split(',').map((h) => h.trim())
      const colIndex = (name: string) => {
        const idx = header!.indexOf(name)
        if (idx === -1) throw new Error(`CSV is missing expected column "${name}". Found columns: ${header!.join(', ')}`)
        return idx
      }
      idxPuzzleId = colIndex('PuzzleId')
      idxFen = colIndex('FEN')
      idxMoves = colIndex('Moves')
      idxRating = colIndex('Rating')
      idxPopularity = colIndex('Popularity')
      idxThemes = colIndex('Themes')
      continue
    }
    if (!line.trim()) continue

    const cols = line.split(',')
    if (cols.length < header.length) continue // skip malformed/short lines

    const themesField = cols[idxThemes].trim()
    if (!themesField) continue
    const rowThemes = themesField.split(' ')
    // Cheap pre-check before allocating the row object.
    if (!rowThemes.some((t) => targetSet.has(t))) continue

    const row: LichessPuzzleRow = {
      PuzzleId: cols[idxPuzzleId].trim(),
      FEN: cols[idxFen].trim(),
      Moves: cols[idxMoves].trim(),
      Rating: cols[idxRating].trim(),
      Popularity: cols[idxPopularity].trim(),
      Themes: themesField,
    }
    matched++
    for (const theme of rowThemes) {
      if (targetSet.has(theme)) buckets.get(theme as TargetTheme)!.push(row)
    }

    if (lineNo % PROGRESS_EVERY === 0) {
      console.log(`  scanned ${lineNo.toLocaleString()} lines, ${matched.toLocaleString()} matched a target theme so far...`)
    }
  }

  console.log(`Scanned ${lineNo.toLocaleString()} lines total, ${matched.toLocaleString()} rows matched a target theme.`)
  return buckets
}

// ─── Theme-balanced, rating-spread selection ────────────────────────────
// For each target theme (in order): drop puzzles already claimed by an
// earlier theme, sort the remainder by rating, then take evenly spaced
// picks so difficulty progresses low-to-high within the theme rather than
// clustering around whatever's most common.
function selectCuratedPuzzles(buckets: Map<TargetTheme, LichessPuzzleRow[]>): Map<TargetTheme, LichessPuzzleRow[]> {
  const claimed = new Set<string>()
  const selection = new Map<TargetTheme, LichessPuzzleRow[]>()

  for (const theme of TARGET_THEMES) {
    const candidates = (buckets.get(theme) ?? [])
      .filter((r) => !claimed.has(r.PuzzleId))
      .sort((a, b) => Number(a.Rating) - Number(b.Rating))

    if (candidates.length === 0) {
      selection.set(theme, [])
      continue
    }

    const count = Math.min(PUZZLES_PER_THEME, candidates.length)
    const picks: LichessPuzzleRow[] = []
    for (let i = 0; i < count; i++) {
      // Evenly spaced index across the sorted candidate list.
      const idx = count === 1 ? 0 : Math.round((i * (candidates.length - 1)) / (count - 1))
      picks.push(candidates[idx])
    }
    // Dedupe in case the spread math picked the same index twice for a short list.
    const seen = new Set<string>()
    const uniquePicks = picks.filter((p) => (seen.has(p.PuzzleId) ? false : (seen.add(p.PuzzleId), true)))

    uniquePicks.forEach((p) => claimed.add(p.PuzzleId))
    selection.set(theme, uniquePicks)
  }

  return selection
}

async function main() {
  const csvPath = resolve(PROJECT_ROOT, process.argv[2] ?? 'data/lichess_puzzles.csv')
  if (!existsSync(csvPath)) {
    console.error(`CSV file not found at ${csvPath}`)
    console.error('Download it from https://database.lichess.org/#puzzles and place it there, or pass a path:')
    console.error('  npm run import-puzzles -- path/to/puzzles.csv')
    process.exit(1)
  }

  const url = process.env.SUPABASE_URL
  const secretKey = process.env.SUPABASE_SECRET_KEY
  if (!url || !secretKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SECRET_KEY. Fill in .env.local before running this script.')
    process.exit(1)
  }

  console.log(`Streaming ${csvPath}...`)
  const buckets = await scanCsv(csvPath)
  const selection = selectCuratedPuzzles(buckets)

  const toInsert: {
    lichess_puzzle_id: string
    fen: string
    moves: string
    rating: number
    themes: string[]
    popularity: number
  }[] = []
  for (const picks of selection.values()) {
    for (const p of picks) {
      toInsert.push({
        lichess_puzzle_id: p.PuzzleId,
        fen: p.FEN,
        moves: p.Moves,
        rating: Number(p.Rating),
        themes: p.Themes.split(' ').filter(Boolean),
        popularity: Number(p.Popularity) || 0,
      })
    }
  }

  if (toInsert.length === 0) {
    console.log('Nothing matched the target themes — nothing to insert. Check the CSV contents.')
    return
  }

  console.log(`Inserting ${toInsert.length} curated puzzles into Supabase...`)
  const supabaseAdmin = createClient(url, secretKey)
  const { error } = await supabaseAdmin.from('puzzles').upsert(toInsert, { onConflict: 'lichess_puzzle_id' })
  if (error) {
    console.error('Insert failed:', error.message)
    process.exit(1)
  }

  console.log('\n=== Import summary ===')
  for (const theme of TARGET_THEMES) {
    const picks = selection.get(theme) ?? []
    const ratings = picks.map((p) => p.Rating).join(', ')
    console.log(`  ${theme}: ${picks.length} puzzles${picks.length ? ` (ratings: ${ratings})` : ' — none found in CSV'}`)
  }
  console.log(`Total imported: ${toInsert.length}`)
}

main().catch((err) => {
  console.error('Import failed:', err)
  process.exit(1)
})
