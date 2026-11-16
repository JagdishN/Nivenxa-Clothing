import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getTournamentById } from '@/lib/chess/tournaments'
import { formatLongDate } from '@/lib/chess/tournamentFormat'
import TournamentFeedbackForm from './TournamentFeedbackForm'
import styles from '../../Tournaments.module.scss'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = { title: 'Tournament feedback', robots: { index: false, follow: false } }

export default async function TournamentFeedbackPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const tournament = await getTournamentById(id)
  if (!tournament) notFound()

  return (
    <main className={styles.page}>
      <div className={styles.backBar}>
        <Link href={`/chess/tournaments/${tournament.id}`} className={styles.backLink}>
          ← Back to tournament
        </Link>
      </div>

      <section className={styles.detailWrap}>
        <h1 className={styles.fbTitle}>Tournament feedback</h1>
        <p className={styles.fbIntro}>Tell us how it went. We read every response.</p>
        <TournamentFeedbackForm
          tournamentId={tournament.id}
          tournamentName={tournament.title}
          tournamentDate={formatLongDate(tournament.dates.startsAt, tournament.dates.endsAt)}
        />
      </section>
    </main>
  )
}
