import { getSupabase } from './supabase'

export interface PuzzleRow {
  id: string
  lichess_puzzle_id: string
  fen: string
  moves: string
  rating: number
  themes: string[]
  popularity: number
  created_at: string
}

export interface ThemeSummary {
  theme: string
  count: number
  minRating: number
  maxRating: number
}

/** Curated theme set from the puzzle import script — see scripts/import-puzzles.ts. */
export const PUZZLE_THEMES = ['fork', 'pin', 'skewer', 'discoveredAttack', 'hangingPiece', 'backRankMate', 'endgame'] as const
export type PuzzleTheme = (typeof PUZZLE_THEMES)[number]

export const THEME_LABELS: Record<string, string> = {
  fork: 'Forks',
  pin: 'Pins',
  skewer: 'Skewers',
  discoveredAttack: 'Discovered Attacks',
  hangingPiece: 'Hanging Pieces',
  backRankMate: 'Back-Rank Mates',
  endgame: 'Endgames',
}

/** One row per theme that actually has puzzles — themes with zero rows are omitted. */
export async function getThemeSummaries(): Promise<ThemeSummary[]> {
  const supabase = getSupabase()
  const summaries: ThemeSummary[] = []

  for (const theme of PUZZLE_THEMES) {
    const { data, error } = await supabase.from('puzzles').select('rating').contains('themes', [theme])
    if (error) {
      console.error(`getThemeSummaries: failed to load "${theme}" —`, error.message)
      continue
    }
    if (!data || data.length === 0) continue
    const ratings = data.map((r) => r.rating as number)
    summaries.push({
      theme,
      count: ratings.length,
      minRating: Math.min(...ratings),
      maxRating: Math.max(...ratings),
    })
  }

  return summaries
}

/** Puzzles for one theme, ordered easiest-first (matches the import script's low-to-high curation). */
export async function getPuzzlesByTheme(theme: string): Promise<PuzzleRow[]> {
  const supabase = getSupabase()
  const { data, error } = await supabase.from('puzzles').select('*').contains('themes', [theme]).order('rating', { ascending: true })
  if (error) {
    console.error(`getPuzzlesByTheme: failed to load "${theme}" —`, error.message)
    return []
  }
  return (data ?? []) as PuzzleRow[]
}
