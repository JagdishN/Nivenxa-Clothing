import type { EngineEvaluation } from './types'

/** Normalizes a mate score to a large-but-finite centipawn figure so it still sorts/compares sensibly against real evaluations. */
export function evaluationToCp(evaluation: EngineEvaluation): number {
  if (evaluation.type === 'mate') {
    return evaluation.value === 0 ? 0 : Math.sign(evaluation.value) * 100000
  }
  return evaluation.value
}

const MATE_THRESHOLD = 100000

/**
 * Buckets a White-absolute centipawn eval into a plain-language read for the
 * Expert dashboard, e.g. { score: '+0.34', label: 'Slight edge for White' }.
 * A mate score (see evaluationToCp above) skips the numeric score entirely.
 */
export function formatEvalLabel(cpWhitePerspective: number): { score: string; label: string } {
  if (Math.abs(cpWhitePerspective) >= MATE_THRESHOLD) {
    return { score: '#', label: `${cpWhitePerspective > 0 ? 'White' : 'Black'} has a forced mate` }
  }

  const abs = Math.abs(cpWhitePerspective)
  const side = cpWhitePerspective >= 0 ? 'White' : 'Black'
  const score = `${cpWhitePerspective > 0 ? '+' : cpWhitePerspective < 0 ? '-' : ''}${(abs / 100).toFixed(2)}`

  let label: string
  if (abs < 30) label = 'Roughly equal'
  else if (abs < 100) label = `Slight edge for ${side}`
  else if (abs < 300) label = `Clear edge for ${side}`
  else label = `${side} is winning`

  return { score, label }
}
