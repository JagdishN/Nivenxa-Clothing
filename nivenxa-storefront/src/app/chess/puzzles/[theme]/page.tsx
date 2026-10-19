import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPuzzlesByTheme, THEME_LABELS } from '@/lib/chess/puzzles'
import PuzzleSolver from './PuzzleSolver'
import styles from '../Puzzles.module.scss'

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

export default async function PuzzleThemePage({ params }: { params: Promise<{ theme: string }> }) {
  const { theme } = await params
  const puzzles = await getPuzzlesByTheme(theme)
  if (puzzles.length === 0) notFound()
  const tacticSlug = THEME_TO_TACTIC_SLUG[theme]
  const themeLabel = THEME_LABELS[theme] ?? theme

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <Link href="/chess/puzzles" className={styles.breadcrumb}>
          ← Puzzles
        </Link>
        <h1 className={styles.heading}>{themeLabel}</h1>
        <p className={styles.subtext}>
          {puzzles.length} puzzle{puzzles.length === 1 ? '' : 's'}, easiest first.
        </p>
        {tacticSlug && (
          <p className={styles.subtext}>
            New to {themeLabel.toLowerCase()}?{' '}
            <Link href={`/chess/learn/tactics/${tacticSlug}`}>Learn with an example →</Link>
          </p>
        )}
      </section>

      <PuzzleSolver puzzles={puzzles} themeLabel={themeLabel} theme={theme} />
    </main>
  )
}
