import { getSupabase } from './supabase'
import { PUZZLE_THEMES } from './puzzleThemes'

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

export function computeBands(ratings: number[]): ThemeBands {
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

export { PUZZLE_THEMES, THEME_LABELS, type PuzzleTheme } from './puzzleThemes'

/** Rows are fetched in pages of this size — Supabase caps a single response (default 1000 rows), so one unpaged select would silently truncate counts once the catalogue grows past it. */
const PAGE_SIZE = 1000

/**
 * One row per theme that actually has puzzles — themes with zero rows are omitted.
 *
 * One (paged) query for the whole catalogue, grouped here. This used to be
 * one query per theme run back-to-back (18 sequential round trips), which is
 * what made /chess/puzzles take seconds to answer. Throws on a database
 * error instead of returning a partial list, so the page's error boundary
 * can offer a retry rather than showing "No puzzles are available yet" for
 * what is really a failed load.
 */
export async function getThemeSummaries(): Promise<ThemeSummary[]> {
  const supabase = getSupabase()
  const byTheme = new Map<string, number[]>()

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from('puzzles')
      .select('rating, themes')
      .overlaps('themes', [...PUZZLE_THEMES])
      .order('id')
      .range(from, from + PAGE_SIZE - 1)
    if (error) throw new Error(`getThemeSummaries: ${error.message}`)
    for (const row of data ?? []) {
      for (const theme of row.themes as string[]) {
        if (!(PUZZLE_THEMES as readonly string[]).includes(theme)) continue
        const list = byTheme.get(theme) ?? []
        list.push(row.rating as number)
        byTheme.set(theme, list)
      }
    }
    if (!data || data.length < PAGE_SIZE) break
  }

  return PUZZLE_THEMES.flatMap((theme) => {
    const ratings = byTheme.get(theme)
    if (!ratings || ratings.length === 0) return []
    return [{ theme, count: ratings.length, minRating: Math.min(...ratings), maxRating: Math.max(...ratings), bands: computeBands(ratings) }]
  })
}

/** Every puzzle for one theme, easiest first. Throws on a database error (see getThemeSummaries). */
export async function getThemePuzzles(theme: string): Promise<PuzzleRow[]> {
  const supabase = getSupabase()
  const rows: PuzzleRow[] = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from('puzzles')
      .select('*')
      .contains('themes', [theme])
      .order('rating', { ascending: true })
      .order('id')
      .range(from, from + PAGE_SIZE - 1)
    if (error) throw new Error(`getThemePuzzles("${theme}"): ${error.message}`)
    rows.push(...((data ?? []) as PuzzleRow[]))
    if (!data || data.length < PAGE_SIZE) break
  }
  return rows
}

/** Restrict an already-loaded, rating-sorted theme set to one band — the page loads the theme once and derives both its band availability and the filtered set from it. */
export function filterByLevel(puzzles: PuzzleRow[], level: DifficultyLevel): PuzzleRow[] {
  if (level === 'all') return puzzles
  const { min, max } = RATING_BANDS[level]
  return puzzles.filter((p) => p.rating >= min && p.rating <= max)
}
