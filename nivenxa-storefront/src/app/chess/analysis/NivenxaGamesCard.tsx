import Link from 'next/link'
import type { ChessSession } from '@/lib/chess/chessAuth'
import CardIcon from './CardIcon'
import styles from './Analysis.module.scss'

/**
 * "Choose one of My Games to analyse" — a way to START an analysis. Signed in: opens My Activity → My Games, where each
 * game has Analyse. Signed out: the account actions are in the card; both return to My Games after signing in.
 */
export default function NivenxaGamesCard({ session }: { session: ChessSession | null }) {
  const target = '/chess/activity/games'
  if (!session) {
    return (
      <div className={styles.card}>
        <CardIcon type="games" />
        <h3 className={styles.cardTitle}>My Games</h3>
        <p className={styles.cardDesc}>Choose a game you&apos;ve played on NIVENXA and analyse it move by move. Needs a free account.</p>
        <div className={styles.cardActions}>
          <Link href={`/chess/login?redirect=${encodeURIComponent(target)}`} className={styles.cardPrimaryBtn}>
            Log In
          </Link>
          <Link href={`/chess/signup?redirect=${encodeURIComponent(target)}`} className={styles.cardSecondaryBtn}>
            Sign Up
          </Link>
        </div>
      </div>
    )
  }
  return (
    <Link href={target} className={styles.card}>
      <CardIcon type="games" />
      <h3 className={styles.cardTitle}>My Games</h3>
      <p className={styles.cardDesc}>Choose one of the games you played on NIVENXA and analyse it.</p>
      <div className={styles.cardActions}>
        <span className={styles.cardPrimaryBtn}>Choose a game →</span>
      </div>
    </Link>
  )
}
