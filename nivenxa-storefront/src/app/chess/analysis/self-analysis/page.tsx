import Link from 'next/link'
import SelfAnalysisBoard from './SelfAnalysisBoard'
import styles from './SelfAnalysis.module.scss'

export default function ChessAnalysisSelfAnalysisPage() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <Link href="/chess/analysis" className={styles.breadcrumb}>
          ← Analysis
        </Link>
        <p className={styles.eyebrow}>NIVENXA CHESS · ANALYSIS</p>
        <h1 className={styles.heading}>Recreate a Game</h1>
        <p className={styles.subtext}>
          Recreate your completed game by playing the moves on the board. When you&apos;re finished, Nivenxa will
          analyze the complete game.
        </p>
      </section>
      <SelfAnalysisBoard />
    </main>
  )
}
