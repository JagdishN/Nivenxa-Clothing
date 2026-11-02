import { getSupabaseAdmin } from './supabase'

// Sensible default per the brief — generous enough that a real coaching
// session never hits it, tight enough to bound cost/abuse from one account.
const EXPLAIN_RATE_LIMIT = 60
const EXPLAIN_RATE_WINDOW_SECONDS = 60 * 60

/**
 * Only meaningful for a signed-in user — call this only when a session
 * exists (see explain-move/route.ts). Fails OPEN on a database error: a
 * broken rate limiter should never be the reason a player's explanation
 * request fails.
 */
export async function checkExplainRateLimit(userId: string): Promise<boolean> {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase.rpc('chess_ai_rate_limit_increment', {
    p_user_id: userId,
    p_limit: EXPLAIN_RATE_LIMIT,
    p_window_seconds: EXPLAIN_RATE_WINDOW_SECONDS,
  })
  if (error) {
    console.error('checkExplainRateLimit: rpc failed —', error.message)
    return true
  }
  return data === true
}
