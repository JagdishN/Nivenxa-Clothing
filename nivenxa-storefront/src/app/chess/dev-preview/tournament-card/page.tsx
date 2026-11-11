import { notFound } from 'next/navigation'
import type { ChessTournament } from '@/lib/chess/types'
import UpcomingTournamentCard from '../../UpcomingTournamentCard'

// Development-only visual check of every state of the home tournament card, with fixed fake data and a fixed
// "today". It does not exist in a production build (404). Used by tests/chess-tournament-card.spec.ts.
export const dynamic = 'force-dynamic'
const TODAY = '2026-11-09'

function t(over: Partial<ChessTournament> & { id: string; title: string }): ChessTournament {
  return {
    category: 'Community',
    lifecycleStatus: 'upcoming',
    source: { name: 'Manual', url: '', externalId: over.id },
    links: { tournamentUrl: '#', registrationUrl: 'https://example.com/register' },
    country: 'India',
    tournamentType: 'Club',
    dates: { startsAt: '2026-11-15' },
    location: { mode: 'otb', label: 'Sundarayya Bhavan, Panchavati Complex, Pragathi Nagar, Hyderabad, Telangana 500090' },
    fideRated: false,
    timeControl: 'Rapid',
    format: 'Swiss',
    topPlayers: [],
    organizer: { name: 'Nivenxa', verified: true },
    trust: { score: 100, reasons: [] },
    ...over,
  }
}

const CASES: { label: string; tournament: ChessTournament; moreCount: number }[] = [
  { label: 'open, link', tournament: t({ id: 'a', title: '2nd Nivenxa Chess Tournament' }), moreCount: 0 },
  { label: 'open, whatsapp only, 2 more', tournament: t({ id: 'b', title: 'Nivenxa Rapid Open', links: { tournamentUrl: '#' }, organizer: { name: 'N', verified: true, whatsapp: '+917416996665' } }), moreCount: 2 },
  { label: 'deadline in future', tournament: t({ id: 'c', title: 'Nivenxa Junior Cup', registrationDeadline: '2026-11-12' }), moreCount: 0 },
  { label: 'deadline today', tournament: t({ id: 'd', title: 'Nivenxa Junior Cup', registrationDeadline: '2026-11-09' }), moreCount: 0 },
  { label: 'deadline passed', tournament: t({ id: 'e', title: 'Nivenxa Junior Cup', registrationDeadline: '2026-11-08' }), moreCount: 0 },
  { label: 'no way to register', tournament: t({ id: 'f', title: 'Nivenxa Club Night', links: { tournamentUrl: '#' } }), moreCount: 0 },
  { label: 'live now', tournament: t({ id: 'g', title: 'Nivenxa Chess Festival', lifecycleStatus: 'live', dates: { startsAt: '2026-11-08', endsAt: '2026-11-10' } }), moreCount: 1 },
  { label: 'starts today', tournament: t({ id: 'h', title: 'Nivenxa Sunday Blitz', dates: { startsAt: '2026-11-09' } }), moreCount: 0 },
  { label: 'multi-day across months', tournament: t({ id: 'i', title: 'Nivenxa Winter Classic', dates: { startsAt: '2026-11-30', endsAt: '2026-12-02' } }), moreCount: 0 },
  {
    label: 'very long name and venue',
    tournament: t({
      id: 'j',
      title: 'The Second Annual Nivenxa Inter-School and Inter-Academy Rapid Chess Championship for Under-7, Under-9, Under-11 and Under-14 Players Across Telangana',
      location: { mode: 'otb', label: 'Pragathi Nagar Community Convention and Cultural Activities Centre Auditorium Annexe, Hyderabad' },
    }),
    moreCount: 3,
  },
]

export default function Page() {
  if (process.env.NODE_ENV === 'production') notFound()
  return (
    <main style={{ padding: '1rem 0 3rem', background: '#F4EEFA', minHeight: '100vh' }}>
      {CASES.map((c) => (
        <div key={c.tournament.id} data-case={c.label} style={{ marginBottom: '0.75rem' }}>
          <p style={{ font: '12px sans-serif', margin: '0 1.5rem' }}>{c.label}</p>
          <UpcomingTournamentCard data={{ tournament: c.tournament, moreCount: c.moreCount }} today={TODAY} />
        </div>
      ))}
    </main>
  )
}
