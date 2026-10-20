'use client'
import { useState } from 'react'
import Link from 'next/link'
import { THEME_LABELS, type ThemeSummary } from '@/lib/chess/puzzles'
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

type Difficulty = 'all' | 'beginner' | 'intermediate' | 'advanced'

// Standard, rough rating buckets — a theme's wide min/max range (e.g.
// 399-3233) said nothing about whether it was safe to start with; this at
// least narrows the choice before the numbers matter at all.
const BUCKETS: { key: Difficulty; label: string; min: number; max: number }[] = [
  { key: 'all', label: 'All', min: -Infinity, max: Infinity },
  { key: 'beginner', label: 'Beginner', min: 0, max: 1199 },
  { key: 'intermediate', label: 'Intermediate', min: 1200, max: 1799 },
  { key: 'advanced', label: 'Advanced', min: 1800, max: Infinity },
]

export default function PuzzleCatalogueGrid({ themes }: { themes: ThemeSummary[] }) {
  const [difficulty, setDifficulty] = useState<Difficulty>('all')
  const bucket = BUCKETS.find((b) => b.key === difficulty)!
  const filtered = difficulty === 'all' ? themes : themes.filter((t) => t.minRating <= bucket.max && t.maxRating >= bucket.min)

  return (
    <>
      <div className={styles.difficultyFilter} role="group" aria-label="Filter by difficulty">
        {BUCKETS.map((b) => (
          <button
            key={b.key}
            type="button"
            className={`${styles.difficultyBtn} ${difficulty === b.key ? styles.difficultyBtnActive : ''}`}
            onClick={() => setDifficulty(b.key)}
          >
            {b.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className={styles.emptyState}>
          <p>No puzzle sets in this range yet — try a different difficulty.</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {filtered.map((t) => (
            <Link key={t.theme} href={`/chess/puzzles/${t.theme}`} className={styles.tile}>
              <span className={styles.tileIcon} aria-hidden="true">
                {THEME_ICON[t.theme] ?? '♟️'}
              </span>
              <h2 className={styles.tileTier}>{THEME_LABELS[t.theme] ?? t.theme}</h2>
              <p className={styles.tileCount}>
                {t.count} puzzle{t.count === 1 ? '' : 's'}
              </p>
              <span className={styles.tileFooter}>
                <span className={styles.tileRange}>
                  Rating {t.minRating}–{t.maxRating}
                </span>
                <span className={styles.tileCta}>Solve →</span>
              </span>
            </Link>
          ))}
        </div>
      )}
    </>
  )
}
