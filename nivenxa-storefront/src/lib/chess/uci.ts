import { Chess } from 'chess.js'

/** Converts a UCI move (e.g. "e2e4", "e7e8q" — Stockfish's own move format) to SAN at the given FEN. */
export function uciToSan(fen: string, uci: string): string {
  try {
    const scratch = new Chess(fen)
    const move = scratch.move({
      from: uci.slice(0, 2),
      to: uci.slice(2, 4),
      promotion: uci.length > 4 ? uci.slice(4, 5) : undefined,
    })
    return move?.san ?? uci
  } catch {
    return uci
  }
}

/** The inverse — the UCI form of a SAN move at the given FEN, or null if it isn't legal there. */
export function sanToUci(fenBefore: string, san: string): string | null {
  try {
    const scratch = new Chess(fenBefore)
    const move = scratch.move(san)
    return move?.lan ?? null
  } catch {
    return null
  }
}
