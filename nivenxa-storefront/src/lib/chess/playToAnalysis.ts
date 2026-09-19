import type { SkillTier } from './skillTiers'
import type { MoveAnalysisEntry } from './types'
import type { NormalizedGame, NormalizedMove } from './analysisTypes'

export type PlayResult = '1-0' | '0-1' | '1/2-1/2'

/**
 * Converts a finished Play session straight into a NormalizedGame — the
 * "Analyze My Game" handoff. Uses analysisEntries (not chess.js's own
 * history string array) as the source, since every entry — quality or
 * purpose — already carries its own fenBefore/fenAfter; no replay needed.
 * needsVerification is always false: a live chess.js game can never produce
 * an illegal/uncertain move, so this handoff skips Verify Game entirely.
 */
export function buildNormalizedGameFromPlaySession(
  analysisEntries: MoveAnalysisEntry[],
  humanColor: 'w' | 'b',
  activeTierId: SkillTier,
  result: PlayResult
): NormalizedGame {
  const moves: NormalizedMove[] = [...analysisEntries]
    .sort((a, b) => a.ply - b.ply)
    .map((e) => ({
      ply: e.ply,
      color: e.color,
      san: e.san,
      fenBefore: e.fenBefore,
      fenAfter: e.fenAfter,
      resolutionStatus: 'confirmed' as const,
    }))

  return {
    source: 'nivenxa-play',
    metadata: {
      white: humanColor === 'w' ? 'You' : 'Nivenxa',
      black: humanColor === 'b' ? 'You' : 'Nivenxa',
      result,
      suggestedTier: activeTierId,
    },
    moves,
    needsVerification: false,
  }
}
