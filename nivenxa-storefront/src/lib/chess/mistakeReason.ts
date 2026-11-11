import { Chess } from 'chess.js'

/**
 * A short, position-specific reason for a confirmed mistake, only when it can be VERIFIED from the position by legal-move
 * generation. Anything that cannot be verified returns null and the caller uses neutral wording. Nothing here calls an engine.
 *
 * Verified facts: after the player's move the opponent has a legal capture of a valuable piece of the player's, and either
 * (a) the player cannot recapture on that square ("unprotected"), or (b) the capturing piece is worth much less than the victim.
 * The fact must be NEW (not already true before the move), so the move is what created it.
 */

const VALUE: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 }
const NAME: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' }

interface Threat {
  square: string
  piece: string
  capturer: string
  unprotected: boolean
  net: number
}

/** Captures the SIDE TO MOVE could legally make in `fen`, scored by material swing. */
function captureThreats(fen: string): Threat[] {
  const game = new Chess(fen)
  const out: Threat[] = []
  for (const m of game.moves({ verbose: true })) {
    if (!m.captured || m.captured === 'k' || m.flags.includes('e') || m.promotion) continue
    const after = new Chess(fen)
    after.move(m)
    const recapture = after.moves({ verbose: true }).some((r) => r.to === m.to && !!r.captured)
    out.push({
      square: m.to,
      piece: m.captured,
      capturer: m.piece,
      unprotected: !recapture,
      net: VALUE[m.captured] - (recapture ? VALUE[m.piece] : 0),
    })
  }
  return out
}

/** Same position with the other side to move (en passant cleared), to ask "what could the opponent have captured BEFORE my move?". */
function withOtherSideToMove(fen: string): string {
  const parts = fen.split(' ')
  parts[1] = parts[1] === 'w' ? 'b' : 'w'
  parts[3] = '-'
  return parts.join(' ')
}

/** Sentence-case reason such as "That leaves your bishop on c4 unprotected.", or null when nothing can be verified. */
export function mistakeReason(fenBefore: string, fenAfter: string): string | null {
  try {
    const now = captureThreats(fenAfter).filter((t) => VALUE[t.piece] >= 3 && t.net >= 2)
    if (now.length === 0) return null
    let before: Threat[] = []
    try {
      before = captureThreats(withOtherSideToMove(fenBefore))
    } catch {
      return null // cannot tell whether the move created this: stay neutral
    }
    const fresh = now.filter((t) => !before.some((b) => b.square === t.square && b.piece === t.piece && b.net >= 2))
    if (fresh.length === 0) return null
    fresh.sort((a, b) => b.net - a.net || Number(b.unprotected) - Number(a.unprotected))
    const t = fresh[0]
    if (t.unprotected) return `That leaves your ${NAME[t.piece]} on ${t.square} unprotected.`
    return `That lets a ${NAME[t.capturer]} capture your ${NAME[t.piece]} on ${t.square}.`
  } catch {
    return null
  }
}
