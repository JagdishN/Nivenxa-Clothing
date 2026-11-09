import ChessLandingContent from '../ChessLandingContent'
import styles from '../Chess.module.scss'

// Shown the instant Home is clicked, while the event strip's query runs: the REAL hero (heading, copy, Start playing,
// Try a puzzle) — it needs no data — with a same-sized placeholder where the strip will land. It sits in a route
// group so it only covers Home, never the other Chess pages.
export default function Loading() {
  return <ChessLandingContent tournamentSlot={<div className={styles.tCardPlaceholder} aria-hidden="true" />} />
}
