// ─────────────────────────────────────────────────────────────────────────
// DRAFT CONTENT — first pass, not yet reviewed.
//
// Each example position and move sequence has been checked for legality
// (every FEN loads, every move is legal in sequence, the stated result —
// check, mate, stalemate, or the described idea — is verified via chess.js),
// but the prose explanations are a first draft and have NOT been checked by
// a chess-knowledgeable human. Please review before treating this as final
// published content — endgame technique needs to be correct, not just
// plausible-sounding.
//
// ENDGAMES is authored in curriculum order — that array order IS the
// learning path `getNextEndgameInPath` walks, same convention as TACTICS in
// src/lib/chess/tactics/data.ts. Lessons 1-4 are the restructured core
// (king play, both basic mates, promoting a pawn); 5-10 are the pawn-ending
// follow-ons, in the specific order requested: Pawn Race → Can the King
// Catch the Pawn? → Create a Passed Pawn → Stop a Passed Pawn → Avoid
// Stalemate → Rook Behind the Pawn.
// ─────────────────────────────────────────────────────────────────────────

export interface EndgameExample {
  /** Distinguishes multiple examples within one entry, e.g. "King and Queen vs King". */
  label?: string
  /** Starting FEN for this example. */
  fen: string
  /** SAN moves, in order, matching the string form chess.js's `.move()` accepts directly. */
  moves: string[]
  /** One explanation per move, aligned by index with `moves`. Use "\n" to break a step's explanation into separate one-idea lines. */
  stepExplanations: string[]
  /** A short "this is called X" aside per move, aligned by index with `moves`. */
  stepReveal?: (string | undefined)[]
  /** Extra square(s) to circle per move, aligned by index with `moves`. */
  stepHighlights?: (string | string[] | undefined)[]
  /** [from, to] arrow to draw per move, aligned by index with `moves`. */
  stepArrows?: ([string, string] | undefined)[]
  /** Overrides the generic "Watch how this works, one move at a time." at step 0. */
  startDescription?: string
  /** Square(s) to circle at step 0, alongside `startDescription`. */
  startHighlights?: string[]
}

/** One "find the move" puzzle — a single decision, no scripted follow-up. */
export interface EndgamePuzzle {
  fen: string
  correctFrom: string
  correctTo: string
  /** Shown instead of the lesson-wide `prompt` when a puzzle's own goal differs from the others. */
  objective?: string
  /**
   * Accepts any legal move satisfying this property, not just
   * `correctFrom`/`correctTo` exactly — see EndgamePuzzleConfig in
   * EndgamePuzzleSet.tsx. Endgames' own small vocabulary: delivering
   * checkmate (any mating move, not just the one demonstrated piece/square)
   * and promoting a pawn (any promotion, not just the one file shown).
   */
  acceptAnyMoveThat?: 'deliversCheckmate' | 'promotesPawn'
}

export interface Endgame {
  slug: string
  name: string
  description: string
  examples: EndgameExample[]
  /** Shown once the learner reaches the last move of an example with no practice puzzles. */
  completionSummary?: string[]
  /** The interactive "Your Turn" phase — three puzzles solved after watching `examples[0]`. */
  prompt?: string
  wrongText?: string
  correctText?: string
  puzzles?: EndgamePuzzle[]
}

