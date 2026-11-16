import Link from 'next/link'
import { getTournamentById } from '@/lib/chess/tournaments'
import { formatDateRange } from '@/lib/chess/tournamentFormat'
import { getAllGalleryData } from '@/lib/chess/tournamentPhotos'
import GalleryGrid from './GalleryGrid'
import { seoMetadata } from '@/lib/seo'
import styles from '../Tournaments.module.scss'

export const dynamic = 'force-dynamic'

// /chess/tournaments/gallery?from=<tournament>&age=...&div=... is the same gallery narrowed to one event, so every
// variant names the plain gallery URL as its canonical (the narrowed view is a filter, not a separate page).
export const metadata = seoMetadata({
  title: 'Chess Tournament Photo Gallery | NIVENXA Chess',
  description: 'Photos from NIVENXA chess tournaments, past and present.',
  path: '/chess/tournaments/gallery',
})

export default async function TournamentGalleryPage({ searchParams }: { searchParams: Promise<{ from?: string; age?: string; div?: string }> }) {
  // Arriving via a tournament detail page's "View N photos" link passes
  // ?from=<tournamentId> so the back link can return there instead of the
  // generic listing — preserves the visitor's context (they came from
  // results, not from browsing tournaments) instead of dropping them one
  // level higher than where they started. Arriving via the homepage
  // preview's "View all" (no ?from) keeps the plain "Back to Tournaments".
  const { from, age, div } = await searchParams
  // Back returns to the same tournament AND the results category the visitor had selected.
  const backQuery = new URLSearchParams()
  if (age) backQuery.set('age', age)
  if (div) backQuery.set('div', div)
  const backHref = from ? `/chess/tournaments/${from}${backQuery.toString() ? `?${backQuery.toString()}` : ''}` : '/chess/tournaments'
  const backLabel = from ? '← Back to tournament' : '← Back to Tournaments'

  // Each event's heading is built from its tournament's own (already
  // admin-confirmed) title, not a second hand-typed copy of it — the two
  // previously disagreed ("Nivenxa Chess Tournament 2026" on the archive/
  // detail pages vs. "Nivenxa State Chess Tournament" here), which read as
  // two different events. Falls back to the event's own label only if the
  // tournament record is ever missing (e.g. deleted after its photos were
  // kept).
  const { events: allEvents, photos: allPhotos } = await getAllGalleryData()
  const events = await Promise.all(
    allEvents.map(async (event) => {
      const tournament = await getTournamentById(event.tournamentId)
      const label = tournament ? `${tournament.title} — ${formatDateRange(tournament)}` : event.label
      return { ...event, label }
    })
  )

  // Reached from one tournament: that tournament's name and date are the page's heading.
  const selected = from ? await getTournamentById(from) : null
  const selectedEvent = selected ? events.find((e) => e.tournamentId === selected.id) : undefined
  const selectedPhotos = selectedEvent ? allPhotos.filter((p) => p.dateKey === selectedEvent.dateKey) : []
  const selectedCount = selectedPhotos.length

  return (
    <main className={styles.page}>
      <div className={styles.backBar}>
        <Link href={backHref} className={styles.backLink}>
          {backLabel}
        </Link>
      </div>

      <section className={styles.hero}>
        <p className={styles.eyebrow}>NIVENXA CHESS GALLERY</p>
        {selected ? (
          <>
            <h1 className={styles.heading}>{selected.title}</h1>
            <p className={styles.subtext}>
              {formatDateRange(selected)} · {selectedCount} photo{selectedCount === 1 ? '' : 's'}
            </p>
          </>
        ) : (
          <>
            <h1 className={styles.heading}>Moments from our tournaments.</h1>
            <p className={styles.subtext}>Photos from Nivenxa-organized tournaments, past and present.</p>
          </>
        )}
      </section>

      {selected ? (
        <>
          {/* Only this tournament's photos (and the viewer's Prev/Next stay within them). The heading above already names it. */}
          <GalleryGrid events={selectedEvent ? [{ ...selectedEvent, label: '' }] : []} photos={selectedPhotos} hideEventHeadings />
          <p className={styles.subtext} style={{ textAlign: 'center', marginTop: '1.5rem' }}>
            <Link href="/chess/tournaments/gallery" className={styles.gallerySlideViewAll}>
              Browse photos from all tournaments →
            </Link>
          </p>
        </>
      ) : (
        <GalleryGrid events={events} photos={allPhotos} />
      )}
    </main>
  )
}
