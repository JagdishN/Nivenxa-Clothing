import Link from 'next/link'
import { getThemeSummaries, THEME_LABELS } from '@/lib/chess/puzzles'
import styles from './Puzzles.module.scss'

export const dynamic = 'force-dynamic' // reflect newly-imported puzzles without a rebuild

export default async function ChessPuzzlesPage() {
  const themes = await getThemeSummaries()

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <p className={styles.eyebrow}>NIVENXA CHESS</p>
        <h1 className={styles.heading}>Puzzles</h1>
        <p className={styles.subtext}>
          Curated puzzle sets to build your tactics, one motif at a time. Pick a theme to begin.
        </p>
      </section>

      {themes.length === 0 ? (
        <div className={styles.emptyState}>
          <p>No puzzles are available yet.</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {themes.map((t) => (
            <Link key={t.theme} href={`/chess/puzzles/${t.theme}`} className={styles.tile}>
              <span className={styles.tileTier}>{THEME_LABELS[t.theme] ?? t.theme}</span>
              <span className={styles.tileCount}>
                {t.count} puzzle{t.count === 1 ? '' : 's'}
              </span>
              <span className={styles.tileRange}>
                Rating {t.minRating}–{t.maxRating}
              </span>
            </Link>
          ))}
        </div>
      )}
    </main>
  )
}
