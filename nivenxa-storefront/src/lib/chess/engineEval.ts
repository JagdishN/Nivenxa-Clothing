import type { EngineEvaluation } from './types'

/** Normalizes a mate score to a large-but-finite centipawn figure so it still sorts/compares sensibly against real evaluations. */
export function evaluationToCp(evaluation: EngineEvaluation): number {
  if (evaluation.type === 'mate') {
    return evaluation.value === 0 ? 0 : Math.sign(evaluation.value) * 100000
  }
  return evaluation.value
}
