import { PUZZLE_THEMES, THEME_LABELS } from './puzzleThemes'
import type { PuzzleOutcome } from './puzzleLogic'

// Pure presentation + paging helpers for My Activity (unit tested).

export const PAGE_SIZE = 20

/** Keyset cursor "<ISO timestamp>|<id>" — stable under inserts (offsets are not), and safe to put in a URL. */
export interface Cursor {
  at: string
  id: string
}
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function encodeCursor(c: Cursor): string {
  return `${c.at}|${c.id}`
}

/** Rejects anything that isn't exactly a timestamp and a UUID — the value is spliced into a filter, so it must be strict. */
export function parseCursor(raw: string | undefined | null): Cursor | null {
  if (!raw) return null
  const [at, id, extra] = raw.split('|')
  if (extra !== undefined || !at || !id) return null
  if (!UUID.test(id) || Number.isNaN(Date.parse(at)) || !/^[0-9T:.+\-Z ]+$/.test(at)) return null
  return { at, id }
}

export function pickFilter<T extends string>(raw: string | undefined, allowed: readonly T[], fallback: T): T {
  return allowed.includes(raw as T) ? (raw as T) : fallback
}

// ─── Puzzles ──────────────────────────────────────────────────────────────

/** The first of OUR topics the puzzle carries, in the catalogue's own order (a puzzle can have many tags). */
export function topicFor(themes: string[] | null | undefined): { slug: string; label: string } | null {
  const slug = PUZZLE_THEMES.find((t) => themes?.includes(t))
  return slug ? { slug, label: THEME_LABELS[slug] ?? slug } : null
}

export type AttemptOutcome = PuzzleOutcome | 'attempted'

export function attemptOutcome(row: { outcome?: string | null; solved: boolean }): AttemptOutcome {
  const o = row.outcome
  if (o === 'solved' || o === 'solved_with_hint' || o === 'solution_viewed' || o === 'skipped') return o
  // Rows written before outcomes were tracked only know solved/not solved.
  return row.solved ? 'solved' : 'attempted'
}

export const OUTCOME_LABEL: Record<AttemptOutcome, string> = {
  solved: 'Solved on your own',
  solved_with_hint: 'Solved with hints',
  solution_viewed: 'Solution viewed',
  skipped: 'Skipped',
  attempted: 'Attempted, not solved',
}

export function assistanceText(row: { hints_used?: number | null; wrong_attempts?: number | null }, outcome: AttemptOutcome): string {
  const bits: string[] = []
  if (row.hints_used) bits.push(`${row.hints_used} hint${row.hints_used === 1 ? '' : 's'}`)
  if (row.wrong_attempts) bits.push(`${row.wrong_attempts} wrong move${row.wrong_attempts === 1 ? '' : 's'}`)
  if (outcome === 'solution_viewed') bits.push('solution shown')
  return bits.length ? bits.join(' · ') : 'No help used'
}

// ─── Games ────────────────────────────────────────────────────────────────

export const GAME_STATUS_LABEL: Record<string, string> = {
  in_progress: 'In progress',
  completed: 'Finished',
  resigned: 'Resigned',
  abandoned: 'Abandoned',
}

/** "2026-11-09T18:03:11Z" -> "9 Nov 2026" (the player's own calendar date is not known server-side, so UTC date is used). */
export function shortDate(iso: string | null | undefined): string {
  if (!iso) return ''
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(iso))
}
