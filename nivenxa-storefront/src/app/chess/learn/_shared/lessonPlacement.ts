// Pure placement helpers (no React) — safe to import from server code and lesson data.

/** square -> FEN piece letter (uppercase = White), e.g. { e1: 'K', d8: 'q' }. */
export type Placement = Record<string, string>

export const PIECE_NAME: Record<string, string> = { k: 'king', q: 'queen', r: 'rook', b: 'bishop', n: 'knight', p: 'pawn' }
export const ROLE_CLASS = PIECE_NAME
export const pieceLabel = (letter: string) => `${letter === letter.toUpperCase() ? 'White' : 'Black'} ${PIECE_NAME[letter.toLowerCase()]}`

/** The standard starting position as a placement. */
export const START_PLACEMENT: Placement = (() => {
  const back = 'rnbqkbnr'
  const p: Placement = {}
  'abcdefgh'.split('').forEach((f, i) => {
    p[`${f}1`] = back[i].toUpperCase()
    p[`${f}2`] = 'P'
    p[`${f}7`] = 'p'
    p[`${f}8`] = back[i]
  })
  return p
})()

/** A placement as the first field of a FEN plus neutral trailing fields — for the regular chessground Board. */
export function fenFromPlacement(p: Placement): string {
  const rows: string[] = []
  for (let rank = 8; rank >= 1; rank--) {
    let row = ''
    let empty = 0
    for (const f of 'abcdefgh') {
      const piece = p[`${f}${rank}`]
      if (piece) {
        if (empty) row += empty
        empty = 0
        row += piece
      } else empty += 1
    }
    if (empty) row += empty
    rows.push(row)
  }
  return `${rows.join('/')} w - - 0 1`
}

/** Which squares differ from the expected placement: wrong = a different piece (or a piece that should not be there); missing = empty but should hold a piece. */
export function compareToTarget(placed: Placement, target: Placement): { wrong: string[]; missing: string[]; correct: number } {
  const wrong: string[] = []
  const missing: string[] = []
  let correct = 0
  for (const sq of Object.keys(placed)) if (target[sq] !== placed[sq]) wrong.push(sq)
  for (const sq of Object.keys(target)) {
    if (!placed[sq]) missing.push(sq)
    else if (placed[sq] === target[sq]) correct += 1
  }
  return { wrong, missing, correct }
}


// ── Independent set-up task: inventory, pattern-level diagnosis, side retry ────────────────────────────────────────

/** How many of each piece a side starts with (FEN letter, case ignored). */
export const PIECE_TOTAL: Record<string, number> = { k: 1, q: 1, r: 2, b: 2, n: 2, p: 8 }
export const isWhitePiece = (letter: string) => letter === letter.toUpperCase()
const rankOf = (sq: string) => Number(sq[1])

/** How many of this exact piece (colour included) are still to be placed. */
export function piecesLeft(placed: Placement, letter: string): number {
  return PIECE_TOTAL[letter.toLowerCase()] - Object.values(placed).filter((p) => p === letter).length
}

/** A copy of the placement without one side's pieces. */
export function removeSide(placed: Placement, side: 'white' | 'black'): Placement {
  const out: Placement = {}
  for (const [sq, p] of Object.entries(placed)) if (isWhitePiece(p) !== (side === 'white')) out[sq] = p
  return out
}

export interface SetupGroup {
  id: 'sides-swapped' | 'white-wrong-side' | 'black-wrong-side' | 'white-king-queen' | 'black-king-queen' | 'white-pawn-rank' | 'black-pawn-rank'
  side: 'white' | 'black' | 'both'
  /** A short explanation of the pattern, shown before any single square is mentioned. */
  message: string
  /** Squares holding the learner's pieces that belong to this pattern. */
  squares: string[]
}

export interface SetupDiagnosis {
  complete: boolean
  correct: number
  missing: string[]
  /** Common error patterns, most general first. Never repeats a square across groups. */
  groups: SetupGroup[]
  /** Wrong squares not explained by any pattern. */
  individual: string[]
}

