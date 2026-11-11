import Link from 'next/link'
import type { HomeTournamentCardData } from '@/lib/chess/tournaments'
import { buildCardView } from '@/lib/chess/tournamentCard'
import { buildWhatsAppRegisterLink } from './tournaments/registerLink'
import styles from './Chess.module.scss'

/**
 * Compact "next tournament" card for the top of the Chess home page. Name, date, venue area, registration
 * status, "View details" (that event's own page), Register only while registration is open, and a link to all
 * tournaments when there are more. Everything else — payment, rules, categories — stays on the details page.
 * `today` is passed in (event timezone) rather than read here, so server and browser can never disagree.
 */
export default function UpcomingTournamentCard({ data, today }: { data: HomeTournamentCardData; today: string }) {
  const { tournament, moreCount } = data
  const view = buildCardView(tournament, today)
  const registerHref = tournament.links.registrationUrl ?? buildWhatsAppRegisterLink(tournament)

  return (
    <section className={styles.tCard} aria-label="Next tournament">
      <div className={styles.tMain}>
        <span className={`${styles.tBadge} ${view.phase === 'live' ? styles.tBadgeLive : ''}`}>{view.phaseLabel}</span>
        <h2 className={styles.tTitle} title={view.title}>
          {view.title}
        </h2>
        <p className={styles.tMeta}>
          <span>{view.dateText}</span>
          <span aria-hidden="true"> · </span>
          <span className={styles.tVenue} title={view.venueFull}>
            {view.venueText}
          </span>
        </p>
      </div>

      <div className={styles.tSide}>
        <p className={`${styles.tReg} ${styles[`tReg_${view.registrationTone}`]}`}>{view.registrationLabel}</p>
        <div className={styles.tActions}>
          {view.canRegister && registerHref && (
            <a href={registerHref} className={styles.tRegister} target="_blank" rel="noreferrer">
              Register
            </a>
          )}
          <Link href={view.detailsHref} className={styles.tDetails}>
            View details <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>

      {moreCount > 0 && (
        <Link href="/chess/tournaments" className={styles.tMore}>
          +{moreCount} more · All tournaments
        </Link>
      )}
    </section>
  )
}
