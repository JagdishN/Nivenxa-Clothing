'use client'
import { useParams } from 'next/navigation'
import { THEME_LABELS } from '@/lib/chess/puzzleThemes'
import styles from './Puzzles.module.scss'

// Shown the instant a Puzzles link is clicked (Next's loading.tsx boundary),
// while the real page's data is still being fetched. It renders the
// destination's own heading, so the page never looks like the previous route
// with only the URL changed; the nav highlight comes from the same pathname.
// Sizes mirror the real catalogue/solver so nothing shifts when content lands.

export function CatalogueSkeleton() {
  return (
    <main className={styles.page} aria-busy="true">
      <section className={styles.hero}>
        <p className={styles.eyebrow}>NIVENXA CHESS</p>
        <h1 className={styles.heading}>Puzzles</h1>
        <p className={styles.subtext}>Practise finding strong moves. Choose a topic to begin.</p>
      </section>
      <div className={styles.difficultyFilter} aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={`${styles.skeletonPill} ${styles.skeleton}`} />
        ))}
      </div>
      <div className={styles.grid} role="status" aria-live="polite">
        <span className={styles.srOnly}>Loading puzzle topics…</span>
        {Array.from({ length: 12 }, (_, i) => (
          <span key={i} className={`${styles.skeletonTile} ${styles.skeleton}`} aria-hidden="true" />
        ))}
      </div>
    </main>
  )
}

export function TopicSkeleton() {
  const { theme } = useParams<{ theme: string }>()
  const label = THEME_LABELS[theme] ?? 'Puzzle'
  return (
    <main className={styles.page} aria-busy="true">
      <section className={styles.topicHero}>
        <span className={styles.breadcrumb}>← Puzzles</span>
        <h1 className={styles.topicHeading}>{label}</h1>
        <div className={styles.topicFilter} aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <span key={i} className={`${styles.skeletonPill} ${styles.skeleton}`} />
          ))}
        </div>
      </section>
      <div className={styles.skeletonSolver} role="status" aria-live="polite">
        <span className={styles.srOnly}>Loading {label} puzzles…</span>
        <span className={`${styles.skeletonBoard} ${styles.skeleton}`} aria-hidden="true" />
        <div className={styles.skeletonPanel} aria-hidden="true">
          <span className={`${styles.skeletonLine} ${styles.skeleton}`} />
          <span className={`${styles.skeletonLineShort} ${styles.skeleton}`} />
          <span className={`${styles.skeletonCard} ${styles.skeleton}`} />
          <div className={styles.skeletonButtons}>
            {/* Present but inert until the position is ready — nothing here can be clicked. */}
            <button type="button" className={styles.skeletonBtn} disabled tabIndex={-1} />
            <button type="button" className={styles.skeletonBtn} disabled tabIndex={-1} />
          </div>
        </div>
      </div>
    </main>
  )
}
