import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getTournamentById } from '@/lib/chess/tournaments'
import { formatLongDate, todayInEventZone } from '@/lib/chess/tournamentFormat'
import { buildCardView } from '@/lib/chess/tournamentCard'
import EventKeyInfo, { EventFacts } from '../EventKeyInfo'
import { getPhotosForTournament } from '@/lib/chess/galleryPhotos'
import { getPhotosForTournamentWithUploads } from '@/lib/chess/tournamentPhotos'
import { RegisterAction } from '../TournamentListing'
import TournamentResults from './TournamentResults'
import GallerySection from '../GallerySection'
import styles from '../Tournaments.module.scss'

export const dynamic = 'force-dynamic'

// Results pages publish participants' full names, including a U7 category —
// noindex keeps them out of search while staying reachable by direct link.
// No shared layout exists under /chess/tournaments (checked: there's no
// layout.tsx at that level or under [id]/), so this sits on this route's own
// page.tsx with no risk of leaking onto /chess/tournaments,
// /chess/tournaments/archive or /chess/tournaments/gallery — all three are
// in the sitemap and must stay indexable. follow: true so links out to the
// gallery still pass through.
export const metadata: Metadata = { robots: { index: false, follow: true } }

export default async function TournamentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ age?: string; div?: string }>
}) {
  const { id } = await params
  const { age, div } = await searchParams
  const tournament = await getTournamentById(id)
  if (!tournament) notFound()

  const isCompleted = tournament.lifecycleStatus === 'completed'
  const photos = await getPhotosForTournamentWithUploads(tournament.id, getPhotosForTournament(tournament.id))

  const isCancelled = tournament.cancelled === true
  const isOpenForEntry = !isCancelled && (tournament.lifecycleStatus === 'live' || tournament.lifecycleStatus === 'upcoming')
  const reg = isOpenForEntry ? buildCardView(tournament, todayInEventZone()) : null
  const categories = tournament.categories
    ? tournament.categories
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean)
    : []

  // Up to 3 photos from this event, then a link into the full gallery at this event's own heading.
  // With no photos yet, a plain link to the gallery so it is always reachable from here.
  const photoPreview =
    photos.length > 0 ? (
      <GallerySection
        photos={photos}
        limit={3}
        embedded
        carryParams={['age', 'div']}
        title="Photos from this tournament"
        viewAllHref={`/chess/tournaments/gallery?from=${tournament.id}#event-${photos[0].dateKey}`}
        viewAllLabel={photos.length > 3 ? `View all ${photos.length} photos →` : 'Open gallery →'}
      />
    ) : (
      <Link href="/chess/tournaments/gallery" className={styles.gallerySlideViewAll}>
        📷 Tournament Gallery →
      </Link>
    )

  return (
    <main className={styles.page}>
      <div className={styles.backBar}>
        {/* "Back to Past Tournaments" only for a completed event (reached
            from the Archive) — "Back to Tournaments" would send a visitor
            straight to the upcoming listing, past the archive they came
            from. */}
        <Link href={isCompleted ? '/chess/tournaments/archive' : '/chess/tournaments'} className={styles.backLink}>
          {isCompleted ? '← Back to Past Tournaments' : '← Back to Tournaments'}
        </Link>
      </div>

      <section className={styles.detailWrap}>
        {/* Completed sits right beside the title, not as its own line
            further down — a parent landing here from a shared/old link
            should know immediately this already happened, in the very
            first thing they read. */}
        <div className={styles.detailTitleRow}>
          <h1 className={styles.detailTitle}>{tournament.title}</h1>
          {isCompleted && <span className={styles.statusBadge}>Completed</span>}
          {isCancelled && <span className={styles.statusBadge}>Cancelled</span>}
        </div>
        <p className={styles.detailOrganizer}>
          Organized by {tournament.organizer.name}
          {isCompleted && <> · {formatLongDate(tournament.dates.startsAt, tournament.dates.endsAt)}</>}
        </p>

        {/* A finished event: what people came for first (results, then a few
            photos), and the logistics (venue, fee, format) collapsed below. */}
        {isCompleted ? (
          <>
            {tournament.results && tournament.results.length > 0 && <TournamentResults results={tournament.results} initialAge={age} initialDivision={div} />}
            {photoPreview}
            <p className={styles.fbLinkRow}>
              How was your experience?{' '}
              <Link href={`/chess/tournaments/${tournament.id}/feedback`} className={styles.fbLink}>
                Share feedback &amp; suggestions →
              </Link>
            </p>
            <details className={styles.eventDetails}>
              <summary>Event details</summary>
              <EventKeyInfo tournament={tournament} />
              <EventFacts tournament={tournament} />
            </details>
          </>
        ) : (
          <>
            {/* WHEN and WHERE first, as labelled panels, then registration status + one modest action, then the rest. */}
            <EventKeyInfo tournament={tournament} />

            {reg && (
              <div className={styles.regRow}>
                <p className={`${styles.regStatus} ${styles[`regStatus_${reg.registrationTone}`]}`}>{reg.registrationLabel}</p>
                {reg.canRegister && <RegisterAction tournament={tournament} />}
              </div>
            )}

            <EventFacts tournament={tournament} />

            {categories.length > 0 && (
              <div className={styles.cardCategories} aria-label="Categories">
                {categories.map((c) => (
                  <span key={c} className={styles.categoryPill}>
                    {c}
                  </span>
                ))}
              </div>
            )}

            {tournament.results && tournament.results.length > 0 && <TournamentResults results={tournament.results} initialAge={age} initialDivision={div} />}
            {photoPreview}
          </>
        )}

        {/* Registration and payment are only relevant while a tournament is
            still open to enter — a completed/cancelled event has nothing
            left to register or pay for. */}
        {isOpenForEntry && (
          <>
            {tournament.payment?.note && (
              <div className={styles.detailSection}>
                <h2 className={styles.detailSectionTitle}>Prizes &amp; Payment</h2>
                <p className={styles.detailNote}>{tournament.payment.note}</p>
              </div>
            )}

            {tournament.payment?.qrUrl && (
              <div className={styles.detailSection}>
                <h2 className={styles.detailSectionTitle}>Payment QR</h2>
                <p className={styles.paymentPanelSubtext}>
                  Official Nivenxa payment QR for this tournament — pay via UPI or bank transfer using the details above.
                </p>
                {/* eslint-disable-next-line @next/next/no-img-element -- external Supabase Storage URL */}
                <img src={tournament.payment.qrUrl} alt={`Payment QR for ${tournament.title}`} className={styles.detailQrImage} />
              </div>
            )}

          </>
        )}
      </section>
    </main>
  )
}
