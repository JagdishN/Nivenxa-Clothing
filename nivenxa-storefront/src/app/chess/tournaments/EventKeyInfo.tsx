import type { ChessTournament } from '@/lib/chess/types'
import { directionsHref, formatLongDate, formatMoney, formatTimeControl, roundsVaryAcrossCategories, splitVenue } from '@/lib/chess/tournamentFormat'
import styles from './Tournaments.module.scss'

/**
 * The two things a parent looks for first: WHEN and WHERE. Labelled panels (icon is decoration only), used by the
 * event details page and, in `compact` form, by each listing card, so both read the same from the same stored data.
 * Event data holds a date but no time of day, so none is shown — nothing is invented.
 */
export default function EventKeyInfo({ tournament, compact }: { tournament: ChessTournament; compact?: boolean }) {
  const venue = splitVenue(tournament.location.label)
  return (
    <div className={`${styles.keyInfo} ${compact ? styles.keyInfoCompact : ''}`}>
      <section className={styles.keyPanel} aria-labelledby={`when-${tournament.id}-${compact ? 'c' : 'd'}`}>
        <p id={`when-${tournament.id}-${compact ? 'c' : 'd'}`} className={styles.keyLabel}>
          <span aria-hidden="true">📅</span> Date &amp; time
        </p>
        <p className={styles.keyValue}>{formatLongDate(tournament.dates.startsAt, tournament.dates.endsAt)}</p>
      </section>

      <section className={styles.keyPanel} aria-labelledby={`where-${tournament.id}-${compact ? 'c' : 'd'}`}>
        <p id={`where-${tournament.id}-${compact ? 'c' : 'd'}`} className={styles.keyLabel}>
          <span aria-hidden="true">📍</span> Venue
        </p>
        <p className={styles.keyValue}>{venue.name}</p>
        {venue.address && <p className={styles.keyAddress}>{venue.address}</p>}
        <a
          href={directionsHref(tournament)}
          target="_blank"
          rel="noreferrer"
          className={styles.keyMap}
          aria-label={`Get directions to ${venue.name} (opens a map in a new tab)`}
        >
          Get directions ↗
        </a>
      </section>
    </div>
  )
}

/** Supporting details as a consistent label/value list: fee, prizes, time control, format. Values are the stored ones, formatted. */
export function EventFacts({ tournament }: { tournament: ChessTournament }) {
  const tc = formatTimeControl(tournament.timeControl)
  const rows: Array<[string, string]> = []
  if (tournament.entryFee) rows.push(['Entry fee', formatMoney(tournament.entryFee)])
  if (tournament.prizePool) rows.push(['Prize pool', formatMoney(tournament.prizePool.label)])
  if (tc) rows.push(['Time control', tc])
  if (tournament.format !== 'Unknown') {
    rows.push(['Format', roundsVaryAcrossCategories(tournament.results) ? 'Rounds vary by category' : tournament.format])
  }
  if (rows.length === 0) return null
  return (
    <dl className={styles.facts}>
      {rows.map(([k, v]) => (
        <div key={k} className={styles.fact}>
          <dt>{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  )
}
