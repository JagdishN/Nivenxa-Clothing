import type { Metadata } from 'next'
import Link from 'next/link'
import MyPuzzlesList from './MyPuzzlesList'
import styles from './MyPuzzles.module.scss'

// Session-specific content, not generic enough to index — see
// chess/analysis/import/page.tsx for the full reasoning.
export const metadata: Metadata = { robots: { index: false, follow: true } }

export default function ChessAnalysisMyPuzzlesPage() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <p className={styles.eyebrow}>NIVENXA CHESS · ANALYSIS</p>
        <h1 className={styles.heading}>My Puzzles</h1>
        <p className={styles.subtext}>Positions you saved from your own games while practicing.</p>
      </section>

      <nav className={styles.tabs} aria-label="Analysis sections">
        <Link href="/chess/analysis" className={styles.tab}>
          Analyze
        </Link>
        <Link href="/chess/analysis/my-games" className={styles.tab}>
          My Games
        </Link>
        <span className={styles.tabActive}>My Puzzles</span>
      </nav>

      <MyPuzzlesList />
    </main>
  )
}
