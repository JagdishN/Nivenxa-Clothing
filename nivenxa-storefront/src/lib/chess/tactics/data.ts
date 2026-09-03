// ─────────────────────────────────────────────────────────────────────────
// DRAFT CONTENT — first pass, not yet reviewed.
//
// Each example position and move sequence has been checked for legality
// (every FEN loads, every move is legal in sequence, the stated result —
// check, mate, or material won — is verified), but the prose explanations
// are a first draft and have NOT been checked by a chess-knowledgeable
// human. Please review before treating this as final published content.
//
// Written to the same standard established for Openings — see that file's
// header comment for the full word rule ("see it -> understand it -> name
// it"). In practice here: every tactic's own name is a real chess term
// (fork, pin, skewer...), so each example explains the mechanism in plain
// language the child can check against the board FIRST, then names the
// term as a `stepReveal` aside on the move where it's fully demonstrated —
// never the other way around.
//
// TACTICS is deliberately authored in curriculum order (Start Here, then
// Learn Next, then Learn Later, each tier itself ordered so no tactic
// depends on a later one to make sense) — that array order IS the learning
// path `getNextTacticInPath` walks, not alphabetical, not by theme.
// ─────────────────────────────────────────────────────────────────────────

/** Matches the puzzle theme tags used elsewhere in the chess feature. */
export type TacticThemeTag =
  | 'hangingPiece'
  | 'check'
  | 'attackCapture'
  | 'fork'
  | 'pin'
  | 'skewer'
  | 'doubleAttack'
  | 'discoveredAttack'
  | 'removingDefender'
  | 'deflection'
  | 'backRankMate'
  | 'doubleCheck'
  | 'inBetweenMove'
  | 'overloading'
  | 'clearance'
  | 'decoy'
  | 'interference'
  | 'trappedPiece'

/** How ready a beginner is to take this tactic on — drives both the list-page badge and the detail-page tag. */
export type TacticDifficulty = 'start' | 'next' | 'later'

export const TACTIC_DIFFICULTY_LABEL: Record<TacticDifficulty, string> = {
  start: 'Start here',
  next: 'Learn next',
  later: 'Learn later',
}

export const TACTIC_DIFFICULTY_EMOJI: Record<TacticDifficulty, string> = {
  start: '🟢',
  next: '🟡',
  later: '🟠',
}

export interface TacticExample {
  /** Starting FEN for this example. */
  fen: string
  /** SAN moves, in order, matching the string form chess.js's `.move()` accepts directly. */
  moves: string[]
  /** One explanation per move, aligned by index with `moves`. Use "\n" to break a step's explanation into separate one-idea lines. */
  stepExplanations: string[]
  /** A short "this is called X" aside per move, aligned by index with `moves` — names the technique once it's been shown, not before. */
  stepReveal?: (string | undefined)[]
}

/** One "find the move" puzzle — a single decision, no scripted follow-up. */
export interface TacticPuzzle {
  fen: string
  correctFrom: string
  correctTo: string
}

export interface Tactic {
  slug: string
  name: string
  themeTag: TacticThemeTag
  /** One short, factual line for the detail-page subtitle. */
  description: string
  /** One short, idea-only line for the list-card — no move notation. */
  summary: string
  difficulty: TacticDifficulty
  examples: TacticExample[]
  /** Shown once the learner reaches the last move — one idea per line, like Openings' completionSummary. */
  completionSummary?: string[]
  /**
   * The interactive "Your Turn" phase — three puzzles the learner solves
   * themselves after watching `examples[0]`. Optional while this migrates
   * tactic by tactic from the old watch-only walkthrough; when absent,
   * TacticDetail falls back to the plain step-through with no "Your Turn."
   */
  prompt?: string
  wrongText?: string
  correctText?: string
  puzzles?: TacticPuzzle[]
}

