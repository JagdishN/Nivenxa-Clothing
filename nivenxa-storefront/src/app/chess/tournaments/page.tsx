import Link from 'next/link'
import { getPublicTournaments } from '@/lib/chess/tournaments'
import { galleryPhotos } from '@/lib/chess/galleryPhotos'
import TournamentListing from './TournamentListing'
import GallerySection from './GallerySection'
import styles from './Tournaments.module.scss'

export const dynamic = 'force-dynamic' // always reflect the latest admin-verified tournaments, not a build-time snapshot

export default async function TournamentsPage() {
  const groups = await getPublicTournaments()
  const hasTournaments = groups.some((group) => group.tournaments.length > 0)

  return (
    <main className={styles.page}>
      <div className={styles.backBar}>
        <Link href="/chess" className={styles.backLink}>← Back to Chess</Link>
      </div>

      {/* No eyebrow, no big "View Archive" CTA — the tournament itself is
          why someone came here, not this hero. Archive is demoted to a
          small text link below everything (see .pastLink at the bottom). */}
      <section className={styles.hero}>
        <h1 className={styles.heading}>NIVENXA Chess Tournaments</h1>
        <p className={styles.subtext}>Upcoming tournaments, prizes and registration details.</p>
      </section>

      <TournamentListing groups={groups} archiveHref="/chess/tournaments/archive" />

      {/* Gallery only renders when there's at least one real photo — an
          empty "Photos will appear here soon" section advertised missing
          content for no benefit; it simply doesn't exist on the page until
          there's something to show. */}
      {galleryPhotos.length > 0 && <GallerySection photos={galleryPhotos} />}

      {/* When there's nothing upcoming, TournamentListing's own empty state
          already surfaces this same link right below its message — this
          bottom-of-page copy would just repeat it after an empty page. */}
      {hasTournaments && (
        <div className={styles.pastLinkRow}>
          <Link href="/chess/tournaments/archive" className={styles.pastLink}>
            Past Tournaments →
          </Link>
        </div>
      )}
    </main>
  )
}
