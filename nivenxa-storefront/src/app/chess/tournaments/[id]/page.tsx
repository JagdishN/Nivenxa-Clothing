import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getTournamentById } from '@/lib/chess/tournaments'
import { formatDateRange } from '@/lib/chess/tournamentFormat'
import { RegisterAction } from '../TournamentListing'
import styles from '../Tournaments.module.scss'

export const dynamic = 'force-dynamic'

// "25+10 Rapid" on the card is deliberately terse (see TournamentListing's
// own time-control shortening) — this is where a parent who doesn't already
// know what that means gets the plain-language explanation, without
// cluttering the card every other visitor just scans past.
function timeControlExplanation(timeControl: string): string | null {
  const match = timeControl.match(/(\d+)\+(\d+)/)
  if (!match) return null
  return `${match[1]} minutes per player, plus ${match[2]} seconds added to the clock after each move.`
}

export default async function TournamentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const tournament = await getTournamentById(id)
  if (!tournament) notFound()

  const categories = tournament.categories
    ? tournament.categories
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean)
    : []
  const explanation = timeControlExplanation(tournament.timeControl)

  return (
    <main className={styles.page}>
      <div className={styles.backBar}>
        <Link href="/chess/tournaments" className={styles.backLink}>
          ← Back to Tournaments
        </Link>
      </div>

      <section className={styles.detailWrap}>
        <h1 className={styles.detailTitle}>{tournament.title}</h1>
        <p className={styles.detailOrganizer}>
          {tournament.organizer.verified && <span aria-hidden="true">✓ </span>}
          Organized by {tournament.organizer.name}
        </p>

        <div className={styles.cardMetaRow}>
          <span className={styles.cardMetaItem}>
            <span className={styles.cardMetaIcon} aria-hidden="true">
              📅
            </span>
            {formatDateRange(tournament)}
          </span>
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

        {categories.length > 0 && (
          <div className={styles.cardCategories}>
            {categories.map((c) => (
              <span key={c} className={styles.categoryPill}>
                {c}
              </span>
            ))}
          </div>
        )}

        <div className={styles.detailStats}>
          {tournament.entryFee && (
            <div className={styles.cardStat}>
              <span className={styles.cardStatLabel}>Entry Fee</span>
              <span className={styles.cardStatValue}>{tournament.entryFee}</span>
            </div>
          )}
          {tournament.prizePool && (
            <div className={styles.cardStat}>
              <span className={styles.cardStatLabel}>Prize Pool</span>
              <span className={styles.cardStatValue}>{tournament.prizePool.label}</span>
            </div>
          )}
          <div className={styles.cardStat}>
            <span className={styles.cardStatLabel}>Time Control</span>
            <span className={styles.cardStatValue}>{tournament.timeControl}</span>
          </div>
          <div className={styles.cardStat}>
            <span className={styles.cardStatLabel}>Format</span>
            <span className={styles.cardStatValue}>{tournament.format}</span>
          </div>
        </div>

        {explanation && <p className={styles.detailNote}>{explanation}</p>}

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
      </section>
    </main>
  )
}
