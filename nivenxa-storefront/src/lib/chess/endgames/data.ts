// ─────────────────────────────────────────────────────────────────────────
// DRAFT CONTENT — first pass, not yet reviewed.
//
// Each example position and move sequence has been checked for legality
// (every FEN loads, every move is legal in sequence, the stated result —
// check, mate, or the described idea — is verified), but the prose
// explanations are a first draft and have NOT been checked by a
// chess-knowledgeable human. Please review before treating this as final
// published content — endgame technique needs to be correct, not just
// plausible-sounding.
// ─────────────────────────────────────────────────────────────────────────

export interface EndgameExample {
  /** Starting FEN for this example. */
  fen: string
  /** SAN moves, in order, matching the string form chess.js's `.move()` accepts directly. */
  moves: string[]
  /** One explanation per move, aligned by index with `moves`. */
  stepExplanations: string[]
  /** Shown at step 0. */
  startDescription: string
  /** Distinguishes multiple examples within one entry, e.g. "King and Queen vs King". */
  label?: string
}

export interface Endgame {
  slug: string
  name: string
  description: string
  examples: EndgameExample[]
}

export const ENDGAMES: Endgame[] = [
  {
    slug: 'king-and-pawn-vs-king',
    name: 'King and Pawn vs King (Opposition)',
    description: 'The most fundamental endgame — whether a lone pawn can promote often comes down to which king controls the key squares in front of it.',
    examples: [
      {
        fen: '3k4/8/3K4/3P4/8/8/8/8 b - - 0 1',
        moves: ['Kc8', 'Kc6'],
        startDescription:
          'White\'s king and pawn face Black\'s lone king. It\'s Black to move — and every square around the White king is covered, forcing Black to give ground. This is the essence of the opposition: whoever is forced to move first is at a disadvantage.',
        stepExplanations: [
          'With d7, c7, and e7 all controlled by White\'s king, Black has no choice but to retreat further back.',
          'White\'s king advances again, continuing to escort the pawn forward while keeping Black\'s king shut out. From here White keeps repeating this pattern — advance, and sidestep if blocked — until the pawn can safely promote.',
        ],
      },
    ],
  },
  {
    slug: 'basic-checkmates',
    name: 'Basic Checkmates',
    description: 'The two simplest forced checkmates — king and queen versus king, and king and rook versus king — every player needs to know cold.',
    examples: [
      {
        label: 'King and Queen vs King',
        fen: 'k7/2K5/8/8/8/8/8/1Q6 w - - 0 1',
        moves: ['Qb8#'],
        startDescription:
          'Black\'s king is confined to the corner. White\'s king already covers b7 and b8, and the queen — about to arrive on b8 — will cover a7 too, sealing every escape square.',
        stepExplanations: [
          'The queen delivers checkmate, protected by White\'s own king on c7 so it can\'t simply be captured. Every escape square is covered: b7 and b8 by the king, a7 by the queen itself along the diagonal. This is the standard technique: use your king to help control escape squares, then deliver the final check with the queen a safe distance away, always keeping it defended.',
        ],
      },
      {
        label: 'King and Rook vs King',
        fen: 'k7/8/1K6/8/8/8/8/7R w - - 0 1',
        moves: ['Rh8#'],
        startDescription:
          'Black\'s king is confined to the corner. Unlike a queen, a lone rook can\'t cover a diagonal square by itself — so White\'s king has taken up a knight\'s-move distance from the corner instead, at b6, covering both a7 and b7 directly.',
        stepExplanations: [
          'The rook checks along the entire 8th rank from a safe distance — far enough that the king can never reach it. White\'s king on b6 covers a7 and b7, the two squares the rook\'s check along the rank doesn\'t reach, and b8 is covered by the rook itself. With every escape square controlled, it\'s checkmate — the standard king placement for a rook mate, since a rook alone can only ever control a full rank or file, never a diagonal.',
        ],
      },
    ],
  },
  {
    slug: 'king-activity',
    name: 'King Activity in the Endgame',
    description: 'Once most pieces are off the board, the king stops being a piece to hide and becomes one of the strongest pieces left — if it gets involved.',
    examples: [
      {
        fen: '4k3/p6p/8/8/8/8/P6P/4K3 w - - 0 1',
        moves: ['Ke2', 'h6', 'Ke3'],
        startDescription:
          'A quiet pawn endgame position. With queens and most pieces off the board, the king stops being a piece to protect and becomes one of the strongest pieces on the board — but only if it gets involved.',
        stepExplanations: [
          'White immediately starts marching the king toward the centre, rather than leaving it tucked away on the back rank.',
          'Black makes a passive waiting move, not yet activating the king.',
          'White\'s king continues centralising. In the endgame, a centralised king supports pawn advances, helps create a passed pawn, and can even help deliver mate — activating it early is one of the biggest differences between good and poor endgame play.',
        ],
      },
    ],
  },
]

export function getEndgame(slug: string): Endgame | undefined {
  return ENDGAMES.find((e) => e.slug === slug)
}
