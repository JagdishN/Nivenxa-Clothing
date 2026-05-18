import type {
  ChessTournament,
  RawTournament,
  TournamentDisplayType,
  TournamentFormat,
  TournamentLifecycleStatus,
  TournamentTimeControl,
} from './types'

function toId(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function normalizeTimeControl(value?: string): TournamentTimeControl {
  const text = value?.toLowerCase() ?? ''

  if (text.includes('bullet')) return 'Bullet'
  if (text.includes('blitz')) return 'Blitz'
  if (text.includes('rapid')) return 'Rapid'
  if (text.includes('classical') || text.includes('standard')) return 'Classical'
  if (text.includes('mixed')) return 'Mixed'

  return 'Unknown'
}

function normalizeFormat(value?: string): TournamentFormat {
  const text = value?.toLowerCase() ?? ''

  if (text.includes('swiss')) return 'Swiss'
  if (text === 's') return 'Swiss'
  if (text.includes('round robin')) return 'Round Robin'
  if (text.includes('arena')) return 'Arena'
  if (text.includes('knockout')) return 'Knockout'
  if (text.includes('team')) return 'Team'
  if (text.includes('league')) return 'League'

  return 'Unknown'
}

function normalizeDisplayType(raw: RawTournament): TournamentDisplayType {
  if (raw.tournamentType) return raw.tournamentType

  const text = [
    raw.title,
    raw.organizerName,
    raw.sourceName,
    ...(raw.tags ?? []),
  ].join(' ').toLowerCase()

  if (text.includes('academy')) return 'Academy'
  if (text.includes('club')) return 'Club'
  if (text.includes('state')) return 'State'
  if (text.includes('national') || text.includes('all india')) return 'National'

  return 'International'
}

export function getLifecycleStatus(
  startsAt: string,
  endsAt: string | undefined,
  now = new Date(),
): TournamentLifecycleStatus {
  const start = new Date(startsAt)
  const end = endsAt ? new Date(endsAt) : start

  if (Number.isNaN(start.getTime())) return 'hidden'
  if (start <= now && end >= now) return 'live'
  if (start > now) return 'upcoming'
  return 'completed'
}

function buildMapUrl(raw: RawTournament) {
  const query = raw.address ?? [raw.venue, raw.city, raw.country].filter(Boolean).join(', ')

  if (!query || raw.locationMode === 'online') return undefined

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
}

export function normalizeTournament(raw: RawTournament): ChessTournament {
  const lifecycleStatus = getLifecycleStatus(raw.startsAt, raw.endsAt)
  const locationLabel = raw.locationMode === 'online'
    ? 'Online'
    : [raw.venue, raw.city].filter(Boolean).join(', ') || raw.country || 'Venue to be announced'

  return {
    id: toId(`${raw.sourceName}-${raw.externalId}`),
    title: raw.title.trim(),
    category: 'Hidden',
    lifecycleStatus,
    source: {
      name: raw.sourceName,
      url: raw.sourceUrl,
      externalId: raw.externalId,
    },
    links: {
      tournamentUrl: raw.officialUrl ?? raw.sourceUrl,
      registrationUrl: raw.registrationUrl,
      mapUrl: buildMapUrl(raw),
    },
    country: raw.country ?? 'Global',
    tournamentType: normalizeDisplayType(raw),
    dates: {
      startsAt: raw.startsAt,
      endsAt: raw.endsAt,
    },
    location: {
      mode: raw.locationMode,
      label: locationLabel,
      address: raw.address,
    },
    fideRated: raw.fideRated ?? null,
    timeControl: normalizeTimeControl(raw.timeControl),
    format: normalizeFormat(raw.format),
    topPlayers: raw.topPlayers ?? [],
    prizePool: raw.prizePool,
    organizer: {
      name: raw.organizerName ?? raw.sourceName,
      verified: raw.organizerVerified ?? false,
    },
    trust: {
      score: 0,
      reasons: [],
    },
  }
}