const ORIENTATION = 'In this view White starts nearest you, on ranks 1 and 2 along the bottom, and Black starts at the top, on ranks 7 and 8.'

/**
 * Compares a built position with the standard start and groups the mistakes into patterns a learner can understand
 * (teams on each other's sides, king and queen swapped, pawns on the wrong rank) before any individual square is named.
 * It judges against the displayed coordinates only: it never rotates the board or accepts a mirrored arrangement.
 */
export function diagnoseSetup(placed: Placement, target: Placement): SetupDiagnosis {
  const { wrong, missing, correct } = compareToTarget(placed, target)
  const wrongSet = new Set(wrong)
  const used = new Set<string>()
  const groups: SetupGroup[] = []
  const entries = Object.entries(placed)
  const whites = entries.filter(([, p]) => isWhitePiece(p))
  const blacks = entries.filter(([, p]) => !isWhitePiece(p))
  const whiteTop = whites.filter(([sq]) => rankOf(sq) >= 5).map(([sq]) => sq)
  const blackBottom = blacks.filter(([sq]) => rankOf(sq) <= 4).map(([sq]) => sq)
  const whiteReversed = whites.length >= 4 && whiteTop.length / whites.length >= 0.75
  const blackReversed = blacks.length >= 4 && blackBottom.length / blacks.length >= 0.75
  const take = (squares: string[]) => squares.filter((s) => wrongSet.has(s) && !used.has(s))
  const mark = (squares: string[]) => squares.forEach((s) => used.add(s))

  if (whiteReversed && blackReversed) {
    const sq = take([...whiteTop, ...blackBottom])
    groups.push({ id: 'sides-swapped', side: 'both', squares: sq, message: `The two teams are on each other's sides. ${ORIENTATION}` })
    mark(sq)
  } else {
    if (whiteReversed) {
      const sq = take(whiteTop)
      groups.push({ id: 'white-wrong-side', side: 'white', squares: sq, message: `The White pieces are on Black's side of the board. White starts at the bottom: ranks 1 and 2.` })
      mark(sq)
    }
    if (blackReversed) {
      const sq = take(blackBottom)
      groups.push({ id: 'black-wrong-side', side: 'black', squares: sq, message: `The Black pieces are on White's side of the board. Black starts at the top: ranks 7 and 8.` })
      mark(sq)
    }
  }

  for (const [side, rank, k, q] of [['white', 1, 'K', 'Q'], ['black', 8, 'k', 'q']] as const) {
    if (placed[`d${rank}`] === k && placed[`e${rank}`] === q) {
      const sq = take([`d${rank}`, `e${rank}`])
      if (sq.length === 2) {
        groups.push({ id: side === 'white' ? 'white-king-queen' : 'black-king-queen', side, squares: sq, message: `The ${side === 'white' ? 'White' : 'Black'} king and queen have swapped places. The queen goes on her own colour: the white queen on a light square, the black queen on a dark square.` })
        mark(sq)
      }
    }
  }

  for (const [side, pawn, home] of [['white', 'P', 2], ['black', 'p', 7]] as const) {
    const pawns = entries.filter(([, p]) => p === pawn).map(([sq]) => sq)
    const off = take(pawns.filter((sq) => rankOf(sq) !== home))
    const ranks = new Set(off.map(rankOf))
    if (off.length >= 3 && ranks.size === 1) {
      groups.push({ id: side === 'white' ? 'white-pawn-rank' : 'black-pawn-rank', side, squares: off, message: `The ${side === 'white' ? 'White' : 'Black'} pawns are on rank ${[...ranks][0]}. They start on rank ${home}, the row right in front of the back row.` })
      mark(off)
    }
  }

  return { complete: wrong.length === 0 && missing.length === 0, correct, missing, groups, individual: wrong.filter((s) => !used.has(s)) }
}
