import { getSupabase } from './supabase'
import type {
  ChessTournament,
  TournamentCategory,
  TournamentDisplayType,
  TournamentFormat,
  TournamentGroup,
  TournamentSourceName,
  TournamentTimeControl,
} from './types'

/** Shape of a row in the `tournaments` table — see supabase/schema.sql. */
export interface TournamentRow {
  id: string
  name: string
  country: string
  tournament_type: string
  start_date: string
  end_date: string | null
  location_name: string
  latitude: number | null
  longitude: number | null
  fide_rated: boolean
  time_control: string
  format: string
  top_players: string | null
  prize_pool: string | null
  /** Freeform, e.g. "₹650" — shown as primary info on the card, see TournamentListing.tsx. */
  entry_fee: string | null
  /** Freeform comma-separated age/skill categories, e.g. "U7, U9, U11, U14". */
  categories: string | null
  organizer_name: string
  organizer_verified: boolean
  register_url: string | null
  organizer_whatsapp: string | null
  payment_qr_url: string | null
  /** Internal admin provenance note only — never surfaced on the public page. */
  payment_qr_source: string | null
  payment_note: string | null
  source: string
  source_reference: string | null
  verified: boolean
  is_live: boolean
  is_nivenxa_organized: boolean
  created_at: string
  updated_at: string
}

const CATEGORY_BY_TYPE: Record<string, TournamentCategory> = {
  International: 'Elite',
  National: 'Professional',
  Local: 'Community',
  Academy: 'Community',
}

/**
 * Maps the admin form's flat `tournaments` row onto the richer `ChessTournament`
 * shape the existing `TournamentListing` UI already renders, so that UI (and
 * its types) can stay completely unchanged. A handful of fields don't have a
 * matching column in the flat schema and are approximated here — documented
 * inline below rather than left as silent guesses.
 */
function mapRowToChessTournament(row: TournamentRow, lifecycleStatus: 'live' | 'upcoming' | 'completed'): ChessTournament {
  const mapUrl = row.latitude != null && row.longitude != null ? `https://www.google.com/maps?q=${row.latitude},${row.longitude}` : undefined

  // `source` in the DB is a lowercase provenance tag ('manual'/'imported'/'submitted'),
  // not one of TournamentSourceName's real-service values — capitalize it for display
  // (the UI just shows this as a small badge next to the title) rather than pretend to
  // know which actual service an "imported" row came from.
  const sourceName = (row.source.charAt(0).toUpperCase() + row.source.slice(1)) as TournamentSourceName

  return {
    id: row.id,
    title: row.name,
    // Not collected by the admin form — approximated from tournament_type since
    // nothing in TournamentListing.tsx actually renders `category` today.
    category: CATEGORY_BY_TYPE[row.tournament_type] ?? 'Community',
    lifecycleStatus,
    source: {
      name: sourceName,
      url: row.register_url ?? '',
      externalId: row.source_reference ?? row.id,
    },
    links: {
      // No dedicated "info page" column exists separately from the registration
      // link — reuse register_url for both, falling back to '#' if neither the
      // organizer gave a URL nor a source_reference exists.
      tournamentUrl: row.register_url ?? row.source_reference ?? '#',
      registrationUrl: row.register_url ?? undefined,
      mapUrl,
    },
    country: row.country,
    // 'Local' is a real value the admin form accepts but isn't in the original
    // TournamentDisplayType union — cast rather than reject; Tournaments.module.scss
    // has a matching `.typeLocal` pill style so it still renders with real styling.
    tournamentType: row.tournament_type as TournamentDisplayType,
    dates: {
      startsAt: row.start_date,
      endsAt: row.end_date ?? undefined,
    },
    location: {
      // The flat schema has no explicit online/otb/hybrid flag — every admin-entered
      // tournament is assumed over-the-board, the common case for a named venue.
      mode: 'otb',
      label: row.location_name,
    },
    fideRated: row.fide_rated,
    timeControl: row.time_control as TournamentTimeControl,
    format: row.format as TournamentFormat,
    // Freeform comma-separated names, not the structured {name,title,rating,country}
    // shape topPlayers normally carries — the admin form has one text field, not a
    // player-by-player editor. Splitting on commas is the most we can recover from it.
    topPlayers: row.top_players
      ? row.top_players
          .split(',')
          .map((name) => ({ name: name.trim() }))
          .filter((p) => p.name.length > 0)
      : [],
    prizePool: row.prize_pool ? { label: row.prize_pool, verified: row.verified } : undefined,
    entryFee: row.entry_fee ?? undefined,
    categories: row.categories ?? undefined,
    organizer: {
      name: row.organizer_name,
      verified: row.organizer_verified,
      whatsapp: row.organizer_whatsapp ?? undefined,
    },
    // Previously gated entirely behind payment_qr_url existing — meant a
    // tournament with real prize/payment text in payment_note but no QR
    // image uploaded yet (like this one) showed none of it anywhere.
    payment:
      row.payment_qr_url || row.payment_note
        ? { qrUrl: row.payment_qr_url ?? undefined, note: row.payment_note ?? undefined }
        : undefined,
    trust: {
      score: row.verified ? 100 : 0,
      reasons: row.verified ? ['Verified by Nivenxa Chess admin'] : [],
    },
  }
}

