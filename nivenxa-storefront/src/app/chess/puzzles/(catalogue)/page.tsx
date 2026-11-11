import { getThemeSummaries, isDifficultyLevel } from '@/lib/chess/puzzles'
import { getMyPuzzleStats } from '@/lib/chess/puzzleActions'
import { seoMetadata } from '@/lib/seo'
import PuzzleCatalogueGrid from '../PuzzleCatalogueGrid'
import styles from '../Puzzles.module.scss'

export const dynamic = 'force-dynamic' // reflect newly-imported puzzles without a rebuild

export const metadata = seoMetadata({
  title: 'Chess Puzzles — NIVENXA Chess',
  description: 'Practise finding strong moves — forks, pins, mates and more. Choose a topic and a difficulty, and get a hint whenever you need one.',
  path: '/chess/puzzles',
})

export default async function ChessPuzzlesPage({ searchParams }: { searchParams: Promise<{ level?: string }> }) {
  // One round of parallel work: the catalogue (a single paged query) and the
  // solver's own stats (null for a guest, so no session lookup is needed up
  // front). A failure in either throws to the route's error boundary, which
  // offers a retry instead of a misleading "no puzzles" page.
  const [{ level: levelParam }, themes, stats] = await Promise.all([searchParams, getThemeSummaries(), getMyPuzzleStats()])
  const level = isDifficultyLevel(levelParam) ? levelParam : 'all'

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <p className={styles.eyebrow}>NIVENXA CHESS</p>
        <h1 className={styles.heading}>Puzzles</h1>
        <p className={styles.subtext}>Practise finding strong moves. Choose a topic to begin.</p>
        {/* Only a logged-in solver has an account to attribute this to — a
            guest's solves are still logged (see logPuzzleAttempt) but with
            no user_id to count them against, so there's nothing to show. */}
        {stats && (
          <p className={styles.statsLine}>
            {stats.solved === 0 ? "You haven't solved any puzzles yet — pick a topic below." : `You've solved ${stats.solved} puzzle${stats.solved === 1 ? '' : 's'} so far.`}
          </p>
        )}
      </section>

      {themes.length === 0 ? (
        <div className={styles.emptyState}>
          <p>No puzzles are available yet.</p>
        </div>
      ) : (
        <PuzzleCatalogueGrid themes={themes} level={level} />
      )}
    </main>
  )
}
