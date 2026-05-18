import { seedTournaments } from './seedTournaments'
import { normalizeTournament } from './TournamentNormalizer'
import { scoreTournament } from './TournamentTrustScorer'
import {
  isCurrentTournament,
  isDisplayableTournament,
  isRecentCompletedTournament,
} from './TournamentValidator'
import type { ChessTournament, TournamentGroup, TournamentLifecycleStatus } from './types'

const CURRENT_GROUPS: { status: TournamentLifecycleStatus; label: string }[] = [
  { status: 'live', label: 'Live Now' },
  { status: 'upcoming', label: 'Upcoming' },
]

const CATEGORY_WEIGHT = {
  Elite: 0,
  Professional: 1,
  Community: 2,
  Casual: 3,
  Hidden: 4,
}

function getCuratedTournaments() {
  return seedTournaments
    .map((raw) => scoreTournament(normalizeTournament(raw), raw))
    .filter(isDisplayableTournament)
}

function sortForDiscovery(a: ChessTournament, b: ChessTournament) {
  const categoryDelta = CATEGORY_WEIGHT[a.category] - CATEGORY_WEIGHT[b.category]
  if (categoryDelta !== 0) return categoryDelta

  const dateDelta = new Date(a.dates.startsAt).getTime() - new Date(b.dates.startsAt).getTime()
  if (dateDelta !== 0) return dateDelta

  return b.trust.score - a.trust.score
}

export function getCurrentTournamentGroups(): TournamentGroup[] {
  const tournaments = getCuratedTournaments()
    .filter(isCurrentTournament)
    .sort(sortForDiscovery)

  return CURRENT_GROUPS
    .map((group) => ({
      ...group,
      tournaments: tournaments.filter((tournament) => tournament.lifecycleStatus === group.status),
    }))
    .filter((group) => group.status === 'live' || group.tournaments.length > 0)
}

export function getArchivedTournamentGroups(): TournamentGroup[] {
  const tournaments = getCuratedTournaments()
    .filter((tournament) => isRecentCompletedTournament(tournament))
    .sort((a, b) => new Date(b.dates.startsAt).getTime() - new Date(a.dates.startsAt).getTime())

  return tournaments.length
    ? [{ status: 'completed', label: 'Recently Completed', tournaments }]
    : []
}
