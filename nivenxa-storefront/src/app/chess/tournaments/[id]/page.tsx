import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getTournamentById } from '@/lib/chess/tournaments'
import { todayInEventZone } from '@/lib/chess/tournamentFormat'
import { buildCardView } from '@/lib/chess/tournamentCard'
import EventKeyInfo, { EventFacts } from '../EventKeyInfo'
import { getPhotosForTournament } from '@/lib/chess/galleryPhotos'
import { RegisterAction } from '../TournamentListing'
import TournamentResults from './TournamentResults'
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

export default async function TournamentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const tournament = await getTournamentById(id)
  if (!tournament) notFound()

  const isCompleted = tournament.lifecycleStatus === 'completed'
  const photos = getPhotosForTournament(tournament.id)

  const isCancelled = tournament.cancelled === true
  const isOpenForEntry = !isCancelled && (tournament.lifecycleStatus === 'live' || tournament.lifecycleStatus === 'upcoming')
  const reg = isOpenForEntry ? buildCardView(tournament, todayInEventZone()) : null
  const categories = tournament.categories
    ? tournament.categories
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean)
    : []

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
        <p className={styles.detailOrganizer}>Organized by {tournament.organizer.name}</p>

        {/* 2. WHEN and WHERE first, as labelled panels. 3. Registration status + one modest action. 4. The rest. */}
        <EventKeyInfo tournament={tournament} />

        {reg && (
          <div className={styles.regRow}>
            <p className={`${styles.regStatus} ${styles[`regStatus_${reg.registrationTone}`]}`}>{reg.registrationLabel}</p>
            {reg.canRegister && <RegisterAction tournament={tournament} />}
          </div>
        )}

        <EventFacts tournament={tournament} />

        {!isCompleted && categories.length > 0 && (
          <div className={styles.cardCategories} aria-label="Categories">
            {categories.map((c) => (
              <span key={c} className={styles.categoryPill}>
                {c}
              </span>
            ))}
          </div>
        )}

        {/* Links to this specific event's photos (grouped under its own
            heading on the full gallery page) — only shown once photos for
            this exact tournament actually exist. */}
        {photos.length > 0 && (
          <Link
            href={`/chess/tournaments/gallery?from=${tournament.id}#event-${photos[0].dateKey}`}
            className={styles.gallerySlideViewAll}
          >
            📷 View {photos.length} photo{photos.length === 1 ? '' : 's'} from this tournament →
          </Link>
        )}

        {/* Results are the main reason a parent opens a completed
            tournament's page — right below the compact event summary above,
            not buried under category chips and a separate stats block.
            Only renders once an admin has actually entered standings. */}
        {tournament.results && tournament.results.length > 0 && <TournamentResults results={tournament.results} />}

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
