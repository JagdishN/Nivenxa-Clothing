import { notFound } from 'next/navigation'
import type { PlayedGameSummary, PuzzleAttemptSummary, SavedAnalysisSummary } from '@/lib/chess/activityActions'
import ActivityTabs from '../../activity/ActivityTabs'
import { AnalysisRows, GameRows, PuzzleRows } from '../../activity/Lists'
import { Empty, Filters, LoadFailed, Pager } from '../../activity/Parts'
import ListSkeleton from '../../activity/Skeleton'
import styles from '../../activity/Activity.module.scss'

// Development-only: the My Activity lists rendered from FIXTURES (the real pages need a signed-in account and a database).
// 404 in a production build. Used by tests/chess-activity.spec.ts for layout, states and screenshots.
export const dynamic = 'force-dynamic'

const U = 'f0000000-0000-4000-8000-0000000000'
const games: PlayedGameSummary[] = [
  { id: `${U}01`, status: 'completed', playerColor: 'w', opponent: 'Nivenxa · Intermediate', tier: 'intermediate', timeControl: 'Rapid · 10 + 5', result: '1-0', moveCount: 41, analysisGameId: `${U}91`, startedAt: '2026-11-09T18:03:00Z' },
  { id: `${U}02`, status: 'resigned', playerColor: 'b', opponent: 'Nivenxa · Expert', tier: 'expert', timeControl: 'Blitz · 3 + 2', result: '1-0', moveCount: 28, analysisGameId: null, startedAt: '2026-11-08T09:20:00Z' },
  { id: `${U}03`, status: 'completed', playerColor: 'w', opponent: 'Nivenxa · Beginner', tier: 'beginner', timeControl: null, result: '1/2-1/2', moveCount: 63, analysisGameId: null, startedAt: '2026-11-07T07:00:00Z' },
  { id: `${U}04`, status: 'abandoned', playerColor: 'b', opponent: 'Nivenxa · Master with a deliberately long name to test wrapping on narrow screens', tier: 'master', timeControl: 'Classical · 30 + 20', result: '*', moveCount: 9, analysisGameId: null, startedAt: '2026-11-01T12:00:00Z' },
]
const analyses: SavedAnalysisSummary[] = [
  { id: `${U}91`, source: 'nivenxa-play', white: 'You', black: 'Nivenxa · Intermediate', event: null, playedOn: null, result: '1-0', moveCount: 41, accuracyWhite: 87, accuracyBlack: 71, analysed: true, createdAt: '2026-11-09T18:30:00Z' },
  { id: `${U}92`, source: 'paste', white: 'Magnus', black: 'Hikaru', event: 'Imported: Online Blitz Final', playedOn: '2026-10-02', result: '0-1', moveCount: 55, accuracyWhite: null, accuracyBlack: null, analysed: false, createdAt: '2026-11-03T10:00:00Z' },
  { id: `${U}93`, source: 'manual', white: null, black: null, event: null, playedOn: null, result: null, moveCount: 12, accuracyWhite: 64, accuracyBlack: 59, analysed: true, createdAt: '2026-10-20T10:00:00Z' },
]
const attempts: PuzzleAttemptSummary[] = [
  { id: `${U}a1`, puzzleId: `${U}b1`, lichessId: 'abc12', rating: 1320, themes: ['fork', 'middlegame'], solved: true, outcome: 'solved', hintsUsed: 0, wrongAttempts: 0, attemptedAt: '2026-11-09T12:00:00Z' },
  { id: `${U}a2`, puzzleId: `${U}b2`, lichessId: 'def34', rating: 980, themes: ['hangingPiece', 'mateIn1'], solved: true, outcome: 'solved_with_hint', hintsUsed: 2, wrongAttempts: 1, attemptedAt: '2026-11-08T12:00:00Z' },
  { id: `${U}a3`, puzzleId: `${U}b3`, lichessId: 'ghi56', rating: 1500, themes: ['pin'], solved: false, outcome: 'solution_viewed', hintsUsed: 3, wrongAttempts: 2, attemptedAt: '2026-11-07T12:00:00Z' },
  { id: `${U}a4`, puzzleId: `${U}b4`, lichessId: 'jkl78', rating: 1100, themes: ['mateIn2'], solved: false, outcome: 'skipped', hintsUsed: 0, wrongAttempts: 0, attemptedAt: '2026-11-06T12:00:00Z' },
  { id: `${U}a5`, puzzleId: `${U}b5`, lichessId: null, rating: null, themes: [], solved: true, outcome: null, hintsUsed: null, wrongAttempts: null, attemptedAt: '2026-10-01T12:00:00Z' },
]

export default async function Page({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  if (process.env.NODE_ENV === 'production') notFound()
  const { view = 'games' } = await searchParams
  return (
    <main className={styles.page}>
      <h1 className={styles.heading}>My Activity</h1>
      <p className={styles.sub}>Your games, saved analyses and puzzle history.</p>
      <ActivityTabs />
      {view === 'games' && (
        <>
          <Filters base="/chess/dev-preview/activity" current="all" options={[{ id: 'all', label: 'All' }, { id: 'won', label: 'Won' }, { id: 'lost', label: 'Lost' }, { id: 'draw', label: 'Draws' }, { id: 'analysed', label: 'Analysed' }]} />
          <GameRows rows={games} />
          <Pager base="/chess/dev-preview/activity" filter="all" cursor="x" next="y" />
        </>
      )}
      {view === 'analyses' && <AnalysisRows rows={analyses} />}
      {view === 'puzzles' && <PuzzleRows rows={attempts} />}
      {view === 'empty-games' && <Empty title="No games yet" text="Games you play against NIVENXA are saved here when they finish." cta="Play your first game" href="/chess/play" />}
      {view === 'empty-analyses' && <Empty title="No saved analyses yet" text="Analyse a game you played, import one, or recreate a position. Finished analyses are saved here." cta="Analyse a game" href="/chess/analysis" />}
      {view === 'empty-puzzles' && <Empty title="No puzzles yet" text="Puzzles you solve, skip or reveal are listed here." cta="Try a puzzle" href="/chess/puzzles" />}
      {view === 'failed' && <LoadFailed what="Games" href="/chess/dev-preview/activity" />}
      {view === 'unavailable' && <LoadFailed what="Games" href="/chess/dev-preview/activity" unavailable />}
      {view === 'loading' && <ListSkeleton what="games" />}
    </main>
  )
}

