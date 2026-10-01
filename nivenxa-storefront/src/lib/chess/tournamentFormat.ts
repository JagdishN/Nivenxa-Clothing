import type { ChessTournament } from './types'

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

  const dateFormatter = new Intl.DateTimeFormat('en', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

  if (!end || dateFormatter.format(start) === dateFormatter.format(end)) {
    return dateFormatter.format(start)
  }

  return `${dateFormatter.format(start)} - ${dateFormatter.format(end)}`
}
