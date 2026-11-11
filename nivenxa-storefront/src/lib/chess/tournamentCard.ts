import type { ChessTournament } from './types'
import { formatCardDate, formatShortDate, venueArea } from './tournamentFormat'

// Pure view-model for the compact home tournament card: every event state is decided here from the event's
// own data and a `today` date (event timezone, YYYY-MM-DD), so it is unit-testable and server/client agree.

export type CardPhase = 'live' | 'today' | 'upcoming'
export type RegistrationTone = 'open' | 'closing' | 'closed' | 'contact' | 'live'

export interface TournamentCardView {
  phase: CardPhase
  phaseLabel: string
  title: string
  dateText: string
  venueText: string
  /** The full venue text, for a tooltip. */
  venueFull: string
  registrationLabel: string
  registrationTone: RegistrationTone
  /** True only when registration is open AND there is somewhere to register (an organiser link or WhatsApp number). */
  canRegister: boolean
  detailsHref: string
}

export function buildCardView(t: ChessTournament, today: string): TournamentCardView {
  const start = t.dates.startsAt
  const end = t.dates.endsAt ?? start
  const hasRegisterRoute = Boolean(t.links.registrationUrl || t.organizer.whatsapp?.replace(/\D/g, ''))

  const inProgress = t.lifecycleStatus === 'live' || (start < today && end >= today)
  const phase: CardPhase = inProgress ? 'live' : start === today ? 'today' : 'upcoming'
  const phaseLabel = phase === 'live' ? 'Live now' : phase === 'today' ? 'Today' : 'Upcoming'

  let registrationLabel: string
  let registrationTone: RegistrationTone
  let open = false

  if (phase === 'live') {
    registrationLabel = 'Event in progress'
    registrationTone = 'live'
  } else if (t.registrationDeadline && today > t.registrationDeadline) {
    registrationLabel = 'Registration closed'
    registrationTone = 'closed'
  } else if (t.registrationDeadline) {
    open = hasRegisterRoute
    const closesToday = t.registrationDeadline === today
    registrationLabel = closesToday ? 'Registration closes today' : `Registration open · closes ${formatShortDate(t.registrationDeadline)}`
    registrationTone = closesToday ? 'closing' : 'open'
  } else if (hasRegisterRoute) {
    open = true
    registrationLabel = 'Registration open'
    registrationTone = 'open'
  } else {
    registrationLabel = 'Contact the organiser to register'
    registrationTone = 'contact'
  }

  return {
    phase,
    phaseLabel,
    title: t.title,
    dateText: formatCardDate(start, t.dates.endsAt),
    venueText: venueArea(t.location.label),
    venueFull: t.location.label,
    registrationLabel,
    registrationTone,
    canRegister: open && hasRegisterRoute,
    detailsHref: `/chess/tournaments/${t.id}`,
  }
}
