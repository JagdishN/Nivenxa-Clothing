import Link from 'next/link'
import { getNivenxaArchiveTournaments } from '@/lib/chess/tournaments'
import TournamentListing from '../TournamentListing'
import styles from '../Tournaments.module.scss'

export const dynamic = 'force-dynamic'

export default async function TournamentArchivePage() {
  const groups = await getNivenxaArchiveTournaments()

  return (
    <main className={styles.page}>
      <div className={styles.backBar}>
        <Link href="/chess/tournaments" className={styles.backLink}>← Back to Tournaments</Link>
      </div>

      <section className={styles.hero}>
        <p className={styles.eyebrow}>NIVENXA CHESS ARCHIVE</p>
        <h1 className={styles.heading}>Completed Nivenxa tournaments.</h1>
        <p className={styles.subtext}>A record of every Nivenxa-organized tournament that&rsquo;s already taken place.</p>
      </section>

      <TournamentListing groups={groups} />
    </main>
  )
}
