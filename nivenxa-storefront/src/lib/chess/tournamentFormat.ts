import type { ChessTournament, TournamentCategoryResult } from './types'

// Plain, framework-agnostic formatting helpers shared by the client card
// list (TournamentListing.tsx, 'use client') and the server-rendered detail
// page ([id]/page.tsx). Deliberately NOT in TournamentListing.tsx itself —
// a plain function exported from a 'use client' file can still be called
// directly from a Server Component in dev (and fails at runtime: "Attempted
// to call formatDateRange() from the server but formatDateRange is on the
// client"), since 'use client' marks the whole module's exports as
// client-only references, not just its actual React components.
/**
 * All Nivenxa events are in India and the `tournaments` table has no timezone column, so "today" and every date
 * shown for an event is the calendar date in this zone — not the server's, not the visitor's. Event dates are
 * plain `date` values (no time of day).
 */
export const EVENT_TIME_ZONE = 'Asia/Kolkata'

/** Today's calendar date (YYYY-MM-DD) in the event timezone. The old `new Date().toISOString().slice(0, 10)` was the UTC date, which is still "yesterday" for the first 5½ hours of an Indian day. */
export function todayInEventZone(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: EVENT_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
}

/**
 * A date-only value ("2026-11-15") is parsed as UTC midnight, so it must be FORMATTED in UTC too. Formatting in the
 * viewer's zone showed "14 November" to anyone west of UTC and made the server and browser renders disagree.
 */
const DATE_ONLY_ZONE = 'UTC'

export function formatDateRange(tournament: ChessTournament) {
  const start = new Date(tournament.dates.startsAt)
  const end = tournament.dates.endsAt ? new Date(tournament.dates.endsAt) : undefined

  // "2 October 2026", not "02 Oct 2026" — a leading zero and an abbreviated
  // month read as a system timestamp; this is a date a parent reads on a page.
  const dateFormatter = new Intl.DateTimeFormat('en', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: DATE_ONLY_ZONE,
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

/** Compact date for the home card: "15 Nov 2026", or "15–16 Nov 2026" / "30 Nov – 1 Dec 2026" for a range. */
export function formatCardDate(startsAt: string, endsAt?: string): string {
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric', timeZone: DATE_ONLY_ZONE }
  const f = new Intl.DateTimeFormat('en-GB', opts)
  const start = new Date(startsAt)
  if (!endsAt || endsAt === startsAt) return f.format(start)
  return f.formatRange(start, new Date(endsAt))
}

/** A short "12 Nov" for a deadline. */
export function formatShortDate(date: string): string {
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: DATE_ONLY_ZONE }).format(new Date(date))
}

/**
 * The venue's area for a compact card, from the single free-text `location_name`. Drops a trailing state/PIN part
 * ("Telangana 500090") and keeps the last two parts (area + city), e.g.
 * "…, Panchavati Complex, Pragathi Nagar, Hyderabad, Telangana 500090" -> "Pragathi Nagar, Hyderabad".
 * A short label is returned unchanged. The full label stays on the details page (and in the card's tooltip).
 */
export function venueArea(label: string): string {
  const parts = label.split(',').map((p) => p.trim()).filter(Boolean)
  const withoutPin = parts.filter((p) => !/\b\d{6}\b/.test(p))
  const usable = withoutPin.length > 0 ? withoutPin : parts
  if (usable.length <= 2) return usable.join(', ')
  return usable.slice(-2).join(', ')
}

// ─── Event details presentation ──────────────────────────────────────────────

function dateParts(iso: string) {
  const d = new Date(iso)
  const f = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-GB', { ...o, timeZone: DATE_ONLY_ZONE }).format(d)
  return { weekday: f({ weekday: 'long' }), day: f({ day: 'numeric' }), month: f({ month: 'long' }), year: f({ year: 'numeric' }) }
}

/**
 * "Sunday, 15 November 2026" from the stored event date (a plain date: formatted in UTC so it can't shift a day);
 * a range reads "Saturday, 14 – Sunday, 15 November 2026" or "Monday, 30 November – Tuesday, 1 December 2026".
 * Event data holds dates only, so no time of day is ever produced here.
 */
export function formatLongDate(startsAt: string, endsAt?: string): string {
  const s = dateParts(startsAt)
  if (!endsAt || endsAt === startsAt) return `${s.weekday}, ${s.day} ${s.month} ${s.year}`
  const e = dateParts(endsAt)
  if (s.month === e.month && s.year === e.year) return `${s.weekday}, ${s.day} – ${e.weekday}, ${e.day} ${e.month} ${e.year}`
  if (s.year === e.year) return `${s.weekday}, ${s.day} ${s.month} – ${e.weekday}, ${e.day} ${e.month} ${e.year}`
  return `${s.weekday}, ${s.day} ${s.month} ${s.year} – ${e.weekday}, ${e.day} ${e.month} ${e.year}`
}

const inr = (digits: string) => `₹${Number(digits.replace(/,/g, '')).toLocaleString('en-IN')}`

/**
 * Rupee amounts from the stored free text, shown as "₹600" / "₹15,000" (Indian digit grouping). Only recognisable
 * amounts are touched: a bare number ("600"), or a number written with ₹ / Rs / INR. Any other wording is returned
 * exactly as stored — nothing is converted, estimated or added.
 */
export function formatMoney(value: string): string {
  const v = value.trim()
  if (/^\d[\d,]*$/.test(v)) return inr(v)
  return v.replace(/(?:₹|Rs\.?|INR)\s*(\d[\d,]*)(?![\d,]*\.\d)/gi, (_m, d: string) => inr(d))
}

/**
 * "25+10 Rapid" -> "25 min + 10 sec/move (Rapid)". Only the standard "minutes+increment" shape is rewritten;
 * anything else is returned as stored. "Unknown" (the importer's placeholder) yields undefined — nothing to show.
 */
export function formatTimeControl(value: string | undefined): string | undefined {
  const v = value?.trim()
  if (!v || v === 'Unknown') return undefined
  const m = v.match(/^(\d+)\s*(?:mints?|mins?|minutes?|m)?\s*\+\s*(\d+)\s*(?:secs?|seconds?|s)?(?:\/move)?\s*([A-Za-z]+)?$/i)
  if (!m) return v
  return `${m[1]} min + ${m[2]} sec/move${m[3] ? ` (${m[3]})` : ''}`
}

/** Venue name = the first part of the stored text; the rest is the address. Both are the stored words, untouched. */
export function splitVenue(label: string): { name: string; address?: string } {
  const parts = label.split(',').map((p) => p.trim()).filter(Boolean)
  if (parts.length <= 1) return { name: label.trim() }
  return { name: parts[0], address: parts.slice(1).join(', ') }
}

/** The stored map link (built from saved coordinates) when there is one, else a map search on the venue's own text. */
export function directionsHref(t: { links: { mapUrl?: string }; location: { label: string } }): string {
  return t.links.mapUrl ?? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(t.location.label)}`
}
