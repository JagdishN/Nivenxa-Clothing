import { Chess } from 'chess.js'
import { gameNeedsVerification } from './analysisTypes'
import type { NormalizedGame, NormalizedMove } from './analysisTypes'

/**
 * Re-replays a game end-to-end, substituting a resolved SAN for any ply the
 * caller has just confirmed (Verify Game's legal-move chips). A move that
 * turns out illegal in the corrected position — even one that was already
 * 'confirmed' — becomes needs-review too: fixing an earlier move can shift
 * what's legal afterward, and that knock-on effect must surface to the
 * player rather than being silently suppressed as if the rest of the game
 * were still correct.
 */
export function applyMoveResolutions(game: NormalizedGame, resolutions: Map<number, string>): NormalizedGame {
  const chess = new Chess(game.startingFen)
  const moves: NormalizedMove[] = []

  for (const original of game.moves) {
    const candidateSan = resolutions.get(original.ply) ?? (original.resolutionStatus === 'confirmed' ? original.san : undefined)
    const fenBefore = chess.fen()

    if (candidateSan) {
      try {
        const move = chess.move(candidateSan)
        moves.push({ ply: original.ply, color: move.color, san: move.san, fenBefore, fenAfter: chess.fen(), resolutionStatus: 'confirmed' })
        continue
      } catch {
        // Falls through to needs-review below.
      }
    }

    const color: 'w' | 'b' = fenBefore.split(' ')[1] === 'b' ? 'b' : 'w'
    moves.push({
      ply: original.ply,
      color,
      san: original.san,
      fenBefore,
      fenAfter: fenBefore,
      resolutionStatus: 'needs-review',
      ocrConfidence: original.ocrConfidence,
      rawGuess: original.rawGuess ?? original.san,
    })
  }

  return { ...game, moves, needsVerification: gameNeedsVerification(moves) }
}

/** Drops every move from `fromPly` onward — the "truncate game here" escape hatch for an unreadable scoresheet tail. */
export function truncateGameAt(game: NormalizedGame, fromPly: number): NormalizedGame {
  const moves = game.moves.filter((m) => m.ply < fromPly)
  return { ...game, moves, needsVerification: gameNeedsVerification(moves) }
}
