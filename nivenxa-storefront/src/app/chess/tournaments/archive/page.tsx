import Link from 'next/link'
import { getArchivedTournamentGroups } from '@/lib/chess/TournamentService'
import TournamentListing from '../TournamentListing'
import styles from '../Tournaments.module.scss'

export default function TournamentArchivePage() {
  const groups = getArchivedTournamentGroups()

  return (
    <main className={styles.page}>
      <div className={styles.backBar}>
        <Link href="/chess/tournaments" className={styles.backLink}>← Back to Tournaments</Link>
      </div>

      <section className={styles.hero}>
        <p className={styles.eyebrow}>NIVENXA CHESS ARCHIVE</p>
        <h1 className={styles.heading}>Completed tournaments from the recent competitive cycle.</h1>
        <p className={styles.subtext}>
          The archive keeps only trusted completed events from the last two years, so history stays useful and uncluttered.
        </p>
      </section>

      <TournamentListing groups={groups} />
    </main>
  )
}
