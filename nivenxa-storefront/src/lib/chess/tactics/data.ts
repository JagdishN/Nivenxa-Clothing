// ─────────────────────────────────────────────────────────────────────────
// DRAFT CONTENT — first pass, not yet reviewed.
//
// Each example position and move sequence has been checked for legality
// (every FEN loads, every move is legal in sequence, the stated result —
// check, mate, or material won — is verified), but the prose explanations
// are a first draft and have NOT been checked by a chess-knowledgeable
// human. Please review before treating this as final published content.
// ─────────────────────────────────────────────────────────────────────────

/** Matches the puzzle theme tags used elsewhere in the chess feature. */
export type TacticThemeTag = 'hangingPiece' | 'fork' | 'pin' | 'skewer' | 'discoveredAttack' | 'backRankMate'

export interface TacticExample {
  /** Starting FEN for this example. */
  fen: string
  /** SAN moves, in order, matching the string form chess.js's `.move()` accepts directly. */
  moves: string[]
  /** One explanation per move, aligned by index with `moves`. */
  stepExplanations: string[]
}

export interface Tactic {
  slug: string
  name: string
  themeTag: TacticThemeTag
  description: string
  examples: TacticExample[]
}

export const TACTICS: Tactic[] = [
  {
    slug: 'hanging-pieces',
    name: 'Hanging Pieces',
    themeTag: 'hangingPiece',
    description: 'The simplest and most common way material changes hands — a piece with no defender is free to capture.',
    examples: [
      {
        fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        moves: ['e4', 'Nc6', 'Nf3', 'Nd4', 'Nxd4'],
        stepExplanations: [
          'White opens with a central pawn push.',
          'Black develops a knight.',
          'White develops a knight, adding a defender toward the centre.',
          'Black’s knight jumps forward but lands on a square with no defender at all — an undefended piece is "hanging," free for anyone who can reach it.',
          'White simply takes the free knight. This is the core lesson of hanging pieces: before you move, check whether the square you\'re landing on — or a piece you\'re leaving behind — can just be captured for nothing in return.',
        ],
      },
    ],
  },
  {
    slug: 'forks',
    name: 'Forks',
    themeTag: 'fork',
    description: 'One piece, two targets at once — the defender can only save one of them.',
    examples: [
      {
        fen: '2r3k1/8/8/5N2/8/8/8/4K3 w - - 0 1',
        moves: ['Ne7+', 'Kf8', 'Nxc8'],
        stepExplanations: [
          'White’s knight leaps to e7, delivering check to the king while simultaneously attacking the rook on c8 — a knight fork. A single move creates two threats at once.',
          'Black has no way to save both pieces — the king must move out of check, leaving the rook undefended.',
          'White scoops up the rook for free. That’s the essence of a fork: one piece attacking two targets, with only enough time to rescue one.',
        ],
      },
    ],
  },
  {
    slug: 'pins',
    name: 'Pins',
    themeTag: 'pin',
    description: 'A piece that can\'t move without exposing something more valuable behind it — often the king — is pinned, and effectively frozen.',
    examples: [
      {
        fen: '4k3/3n4/8/2N5/8/8/B7/4K3 w - - 0 1',
        moves: ['Nxd7'],
        stepExplanations: [
          'White captures the knight on d7. Black cannot recapture with the king — that would move it onto the same diagonal as the bishop on a2, walking straight into check. The knight was pinned against its own king, so it was only defended in appearance: it was actually free to take.',
        ],
      },
    ],
  },
  {
    slug: 'skewers',
    name: 'Skewers',
    themeTag: 'skewer',
    description: 'The mirror image of a pin — the more valuable piece is in front and must move, exposing the piece behind it to capture.',
    examples: [
      {
        fen: '7r/8/8/4k3/8/8/3B4/6K1 w - - 0 1',
        moves: ['Bc3+', 'Ke6', 'Bxh8'],
        stepExplanations: [
          'White’s bishop moves onto the same diagonal as the king, giving check — and lines up Black’s rook on h8 behind it, though Black has to deal with the check before worrying about that.',
          'Black has no choice but to move the king out of check, stepping off the diagonal.',
          'With the king out of the way, the bishop simply continues down the same diagonal and captures the rook. Unlike a pin, here the more valuable piece — the king — was in front and had to move, clearing the way to win the piece behind it.',
        ],
      },
    ],
  },
  {
    slug: 'discovered-attacks',
    name: 'Discovered Attacks',
    themeTag: 'discoveredAttack',
    description: 'Moving one piece out of the way unleashes an attack from a piece behind it — often creating two threats the opponent can\'t both answer.',
    examples: [
      {
        fen: '3qk3/8/8/4N3/8/8/8/4R1K1 w - - 0 1',
        moves: ['Nc6+', 'Kf8', 'Nxd8'],
        stepExplanations: [
          'White’s knight jumps away from e5, and two things happen at once: the knight itself now attacks the queen on d8, and moving off the e-file uncovers the rook’s attack straight down onto the king — a discovered check. Black has to deal with the check first, before the threat to the queen can even be addressed.',
          'The king steps out of check. But that\'s all this move can do — the queen on d8 is still hanging to the knight, and the king isn\'t even close enough to defend it.',
          'White simply collects the queen. This is the power of a discovered attack: the moving piece creates a second, independent threat that the opponent\'s response to the first threat can\'t also solve.',
        ],
      },
    ],
  },
  {
    slug: 'back-rank-weaknesses',
    name: 'Back-Rank Weaknesses',
    themeTag: 'backRankMate',
    description: 'A king castled behind its own unmoved pawns can be mated by a single rook or queen check along the back rank, with nowhere left to run.',
    examples: [
      {
        fen: '6k1/5ppp/8/8/8/8/6K1/R7 w - - 0 1',
        moves: ['Ra8#'],
        stepExplanations: [
          'The rook swings all the way down the open file and delivers checkmate along the back rank. Black\'s own pawns on f7, g7, and h7 — normally a source of safety — have sealed the king\'s only escape squares. This is the classic back-rank weakness: because the king can never step forward past its own pawn shield, a single check along the last rank can be fatal.',
        ],
      },
    ],
  },
]

export function getTactic(slug: string): Tactic | undefined {
  return TACTICS.find((t) => t.slug === slug)
}
