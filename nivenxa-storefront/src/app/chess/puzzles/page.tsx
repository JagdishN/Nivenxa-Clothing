import { getThemeSummaries } from '@/lib/chess/puzzles'
import { getChessSession } from '@/lib/chess/chessAuth'
import { getMyPuzzleStats } from '@/lib/chess/puzzleActions'
import PuzzleCatalogueGrid from './PuzzleCatalogueGrid'
import styles from './Puzzles.module.scss'

export const dynamic = 'force-dynamic' // reflect newly-imported puzzles without a rebuild

export default async function ChessPuzzlesPage() {
  const [themes, session] = await Promise.all([getThemeSummaries(), getChessSession()])
  const stats = session ? await getMyPuzzleStats() : null

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
            {stats.solved === 0 ? "You haven't solved any puzzles yet — pick a theme below." : `You've solved ${stats.solved} puzzle${stats.solved === 1 ? '' : 's'} so far.`}
          </p>
        )}
      </section>

      {themes.length === 0 ? (
        <div className={styles.emptyState}>
          <p>No puzzles are available yet.</p>
        </div>
      ) : (
        <PuzzleCatalogueGrid themes={themes} />
      )}
    </main>
  )
}
