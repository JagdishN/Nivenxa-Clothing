import Link from 'next/link'
import { getNivenxaArchiveTournaments } from '@/lib/chess/tournaments'
import TournamentListing from '../TournamentListing'
import styles from '../Tournaments.module.scss'
import { seoMetadata } from '@/lib/seo'

export const dynamic = 'force-dynamic'

export const metadata = seoMetadata({
  title: 'Past Chess Tournaments | NIVENXA Chess',
  description:
    'Past NIVENXA chess tournaments, with prize winners and photos from each event.',
  path: '/chess/tournaments/archive',
})

export default async function TournamentArchivePage() {
  const groups = await getNivenxaArchiveTournaments()

  return (
    <main className={styles.page}>
      <div className={styles.backBar}>
        <Link href="/chess/tournaments" className={styles.backLink}>← Back to Tournaments</Link>
      </div>

      <section className={styles.hero}>
        <p className={styles.eyebrow}>NIVENXA CHESS ARCHIVE</p>
        <h1 className={styles.heading}>Past tournaments</h1>
        <p className={styles.subtext}>A look back at NIVENXA&rsquo;s past tournaments.</p>
      </section>

      <TournamentListing groups={groups} />
    </main>
  )
}