/**
 * Public tournaments feed — the only tables/rows the /chess/tournaments page
 * is allowed to show. Both queries filter on `verified = true` in application
 * code; note that RLS is currently OFF (see supabase/schema.sql), so this
 * filter is not a security boundary yet, only a display one.
 *
 * Also filters on `is_nivenxa_organized = true` — the Tournaments tab was
 * previously a multi-source discovery board (FIDE/Lichess/ChessResults/
 * academy/club listings, see the now-unused `seedTournaments.ts`/
 * `TournamentService.ts`), explicitly narrowed (2026-10-01) to show only
 * Nivenxa's own organized events. Third-party tournament rows can still
 * exist in the table (e.g. for internal reference) but never surface here.
 */
export async function getPublicTournaments(): Promise<TournamentGroup[]> {
  const supabase = getSupabase()
  const todayIso = new Date().toISOString().slice(0, 10)

  const [liveResult, upcomingResult] = await Promise.all([
    supabase
      .from('tournaments')
      .select('*')
      .eq('verified', true)
      .eq('is_nivenxa_organized', true)
      .eq('is_live', true)
      .order('start_date', { ascending: true }),
    supabase
      .from('tournaments')
      .select('*')
      .eq('verified', true)
      .eq('is_nivenxa_organized', true)
      .eq('is_live', false)
      .gte('start_date', todayIso)
      .order('start_date', { ascending: true }),
  ])

  if (liveResult.error) console.error('getPublicTournaments: failed to load live tournaments —', liveResult.error.message)
  if (upcomingResult.error) console.error('getPublicTournaments: failed to load upcoming tournaments —', upcomingResult.error.message)

  const live = ((liveResult.data ?? []) as TournamentRow[]).map((row) => mapRowToChessTournament(row, 'live'))
  const upcoming = ((upcomingResult.data ?? []) as TournamentRow[]).map((row) => mapRowToChessTournament(row, 'upcoming'))

  const groups: TournamentGroup[] = [
    { status: 'live', label: 'Live Now', tournaments: live },
    { status: 'upcoming', label: 'Upcoming', tournaments: upcoming },
  ]
  // An empty "Live Now" used to always render anyway (with its own "nothing
  // live right now" copy) — changed on direct feedback that a parent should
  // land straight on real tournaments, not read past an empty section
  // first. Both groups are dropped equally when empty now.
  return groups.filter((group) => group.tournaments.length > 0)
}

/**
 * Completed Nivenxa-organized tournaments for /chess/tournaments/archive —
 * replaces the old TournamentService.getArchivedTournamentGroups() (hardcoded
 * FIDE/Tata Steel/Lichess seed data, unrelated to anything Nivenxa actually
 * ran), per the 2026-10-01 Nivenxa-only pivot. "Completed" = verified,
 * Nivenxa-organized, start_date before today — most recent first.
 */
export async function getNivenxaArchiveTournaments(): Promise<TournamentGroup[]> {
  const supabase = getSupabase()
  const todayIso = new Date().toISOString().slice(0, 10)

  const { data, error } = await supabase
    .from('tournaments')
    .select('*')
    .eq('verified', true)
    .eq('is_nivenxa_organized', true)
    .lt('start_date', todayIso)
    .order('start_date', { ascending: false })

  if (error) console.error('getNivenxaArchiveTournaments: query failed —', error.message)

  const completed = ((data ?? []) as TournamentRow[]).map((row) => mapRowToChessTournament(row, 'completed'))
  return [{ status: 'completed', label: 'Completed', tournaments: completed }]
}

/** One tournament, for /chess/tournaments/[id] (the "View Details" destination). Only returns verified, Nivenxa-organized rows — same visibility rule as everywhere else public. */
export async function getTournamentById(id: string): Promise<ChessTournament | null> {
  const supabase = getSupabase()
  const { data, error } = await supabase.from('tournaments').select('*').eq('id', id).eq('verified', true).eq('is_nivenxa_organized', true).maybeSingle()
  if (error) console.error('getTournamentById: query failed —', error.message)
  if (!data) return null

  const row = data as TournamentRow
  const todayIso = new Date().toISOString().slice(0, 10)
  const lifecycleStatus = row.is_live ? 'live' : row.start_date < todayIso ? 'completed' : 'upcoming'
  return mapRowToChessTournament(row, lifecycleStatus)
}

/**
 * The single Nivenxa-organized tournament to feature on the /chess landing
 * page — a currently-live one takes priority; otherwise the soonest verified
 * upcoming one. Returns null when there's nothing to highlight, in which
 * case the landing page renders no section at all (no empty state).
 */
export async function getNivenxaHighlightTournament(): Promise<ChessTournament | null> {
  const supabase = getSupabase()
  const todayIso = new Date().toISOString().slice(0, 10)

  const liveResult = await supabase
    .from('tournaments')
    .select('*')
    .eq('verified', true)
    .eq('is_nivenxa_organized', true)
    .eq('is_live', true)
    .limit(1)
    .maybeSingle()
  if (liveResult.error) console.error('getNivenxaHighlightTournament: live query failed —', liveResult.error.message)
  if (liveResult.data) return mapRowToChessTournament(liveResult.data as TournamentRow, 'live')

  const upcomingResult = await supabase
    .from('tournaments')
    .select('*')
    .eq('verified', true)
    .eq('is_nivenxa_organized', true)
    .eq('is_live', false)
    .gte('start_date', todayIso)
    .order('start_date', { ascending: true })
    .limit(1)
    .maybeSingle()
  if (upcomingResult.error) console.error('getNivenxaHighlightTournament: upcoming query failed —', upcomingResult.error.message)
  if (upcomingResult.data) return mapRowToChessTournament(upcomingResult.data as TournamentRow, 'upcoming')

  return null
}
