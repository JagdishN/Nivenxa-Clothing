export type TournamentCategory =
  | 'Elite'
  | 'Professional'
  | 'Community'
  | 'Casual'
  | 'Hidden'

export type TournamentDisplayType =
  | 'International'
  | 'State'
  | 'National'
  | 'Club'
  | 'Academy'

export type TournamentLifecycleStatus =
  | 'live'
  | 'upcoming'
  | 'completed'
  | 'cancelled'
  | 'hidden'

export type TournamentSourceName =
  | 'FIDE'
  | 'ChessResults'
  | 'Lichess'
  | 'Chess.com'
  | 'Academy'
  | 'Manual'

export type TournamentLocationMode = 'online' | 'otb' | 'hybrid'

export type TournamentTimeControl =
  | 'Bullet'
  | 'Blitz'
  | 'Rapid'
  | 'Classical'
  | 'Mixed'
  | 'Unknown'

export type TournamentFormat =
  | 'Swiss'
  | 'Round Robin'
  | 'Arena'
  | 'Knockout'
  | 'Team'
  | 'League'
  | 'Unknown'

export interface TournamentPlayerPreview {
  name: string
  title?: string
  rating?: number
  country?: string
}

export interface TournamentPrizePool {
  label: string
  verified: boolean
}

export interface RawTournament {
  externalId: string
  title: string
  sourceName: TournamentSourceName
  sourceUrl: string
  officialUrl?: string
  registrationUrl?: string
  startsAt: string
  endsAt?: string
  country?: string
  venue?: string
  address?: string
  city?: string
  locationMode: TournamentLocationMode
  fideRated?: boolean | null
  timeControl?: string
  format?: string
  tournamentType?: TournamentDisplayType
  organizerName?: string
  organizerVerified?: boolean
  prizePool?: TournamentPrizePool
  topPlayers?: TournamentPlayerPreview[]
  tags?: string[]
}

export interface ChessTournament {
  id: string
  title: string
  category: TournamentCategory
  lifecycleStatus: TournamentLifecycleStatus
  source: {
    name: TournamentSourceName
    url: string
    externalId: string
  }
  links: {
    tournamentUrl: string
    registrationUrl?: string
    mapUrl?: string
  }
  country: string
  tournamentType: TournamentDisplayType
  dates: {
    startsAt: string
    endsAt?: string
  }
  location: {
    mode: TournamentLocationMode
    label: string
    address?: string
  }
  fideRated: boolean | null
  timeControl: TournamentTimeControl
  format: TournamentFormat
  topPlayers: TournamentPlayerPreview[]
  prizePool?: TournamentPrizePool
  organizer: {
    name: string
    verified: boolean
  }
  trust: {
    score: number
    reasons: string[]
  }
}

export interface TournamentGroup {
  status: TournamentLifecycleStatus
  label: string
  tournaments: ChessTournament[]
}
