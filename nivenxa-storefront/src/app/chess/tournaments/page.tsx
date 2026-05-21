import Link from 'next/link'
import { getCurrentTournamentGroups } from '@/lib/chess/TournamentService'
import TournamentListing from './TournamentListing'
import styles from './Tournaments.module.scss'

export default function TournamentsPage() {
  const groups = getCurrentTournamentGroups()

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
