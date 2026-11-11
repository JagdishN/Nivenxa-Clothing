import type { SkillTier } from './skillTiers'

/**
 * Reply pace is decided by the selected level, never by a setting: the MINIMUM time between the human's move being accepted and the
 * opponent's reply appearing. The engine starts computing at once; the pace only decides how long a reply that is ready early is held
 * back. A reply that takes longer is played when ready, with no extra wait. The durations are initial product settings to evaluate,
 * not proven optimum timings.
 */
const MIN_REPLY_MS: Record<SkillTier, number> = {
  beginner: 4000,
  intermediate: 2000,
  expert: 500,
  master: 500,
}

export const replyMinMs = (tier: SkillTier, override?: number | null): number => (override != null ? override : MIN_REPLY_MS[tier])

/**
 * Test-only: lets automated suites that are not about pacing shorten the minimum. Honoured ONLY in a build made with
 * NEXT_PUBLIC_CHESS_TEST_HOOKS=1 (never a normal build) and never offered in the interface. Returns null otherwise.
 */
export function testOverrideMs(): number | null {
  // The switch is a NEXT_PUBLIC variable fixed when the build is made. A normal build does not set it, so this always returns null
  // there (checked by scripts/smoke-normal-build.mts). The code is still shipped but cannot be switched on at runtime.
  if (process.env.NEXT_PUBLIC_CHESS_TEST_HOOKS === '1' && typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem('nivenxa.chess.test.replyMinMs')
      const v = Number(raw)
      return raw !== null && Number.isFinite(v) && v >= 0 ? v : null
    } catch {
      return null
    }
  }
  return null
}

/**
 * How much longer to hold a reply that is ready `elapsedMs` after the human move was accepted. Time the engine already spent
 * counts; a reply that took longer than the minimum waits no extra time.
 */
export function remainingHoldMs(minMs: number, elapsedMs: number): number {
  return Math.max(0, minMs - Math.max(0, elapsedMs))
}
