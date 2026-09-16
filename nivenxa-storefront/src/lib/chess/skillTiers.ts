import type { EngineMoveOptions, ExplanationDepth, ExplanationTone, MoveClassification, SkillLevel } from './types'
import type { TimeControlMode } from './timeControls'

export type SkillTier = 'beginner' | 'intermediate' | 'expert' | 'master'

export interface TierConfig {
  id: SkillTier
  label: string
  /** What Nivenxa acts as at this tier (e.g. "Teacher", "Challenge") — the second line on the setup screen's level card, deliberately not framed as an opponent persona. */
  experienceLabel: string
  /** One short line naming the main experience (e.g. "Guides you", "No assistance") — the level card's third line. */
  experienceVerb: string
  /** Longer explanation, not shown on the level card by default (only as its hover title) — see the setup screen's tier options. */
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
    experienceLabel: 'Teacher',
    experienceVerb: 'Guides you',
    description: 'Nivenxa explains what happened after every move.',
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
    experienceLabel: 'Coach',
    experienceVerb: 'Helps when it matters',
    description: 'Most moves just play out — Nivenxa speaks up when it matters.',
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
    experienceLabel: 'Challenge',
    experienceVerb: 'Tests your decisions',
    description: 'A live position dashboard replaces the coaching feed.',
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
    experienceLabel: 'Competitive',
    experienceVerb: 'No assistance',
    description: 'Board, clock, moves — no commentary during play.',
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

// Beginner gets the full headline/bullets/remember treatment, Intermediate a
// shorter version of the same structure. Expert is the odd one out: a very
// short live one-liner ('minimal') but the original detailed paragraph
// ('plain') once reviewed post-game — `isReview` is `revealBestMove`, which
// is true exactly for a post-game/Analysis fetch and false for a live one.
// Master is always 'plain' since it's never shown live at all.
export function depthFor(tierId: SkillTier, isReview: boolean): ExplanationDepth {
  if (tierId === 'beginner') return 'rich'
  if (tierId === 'intermediate') return 'brief'
  if (tierId === 'expert') return isReview ? 'plain' : 'minimal'
  return 'plain'
}

/**
 * Whether a given move should trigger an auto-fetched live prose explanation
 * at all — the actual "selective coaching" gate (see useMoveAnalysis's
 * insertEntry). This is separate from grading/classification, which always
 * happens for every Expert/Master move and every player move regardless —
 * this only governs whether prose gets fetched and shown live.
 *
 * - Beginner: always — the Teacher explains every move, by design.
 * - Intermediate: only "notable" moves — a graded ('quality') move that
 *   wasn't the engine's own best pick (i.e. classification !== 'best'), or
 *   an ungraded ('purpose') engine move that captures, checks, or mates.
 *   Everything else just appears in the Moves list, unremarked.
 * - Expert: never — replaced by the live dashboard (ExpertDashboard), which
 *   reads classification/eval directly off already-graded entries instead.
 * - Master: never — already excluded upstream since explanationMode is
 *   never 'live' for Master (resolveExplanationMode), but explicit here too
 *   so this function's own contract doesn't depend on that.
 */
export function shouldAutoExplainLive(
  tierId: SkillTier,
  entry: { kind: 'quality' | 'purpose'; classification?: MoveClassification; san: string }
): boolean {
  if (tierId === 'beginner') return true
  if (tierId === 'expert' || tierId === 'master') return false
  // intermediate
  if (entry.kind === 'quality') return entry.classification !== 'best'
  return entry.san.includes('x') || entry.san.endsWith('+') || entry.san.endsWith('#')
}