export const ENDGAMES: Endgame[] = [
  // ─── Core: king play, the two basic mates, promoting a pawn ─────────────
  {
    slug: 'use-your-king',
    name: 'Use Your King',
    description: 'Once queens come off the board, the king stops being a piece to hide and becomes one of your strongest pieces — if it gets involved.',
    examples: [
      {
        label: 'March to the centre',
        fen: '4k3/p6p/8/8/8/8/P6P/4K3 w - - 0 1',
        startDescription:
          'During the opening and middlegame, the king hides and stays safe.\nIn the endgame, with fewer pieces left to attack it, the king can come out and fight.\nWatch White march the king toward the centre of the board.',
        startHighlights: ['e1', 'e8'],
        moves: ['Ke2', 'h6', 'Ke3'],
        stepExplanations: [
          'White immediately starts marching the king toward the centre, rather than leaving it tucked away on the back rank.',
          'Black makes a passive waiting move, not yet activating the king.',
          "White's king continues centralising. In the endgame, a centralised king supports pawn advances, helps create a passed pawn, and can even help deliver mate — activating it early is one of the biggest differences between good and poor endgame play.",
        ],
        stepReveal: [undefined, undefined, 'This is called king activity.'],
      },
      {
        label: 'Protect a pawn',
        fen: '3rk3/8/8/3P4/4K3/8/8/8 b - - 0 1',
        startDescription:
          "The king doesn't just attack — it protects too.\nOur king on e4 is standing guard right next to the pawn on d5.\nWatch what happens if Black tries to win it.",
        startHighlights: ['e4', 'd5', 'd8'],
        moves: ['Rxd5', 'Kxd5'],
        stepExplanations: [
          "Black's rook captures the pawn.",
          "But the king was protecting it all along — White recaptures the rook for free. The pawn was never really free to take.",
        ],
        stepReveal: [undefined, 'A protected piece is never truly hanging — the king can defend just like any other piece.'],
      },
    ],
    completionSummary: ['You can now find active moves for your king.'],
    prompt: 'Can you find the move that attacks an undefended pawn?',
    wrongText: 'Not quite. Look for an enemy pawn your king can safely capture.',
    correctText: 'Your king captures the {capturedPiece} — a king can win material too, not just defend it.',
    puzzles: [
      { fen: 'k7/8/3p4/3K4/8/8/8/8 w - - 0 1', correctFrom: 'd5', correctTo: 'd6' },
      // Mirrored (board flipped, colors swapped) from the original White
      // puzzle — same mechanism, Black's move this time. Every puzzle set
      // in this file mixes White-to-move and Black-to-move rather than
      // staying one color throughout, so solving a lesson's puzzles also
      // means reading "whose move is it" correctly, not just the pattern.
      { fen: '8/8/8/6P1/5k2/8/8/K7 b - - 0 1', correctFrom: 'f4', correctTo: 'g5' },
      { fen: '8/8/8/4Kp2/8/8/8/7k w - - 0 1', correctFrom: 'e5', correctTo: 'f5' },
    ],
  },
  {
    slug: 'checkmate-with-a-queen',
    name: 'Checkmate with a Queen',
    description: 'Guide the opponent’s king toward the edge of the board, then finish safely with your king and queen working together.',
    examples: [
      {
        fen: 'k7/2K5/8/8/8/8/8/1Q6 w - - 0 1',
        startDescription:
          "Black's king is confined to the corner.\nWhite's king already covers b7 and b8.\nMany different queen moves can checkmate from here — here's one way to do it:",
        startHighlights: ['a8', 'c7', 'b1'],
        moves: ['Qb8#'],
        stepExplanations: [
          "The queen delivers checkmate, protected by White's own king on c7 so it can't simply be captured. Every escape square is covered: b7 and b8 by the king, a7 by the queen itself along the diagonal. This is the standard technique — use your king to help control escape squares, then deliver the final check with the queen a safe distance away, always keeping it defended.",
        ],
        stepReveal: ['This is checkmate.'],
      },
    ],
    completionSummary: ['You can now checkmate with a king and queen.'],
    prompt: 'Can you find the move that checkmates the king?',
    wrongText: 'Not quite. Look for a queen move that covers every escape square.',
    correctText: 'Checkmate! Your {yourPiece} leaves the king with nowhere safe to go.',
    // REVIEW: "find the move that checkmates" has more than one right answer
    // in general — `acceptAnyMoveThat: 'deliversCheckmate'` checks
    // `chess.isCheckmate()` directly, not just this one demonstrated square.
    puzzles: [
      { fen: '7k/2Q5/6K1/8/8/8/8/8 w - - 0 1', correctFrom: 'c7', correctTo: 'g7', acceptAnyMoveThat: 'deliversCheckmate' },
      { fen: '2q5/8/8/8/8/1k6/8/K7 b - - 0 1', correctFrom: 'c8', correctTo: 'c1', acceptAnyMoveThat: 'deliversCheckmate' },
      { fen: '6Q1/8/8/8/8/8/5K2/7k w - - 0 1', correctFrom: 'g8', correctTo: 'g1', acceptAnyMoveThat: 'deliversCheckmate' },
    ],
  },
  {
    slug: 'checkmate-with-a-rook',
    name: 'Checkmate with a Rook',
    description: 'A lone rook can’t cover a diagonal by itself, so this mate uses the king and rook together in a slightly different way.',
    examples: [
      {
        fen: 'k7/8/1K6/8/8/8/8/7R w - - 0 1',
        startDescription:
          "Black's king is confined to the corner.\nUnlike a queen, a rook alone can't cover a diagonal square — so White's king has taken up a position a knight's-move from the corner instead, at b6, covering both a7 and b7 directly.\nHere's one way to finish it:",
        startHighlights: ['a8', 'b6', 'h1'],
        moves: ['Rh8#'],
        stepExplanations: [
          "The rook checks along the entire 8th rank from a safe distance — far enough that the king can never reach it. White's king on b6 covers a7 and b7, the two squares the rook's check along the rank doesn't reach, and b8 is covered by the rook itself. With every escape square controlled, it's checkmate — the standard king placement for a rook mate, since a rook alone can only ever control a full rank or file, never a diagonal.",
        ],
        stepReveal: ['This is checkmate.'],
      },
    ],
    completionSummary: ['You can now checkmate with a king and rook.'],
    prompt: 'Can you find the move that checkmates the king?',
    wrongText: 'Not quite. Look at the back row — can the king run anywhere?',
    correctText: 'Checkmate! Your {yourPiece} seals off every escape square.',
    puzzles: [
      { fen: 'k7/8/1K6/8/8/8/8/2R5 w - - 0 1', correctFrom: 'c1', correctTo: 'c8', acceptAnyMoveThat: 'deliversCheckmate' },
      { fen: 'r7/8/8/8/8/6k1/8/7K b - - 0 1', correctFrom: 'a8', correctTo: 'a1', acceptAnyMoveThat: 'deliversCheckmate' },
      { fen: '7R/8/8/8/8/8/2K5/k7 w - - 0 1', correctFrom: 'h8', correctTo: 'a8', acceptAnyMoveThat: 'deliversCheckmate' },
    ],
  },
  {
    slug: 'help-your-pawn-become-a-queen',
    name: 'Help Your Pawn Become a Queen',
    description: 'Escort a pawn all the way to the far side of the board, using your king to clear the way — the idea of the opposition explained through examples.',
    examples: [
      {
        label: 'Black to move',
        fen: '3k4/8/3K4/3P4/8/8/8/8 b - - 0 1',
        startDescription:
          "White's king and pawn face Black's lone king.\nIt's Black to move — and every square around the White king is covered, forcing Black to give ground.\nThis is the essence of the opposition: whoever is forced to move first is at a disadvantage.",
        startHighlights: ['d6', 'd5', 'd8'],
        moves: ['Kc8', 'Kc6'],
        stepExplanations: [
          'With d7, c7, and e7 all controlled by White’s king, Black has no choice but to retreat further back.',
          "White's king advances again, continuing to escort the pawn forward while keeping Black's king shut out. From here White keeps repeating this pattern — advance, and sidestep if blocked — until the pawn can safely promote.",
        ],
        stepReveal: [undefined, 'This is called the opposition.'],
      },
      {
        label: 'White to move (contrast)',
        fen: '4k3/8/4K3/4P3/8/8/8/8 w - - 0 1',
        startDescription:
          "Same idea, same distance apart — but now it's WHITE to move instead of Black.\nNotice White can't simply step forward: Ke7 would put the two kings right next to each other, which is never allowed.",
        startHighlights: ['e6', 'e5', 'e8'],
        moves: ['Kf6', 'Kf8'],
        stepExplanations: [
          "White has to go around instead of straight ahead.",
          'Black mirrors the king to keep blocking the pawn. Unlike Example 1, White made no real progress this move — being forced to move first, without the opposition, costs a tempo.',
        ],
        stepReveal: [undefined, "This is the same opposition idea, from the side that doesn't have it."],
      },
    ],
    completionSummary: ['You can now escort a pawn toward promotion.'],
    prompt: 'Can you push the pawn all the way to become a queen?',
    wrongText: 'Not quite. Which pawn is free to run all the way to the end?',
    correctText: 'Your pawn reaches the far side and becomes a queen!',
    // REVIEW: "push it home" accepts any promotion, not just a queen —
    // `acceptAnyMoveThat: 'promotesPawn'` checks that the move promoted at
    // all, rather than requiring this exact piece.
    puzzles: [
      { fen: '7k/PK6/8/8/8/8/8/8 w - - 0 1', correctFrom: 'a7', correctTo: 'a8', acceptAnyMoveThat: 'promotesPawn' },
      { fen: 'K7/8/8/8/8/8/5kp1/8 b - - 0 1', correctFrom: 'g2', correctTo: 'g1', acceptAnyMoveThat: 'promotesPawn' },
      { fen: '8/KP6/8/8/8/8/8/7k w - - 0 1', correctFrom: 'b7', correctTo: 'b8', acceptAnyMoveThat: 'promotesPawn' },
    ],
  },

  // ─── Pawn endgames ────────────────────────────────────────────────────────
  {
    slug: 'the-pawn-race',
    name: 'The Pawn Race',
    description: 'When both sides have a pawn running for the far side of the board, count the moves each one needs — including whose turn it is — to see who gets there first.',
    examples: [
      {
        fen: '7k/8/P7/8/8/7p/8/K7 w - - 0 1',
        startDescription:
          "White's a-pawn needs 2 moves to become a queen. Black's h-pawn also needs 2 moves.\nIt's White's move — so count carefully and see who really wins the race.",
        startHighlights: ['a6', 'h3'],
        moves: ['a7', 'h2', 'a8=Q'],
        stepExplanations: [
          'White pushes the pawn one step closer.',
          'Black pushes too — but Black only gets one move for every one of White’s, and White moved first.',
          'White’s pawn reaches the end and becomes a queen — a full move before Black’s pawn can do the same.',
        ],
        stepReveal: [undefined, undefined, 'Counting the moves (and whose turn it is) tells you who wins the race.'],
      },
    ],
    completionSummary: ['You can now count a pawn race to see who wins it.'],
    prompt: 'Can you find the move that wins the pawn race?',
    wrongText: 'Not quite. Count how many moves each pawn needs — which one gets there first?',
    correctText: 'Pushing the {yourPiece} keeps you ahead in the race.',
    puzzles: [
      { fen: '7k/8/2P5/8/8/5p2/8/K7 w - - 0 1', correctFrom: 'c6', correctTo: 'c7' },
      { fen: 'k7/8/2P5/8/8/5p2/8/7K b - - 0 1', correctFrom: 'f3', correctTo: 'f2' },
      { fen: '7k/8/8/6P1/8/1p6/8/K7 w - - 0 1', correctFrom: 'g5', correctTo: 'g6' },
    ],
  },
  {
    slug: 'can-the-king-catch-the-pawn',
    name: 'Can the King Catch the Pawn?',
    description: 'A simple shortcut — the “square of the pawn” — tells you instantly whether a lone king can catch a runaway pawn, without counting every move.',
    examples: [
      {
        label: 'Inside the square',
        fen: '8/8/2k5/4P3/8/8/8/K7 b - - 0 1',
        startDescription:
          "Picture a square drawn from the pawn to its queening square, the same width as it is tall.\nIf the defending king can step inside that square on its move, it catches the pawn — no matter how the race goes from there.\nBlack's king is inside the square here. Watch it catch up.",
        startHighlights: ['e5', 'e8', 'b5'],
        moves: ['Kd5', 'e6', 'Kxe6'],
        stepExplanations: [
          "Black's king heads straight for the pawn.",
          'White pushes — but this only brings the pawn closer to the king, not further away.',
          'The king catches the pawn. Being inside the square meant Black always had time to get there.',
        ],
        stepReveal: [undefined, undefined, 'This is called the square of the pawn.'],
      },
      {
        label: 'Outside the square',
        fen: '8/8/k7/4P3/8/8/8/K7 b - - 0 1',
        startDescription:
          "Same pawn, same distance to go — but this time Black's king starts one square further away, outside the square.\nWatch what happens when the king chases anyway.",
        startHighlights: ['e5', 'e8', 'b5'],
        moves: ['Kb6', 'e6', 'Kc6', 'e7', 'Kd6', 'e8=Q'],
        stepExplanations: [
          "Black's king starts the chase.",
          'White pushes toward promotion.',
          'Black keeps chasing, one square at a time.',
          'White pushes again — getting close now.',
          'Black is still one square short.',
          "The pawn reaches the end and becomes a queen. Starting outside the square meant Black could never quite catch up, no matter how directly the king ran.",
        ],
      },
    ],
    completionSummary: ['You can now use the square of the pawn to tell if a king can catch it.'],
    prompt: 'Can you find the move that catches the pawn?',
    wrongText: 'Not quite. Which square gets your king closer to the pawn?',
    correctText: 'Your king catches the {capturedPiece} — right on time.',
    puzzles: [
      { fen: '8/8/3k4/3P4/8/8/8/K7 b - - 0 1', correctFrom: 'd6', correctTo: 'd5' },
      { fen: 'k7/8/8/5Kp1/8/8/8/8 w - - 0 1', correctFrom: 'f5', correctTo: 'g5' },
      { fen: '8/8/8/8/8/1Pk5/8/7K b - - 0 1', correctFrom: 'c3', correctTo: 'b3' },
    ],
  },
  {
    slug: 'create-a-passed-pawn',
    name: 'Create a Passed Pawn',
    description: 'A passed pawn has no enemy pawn on its own file or the files next to it that can ever block or capture it. Sometimes you have to trade pawns to create one.',
    examples: [
      {
        fen: '4k3/8/8/p7/PP6/8/8/4K3 w - - 0 1',
        startDescription:
          "White's b-pawn is blocked by Black's own a-pawn standing in its way.\nBut White has a trick: push the OTHER pawn past it instead.\nWatch what happens to the b-pawn's prospects.",
        startHighlights: ['a4', 'b4', 'a5'],
        moves: ['b5'],
        stepExplanations: [
          "White's b-pawn slips past Black's a-pawn. Black's pawn can never capture it from here — pawns only capture diagonally forward, and Black's a-pawn's diagonal squares are both behind this one now. With no black pawn left on the a, b, or c files ahead of it, White's b-pawn is free to run all the way to the end.",
        ],
        stepReveal: ['This is called creating a passed pawn.'],
      },
    ],
    completionSummary: ['You can now find a pawn break that creates a passed pawn.'],
    prompt: 'Can you find the pawn move that creates a passed pawn?',
    wrongText: 'Not quite. Which pawn can slip past the piece blocking it?',
    correctText: 'Your {yourPiece} slips past — nothing can stop it from here.',
    puzzles: [
      { fen: '4k3/8/8/3p4/3PP3/8/8/4K3 w - - 0 1', correctFrom: 'e4', correctTo: 'e5' },
      { fen: '4k3/8/8/5pp1/6P1/8/8/4K3 b - - 0 1', correctFrom: 'f5', correctTo: 'f4' },
      { fen: '4k3/8/8/1p6/1PP5/8/8/4K3 w - - 0 1', correctFrom: 'c4', correctTo: 'c5' },
    ],
  },
  {
    slug: 'stop-a-passed-pawn',
    name: 'Stop a Passed Pawn',
    description: 'A king (or any piece) standing directly in front of a pawn can never be captured by it — pawns only capture diagonally, never straight ahead.',
    examples: [
      {
        fen: '3k4/8/8/4P3/8/8/8/K7 b - - 0 1',
        startDescription:
          "White's pawn is already passed and ready to run.\nBlack's best defence is to get the king directly in front of it — a square the pawn can never capture into.\nWatch Black reach that square.",
        startHighlights: ['e5', 'd8'],
        moves: ['Ke7', 'Kb1', 'Ke6'],
        stepExplanations: [
          "Black's king heads toward the pawn's path.",
          "White makes a quiet waiting move — there's nothing better to do yet.",
          "Black's king steps onto e6, directly in front of the pawn. The pawn can never advance past the king, and it can never capture it either — straight ahead is never a legal pawn capture.",
        ],
        stepReveal: [undefined, undefined, 'This is called blockading the pawn.'],
      },
    ],
    completionSummary: ['You can now blockade a passed pawn to stop it cold.'],
    prompt: 'Can you find the move that blocks the pawn?',
    wrongText: 'Not quite. Which square is directly in front of the pawn?',
    correctText: 'Your {yourPiece} blocks the pawn completely — it can never get past.',
    puzzles: [
      { fen: '8/8/4k3/8/4P3/8/8/K7 b - - 0 1', correctFrom: 'e6', correctTo: 'e5' },
      { fen: 'k7/8/8/2p5/8/1K6/8/8 w - - 0 1', correctFrom: 'b3', correctTo: 'c4' },
      { fen: '8/8/5k2/8/6P1/8/8/K7 b - - 0 1', correctFrom: 'f6', correctTo: 'g5' },
    ],
  },
  {
    slug: 'avoid-stalemate',
    name: 'Avoid Stalemate',
    description: 'A very common mistake when checkmating with extra material: a careless move leaves the king with no legal moves but no check either — that’s a stalemate, and the game is a draw.',
    examples: [
      {
        label: 'The mistake',
        fen: 'k7/7Q/1K6/8/8/8/8/8 w - - 0 1',
        startDescription:
          "This looks just like the Checkmate with a Queen lesson — White has a king and queen against a lone king.\nBut not every queen move here actually wins. Watch this one closely.",
        startHighlights: ['a8', 'b6', 'h7'],
        moves: ['Qc7'],
        stepExplanations: [
          "This looks like a safe, controlling square for the queen — but check Black's king carefully: a7, b7, and b8 are all covered, so it has no legal moves. And it isn't in check. That's a stalemate — the game is a draw, even though White still has a whole queen and king for nothing.",
        ],
        stepReveal: ['This is called stalemate — always check for it before you move.'],
      },
      {
        label: 'The fix',
        fen: 'k7/7Q/1K6/8/8/8/8/8 w - - 0 1',
        startDescription: 'Same starting position. This time, White finds the move that actually wins.',
        startHighlights: ['a8', 'b6', 'h7'],
        moves: ['Qb7#'],
        stepExplanations: [
          "The queen delivers check this time, protected by the king on b6. Black's king has nowhere to go — but unlike before, it's actually in check. That's checkmate, not a draw.",
        ],
        stepReveal: ['This is checkmate — always the goal, never a stalemate.'],
      },
    ],
    completionSummary: ['You can now spot the difference between checkmate and an accidental stalemate.'],
    prompt: 'Can you find the move that checkmates — not stalemates — the king?',
    wrongText: 'Not quite. Look for a move that actually checks the king.',
    correctText: 'Checkmate! Your {yourPiece} wins the game — not just a draw.',
    puzzles: [
      { fen: '7k/2Q5/6K1/8/8/8/8/8 w - - 0 1', correctFrom: 'c7', correctTo: 'g7', acceptAnyMoveThat: 'deliversCheckmate' },
      { fen: '7q/8/8/8/8/1k6/8/K7 b - - 0 1', correctFrom: 'h8', correctTo: 'b2', acceptAnyMoveThat: 'deliversCheckmate' },
      { fen: '7k/8/6K1/8/3Q4/8/8/8 w - - 0 1', correctFrom: 'd4', correctTo: 'g7', acceptAnyMoveThat: 'deliversCheckmate' },
    ],
  },
  {
    slug: 'rook-behind-the-pawn',
    name: 'Rook Behind the Pawn',
    description:
      'A rook placed behind a passed pawn supports it all the way to the end — a useful guideline, not a rule that always wins, but a strong one worth knowing.',
    examples: [
      {
        fen: '7k/8/8/4P3/8/8/8/K3R3 w - - 0 1',
        startDescription:
          "White's rook sits on e1, directly behind the passed pawn on e5.\nFrom back there, the rook guards every square the pawn will cross — nothing on the e-file can ever stop it.\nWatch the pawn march, fully supported.",
        startHighlights: ['e1', 'e5', 'h8'],
        moves: ['e6', 'Kg8', 'e7', 'Kh7', 'e8=Q'],
        stepExplanations: [
          'The pawn advances, with the rook guarding its whole path from behind.',
          "Black's king tries to get closer, but it's too far away to help in time.",
          'The pawn advances again.',
          "Black's king still can't reach it.",
          'The pawn reaches the end and becomes a queen. The rook never had to move — its job was simply to guard the file from behind.',
        ],
        stepReveal: [undefined, undefined, undefined, undefined, 'This guideline is sometimes called Tarrasch’s rule — put rooks behind passed pawns, yours or your opponent’s. It’s a strong habit, but not an unbreakable rule: sometimes the rook has better work to do elsewhere.'],
      },
    ],
    completionSummary: ['You can now support a passed pawn with a rook from behind.'],
    prompt: 'Can you push the passed pawn forward?',
    wrongText: 'Not quite. Which pawn does your rook already support from behind?',
    correctText: "Your {yourPiece} advances, fully protected by the rook behind it.",
    puzzles: [
      { fen: '7k/8/8/8/4P3/8/8/K3R3 w - - 0 1', correctFrom: 'e4', correctTo: 'e5' },
      { fen: 'k4r2/8/8/5p2/8/8/8/7K b - - 0 1', correctFrom: 'f5', correctTo: 'f4' },
      { fen: 'k7/6P1/8/8/8/8/8/K5R1 w - - 0 1', correctFrom: 'g7', correctTo: 'g8', acceptAnyMoveThat: 'promotesPawn' },
    ],
  },
]

export function getEndgame(slug: string): Endgame | undefined {
  return ENDGAMES.find((e) => e.slug === slug)
}

/** The endgame that follows `slug` in the learning path — ENDGAMES is already authored in curriculum order, so this is just the next array entry. */
export function getNextEndgameInPath(slug: string): Endgame | undefined {
  const index = ENDGAMES.findIndex((e) => e.slug === slug)
  if (index === -1 || index === ENDGAMES.length - 1) return undefined
  return ENDGAMES[index + 1]
}