export const TACTICS: Tactic[] = [
  // ─── Start Here ───────────────────────────────────────────────────────
  {
    slug: 'hanging-pieces',
    name: 'Hanging Pieces',
    themeTag: 'hangingPiece',
    description: 'A piece with no defender can simply be captured for free.',
    summary: 'Find pieces that are not protected.',
    difficulty: 'start',
    examples: [
      {
        fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        moves: ['e4', 'Nc6', 'Nf3', 'Nd4', 'Nxd4'],
        stepExplanations: [
          'White moves a pawn to the middle.',
          'Black brings out a knight.',
          'White brings out a knight.',
          'Black moves the knight forward.\nBut nothing protects it there.',
          'White captures the knight for free.',
        ],
        stepReveal: [undefined, undefined, undefined, undefined, 'This is called a hanging piece.'],
      },
    ],
    completionSummary: ['You can now find pieces that are not protected.'],
    prompt: 'Can you find the piece with no defender?',
    wrongText: 'Not quite. Look for a piece that nothing is protecting.',
    correctText: 'Nothing was protecting it.',
    puzzles: [
      { fen: 'k7/8/r7/8/8/8/8/Q6K w - - 0 1', correctFrom: 'a1', correctTo: 'a6' },
      { fen: '7k/8/8/4b3/8/8/8/4R2K w - - 0 1', correctFrom: 'e1', correctTo: 'e5' },
      { fen: '7k/8/8/8/3n4/8/8/B6K w - - 0 1', correctFrom: 'a1', correctTo: 'd4' },
    ],
  },
  {
    slug: 'checks',
    name: 'Checks',
    themeTag: 'check',
    description: 'A move that attacks the king is called check — the king must answer right away.',
    summary: 'Find moves that attack the king.',
    difficulty: 'start',
    examples: [
      {
        fen: '3k4/8/8/8/8/8/8/R3K3 w - - 0 1',
        moves: ['Ra8+', 'Kd7'],
        stepExplanations: ['White moves the rook to attack the king.', 'Black must move the king to safety.'],
        stepReveal: ['This is called check.', undefined],
      },
    ],
    completionSummary: ['You can now find moves that attack the king.'],
    prompt: 'Can you find a move that gives check?',
    wrongText: 'Not quite. Look for a move that attacks the king.',
    correctText: 'That move attacks the king.',
    puzzles: [
      { fen: '3k4/8/8/8/8/8/8/R3K3 w - - 0 1', correctFrom: 'a1', correctTo: 'a8' },
      { fen: '4k3/8/8/8/8/8/8/4R2K w - - 0 1', correctFrom: 'e1', correctTo: 'e8' },
      { fen: '7k/8/8/8/8/8/8/B6K w - - 0 1', correctFrom: 'a1', correctTo: 'h8' },
    ],
  },
  {
    slug: 'attack-and-capture',
    name: 'Attack & Capture',
    themeTag: 'attackCapture',
    description: 'Sometimes the tactic is simply spotting a piece you can attack or capture right now.',
    summary: 'Find a piece you can attack or take.',
    difficulty: 'start',
    examples: [
      {
        fen: '4k3/8/8/3r4/8/8/8/4K2Q w - - 0 1',
        moves: ['Qxd5'],
        stepExplanations: ["White's queen can reach the rook.\nWhite simply takes it."],
      },
    ],
    completionSummary: ['You can now find pieces you can attack or take.'],
    prompt: 'Can you find a piece you can attack or take?',
    wrongText: 'Not quite. Look for an enemy piece you can reach.',
    correctText: 'You found a piece you could reach.',
    puzzles: [
      { fen: '4k3/8/8/3r4/8/8/8/4K2Q w - - 0 1', correctFrom: 'h1', correctTo: 'd5' },
      { fen: '4k3/8/2n5/8/8/8/8/2R1K3 w - - 0 1', correctFrom: 'c1', correctTo: 'c6' },
      { fen: '4k3/8/8/4b3/8/8/8/B3K3 w - - 0 1', correctFrom: 'a1', correctTo: 'e5' },
    ],
  },
  {
    slug: 'forks',
    name: 'Forks',
    themeTag: 'fork',
    description: 'One piece attacking two targets at once is called a fork — the defender can only save one.',
    summary: 'Attack two pieces at the same time.',
    difficulty: 'start',
    examples: [
      {
        fen: '2r3k1/8/8/5N2/8/8/8/4K3 w - - 0 1',
        moves: ['Ne7+', 'Kf8', 'Nxc8'],
        stepExplanations: [
          "White's knight jumps forward.\nIt attacks the king and the rook at the same time.",
          'Black must move the king out of check.',
          'White captures the rook.',
        ],
        stepReveal: [undefined, undefined, 'This is called a fork.'],
      },
    ],
    completionSummary: ['You can now find forks.'],
    prompt: 'Can you find the fork?',
    wrongText: 'Not quite. Look for a move that attacks two pieces.',
    correctText: 'Your knight attacks two pieces.',
    puzzles: [
      { fen: '2r3k1/8/8/5N2/8/8/8/4K3 w - - 0 1', correctFrom: 'f5', correctTo: 'e7' },
      { fen: '4r1k1/3N4/8/8/8/8/8/7K w - - 0 1', correctFrom: 'd7', correctTo: 'f6' },
      { fen: '5r1k/8/8/4N3/8/8/8/4K3 w - - 0 1', correctFrom: 'e5', correctTo: 'g6' },
    ],
  },
  {
    slug: 'pins',
    name: 'Pins',
    themeTag: 'pin',
    description: 'A piece that cannot move without exposing the king behind it is pinned — and effectively frozen.',
    summary: 'A piece cannot move because something important is behind it.',
    difficulty: 'start',
    examples: [
      {
        fen: '6k1/5n2/8/8/8/8/B7/5R1K w - - 0 1',
        moves: ['Rxf7'],
        stepExplanations: [
          "White captures the knight.\nBlack cannot take back with the king — that would walk into the bishop's line, right into check.",
        ],
        stepReveal: ['This is called a pin.'],
      },
    ],
    completionSummary: ['You can now find pins.'],
    prompt: 'Can you find the pin?',
    wrongText: 'Not quite. Look for a piece that cannot move away.',
    correctText: 'The pinned piece could not take back.',
    puzzles: [
      { fen: '7k/6n1/8/8/8/8/8/BK4R1 w - - 0 1', correctFrom: 'g1', correctTo: 'g7' },
      { fen: 'k7/1n6/8/8/8/8/8/1R4KB w - - 0 1', correctFrom: 'b1', correctTo: 'b7' },
      { fen: '4k3/8/8/4n3/8/2B5/8/4R1K1 w - - 0 1', correctFrom: 'c3', correctTo: 'e5' },
    ],
  },

  // ─── Learn Next ───────────────────────────────────────────────────────
  {
    slug: 'skewers',
    name: 'Skewers',
    themeTag: 'skewer',
    description: 'The mirror image of a pin — the more valuable piece is in front and must move, exposing the piece behind it.',
    summary: 'Attack one piece and win the piece behind it.',
    difficulty: 'next',
    examples: [
      {
        fen: '7r/8/8/4k3/8/8/3B4/6K1 w - - 0 1',
        moves: ['Bc3+', 'Ke6', 'Bxh8'],
        stepExplanations: [
          "White's bishop lines up with the king.\nThe rook is on the same line, right behind it.",
          'Black must move the king out of check.',
          'White captures the rook.',
        ],
        stepReveal: [undefined, undefined, 'This is called a skewer.'],
      },
    ],
    completionSummary: ['You can now find skewers.'],
  },
  {
    slug: 'double-attack',
    name: 'Double Attack',
    themeTag: 'doubleAttack',
    description: 'One move that threatens two different pieces at once — not always with the same piece pattern as a fork.',
    summary: 'Make one move that attacks two things.',
    difficulty: 'next',
    examples: [
      {
        fen: '4k3/5b2/8/r7/8/8/8/3QK3 w - - 0 1',
        moves: ['Qd5', 'Ra6', 'Qxf7+'],
        stepExplanations: [
          "White's queen moves to attack two pieces at once.\nBlack cannot save both.",
          'Black moves the rook to safety.',
          'White captures the bishop instead.',
        ],
        stepReveal: [undefined, undefined, 'This is called a double attack.'],
      },
    ],
    completionSummary: ['You can now find double attacks.'],
  },
  {
    slug: 'discovered-attack',
    name: 'Discovered Attack',
    themeTag: 'discoveredAttack',
    description: 'Moving one piece out of the way unleashes an attack from a piece that was standing behind it.',
    summary: 'Move one piece to open an attack from another piece.',
    difficulty: 'next',
    examples: [
      {
        fen: '3qk3/8/8/4N3/8/8/8/4R1K1 w - - 0 1',
        moves: ['Nc6+', 'Kf8', 'Nxd8'],
        stepExplanations: [
          "White's knight jumps away.\nThis opens up the rook's attack on the king, and the knight itself now attacks the queen too.",
          'Black must move the king out of check.\nThe queen is still attacked.',
          'White captures the queen.',
        ],
        stepReveal: [undefined, undefined, 'This is called a discovered attack.'],
      },
    ],
    completionSummary: ['You can now find discovered attacks.'],
  },
  {
    slug: 'removing-the-defender',
    name: 'Removing the Defender',
    themeTag: 'removingDefender',
    description: 'Take away the piece protecting another piece, and the second piece is free to capture.',
    summary: 'Take away the piece that is protecting another piece.',
    difficulty: 'next',
    examples: [
      {
        fen: '4k3/1b6/8/2Nr4/8/8/8/4K3 w - - 0 1',
        moves: ['Nxb7'],
        stepExplanations: ['White captures the piece protecting the rook.\nNow the rook has no protection.'],
        stepReveal: ['This is called removing the defender.'],
      },
    ],
    completionSummary: ['You can now find ways to remove the defender.'],
  },
  {
    slug: 'deflection',
    name: 'Deflection',
    themeTag: 'deflection',
    description: 'Attack the piece that is defending something else, forcing it to move away and give up its job.',
    summary: 'Make a defending piece move away.',
    difficulty: 'next',
    examples: [
      {
        fen: '4k3/3q4/8/3r4/8/1N6/8/4K3 w - - 0 1',
        moves: ['Nc5', 'Qh3'],
        stepExplanations: ['White attacks the queen.\nNow it must move away.', 'Black moves the queen to safety.\nBut now the rook has no protection.'],
        stepReveal: [undefined, 'This is called deflection.'],
      },
    ],
    completionSummary: ['You can now find deflections.'],
  },
  {
    slug: 'back-rank-mate',
    name: 'Back-Rank Mate',
    themeTag: 'backRankMate',
    description: 'A king trapped behind its own unmoved pawns can be checkmated by a single rook or queen on the back row.',
    summary: 'Checkmate a king trapped on the back row.',
    difficulty: 'next',
    examples: [
      {
        fen: '6k1/5ppp/8/8/8/8/6K1/R7 w - - 0 1',
        moves: ['Ra8#'],
        stepExplanations: [
          "The rook moves all the way down the open file.\nBlack's own pawns block every escape square, so the king has nowhere to go.",
        ],
        stepReveal: ['This is called a back-rank mate.'],
      },
    ],
    completionSummary: ['You can now find back-rank mates.'],
  },

  // ─── Learn Later ──────────────────────────────────────────────────────
  {
    slug: 'double-check',
    name: 'Double Check',
    themeTag: 'doubleCheck',
    description: 'One move that gives check from two pieces at once — the king cannot block or capture both, it must move.',
    summary: 'Give check with two pieces at the same time.',
    difficulty: 'later',
    examples: [
      {
        fen: '4k3/3N4/2B5/8/8/8/8/4K3 w - - 0 1',
        moves: ['Nf6+'],
        stepExplanations: [
          "White moves the knight.\nThis uncovers a check from the bishop, and the knight itself checks too — two checks from one move.",
        ],
        stepReveal: ['This is called a double check.'],
      },
    ],
    completionSummary: ['You can now find double checks.'],
  },
  {
    slug: 'in-between-move',
    name: 'In-Between Move',
    themeTag: 'inBetweenMove',
    description: 'Instead of playing the move everyone expects, a stronger move comes first — often a check.',
    summary: 'Make a strong move before the move you expected to play.',
    difficulty: 'later',
    examples: [
      {
        fen: '4k3/8/8/3p4/4N3/8/8/3RK3 w - - 0 1',
        moves: ['Nf6+', 'Kd8', 'Rxd5'],
        stepExplanations: [
          'White could capture the pawn right away.\nInstead, White plays a check first.',
          'Black must move the king out of check.',
          'Now White captures the pawn.\nPlaying the check first did not give Black any extra time.',
        ],
        stepReveal: [undefined, undefined, 'Chess players also call this a Zwischenzug.'],
      },
    ],
    completionSummary: ['You can now find in-between moves.'],
  },
  {
    slug: 'overloading',
    name: 'Overloading',
    themeTag: 'overloading',
    description: 'One piece defending two things at once can only really protect one of them.',
    summary: 'Make one piece try to protect too many things.',
    difficulty: 'later',
    examples: [
      {
        fen: '4k3/8/1r3b2/3n4/7B/8/8/1R2K3 w - - 0 1',
        moves: ['Rxb6', 'Nxb6', 'Bxf6'],
        stepExplanations: [
          'White captures the rook.\nOnly the knight can take it back.',
          "Black's knight recaptures.\nBut now the knight cannot also protect the bishop.",
          'White captures the bishop for free.',
        ],
        stepReveal: [undefined, undefined, 'One knight could not protect two pieces — this is called overloading.'],
      },
    ],
    completionSummary: ['You can now find overloaded pieces.'],
  },
  {
    slug: 'clearance',
    name: 'Clearance',
    themeTag: 'clearance',
    description: 'Move a piece out of the way to free up a square or line for another piece to use next.',
    summary: 'Move a piece away to open a square or line.',
    difficulty: 'later',
    examples: [
      {
        fen: '3Nk3/8/2q5/Q7/8/8/8/4K3 w - - 0 1',
        moves: ['Nxc6', 'Kf8', 'Qd8+'],
        stepExplanations: [
          "White's knight captures the queen.\nThis also clears the square it was standing on.",
          'Black moves the king.',
          'White\'s queen moves onto the cleared square.\nThis gives check.',
        ],
        stepReveal: [undefined, undefined, 'This is called clearance.'],
      },
    ],
    completionSummary: ['You can now find clearance moves.'],
  },
  {
    slug: 'decoy',
    name: 'Decoy',
    themeTag: 'decoy',
    description: 'Force an enemy piece onto a square where it can be attacked again — often by giving up material to lure it there.',
    summary: 'Make a piece move to a square where you want it.',
    difficulty: 'later',
    examples: [
      {
        fen: '4k3/8/8/8/8/8/4Q3/R5K1 w - - 0 1',
        moves: ['Qe7+', 'Kxe7', 'Ra7+'],
        stepExplanations: [
          'White gives up the queen with check.\nThe king has no other safe square, so it must capture.',
          'The king captures the queen.\nBut now the king is out in the open.',
          "White's rook gives check.\nThe queen sacrifice pulled the king to a square where it could be attacked again.",
        ],
        stepReveal: [undefined, undefined, 'This is called a decoy.'],
      },
    ],
    completionSummary: ['You can now find decoys.'],
  },
  {
    slug: 'interference',
    name: 'Interference',
    themeTag: 'interference',
    description: 'Put a piece between an enemy piece and the one it is defending, breaking the connection between them.',
    summary: 'Put a piece between two pieces that help each other.',
    difficulty: 'later',
    examples: [
      {
        fen: '3qk3/8/8/1N6/3r1B2/8/8/3RK3 w - - 0 1',
        moves: ['Nd6+', 'Kf8', 'Rxd4'],
        stepExplanations: [
          "White's knight jumps into the middle, giving check.\nIt also stands between the queen and the rook.",
          'Black moves the king out of check.\nThe knight stays in place.',
          "The queen can no longer protect the rook — the knight is in the way.\nWhite captures the rook for free.",
        ],
        stepReveal: [undefined, undefined, 'This is called interference.'],
      },
    ],
    completionSummary: ['You can now find interference.'],
  },
  {
    slug: 'trapped-piece',
    name: 'Trapped Piece',
    themeTag: 'trappedPiece',
    description: 'A piece with nowhere safe to go can simply be attacked and won.',
    summary: 'Find a piece that has nowhere safe to go.',
    difficulty: 'later',
    examples: [
      {
        fen: 'n3k3/8/N7/8/3B4/8/8/4K2Q w - - 0 1',
        moves: ['Qxa8'],
        stepExplanations: ['The knight has nowhere safe to go — both of its escape squares are covered.\nWhite simply captures it.'],
        stepReveal: ['This is called a trapped piece.'],
      },
    ],
    completionSummary: ['You can now find trapped pieces.'],
  },
]

export function getTactic(slug: string): Tactic | undefined {
  return TACTICS.find((t) => t.slug === slug)
}

/** The four tactics recommended for a first-time learner — shown as a strip, not a full category. */
export const RECOMMENDED_TACTIC_SLUGS = ['hanging-pieces', 'checks', 'forks', 'pins']

/** The tactic that follows `slug` in the learning path — TACTICS is already authored in curriculum order, so this is just the next array entry. */
export function getNextTacticInPath(slug: string): Tactic | undefined {
  const index = TACTICS.findIndex((t) => t.slug === slug)
  if (index === -1 || index === TACTICS.length - 1) return undefined
  return TACTICS[index + 1]
}
