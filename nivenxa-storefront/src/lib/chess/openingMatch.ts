import { OPENINGS, type Opening } from './openings/data'

/**
 * Longest-prefix match of played SAN moves against Learn's existing 16-family
 * opening list (src/lib/chess/openings/data.ts) — reused as-is rather than
 * building a separate ECO-scale dataset. Returns the best (longest) match
 * found so far in the game; once play leaves the book this keeps returning
 * that same match rather than clearing it, since "you're playing on from the
 * Sicilian Defence" is still true information, just not further specialized
 * into a named sub-variation (this list doesn't have those).
 */
export function matchOpeningFamily(sanHistory: string[]): Opening | undefined {
  let best: Opening | undefined
  let bestLength = 0

  for (const opening of OPENINGS) {
    const length = Math.min(opening.moves.length, sanHistory.length)
    let matched = 0
    for (let i = 0; i < length; i++) {
      if (opening.moves[i] !== sanHistory[i]) break
      matched++
    }
    if (matched > 0 && matched > bestLength) {
      bestLength = matched
      best = opening
    }
  }

  return best
}
