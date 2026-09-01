import type { EngineMoveOptions, ExplanationTone, SkillLevel } from './types'
import type { TimeControlMode } from './timeControls'

export type SkillTier = 'beginner' | 'intermediate' | 'expert' | 'master'

export interface TierConfig {
  id: SkillTier
  label: string
  /** Purely about engine strength — explanation timing is derived separately, see resolveExplanationMode below. */
  description: string
  skillLevel: SkillLevel
  movetime: EngineMoveOptions['movetime']
  /** Vocabulary level for Claude explanations — simple for newer players, technical for stronger ones. */
  tone: ExplanationTone
}

export const SKILL_TIERS: Record<SkillTier, TierConfig> = {
  beginner: {
    id: 'beginner',
    label: 'Beginner',
    description: 'Relaxed play. More forgiving of mistakes.',
    skillLevel: 2,
    movetime: 500,
    tone: 'simple',
  },
  intermediate: {
    id: 'intermediate',
    label: 'Intermediate',
    description: 'Balanced play. A steady challenge.',
    skillLevel: 8,
    movetime: 800,
    tone: 'simple',
  },
  expert: {
    id: 'expert',
    label: 'Expert',
    description: 'Strong, accurate play.',
    skillLevel: 15,
    movetime: 1200,
    tone: 'technical',
  },
  master: {
    id: 'master',
    label: 'Master',
    description: 'Near full-strength engine play.',
    skillLevel: 20,
    movetime: 1800,
    tone: 'technical',
  },
}

export const SKILL_TIER_LIST: TierConfig[] = [
  SKILL_TIERS.beginner,
  SKILL_TIERS.intermediate,
  SKILL_TIERS.expert,
  SKILL_TIERS.master,
]

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
