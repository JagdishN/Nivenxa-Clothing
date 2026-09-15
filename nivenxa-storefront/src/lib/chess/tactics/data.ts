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
    prompt: "Can you find the check that also threatens what's behind the king?",
    wrongText: 'Not quite. Look for a check — then see what is lined up right behind the king.',
    correctText: 'The king had to move out of check — and now what was behind it is open to capture.',
    puzzles: [
      { fen: '4b3/6p1/2k5/1p1p1pP1/1P1P1P2/5K2/8/3N4 b - - 2 33', correctFrom: 'e8', correctTo: 'h5' },
      { fen: '8/8/8/8/3r4/7k/6R1/6K1 b - - 0 64', correctFrom: 'd4', correctTo: 'd1' },
      { fen: '8/8/3k4/3p4/3Kp2p/6bP/6P1/R7 b - - 1 59', correctFrom: 'g3', correctTo: 'e5' },
    ],
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
    // No Lichess theme tag matches "double attack" (it doesn't exist in
    // their taxonomy — verified by scanning the imported CSV), so these are
    // hand-authored, same as the original 5. Each move is verified — not
    // just legal, but a genuine simultaneous attack on both named squares —
    // via a custom sliding/jump attack-detector script, matching the same
    // discipline that caught real design mistakes in the first 5 tactics.
    prompt: 'Can you find the move that attacks two pieces at once?',
    wrongText: 'Not quite. Look for one move that threatens two different pieces.',
    correctText: 'That move attacked two pieces — Black can only save one.',
    puzzles: [
      { fen: '4k3/8/8/2n3r1/8/8/8/3QK3 w - - 0 1', correctFrom: 'd1', correctTo: 'd5' },
      { fen: '4k3/2r5/8/8/8/2n5/7B/4K3 w - - 0 1', correctFrom: 'h2', correctTo: 'e5' },
      { fen: '4k3/8/8/5r2/8/2n5/8/5RK1 w - - 0 1', correctFrom: 'f1', correctTo: 'f3' },
    ],
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
    prompt: 'Can you find the move that uncovers an attack from another piece?',
    wrongText: 'Not quite. Try moving a piece out of the way and see what opens up behind it.',
    correctText: 'Moving that piece opened up an attack from the piece behind it.',
    puzzles: [
      { fen: '6k1/6pp/p1bp1r1r/1p6/3q4/1P2RPP1/P4QKP/4N1R1 w - - 2 30', correctFrom: 'e3', correctTo: 'e8' },
      { fen: '6rk/pp1b4/3Nn1pp/3R4/7P/1P6/P4PP1/6K1 w - - 1 35', correctFrom: 'd6', correctTo: 'f7' },
      { fen: '8/1kp5/1p3qpK/3P1p2/2P2Q1P/5PP1/8/8 b - - 2 54', correctFrom: 'g6', correctTo: 'g5' },
    ],
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
    prompt: 'Can you find the move that captures the defender?',
    wrongText: 'Not quite. Look for the piece that is protecting something else — can you take it?',
    correctText: 'Now the piece it was protecting has no defender left.',
    puzzles: [
      { fen: '2r3k1/5ppp/4q3/p7/1pQ1P3/P2P3P/KP6/2R5 w - - 4 29', correctFrom: 'c4', correctTo: 'e6' },
      { fen: '4r1k1/3pb2p/2p2ppB/1p6/2nP4/2P2QPN/q1P2P1P/4R1K1 w - - 1 21', correctFrom: 'e1', correctTo: 'e7' },
      { fen: 'r1bq1rk1/2Bpbppp/p1n1p3/1Np5/Q3P3/5N2/PPP2PPP/R4RK1 b - - 9 12', correctFrom: 'a6', correctTo: 'b5' },
    ],
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
    prompt: 'Can you find the move that forces a defender to move away?',
    wrongText: "Not quite. Look for a way to attack the piece that's doing the defending.",
    correctText: 'That piece had to move — and now what it was defending is undefended.',
    puzzles: [
      { fen: '8/8/8/8/6p1/6kp/5N2/6K1 b - - 1 62', correctFrom: 'h3', correctTo: 'h2' },
      { fen: '8/pp1r3p/k1p5/P7/1P3Q2/4p2P/2P2qPK/8 w - - 1 37', correctFrom: 'f4', correctTo: 'c4' },
      { fen: '8/6k1/7R/4P1K1/6P1/6r1/7p/8 b - - 1 52', correctFrom: 'g3', correctTo: 'g4' },
    ],
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
    prompt: 'Can you find the move that checks the king on the back row?',
    wrongText: 'Not quite. Look at the back row — can the king run anywhere?',
    correctText: "The king's own pawns blocked every escape.",
    puzzles: [
      { fen: '5rk1/p1p2ppp/b7/6b1/4N3/2Pr4/PP3PPP/R1BQ2K1 b - - 0 17', correctFrom: 'd3', correctTo: 'd1' },
      { fen: '1r4k1/5ppp/8/8/3R4/8/pr4PP/K2R4 w - - 0 36', correctFrom: 'd4', correctTo: 'd8' },
      { fen: 'r2q2k1/p1p2ppp/2p5/4Q3/1p2B1b1/8/PPP2PPP/R1B3K1 b - - 0 17', correctFrom: 'd8', correctTo: 'd1' },
    ],
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
    prompt: 'Can you find the move that checks the king with two pieces at once?',
    wrongText: 'Not quite. Look for a move that uncovers a second check.',
    correctText: 'Two pieces checked the king at the same time — it had to move.',
    puzzles: [
      { fen: '1k1r3r/pP4p1/1nq1pp2/3n3p/2pP1P2/Q1P5/6PP/R4RK1 w - - 0 31', correctFrom: 'a3', correctTo: 'a7' },
      { fen: '2r5/5kpp/3p4/p3pNb1/Pp2P3/1P1P1QPP/3q1P2/6K1 w - - 0 30', correctFrom: 'f5', correctTo: 'd6' },
      { fen: '5rk1/pp5p/6P1/3pN2r/3Ppq2/1PP3Q1/P6P/2R1K3 w - - 0 37', correctFrom: 'g6', correctTo: 'h7' },
    ],
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
    prompt: 'Can you find the strong move to play before the expected one?',
    wrongText: 'Not quite. Is there a check or a bigger threat to play first?',
    correctText: 'That move was stronger than the one that looked obvious.',
    puzzles: [
      { fen: '3q1rk1/1pp2p2/4p1pp/4n3/7P/1P6/1B3PP1/1K1R3R w - - 0 26', correctFrom: 'd1', correctTo: 'd8' },
      { fen: '2r5/3r1Npk/p1Q4p/8/2p5/P6P/B1P2PP1/3R2K1 b - - 0 35', correctFrom: 'd7', correctTo: 'd1' },
      { fen: '2R1rk2/5ppp/p7/1p1RN2P/3b1K2/4P3/5P2/8 b - - 0 29', correctFrom: 'd4', correctTo: 'e5' },
    ],
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
    // No Lichess "overloading" theme tag exists either — hand-authored, same
    // verification discipline as double-attack above: a script confirmed
    // each defender genuinely guards both named squares before the capture.
    prompt: 'Can you find the piece that is defending two things at once?',
    wrongText: 'Not quite. Look for one defender that is protecting two different pieces.',
    correctText: 'That defender could not protect both pieces at once.',
    puzzles: [
      { fen: '4k3/8/4n3/2r3r1/8/8/8/2R1K3 w - - 0 1', correctFrom: 'c1', correctTo: 'c5' },
      { fen: '4k3/1r6/8/3b4/8/1r6/8/1R2K3 w - - 0 1', correctFrom: 'b1', correctTo: 'b3' },
      { fen: '4k3/8/8/b2r4/8/8/3n4/3RK3 w - - 0 1', correctFrom: 'd1', correctTo: 'd2' },
    ],
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
    prompt: 'Can you find the move that clears a square for a check?',
    wrongText: 'Not quite. What square do you need to clear to give check?',
    correctText: 'Moving off that square opened the line for the check.',
    puzzles: [
      { fen: '5rk1/pp5p/2p3p1/8/2PR1n2/P1N1P2b/1PB4P/6K1 b - - 0 22', correctFrom: 'f4', correctTo: 'e2' },
      { fen: '1r1r4/6k1/1p6/1Pp1PQ2/8/8/6PP/6K1 b - - 0 35', correctFrom: 'd8', correctTo: 'd1' },
      { fen: '8/6pk/p2rQ2p/8/Ppnq4/6PP/1P2RP1K/8 w - - 2 42', correctFrom: 'e6', correctTo: 'f5' },
    ],
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
    prompt: 'Can you find the move that pulls a piece where you want it?',
    wrongText: 'Not quite. Look for a way to force a piece onto a bad square — even if it costs material.',
    correctText: 'That move pulled the piece onto a square where it could be attacked again.',
    puzzles: [
      { fen: '3r4/p6k/2P1p1p1/PP6/2P2P2/4B2p/5P1P/3r2RK b - - 4 40', correctFrom: 'd1', correctTo: 'g1' },
      { fen: 'R4rk1/5ppp/3p4/Q1p5/2q5/1p3P1P/5P1K/8 w - - 0 34', correctFrom: 'a8', correctTo: 'f8' },
      { fen: 'r1bkr3/ppppn2p/2n4B/4q2Q/8/8/P1P3PP/R4R1K w - - 0 18', correctFrom: 'h5', correctTo: 'e8' },
    ],
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
    prompt: 'Can you find the move that blocks the defender from helping?',
    wrongText: 'Not quite. Look for a square between an enemy piece and the one it is defending.',
    correctText: 'That piece is no longer protected — the connection is blocked.',
    puzzles: [
      { fen: 'rn1qkb1r/1p1b4/p1p1p1p1/4P1p1/2PP4/3B4/PP3PPP/R1B1K2R w KQkq - 0 13', correctFrom: 'd3', correctTo: 'g6' },
      { fen: '8/R6p/6k1/1Pp2pp1/2r5/P4KP1/7r/3R4 w - - 2 39', correctFrom: 'd1', correctTo: 'd6' },
      { fen: 'r2q1rk1/pp3p1p/2n5/2bN2p1/2Bp1Q1N/6Pb/PPP2P1P/R3R1K1 w - - 0 19', correctFrom: 'd5', correctTo: 'f6' },
    ],
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
    prompt: 'Can you find the piece with nowhere safe to go?',
    wrongText: 'Not quite. Look for a piece that cannot escape — then attack it.',
    correctText: 'That piece had nowhere safe to run.',
    puzzles: [
      { fen: '3qr1k1/p5bp/1p3pp1/n3p3/P6Q/R2P2P1/3NPPbP/1rBR1K2 w - - 0 24', correctFrom: 'f1', correctTo: 'g2' },
      { fen: '8/8/5p2/p1pp1Pp1/1p1k4/1P1B4/P1P1K3/8 b - - 5 52', correctFrom: 'c5', correctTo: 'c4' },
      { fen: 'r2b2k1/pp3pp1/4pn1p/8/q4B2/2PB1Q2/1P1R1PPP/6K1 w - - 6 24', correctFrom: 'f3', correctTo: 'b7' },
    ],
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
