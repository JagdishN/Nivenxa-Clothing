import { Chess } from 'chess.js'
import type { Key } from 'chessground/types'

export interface MoveSquares {
  from: Key
  to: Key
  piece: string
}

/** Replays `moves` (SAN) once from `fen` (or the standard start position) and
 * returns each move's from/to squares and piece type, aligned by index. */
export function computeMoveSquares(moves: string[], fen?: string): MoveSquares[] {
  const chess = fen ? new Chess(fen) : new Chess()
  return moves.map((san) => {
    const move = chess.move(san)
    return { from: move.from as Key, to: move.to as Key, piece: move.piece }
  })
}

export const PIECE_NAME: Record<string, string> = {
  p: 'pawn',
  n: 'knight',
  b: 'bishop',
  r: 'rook',
  q: 'queen',
  k: 'king',
}
