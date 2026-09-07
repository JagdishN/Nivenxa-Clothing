'use server'
// Split out from puzzles.ts: a module-level "use server" file is what lets
// Next.js safely import a server action from a Client Component (the
// PuzzleSolver board) — an inline per-function "use server" inside
// puzzles.ts doesn't work once that file is also imported by a Client
// Component, since Next then treats it as part of the client bundle too.
import { getSupabaseAdmin } from './supabase'

/** user_id stays null until real auth exists (see supabase/schema.sql's comment on puzzle_attempts.user_id). */
export async function logPuzzleAttempt(input: { puzzleId: string; solved: boolean; timeTakenSeconds?: number }): Promise<void> {
  const supabase = getSupabaseAdmin()
  const { error } = await supabase.from('puzzle_attempts').insert({
    user_id: null,
    puzzle_id: input.puzzleId,
    solved: input.solved,
    time_taken_seconds: input.timeTakenSeconds ?? null,
  })
  if (error) console.error('logPuzzleAttempt: insert failed —', error.message)
}
