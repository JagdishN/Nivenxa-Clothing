import Link from 'next/link'
import { getPublicTournaments } from '@/lib/chess/tournaments'
import { galleryPhotos } from '@/lib/chess/galleryPhotos'
import TournamentListing from './TournamentListing'
import GallerySection from './GallerySection'
import styles from './Tournaments.module.scss'

export const dynamic = 'force-dynamic' // always reflect the latest admin-verified tournaments, not a build-time snapshot

export default async function TournamentsPage() {
  const groups = await getPublicTournaments()

  return (
    <main className={styles.page}>
      <div className={styles.backBar}>
        <Link href="/chess" className={styles.backLink}>← Back to Chess</Link>
      </div>

      {/* No eyebrow, no big "View Archive" CTA — the tournament itself is
          why someone came here, not this hero. Archive is demoted to a
          small text link below everything (see .pastLink at the bottom). */}
      <section className={styles.hero}>
        <h1 className={styles.heading}>Chess Tournaments</h1>
        <p className={styles.subtext}>Upcoming tournaments, prizes and registration details.</p>
      </section>

      <TournamentListing groups={groups} />

      {/* Gallery only renders when there's at least one real photo — an
          empty "Photos will appear here soon" section advertised missing
          content for no benefit; it simply doesn't exist on the page until
          there's something to show. */}
      {galleryPhotos.length > 0 && <GallerySection photos={galleryPhotos} />}

      <div className={styles.pastLinkRow}>
        <Link href="/chess/tournaments/archive" className={styles.pastLink}>
          Past Tournaments →
        </Link>
      </div>
    </main>
  )
}
