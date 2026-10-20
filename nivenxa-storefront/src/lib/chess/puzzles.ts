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

export type DifficultyLevel = 'all' | 'beginner' | 'intermediate' | 'advanced'

export function isDifficultyLevel(value: string | string[] | undefined): value is DifficultyLevel {
  return value === 'all' || value === 'beginner' || value === 'intermediate' || value === 'advanced'
}

/**
 * Rating bands applied to every theme's puzzle set. Thresholds per the brief:
 * beginner <=1200, intermediate 1201-1800, advanced >1800. `max: 10000` on
 * advanced is just "no real upper bound" — the highest rating in the
 * catalogue is ~3300, so it never clips anything.
 */
export const RATING_BANDS: Record<Exclude<DifficultyLevel, 'all'>, { label: string; min: number; max: number }> = {
  beginner: { label: 'Beginner', min: 0, max: 1200 },
  intermediate: { label: 'Intermediate', min: 1201, max: 1800 },
  advanced: { label: 'Advanced', min: 1801, max: 10000 },
}

/**
 * A band with fewer puzzles than this is worse than no filter at all — a
 * "Beginner" link that leads to one or two puzzles reads as broken, not
 * curated. Below this floor, a theme's band is treated as unavailable: the
 * UI doesn't link to it, and a direct/stale URL for it falls back to the
 * theme's full set rather than a near-empty page.
 */
export const MIN_BAND_PUZZLES = 8

export interface ThemeBandSummary {
  count: number
  minRating: number
  maxRating: number
}

export type ThemeBands = Record<Exclude<DifficultyLevel, 'all'>, ThemeBandSummary | null>

export interface ThemeSummary {
  theme: string
  count: number
  minRating: number
  maxRating: number
  bands: ThemeBands
}

/** True for 'all' (always available) or a band with at least MIN_BAND_PUZZLES puzzles. */
export function isBandAvailable(bands: ThemeBands, level: DifficultyLevel): boolean {
  if (level === 'all') return true
  const band = bands[level]
  return !!band && band.count >= MIN_BAND_PUZZLES
}

function computeBands(ratings: number[]): ThemeBands {
  const bands: ThemeBands = { beginner: null, intermediate: null, advanced: null }
  for (const level of Object.keys(RATING_BANDS) as Exclude<DifficultyLevel, 'all'>[]) {
    const { min, max } = RATING_BANDS[level]
    const inBand = ratings.filter((r) => r >= min && r <= max)
    if (inBand.length > 0) {
      bands[level] = { count: inBand.length, minRating: Math.min(...inBand), maxRating: Math.max(...inBand) }
    }
  }
  return bands
}

/** Curated theme set from the puzzle import script — see scripts/import-puzzles.ts. */
export const PUZZLE_THEMES = [
  'fork',
  'pin',
  'skewer',
  'discoveredAttack',
  'hangingPiece',
  'backRankMate',
  'endgame',
  'mateIn1',
  'mateIn2',
  'doubleCheck',
  'deflection',
  'sacrifice',
  'capturingDefender',
  'intermezzo',
  'clearance',
  'attraction',
  'interference',
  'trappedPiece',
] as const
export type PuzzleTheme = (typeof PUZZLE_THEMES)[number]

export const THEME_LABELS: Record<string, string> = {
  fork: 'Forks',
  pin: 'Pins',
  skewer: 'Skewers',
  discoveredAttack: 'Discovered Attacks',
  hangingPiece: 'Hanging Pieces',
  backRankMate: 'Back-Rank Mates',
  endgame: 'Endgames',
  mateIn1: 'Mate in One',
  mateIn2: 'Mate in Two',
  doubleCheck: 'Double Checks',
  deflection: 'Deflection',
  sacrifice: 'Sacrifices',
  capturingDefender: 'Removing the Defender',
  intermezzo: 'In-Between Moves',
  clearance: 'Clearance',
  attraction: 'Decoys',
  interference: 'Interference',
  trappedPiece: 'Trapped Pieces',
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
      bands: computeBands(ratings),
    })
  }

  return summaries
}

/** One theme's band availability — used by the per-theme page, which only needs this one theme's bands, not the whole catalogue's. */
export async function getThemeBands(theme: string): Promise<ThemeBands> {
  const supabase = getSupabase()
  const { data, error } = await supabase.from('puzzles').select('rating').contains('themes', [theme])
  if (error || !data) return { beginner: null, intermediate: null, advanced: null }
  return computeBands(data.map((r) => r.rating as number))
}

/**
 * Puzzles for one theme, ordered easiest-first (matches the import script's
 * low-to-high curation). `level` restricts to that rating band server-side —
 * the puzzle count the caller sees back (and therefore the "Puzzle X of N"
 * counter) is already the filtered count, not the whole theme's.
 */
export async function getPuzzlesByTheme(theme: string, level: DifficultyLevel = 'all'): Promise<PuzzleRow[]> {
  const supabase = getSupabase()
  let query = supabase.from('puzzles').select('*').contains('themes', [theme])
  if (level !== 'all') {
    const { min, max } = RATING_BANDS[level]
    query = query.gte('rating', min).lte('rating', max)
  }
  const { data, error } = await query.order('rating', { ascending: true })
  if (error) {
    console.error(`getPuzzlesByTheme: failed to load "${theme}" —`, error.message)
    return []
  }
  return (data ?? []) as PuzzleRow[]
}
