import Link from 'next/link'
import type { ChessSession } from '@/lib/chess/chessAuth'
import CardIcon from './CardIcon'
import styles from './Analysis.module.scss'

/**
 * The one card whose content depends on who's looking — but it stays the
 * same card, in the same grid slot, at the same size, in all three states.
 * The action(s) live inside the card itself (no click-through to discover a
 * login wall). Both auth links carry `?redirect=/chess/analysis` so signing
 * in returns here, never to Home. Unlike the other two cards, the guest
 * state isn't a whole-card link — it holds two distinct auth actions, so
 * only the two real buttons are clickable there.
 */
export default function NivenxaGamesCard({ session, hasGames }: { session: ChessSession | null; hasGames: boolean }) {
  if (!session) {
    return (
      <div className={styles.card}>
        <CardIcon type="games" />
        <h3 className={styles.cardTitle}>My Nivenxa Games</h3>
        <p className={styles.cardDesc}>Choose a game you&apos;ve already played on Nivenxa and analyze it move by move.</p>
        <div className={styles.cardActions}>
          <Link href="/chess/login?redirect=/chess/analysis" className={styles.cardPrimaryBtn}>
            Log In
          </Link>
          <Link href="/chess/signup?redirect=/chess/analysis" className={styles.cardSecondaryBtn}>
            Sign Up
          </Link>
        </div>
      </div>
    )
  }

  if (!hasGames) {
    return (
      <Link href="/chess/play" className={styles.card}>
        <CardIcon type="games" />
        <h3 className={styles.cardTitle}>My Nivenxa Games</h3>
        <p className={styles.cardDesc}>No games yet. Play your first Nivenxa game and come back to analyze it.</p>
        <div className={styles.cardActions}>
          <span className={styles.cardPrimaryBtn}>Play a Game →</span>
        </div>
      </Link>
    )
  }

  return (
    <Link href="/chess/analysis/my-games" className={styles.card}>
      <CardIcon type="games" />
      <h3 className={styles.cardTitle}>My Nivenxa Games</h3>
      <p className={styles.cardDesc}>Choose one of your Nivenxa games and see where the game changed.</p>
      <div className={styles.cardActions}>
        <span className={styles.cardPrimaryBtn}>View My Games →</span>
      </div>
    </Link>
  )
}
