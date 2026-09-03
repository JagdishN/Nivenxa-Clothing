import type { EngineMoveOptions, ExplanationTone, SkillLevel } from './types'
import type { TimeControlMode } from './timeControls'

export type SkillTier = 'beginner' | 'intermediate' | 'expert' | 'master'

export interface TierConfig {
  id: SkillTier
  label: string
  /** Purely about engine strength — explanation timing is derived separately, see resolveExplanationMode below. */
  description: string
  /** Stockfish "Skill Level" (0-20) range this tier is allowed to draw from — see `skillForStrength` below. */
  minSkill: SkillLevel
  maxSkill: SkillLevel
  defaultSkill: SkillLevel
  movetime: EngineMoveOptions['movetime']
  /** Vocabulary level for Claude explanations — simple for newer players, technical for stronger ones. */
  tone: ExplanationTone
  /**
   * Draw-offer decision thresholds, in centipawns from Nivenxa's own point of
   * view (positive = Nivenxa favored). At or above `drawRejectCp` it always
   * declines; at or below `drawAcceptCp` it always accepts; in between,
   * acceptance likelihood rises linearly toward the accept end — see
   * `resolveDrawDecision` in drawDecision.ts. Tighter bands at higher tiers
   * so Master in particular won't give up a real advantage.
   */
  drawRejectCp: number
  drawAcceptCp: number
}

export const SKILL_TIERS: Record<SkillTier, TierConfig> = {
  beginner: {
    id: 'beginner',
    label: 'Beginner',
    description: 'Relaxed play. More forgiving of mistakes.',
    minSkill: 0,
    maxSkill: 2,
    defaultSkill: 0,
    movetime: 500,
    tone: 'simple',
    drawRejectCp: 200,
    drawAcceptCp: -100,
  },
  intermediate: {
    id: 'intermediate',
    label: 'Intermediate',
    description: 'Balanced play. A steady challenge.',
    minSkill: 3,
    maxSkill: 7,
    defaultSkill: 3,
    movetime: 800,
    tone: 'simple',
    drawRejectCp: 100,
    drawAcceptCp: -50,
  },
  expert: {
    id: 'expert',
    label: 'Expert',
    description: 'Strong, accurate play.',
    minSkill: 8,
    maxSkill: 13,
    defaultSkill: 8,
    movetime: 1200,
    tone: 'technical',
    drawRejectCp: 70,
    drawAcceptCp: -50,
  },
  master: {
    id: 'master',
    label: 'Master',
    description: 'Near full-strength engine play.',
    minSkill: 14,
    maxSkill: 20,
    defaultSkill: 14,
    movetime: 1800,
    tone: 'technical',
    drawRejectCp: 40,
    drawAcceptCp: -40,
  },
}

export const SKILL_TIER_LIST: TierConfig[] = [
  SKILL_TIERS.beginner,
  SKILL_TIERS.intermediate,
  SKILL_TIERS.expert,
  SKILL_TIERS.master,
]

/** How many discrete "Strength" steps a tier's skill range offers — e.g. Master (14-20) is 7. */
export function strengthSteps(tier: SkillTier): number {
  const t = SKILL_TIERS[tier]
  return t.maxSkill - t.minSkill + 1
}

/** Maps a 1-indexed "Strength: N of M" pick to the actual Stockfish Skill Level for that tier. */
export function skillForStrength(tier: SkillTier, strength: number): SkillLevel {
  const t = SKILL_TIERS[tier]
  const clamped = Math.min(Math.max(1, Math.round(strength)), strengthSteps(tier))
  return t.minSkill + clamped - 1
}

/**
 * 'live'        — explain moves as they're played
 * 'post-game'   — classify silently during play; explanations available once the game ends
 * 'summary-only' — classify silently; explanations only fetched on request post-game
 */
export type ExplanationMode = 'live' | 'post-game' | 'summary-only'

/**
 * Rapid mode defers all explanations post-game so mid-game reading time
 * doesn't eat a fast clock. Play Classical for real-time learning.
 */
export function resolveExplanationMode(tier: SkillTier, mode: TimeControlMode | null): ExplanationMode {
  if (tier === 'beginner') return 'live' // untimed regardless of mode — no floor to apply

  // Expert gets live commentary too now, just a much shorter one-liner
  // ('minimal' depth, see useMoveAnalysis) — only Master stays fully quiet.
  const classicalBaseline: ExplanationMode = tier === 'master' ? 'summary-only' : 'live'

  if (mode === 'rapid' && classicalBaseline === 'live') return 'post-game'
  return classicalBaseline
}
