import Link from 'next/link'
import { getPublicTournaments } from '@/lib/chess/tournaments'
import TournamentListing from './TournamentListing'
import styles from './Tournaments.module.scss'

export const dynamic = 'force-dynamic' // always reflect the latest admin-verified tournaments, not a build-time snapshot

export default async function TournamentsPage() {
  const groups = await getPublicTournaments()

  return (
    <main className={styles.page}>
      <div className={styles.backBar}>
        <Link href="/chess" className={styles.backLink}>← Back to Chess</Link>
      </div>

      <section className={styles.hero}>
        <p className={styles.eyebrow}>NIVENXA CHESS CALENDAR</p>
        <h1 className={styles.heading}>Live and upcoming tournaments, curated with intent.</h1>
        <p className={styles.subtext}>
          A refined discovery board for trusted chess events, from elite championships to verified academy and local tournaments.
        </p>
        <div className={styles.heroActions}>
          <Link href="/chess/tournaments/archive" className={styles.archiveLink}>
            View Archive
          </Link>
        </div>
      </section>

      <TournamentListing groups={groups} />
    </main>
  )
}
