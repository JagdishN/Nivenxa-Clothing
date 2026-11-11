'use server'
// Split out from puzzles.ts: a module-level "use server" file is what lets
// Next.js safely import a server action from a Client Component (the
// PuzzleSolver board) — an inline per-function "use server" inside
// puzzles.ts doesn't work once that file is also imported by a Client
// Component, since Next then treats it as part of the client bundle too.
import { getSupabaseAdmin } from './supabase'
import { getChessSession } from './chessAuth'
import { outcomeCountsAsSolved, type PuzzleOutcome } from './puzzleLogic'

const OUTCOMES: readonly PuzzleOutcome[] = ['solved', 'solved_with_hint', 'solution_viewed', 'skipped']

export interface PuzzleAttemptInput {
  puzzleId: string
  outcome: PuzzleOutcome
  hintsUsed: number
  wrongAttempts: number
  timeTakenSeconds?: number
}

/**
 * Records one result for a puzzle. user_id comes from the server-side session when one exists —
 * never from the client. Stays null for a guest, same as before auth existed.
 *
 * `solved` (the original column) is true for a genuine solve — unaided or hinted — and never for a
 * revealed solution or a skip, so existing "puzzles solved" counts can't be inflated by viewing the
 * answer. The richer columns (outcome / hints_used / wrong_attempts) come from
 * supabase/migrations/20261109090000_puzzle_attempt_outcomes.sql; until that is applied the insert
 * falls back to the original columns so logging keeps working.
 *
 * A second *solved* result for the same logged-in player and puzzle is not inserted: replaying a puzzle
 * never overwrites or duplicates a completed one.
 */
export async function logPuzzleAttempt(input: PuzzleAttemptInput): Promise<{ ok: boolean; deduped?: boolean }> {
  if (!OUTCOMES.includes(input.outcome)) return { ok: false }
  const session = await getChessSession()
  const supabase = getSupabaseAdmin()
  const solved = outcomeCountsAsSolved(input.outcome)

  if (solved && session) {
    const { data: existing } = await supabase
      .from('puzzle_attempts')
      .select('id')
      .eq('user_id', session.userId)
      .eq('puzzle_id', input.puzzleId)
      .eq('solved', true)
      .limit(1)
    if (existing && existing.length > 0) return { ok: true, deduped: true }
  }

  const base = {
    user_id: session?.userId ?? null,
    puzzle_id: input.puzzleId,
    solved,
    time_taken_seconds: input.timeTakenSeconds ?? null,
  }
  const rich = {
    ...base,
    outcome: input.outcome,
    hints_used: Math.max(0, Math.min(3, Math.round(input.hintsUsed))),
    wrong_attempts: Math.max(0, Math.min(99, Math.round(input.wrongAttempts))),
  }
  let { error } = await supabase.from('puzzle_attempts').insert(rich)
  // 42703 = undefined_column (Postgres); PGRST204 = column not in PostgREST's schema cache.
  if (error && (error.code === '42703' || error.code === 'PGRST204')) {
    ;({ error } = await supabase.from('puzzle_attempts').insert(base))
  }
  if (error) {
    console.error('logPuzzleAttempt: insert failed —', error.message)
    return { ok: false }
  }
  return { ok: true }
}

export interface PuzzleStats {
  solved: number
}

/** Puzzles solved status for the logged-in user — null for a guest (nothing to attribute). Counts distinct puzzles, not raw attempt rows, so re-solving the same puzzle twice doesn't inflate the count. */
export async function getMyPuzzleStats(): Promise<PuzzleStats | null> {
  const session = await getChessSession()
  if (!session) return null

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase.from('puzzle_attempts').select('puzzle_id').eq('user_id', session.userId).eq('solved', true)
  if (error) {
    console.error('getMyPuzzleStats: select failed —', error.message)
    return { solved: 0 }
  }
  return { solved: new Set(data.map((row) => row.puzzle_id)).size }
}
