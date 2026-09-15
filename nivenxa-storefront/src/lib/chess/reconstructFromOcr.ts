import { Chess } from 'chess.js'
import { gameNeedsVerification } from './analysisTypes'
import type { GameSource, NormalizedGame, NormalizedGameMetadata, NormalizedMove } from './analysisTypes'

export interface OcrMoveRow {
  ply: number
  san_guess: string
  confidence: 'high' | 'low'
}

export interface OcrHeaderFields {
  white?: string
  black?: string
  event?: string
  played_on?: string
  result?: string
}

/**
 * Replays a scoresheet's OCR'd moves sequentially from the start. A
 * low-confidence or illegal-in-context guess becomes a single needs-review
 * move (fenAfter === fenBefore) without aborting the rest of the
 * transcription — later rows keep attempting from the same, un-advanced
 * position, exactly like pgnImport.ts's replayTokens fallback. Verify Game
 * resolves each flagged move from what's actually legal there; nothing here
 * is ever silently guessed or forced.
 */
export function reconstructGameFromOcrMoves(rows: OcrMoveRow[], header: OcrHeaderFields, source: GameSource): NormalizedGame {
  const sorted = [...rows].sort((a, b) => a.ply - b.ply)
  const chess = new Chess()
  const moves: NormalizedMove[] = []

  for (const row of sorted) {
    const fenBefore = chess.fen()
    const color: 'w' | 'b' = fenBefore.split(' ')[1] === 'b' ? 'b' : 'w'

    if (row.confidence === 'high') {
      try {
        const move = chess.move(row.san_guess)
        moves.push({ ply: row.ply, color: move.color, san: move.san, fenBefore, fenAfter: chess.fen(), resolutionStatus: 'confirmed' })
        continue
      } catch {
        // Falls through to needs-review below — a "high confidence" reading
        // that turns out illegal here still needs the player's eyes on it.
      }
    }

    moves.push({
      ply: row.ply,
      color,
      san: row.san_guess,
      fenBefore,
      fenAfter: fenBefore,
      resolutionStatus: 'needs-review',
      ocrConfidence: row.confidence,
      rawGuess: row.san_guess,
    })
  }

  const result = header.result
  const metadata: NormalizedGameMetadata = {
    white: header.white,
    black: header.black,
    event: header.event,
    playedOn: header.played_on,
    result: result === '1-0' || result === '0-1' || result === '1/2-1/2' || result === '*' ? result : undefined,
  }

  return { source, metadata, moves, needsVerification: gameNeedsVerification(moves) }
}
