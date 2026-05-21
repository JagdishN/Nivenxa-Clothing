import type { ChessTournament } from './types'

export function isDisplayableTournament(tournament: ChessTournament) {
  if (!tournament.title || !tournament.links.tournamentUrl) return false
  if (tournament.category === 'Hidden') return false
  if (tournament.lifecycleStatus === 'hidden' || tournament.lifecycleStatus === 'cancelled') return false
  if (tournament.timeControl === 'Unknown' && tournament.format === 'Unknown') return false

  return true
}

export function isCurrentTournament(tournament: ChessTournament) {
  return tournament.lifecycleStatus === 'live' || tournament.lifecycleStatus === 'upcoming'
}

export function isRecentCompletedTournament(
  tournament: ChessTournament,
  now = new Date(),
  years = 2,
) {
  if (tournament.lifecycleStatus !== 'completed') return false

  const endsAt = new Date(tournament.dates.endsAt ?? tournament.dates.startsAt)
  const archiveStart = new Date(now)
  archiveStart.setFullYear(archiveStart.getFullYear() - years)

  return endsAt >= archiveStart
}
