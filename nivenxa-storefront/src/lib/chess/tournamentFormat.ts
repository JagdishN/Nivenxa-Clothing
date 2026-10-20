import type { ChessTournament, TournamentCategoryResult } from './types'

// Plain, framework-agnostic formatting helpers shared by the client card
// list (TournamentListing.tsx, 'use client') and the server-rendered detail
// page ([id]/page.tsx). Deliberately NOT in TournamentListing.tsx itself —
// a plain function exported from a 'use client' file can still be called
// directly from a Server Component in dev (and fails at runtime: "Attempted
// to call formatDateRange() from the server but formatDateRange is on the
// client"), since 'use client' marks the whole module's exports as
// client-only references, not just its actual React components.
export function formatDateRange(tournament: ChessTournament) {
  const start = new Date(tournament.dates.startsAt)
  const end = tournament.dates.endsAt ? new Date(tournament.dates.endsAt) : undefined

  // "2 October 2026", not "02 Oct 2026" — a leading zero and an abbreviated
  // month read as a system timestamp; this is a date a parent reads on a page.
  const dateFormatter = new Intl.DateTimeFormat('en', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  if (!end || dateFormatter.format(start) === dateFormatter.format(end)) {
    return dateFormatter.format(start)
  }

  return `${dateFormatter.format(start)} - ${dateFormatter.format(end)}`
}

// Categories are entered one at a time as results come in (see
// scripts/_add_*_results.ts, run ad hoc), so they land in the `results`
// jsonb column in whatever order they were typed — not youngest-to-oldest.
// Sort by the age number in the category name (U7 before U9 before U11...)
// with "Open" before any other subdivision (Girls, etc.) within the same age.
export function sortTournamentResults(results: TournamentCategoryResult[]): TournamentCategoryResult[] {
  return [...results].sort((a, b) => {
    const ageA = Number(a.category.match(/\d+/)?.[0] ?? Number.MAX_SAFE_INTEGER)
    const ageB = Number(b.category.match(/\d+/)?.[0] ?? Number.MAX_SAFE_INTEGER)
    if (ageA !== ageB) return ageA - ageB

    const isOpenA = /open/i.test(a.category)
    const isOpenB = /open/i.test(b.category)
    if (isOpenA !== isOpenB) return isOpenA ? -1 : 1

    return a.category.localeCompare(b.category)
  })
}

/**
 * Splits a stored category string ("U7 Open", "U7 Girls") into its age
 * group ("U7") and subdivision ("Open") — powers the Results tab switcher's
 * two-level control (age group, then Open/Girls within it) instead of one
 * flat row of seven pills that wraps awkwardly.
 */
export function parseCategoryLabel(category: string): { ageGroup: string; subdivision: string } {
  const [ageGroup, ...rest] = category.split(' ')
  return { ageGroup, subdivision: rest.join(' ') || 'Open' }
}

/**
 * True once two categories in the same tournament played a different
 * number of rounds (e.g. U14 Open ran 4 while everything else ran 5) — the
 * single tournament-wide "format" string (e.g. "5 Rounds") shown on the
 * event summary can't speak for every category when this is true, so the
 * caller should caveat it rather than silently letting it say the wrong
 * thing for the category that ran shorter.
 */
export function roundsVaryAcrossCategories(results: TournamentCategoryResult[] | undefined): boolean {
  if (!results || results.length < 2) return false
  return new Set(results.map((r) => r.totalRounds)).size > 1
}

/** 1 -> "1st", 2 -> "2nd", 11 -> "11th", 23 -> "23rd" — for a results standings list. */
export function ordinal(rank: number): string {
  const lastTwo = rank % 100
  const last = rank % 10
  if (lastTwo >= 11 && lastTwo <= 13) return `${rank}th`
  if (last === 1) return `${rank}st`
  if (last === 2) return `${rank}nd`
  if (last === 3) return `${rank}rd`
  return `${rank}th`
}
