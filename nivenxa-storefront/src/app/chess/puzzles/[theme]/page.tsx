import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import {
  computeBands,
  filterByLevel,
  getThemePuzzles,
  isBandAvailable,
  isDifficultyLevel,
  RATING_BANDS,
  THEME_LABELS,
  type DifficultyLevel,
} from '@/lib/chess/puzzles'
import { seoMetadata } from '@/lib/seo'
import PuzzleSolver from './PuzzleSolver'
import styles from '../Puzzles.module.scss'

const LEVELS: DifficultyLevel[] = ['all', 'beginner', 'intermediate', 'advanced']

export const dynamic = 'force-dynamic'

// Only the themes with a real Tactics lesson behind them — endgame/mateIn1/
// mateIn2/sacrifice have no matching Tactics entry and simply get no link.
// A quiet pointer back to Learn, not a gate: Puzzles stays reachable with
// no required detour through a lesson first.
const THEME_TO_TACTIC_SLUG: Partial<Record<string, string>> = {
  fork: 'forks',
  pin: 'pins',
  skewer: 'skewers',
  discoveredAttack: 'discovered-attack',
  hangingPiece: 'hanging-pieces',
  backRankMate: 'back-rank-mate',
  doubleCheck: 'double-check',
  deflection: 'deflection',
  capturingDefender: 'removing-the-defender',
  intermezzo: 'in-between-move',
  clearance: 'clearance',
  attraction: 'decoy',
  interference: 'interference',
  trappedPiece: 'trapped-piece',
}

export async function generateMetadata({ params }: { params: Promise<{ theme: string }> }): Promise<Metadata> {
  const { theme } = await params
  const label = THEME_LABELS[theme]
  if (!label) return { title: 'Puzzle — NIVENXA Chess', robots: { index: false, follow: true } }
  return seoMetadata({
    title: `${label} Puzzles — NIVENXA Chess`,
    description: `Practise ${label.toLowerCase()} puzzles at your own level, with hints and a step-by-step explanation of every solution.`,
    path: `/chess/puzzles/${theme}`,
  })
}

export default async function PuzzleThemePage({
  params,
  searchParams,
}: {
  params: Promise<{ theme: string }>
  searchParams: Promise<{ level?: string; puzzle?: string }>
}) {
  const [{ theme }, { level: levelParam, puzzle: startAtParam }] = await Promise.all([params, searchParams])
  const requestedLevel = isDifficultyLevel(levelParam) ? levelParam : 'all'
  // One query for the whole theme; band availability and the filtered set are
  // both derived from it (this used to be two round trips). A database error
  // throws to the route's error boundary — only a theme that genuinely has no
  // puzzles is a 404.
  const allPuzzles = await getThemePuzzles(theme)
  if (allPuzzles.length === 0) notFound()
  const bands = computeBands(allPuzzles.map((p) => p.rating))
  // A thin/unavailable band for THIS theme isn't a 404 and isn't shown as a
  // near-empty page either — a stale or hand-typed URL for it just falls
  // back to the theme's full set, same as never passing a level at all.
  const fellBack = requestedLevel !== 'all' && !isBandAvailable(bands, requestedLevel)
  const level: DifficultyLevel = fellBack ? 'all' : requestedLevel

  const puzzles = filterByLevel(allPuzzles, level)
  // Carries the active filter back to the catalogue (see PuzzleSolver's own copy of this).
  const puzzlesHref = level === 'all' ? '/chess/puzzles' : `/chess/puzzles?level=${level}`
  const tacticSlug = THEME_TO_TACTIC_SLUG[theme]
  const themeLabel = THEME_LABELS[theme] ?? theme
  const levelLabel = level === 'all' ? null : RATING_BANDS[level].label

  return (
    <main className={styles.page}>
      <section className={styles.topicHero}>
        <Link href={puzzlesHref} className={styles.breadcrumb}>
          ← Puzzles
        </Link>
        <h1 className={styles.topicHeading}>{themeLabel}</h1>

        <div className={styles.topicFilter} role="group" aria-label="Filter by difficulty">
          {LEVELS.filter((l) => isBandAvailable(bands, l)).map((l) => (
            <Link
              key={l}
              href={l === 'all' ? `/chess/puzzles/${theme}` : `/chess/puzzles/${theme}?level=${l}`}
              className={`${styles.difficultyBtn} ${level === l ? styles.difficultyBtnActive : ''}`}
              aria-current={level === l ? 'true' : undefined}
            >
              {l === 'all' ? 'All' : RATING_BANDS[l].label}
            </Link>
          ))}
        </div>

        <p className={styles.topicMeta}>
          {fellBack && (
            <>
              Not enough {RATING_BANDS[requestedLevel as Exclude<DifficultyLevel, 'all'>].label.toLowerCase()} puzzles here yet — showing the full set.{' '}
            </>
          )}
          {puzzles.length} {levelLabel ? `${levelLabel.toLowerCase()} ` : ''}puzzle{puzzles.length === 1 ? '' : 's'}, easiest first.
          {tacticSlug && (
            <>
              {' '}
              New to {themeLabel.toLowerCase()}? <Link href={`/chess/learn/tactics/${tacticSlug}`}>Learn with an example →</Link>
            </>
          )}
        </p>
      </section>

      {/* Keyed on theme+level — otherwise PuzzleSolver's own puzzleIndex state
          (and everything derived from it) would carry over across a
          level-filter navigation into a shorter/reordered puzzle array,
          same class of cross-navigation state leak fixed earlier for
          Tactics/Endgames' detail components. */}
      <PuzzleSolver key={`${theme}-${level}`} puzzles={puzzles} themeLabel={themeLabel} theme={theme} level={level} startAtLichessId={startAtParam} />
    </main>
  )
}
