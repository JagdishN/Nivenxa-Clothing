import Link from 'next/link'
import MyGamesList from './MyGamesList'
import type { AnalysisGameFilter } from './MyGamesList'
import styles from './MyGames.module.scss'

const VALID_FILTERS: AnalysisGameFilter[] = ['all', 'analyzed', 'not-analyzed']

export default async function ChessAnalysisMyGamesPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>
}) {
  const params = await searchParams
  const initialFilter = VALID_FILTERS.includes(params.filter as AnalysisGameFilter)
    ? (params.filter as AnalysisGameFilter)
    : 'all'

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <p className={styles.eyebrow}>NIVENXA CHESS · ANALYSIS</p>
        <h1 className={styles.heading}>My Games</h1>
      </section>

      <nav className={styles.tabs} aria-label="Analysis sections">
        <Link href="/chess/analysis" className={styles.tab}>
          Analyze
        </Link>
        <span className={styles.tabActive}>My Games</span>
        <Link href="/chess/analysis/my-puzzles" className={styles.tab}>
          My Puzzles
        </Link>
      </nav>

      <MyGamesList initialFilter={initialFilter} />
    </main>
  )
}
