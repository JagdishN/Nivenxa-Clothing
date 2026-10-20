import Link from 'next/link'
import { THEME_LABELS, RATING_BANDS, isBandAvailable, type DifficultyLevel, type ThemeSummary } from '@/lib/chess/puzzles'
import styles from './Puzzles.module.scss'

// Reuses the same icons already picked for the matching Tactics (same
// underlying ideas: hanging pieces, forks, pins…) — visual polish to match
// every other Learn catalogue's card icons, not a new data field. No
// number badge here on purpose — unlike Tactics' Start Here/Learn Next
// groups, puzzle themes have no real learning order to number through.
const THEME_ICON: Record<string, string> = {
  fork: '🔱',
  pin: '📌',
  skewer: '🗡️',
  discoveredAttack: '🔍',
  hangingPiece: '🎯',
  backRankMate: '🏰',
  endgame: '♟️',
  mateIn1: '🏁',
  mateIn2: '🔚',
  doubleCheck: '⚡',
  deflection: '↪️',
  sacrifice: '💣',
  capturingDefender: '🪓',
  intermezzo: '⏸️',
  clearance: '🧹',
  attraction: '🎣',
  interference: '🚧',
  trappedPiece: '🕸️',
}

const LEVELS: DifficultyLevel[] = ['all', 'beginner', 'intermediate', 'advanced']

function levelHref(theme: string | null, level: DifficultyLevel): string {
  const base = theme ? `/chess/puzzles/${theme}` : '/chess/puzzles'
  return level === 'all' ? base : `${base}?level=${level}`
}

export default function PuzzleCatalogueGrid({ themes, level }: { themes: ThemeSummary[]; level: DifficultyLevel }) {
  // A theme only shows under a given level when that band actually clears
  // the floor for it — the filter's whole point is to stop pointing
  // learners at a "Beginner" link that turns out to hold two puzzles.
  const filtered = level === 'all' ? themes : themes.filter((t) => isBandAvailable(t.bands, level))

  return (
    <>
      <div className={styles.difficultyFilter} role="group" aria-label="Filter by difficulty">
        {LEVELS.map((l) => (
          <Link
            key={l}
            href={levelHref(null, l)}
            className={`${styles.difficultyBtn} ${level === l ? styles.difficultyBtnActive : ''}`}
            aria-current={level === l ? 'true' : undefined}
          >
            {l === 'all' ? 'All' : RATING_BANDS[l].label}
          </Link>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className={styles.emptyState}>
          <p>No puzzle sets in this range yet — try a different difficulty.</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {filtered.map((t) => {
            // With a level active, the card's count/range describes that
            // band specifically — the whole-theme range (e.g. 399-3233) is
            // exactly what makes a 36-puzzle spread look alarming.
            const band = level === 'all' ? null : t.bands[level]
            const count = band ? band.count : t.count
            const minRating = band ? band.minRating : t.minRating
            const maxRating = band ? band.maxRating : t.maxRating
            return (
              <Link key={t.theme} href={levelHref(t.theme, level)} className={styles.tile}>
                <span className={styles.tileIcon} aria-hidden="true">
                  {THEME_ICON[t.theme] ?? '♟️'}
                </span>
                <h2 className={styles.tileTier}>{THEME_LABELS[t.theme] ?? t.theme}</h2>
                <p className={styles.tileCount}>
                  {count} puzzle{count === 1 ? '' : 's'}
                </p>
                <span className={styles.tileFooter}>
                  <span className={styles.tileRange}>
                    Rating {minRating}–{maxRating}
                  </span>
                  <span className={styles.tileCta}>Solve →</span>
                </span>
              </Link>
            )
          })}
        </div>
      )}
    </>
  )
}
