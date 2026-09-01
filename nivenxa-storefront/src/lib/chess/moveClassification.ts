import type { MoveClassification, QualityMoveEntry } from './types'

/**
 * Centipawn-loss thresholds, relative to the engine's best move at that
 * position (0 = played the objectively best move). Tune freely — these are
 * starting values, not derived from any external rating study.
 */
export const CP_LOSS_THRESHOLDS = {
  best: 5, // <=5cp loss (or an exact match with the engine's #1 choice) counts as best
  excellent: 10,
  good: 50,
  inaccuracy: 100,
  mistake: 300,
  // >=300cp loss => blunder
} as const

export function classifyMove(cpLoss: number, isEngineBestMove: boolean): MoveClassification {
  if (isEngineBestMove || cpLoss <= CP_LOSS_THRESHOLDS.best) return 'best'
  if (cpLoss < CP_LOSS_THRESHOLDS.excellent) return 'excellent'
  if (cpLoss < CP_LOSS_THRESHOLDS.good) return 'good'
  if (cpLoss < CP_LOSS_THRESHOLDS.inaccuracy) return 'inaccuracy'
  if (cpLoss < CP_LOSS_THRESHOLDS.mistake) return 'mistake'
  return 'blunder'
}

/**
 * Rough per-move "quality score" used to build the post-game accuracy stat.
 * This is a coaching-app-style approximation (a weighted average of
 * classifications), not a calibrated Elo-loss/win-probability model like
 * chess.com's accuracy metric — tune the weights freely.
 */
export const CLASSIFICATION_WEIGHT: Record<MoveClassification, number> = {
  best: 100,
  excellent: 95,
  good: 80,
  inaccuracy: 60,
  mistake: 35,
  blunder: 10,
}

export function accuracyFromEntries(entries: QualityMoveEntry[]): number {
  if (entries.length === 0) return 100
  const total = entries.reduce((sum, e) => sum + CLASSIFICATION_WEIGHT[e.classification], 0)
  return Math.round(total / entries.length)
}
