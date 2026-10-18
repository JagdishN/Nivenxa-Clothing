'use server'
// Split out from puzzles.ts: a module-level "use server" file is what lets
// Next.js safely import a server action from a Client Component (the
// PuzzleSolver board) — an inline per-function "use server" inside
// puzzles.ts doesn't work once that file is also imported by a Client
// Component, since Next then treats it as part of the client bundle too.
import { getSupabaseAdmin } from './supabase'
import { getChessSession } from './chessAuth'

/** user_id is set from the server-side session when one exists — never trust a client-supplied id for this. Stays null for a guest solve, same as before auth existed. */
export async function logPuzzleAttempt(input: { puzzleId: string; solved: boolean; timeTakenSeconds?: number }): Promise<void> {
  const session = await getChessSession()
  const supabase = getSupabaseAdmin()
  const { error } = await supabase.from('puzzle_attempts').insert({
    user_id: session?.userId ?? null,
    puzzle_id: input.puzzleId,
    solved: input.solved,
    time_taken_seconds: input.timeTakenSeconds ?? null,
  })
  if (error) console.error('logPuzzleAttempt: insert failed —', error.message)
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
