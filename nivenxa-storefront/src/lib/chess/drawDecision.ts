import { SKILL_TIERS } from './skillTiers'
import type { SkillTier } from './skillTiers'

/**
 * Decides whether Nivenxa accepts a draw offer, given the position
 * evaluation (centipawns, from Nivenxa's own point of view — positive means
 * Nivenxa is favored) and the active tier's thresholds.
 *
 * At or above `drawRejectCp` it always declines; at or below `drawAcceptCp`
 * it always accepts. In between, acceptance likelihood rises linearly from
 * 0 (at the reject threshold) to 1 (at the accept threshold) — a roughly
 * equal position is a coin flip, tilting toward accept as the position gets
 * worse for Nivenxa. `rng` is injectable so the boundary behavior (the only
 * part that matters for "does Master ever give away an advantage") can be
 * tested deterministically without depending on Math.random.
 */
export function resolveDrawDecision(evalCp: number, tier: SkillTier, rng: () => number = Math.random): 'accept' | 'reject' {
  const { drawRejectCp, drawAcceptCp } = SKILL_TIERS[tier]
  if (evalCp >= drawRejectCp) return 'reject'
  if (evalCp <= drawAcceptCp) return 'accept'
  const acceptProbability = (drawRejectCp - evalCp) / (drawRejectCp - drawAcceptCp)
  return rng() < acceptProbability ? 'accept' : 'reject'
}
