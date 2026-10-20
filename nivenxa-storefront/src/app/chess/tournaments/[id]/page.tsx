import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getTournamentById } from '@/lib/chess/tournaments'
import { formatDateRange, roundsVaryAcrossCategories } from '@/lib/chess/tournamentFormat'
import { getPhotosForTournament } from '@/lib/chess/galleryPhotos'
import { RegisterAction } from '../TournamentListing'
import TournamentResults from './TournamentResults'
import styles from '../Tournaments.module.scss'

export const dynamic = 'force-dynamic'

export default async function TournamentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const tournament = await getTournamentById(id)
  if (!tournament) notFound()

  const isCompleted = tournament.lifecycleStatus === 'completed'
  const photos = getPhotosForTournament(tournament.id)

  // One compact, normal-weight line instead of a separate big bold stats
  // block — "5 Rounds"/"25+10 Rapid" are shown bare (not "Rounds: 5 Rounds"
  // or "Time Control: 25+10 Rapid"), since the value already says what it
  // is; only Entry fee/Prize pool get a short prefix since a bare ₹ amount
  // alone wouldn't say which is which. Each separator is folded into its
  // OWN item's text (not a sibling node) so a line break can only ever fall
  // between two complete "· item" units — never leaving a dangling dot
  // alone at the start or end of a wrapped line.
  const metaParts: string[] = []
  if (tournament.entryFee) metaParts.push(`Entry fee: ${tournament.entryFee}`)
  if (tournament.prizePool) metaParts.push(`Prize pool: ${tournament.prizePool.label}`)
  metaParts.push(tournament.timeControl)
  // The tournament-wide format string (e.g. "5 Rounds") can't speak for a
  // category that actually ran a different number of rounds — see the
  // U14 Open exception below. Once that's true, state it plainly instead
  // of pairing a specific number with a caveat that contradicts it; the
  // exact per-category count is what the Results heading shows instead.
  if (tournament.format !== 'Unknown') {
    metaParts.push(roundsVaryAcrossCategories(tournament.results) ? 'Rounds vary by category' : tournament.format)
  }

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
        </div>
        <p className={styles.detailOrganizer}>Organized by {tournament.organizer.name}</p>

        {/* Date + entry fee/prize pool/time control/rounds on one wrapping
            line; venue gets its own line underneath — mixing venue in with
            the rest left it sharing a line with whatever came right after
            it and wrapping unpredictably. */}
        <div className={styles.cardMetaRow}>
          <span className={styles.cardMetaItem}>
            <span className={styles.cardMetaIcon} aria-hidden="true">
              📅
            </span>
            {formatDateRange(tournament)}
          </span>
          {metaParts.map((part) => (
            <span key={part} className={styles.cardMetaItem}>
              <span className={styles.metaDot} aria-hidden="true">
                /
              </span>
              {part}
            </span>
          ))}
        </div>
        <div className={styles.cardMetaRow}>
          <span className={styles.cardMetaItem}>
            <span className={styles.cardMetaIcon} aria-hidden="true">
              📍
            </span>
            {tournament.links.mapUrl ? (
              <a href={tournament.links.mapUrl} target="_blank" rel="noreferrer" className={styles.cardVenueLink}>
                {tournament.location.label}
              </a>
            ) : (
              tournament.location.label
            )}
          </span>
        </div>

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
        {(tournament.lifecycleStatus === 'live' || tournament.lifecycleStatus === 'upcoming') && (
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

            <div className={styles.cardActions}>
              <RegisterAction tournament={tournament} />
            </div>
          </>
        )}
      </section>
    </main>
  )
}
