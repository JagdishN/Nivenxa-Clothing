// Deliberately not AI-generated prose — this is the "chess information"
// register the Expert dashboard wants (see ExpertDashboard.tsx), not another
// coaching sentence. Everything here is a cheap, deterministic read off the
// FEN board field: a v1 heuristic, not a positional-understanding engine —
// same "draft, revisit later" spirit as the disclaimer at the top of
// openings/data.ts, just for structural facts instead of prose.

const PIECE_VALUES: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9 }

function materialFor(boardField: string, white: boolean): number {
  let total = 0
  for (const char of boardField) {
    const isWhitePiece = char === char.toUpperCase()
    if (isWhitePiece !== white) continue
    const value = PIECE_VALUES[char.toLowerCase()]
    if (value) total += value
  }
  return total
}

function hasCastled(boardField: string, white: boolean): boolean {
  const rows = boardField.split('/')
  const backRank = white ? rows[7] : rows[0] // FEN ranks run 8→1, so rank 1 is the last row, rank 8 the first
  const king = white ? 'K' : 'k'
  // Expand the rank's run-length digits into a per-square string so we can
  // check specific files (g/c) by index without hand-rolling FEN parsing twice.
  const expanded = backRank.replace(/\d/g, (d) => '1'.repeat(Number(d)))
  const gFile = expanded[6]
  const cFile = expanded[2]
  return gFile === king || cFile === king
}

/**
 * 1-2 short, factual lines about the current position — material balance
 * always, king safety only when asymmetric and past move ~10 (plyCount 20).
 */
export function getPositionFacts(fen: string, plyCount: number): string[] {
  const boardField = fen.split(' ')[0] ?? ''
  const facts: string[] = []

  const whiteMaterial = materialFor(boardField, true)
  const blackMaterial = materialFor(boardField, false)
  const diff = whiteMaterial - blackMaterial
  facts.push(diff === 0 ? 'Material is even' : `${diff > 0 ? 'White' : 'Black'} is up ${Math.abs(diff)} point${Math.abs(diff) === 1 ? '' : 's'}`)

  const whiteCastled = hasCastled(boardField, true)
  const blackCastled = hasCastled(boardField, false)
  if (plyCount > 20 && whiteCastled !== blackCastled) {
    facts.push(`${whiteCastled ? "Black's" : "White's"} king is still in the centre`)
  }

  return facts
}

// Standard starting counts per piece type (kings excluded — never captured).
const STARTING_COUNTS: { letter: string; count: number; white: string; black: string }[] = [
  { letter: 'q', count: 1, white: '♕', black: '♛' },
  { letter: 'r', count: 2, white: '♖', black: '♜' },
  { letter: 'b', count: 2, white: '♗', black: '♝' },
  { letter: 'n', count: 2, white: '♘', black: '♞' },
  { letter: 'p', count: 8, white: '♙', black: '♟' },
]

function countOf(boardField: string, letter: string): number {
  let n = 0
  for (const char of boardField) if (char === letter) n++
  return n
}

/**
 * Captured-piece glyphs per side, most valuable first — `white` is what
 * White has captured (i.e. Black pieces currently missing from the board),
 * `black` is what Black has captured. Purely a FEN piece-count diff against
 * the standard starting position, same register as getPositionFacts above.
 */
export function getCapturedPieces(fen: string): { white: string[]; black: string[] } {
  const boardField = fen.split(' ')[0] ?? ''
  const white: string[] = []
  const black: string[] = []

  for (const { letter, count, white: whiteGlyph, black: blackGlyph } of STARTING_COUNTS) {
    const missingWhite = count - countOf(boardField, letter.toUpperCase())
    const missingBlack = count - countOf(boardField, letter)
    for (let i = 0; i < missingBlack; i++) white.push(blackGlyph) // White captured Black's pieces
    for (let i = 0; i < missingWhite; i++) black.push(whiteGlyph) // Black captured White's pieces
  }

  return { white, black }
}
