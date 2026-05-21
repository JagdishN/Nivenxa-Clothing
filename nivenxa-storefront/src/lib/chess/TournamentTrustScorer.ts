import type { ChessTournament, RawTournament, TournamentCategory } from './types'

const ELITE_EVENT_PATTERNS = [
  'fide candidates',
  'tata steel chess',
  'world championship',
  'chess olympiad',
  'world cup',
]

const PROFESSIONAL_PATTERNS = [
  'national',
  'championship',
  'open',
  'titled arena',
  'fide rated',
]

export function scoreTournament(
  tournament: ChessTournament,
  raw: RawTournament,
): ChessTournament {
  const title = tournament.title.toLowerCase()
  const tags = raw.tags?.map((tag) => tag.toLowerCase()) ?? []
  const reasons: string[] = []
  let score = 20

  if (['FIDE', 'Lichess', 'Chess.com'].includes(tournament.source.name)) {
    score += 28
    reasons.push('official_source')
  }

  if (tournament.source.name === 'ChessResults') {
    score += 18
    reasons.push('recognized_results_source')
  }

  if (tournament.organizer.verified) {
    score += 16
    reasons.push('verified_organizer')
  }

  if (tournament.fideRated) {
    score += 14
    reasons.push('fide_rated')
  }

  if (tournament.links.registrationUrl) {
    score += 5
    reasons.push('registration_available')
  }

  if (tournament.location.address || tournament.location.mode === 'online') {
    score += 6
    reasons.push('clear_location')
  }

  if (tournament.topPlayers.length > 0) {
    score += 5
    reasons.push('player_preview_available')
  }

  if (ELITE_EVENT_PATTERNS.some((pattern) => title.includes(pattern) || tags.includes(pattern))) {
    score += 26
    reasons.push('elite_event_signal')
  }

  if (PROFESSIONAL_PATTERNS.some((pattern) => title.includes(pattern) || tags.includes(pattern))) {
    score += 10
    reasons.push('professional_event_signal')
  }

  if (tournament.format === 'Unknown') score -= 6
  if (tournament.timeControl === 'Unknown') score -= 6
  if (!tournament.dates.startsAt) score -= 30

  const normalizedScore = Math.max(0, Math.min(100, score))

  return {
    ...tournament,
    category: getCategory(normalizedScore, title, tags),
    trust: {
      score: normalizedScore,
      reasons,
    },
  }
}

function getCategory(score: number, title: string, tags: string[]): TournamentCategory {
  const isElite = ELITE_EVENT_PATTERNS.some((pattern) => title.includes(pattern) || tags.includes(pattern))

  if (score < 30) return 'Hidden'
  if (isElite && score >= 75) return 'Elite'
  if (score >= 75) return 'Professional'
  if (score >= 50) return 'Community'
  if (score >= 30) return 'Casual'

  return 'Hidden'
}
