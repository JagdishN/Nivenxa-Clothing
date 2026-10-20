import Link from 'next/link'
import { getTournamentById } from '@/lib/chess/tournaments'
import { formatDateRange } from '@/lib/chess/tournamentFormat'
import { galleryEvents, galleryPhotos } from '@/lib/chess/galleryPhotos'
import GalleryGrid from './GalleryGrid'
import styles from '../Tournaments.module.scss'

export const dynamic = 'force-dynamic'

export default async function TournamentGalleryPage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  // Arriving via a tournament detail page's "View N photos" link passes
  // ?from=<tournamentId> so the back link can return there instead of the
  // generic listing — preserves the visitor's context (they came from
  // results, not from browsing tournaments) instead of dropping them one
  // level higher than where they started. Arriving via the homepage
  // preview's "View all" (no ?from) keeps the plain "Back to Tournaments".
  const { from } = await searchParams
  const backHref = from ? `/chess/tournaments/${from}` : '/chess/tournaments'
  const backLabel = from ? '← Back to Tournament Results' : '← Back to Tournaments'

  // Each event's heading is built from its tournament's own (already
  // admin-confirmed) title, not a second hand-typed copy of it — the two
  // previously disagreed ("Nivenxa Chess Tournament 2026" on the archive/
  // detail pages vs. "Nivenxa State Chess Tournament" here), which read as
  // two different events. Falls back to the event's own label only if the
  // tournament record is ever missing (e.g. deleted after its photos were
  // kept).
  const events = await Promise.all(
    galleryEvents.map(async (event) => {
      const tournament = await getTournamentById(event.tournamentId)
      const label = tournament ? `${tournament.title} — ${formatDateRange(tournament)}` : event.label
      return { ...event, label }
    })
  )

  return (
    <main className={styles.page}>
      <div className={styles.backBar}>
        <Link href={backHref} className={styles.backLink}>
          {backLabel}
        </Link>
      </div>

      <section className={styles.hero}>
        <p className={styles.eyebrow}>NIVENXA CHESS GALLERY</p>
        <h1 className={styles.heading}>Moments from our tournaments.</h1>
        <p className={styles.subtext}>Photos from Nivenxa-organized tournaments, past and present.</p>
      </section>

      <GalleryGrid events={events} photos={galleryPhotos} />
    </main>
  )
}
