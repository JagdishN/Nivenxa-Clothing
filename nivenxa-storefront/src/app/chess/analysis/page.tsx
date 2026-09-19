import Link from 'next/link'
import { getChessSession } from '@/lib/chess/chessAuth'
import { listMyGames } from '@/lib/chess/analysisActions'
import NivenxaGamesCard from './NivenxaGamesCard'
import CardIcon from './CardIcon'
import styles from './Analysis.module.scss'

export default async function ChessAnalysisPage() {
  const session = await getChessSession()
  const hasNivenxaGames = session
    ? (await listMyGames(session.userId)).some((g) => g.source === 'nivenxa-play')
    : false

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <p className={styles.eyebrow}>NIVENXA CHESS</p>
        <h1 className={styles.heading}>Understand your game, move by move.</h1>
        <p className={styles.subtext}>
          See how your game unfolded, discover the moments that mattered, and learn what you can do better next time.
        </p>
      </section>

      <h2 className={styles.prompt}>How would you like to analyze?</h2>

      <div className={styles.grid}>
        <Link href="/chess/analysis/import" className={styles.card}>
          <CardIcon type="import" />
          <h3 className={styles.cardTitle}>Import a Game</h3>
          <p className={styles.cardDesc}>Have your game saved? Upload it or paste your moves and we&apos;ll take it from there.</p>
          <div className={styles.cardActions}>
            <span className={styles.cardPrimaryBtn}>Import Game →</span>
          </div>
        </Link>

        <Link href="/chess/analysis/self-analysis" className={styles.card}>
          <CardIcon type="recreate" />
          <h3 className={styles.cardTitle}>Recreate a Game</h3>
          <p className={styles.cardDesc}>Play through your finished game on the board. When you&apos;re done, Nivenxa will analyze it.</p>
          <div className={styles.cardActions}>
            <span className={styles.cardPrimaryBtn}>Recreate Game →</span>
          </div>
        </Link>

        <NivenxaGamesCard session={session} hasGames={hasNivenxaGames} />
      </div>
    </main>
  )
}
