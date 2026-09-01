// ─────────────────────────────────────────────────────────────────────────
// DRAFT CONTENT — first pass, not yet reviewed.
//
// Every FEN and move sequence below has been checked for legality (loads
// correctly, every move is legal in sequence, and the stated result — check,
// mate, stalemate, draw condition — is verified against chess.js's own
// rules engine). The prose has NOT been checked by a chess-knowledgeable
// human, and for a rules reference, accuracy matters more than almost
// anywhere else in Learn — please review before treating this as final.
// ─────────────────────────────────────────────────────────────────────────

export interface RuleExample {
  /** Starting FEN for this example. */
  fen: string
  /** SAN moves, in order, matching the string form chess.js's `.move()` accepts directly. Can be empty for a single static position. */
  moves: string[]
  /** One explanation per move, aligned by index with `moves`. */
  stepExplanations: string[]
  /** Shown at step 0. */
  startDescription: string
  /** Distinguishes multiple examples within one entry, e.g. "Kingside". */
  label?: string
}

export interface Rule {
  slug: string
  name: string
  description: string
  type: 'illustrated' | 'text'
  /** Only present when type is 'illustrated'. */
  examples?: RuleExample[]
  /** Paragraphs, only present when type is 'text'. */
  body?: string[]
}

export const RULES: Rule[] = [
  {
    slug: 'how-the-pieces-move',
    name: 'How the Pieces Move',
    description: 'Each piece moves — and captures — in its own distinct way. Step through all six.',
    type: 'illustrated',
    examples: [
      {
        label: 'Pawn',
        fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        moves: ['e4', 'd5', 'exd5'],
        startDescription: 'Pawns are the only piece that moves and captures differently — forward to move, diagonally to capture.',
        stepExplanations: [
          "A pawn's most common move: one square forward, or two squares on its very first move, as here. Pawns can never move backward or sideways.",
          'Black mirrors this — pawns can advance two squares only from their starting square.',
          "Pawns capture differently from how they move: diagonally forward, one square, rather than straight ahead. A pawn can never capture the piece directly in front of it.",
        ],
      },
      {
        label: 'Knight',
        fen: '4k3/8/8/8/3p4/8/4N3/4K3 w - - 0 1',
        moves: ['Nxd4'],
        startDescription: 'The knight jumps in an L-shape and is the only piece that can leap over others to get where it\'s going.',
        stepExplanations: [
          "The knight is the only piece that moves in an 'L' shape — two squares in one direction, then one square perpendicular — and it's the only piece that can jump over other pieces entirely to get there. It captures by simply landing on the enemy piece's square, just like this.",
        ],
      },
      {
        label: 'Bishop',
        fen: '4k3/8/8/6p1/8/8/8/2B1K3 w - - 0 1',
        moves: ['Bxg5'],
        startDescription: 'The bishop slides diagonally, any distance, and stays on one color of square for the whole game.',
        stepExplanations: [
          'A bishop moves any number of squares diagonally, in any direction, but never leaves the color of square it started on. This bishop began on a dark square and stays on dark squares for the rest of the game.',
        ],
      },
      {
        label: 'Rook',
        fen: '4k3/8/p7/8/8/8/8/R3K3 w - - 0 1',
        moves: ['Rxa6'],
        startDescription: 'The rook slides in straight lines, any distance, along ranks and files.',
        stepExplanations: ['A rook moves any number of squares along a rank (row) or file (column), but never diagonally.'],
      },
      {
        label: 'Queen',
        fen: '4k3/8/8/7p/8/8/8/3QK3 w - - 0 1',
        moves: ['Qxh5+'],
        startDescription: 'The queen combines the rook and bishop\'s movement — the single most powerful piece on the board.',
        stepExplanations: [
          "The queen combines the rook's straight-line movement with the bishop's diagonal movement, moving any number of squares in any direction.",
        ],
      },
      {
        label: 'King',
        fen: 'k7/8/8/3p4/3K4/8/8/8 w - - 0 1',
        moves: ['Kxd5'],
        startDescription: 'The king moves just one square at a time — but has one rule no other piece does: it can never move into check.',
        stepExplanations: [
          "The king moves exactly one square in any direction — horizontally, vertically, or diagonally — and captures the same way. The one hard rule: it can never move to a square attacked by an enemy piece, since that would put it in check.",
        ],
      },
    ],
  },
  {
    slug: 'castling',
    name: 'Castling',
    description: 'The one move where two of your own pieces move at once — a special king-and-rook move, with its own conditions.',
    type: 'illustrated',
    examples: [
      {
        label: 'Kingside',
        fen: '4k3/8/8/8/8/8/8/4K2R w K - 0 1',
        moves: ['O-O'],
        startDescription: 'White\'s king and h-rook are both still on their starting squares, with nothing between them — castling kingside is available.',
        stepExplanations: [
          "Castling kingside: the king moves two squares toward the rook, and the rook jumps to the square right next to it on the other side. It's the only move where two of your own pieces move at once. Castling is only legal if: neither the king nor that rook has moved yet this game, there are no pieces between them, and the king is not currently in check, does not pass through an attacked square, and does not land on one.",
        ],
      },
      {
        label: 'Queenside',
        fen: '4k3/8/8/8/8/8/8/R3K3 w Q - 0 1',
        moves: ['O-O-O'],
        startDescription: 'White\'s king and a-rook are both still on their starting squares, with nothing between them — castling queenside is available.',
        stepExplanations: [
          "Castling queenside works the same way, just toward the a-rook — the king still only moves two squares, but the rook travels further, landing on the square just on the other side of the king. The same conditions apply: neither piece has moved, the squares between them are empty, and the king isn't in, through, or into check.",
        ],
      },
    ],
  },
  {
    slug: 'en-passant',
    name: 'En Passant',
    description: 'A special, easy-to-forget pawn capture that only exists for one move.',
    type: 'illustrated',
    examples: [
      {
        fen: '4k3/5p2/8/4P3/8/8/8/4K3 b - - 0 1',
        moves: ['f5', 'exf6'],
        startDescription:
          "White's pawn on e5 has already advanced. If Black's f-pawn now jumps two squares to f5, landing right beside it, White gets one special, one-time chance to capture it as though it had only moved one square.",
        stepExplanations: [
          "Black's pawn advances two squares from its starting rank, landing directly beside White's e5 pawn.",
          "En passant (\"in passing\"): because Black's pawn tried to skip past the square White's pawn was attacking, White may capture it as if it had stopped there instead. This capture is only legal on the very next move — the chance disappears immediately if not taken right away.",
        ],
      },
    ],
  },
  {
    slug: 'pawn-promotion',
    name: 'Pawn Promotion',
    description: 'A pawn that reaches the far end of the board doesn\'t stay a pawn.',
    type: 'illustrated',
    examples: [
      {
        fen: '4k3/P7/8/8/8/8/8/4K3 w - - 0 1',
        moves: ['a8=Q+'],
        startDescription: 'White\'s pawn is one square from the 8th rank — the far end of the board, from White\'s side.',
        stepExplanations: [
          "When a pawn reaches the far end of the board (the 8th rank for White, the 1st for Black), it must immediately promote — turning into a queen, rook, bishop, or knight of the same color. Queen is by far the most common choice, since it's the most powerful piece, but underpromoting to a knight (or, rarely, a rook or bishop) is occasionally the better tactical choice.",
        ],
      },
    ],
  },
  {
    slug: 'check-checkmate-stalemate',
    name: 'Check, Checkmate & Stalemate',
    description: 'Three related but very different outcomes — and one common point of confusion worth clearing up.',
    type: 'illustrated',
    examples: [
      {
        label: 'Check',
        fen: '3k4/8/8/8/8/8/8/Q3K3 w - - 0 1',
        moves: ['Qd1+'],
        startDescription: 'White is about to attack Black\'s king directly.',
        stepExplanations: [
          'A check: this move attacks the enemy king directly. The king isn\'t required to move — check can also be answered by blocking the attack or capturing the checking piece — but a player in check MUST get out of it immediately by one of those three means; no other move is legal until they do.',
        ],
      },
      {
        label: 'Checkmate',
        fen: '6k1/5ppp/8/8/8/8/6K1/R7 w - - 0 1',
        moves: ['Ra8#'],
        startDescription: 'Black\'s own pawns have sealed off every escape square around the king.',
        stepExplanations: [
          "Checkmate: the king is in check, and there is no legal way to escape it — it can't move to a safe square, block the attack, or capture the checking piece. The game ends immediately; whoever delivers checkmate wins.",
        ],
      },
      {
        label: 'Stalemate',
        fen: 'k7/8/8/8/8/8/8/1Q2K3 w - - 0 1',
        moves: ['Qb6'],
        startDescription: 'Black\'s king is confined to the corner, with only a7, b7, and b8 to go to.',
        stepExplanations: [
          "This move traps Black's king completely: a7, b7, and b8 are all covered by the queen, so the king has no legal move. But the king itself is NOT in check right now. When the player to move has no legal moves and their king is not in check, that's stalemate — and stalemate is a DRAW, not a win for the side that trapped the king. This trips up a lot of new players: it's easy to accidentally stalemate an opponent while trying to checkmate them, especially when way ahead in material.",
        ],
      },
    ],
  },
  {
    slug: 'draws',
    name: 'Draws: Repetition, Fifty-Move Rule & Insufficient Material',
    description: 'Not every game ends in a win — these are the three most common ways a game ends level.',
    type: 'illustrated',
    examples: [
      {
        label: 'Repetition',
        fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        moves: ['Nf3', 'Nf6', 'Ng1', 'Ng8'],
        startDescription: 'The starting position — occurrence #1 of what\'s about to become a repeated position.',
        stepExplanations: [
          'White develops a knight.',
          'Black mirrors it.',
          'White retreats the same knight back to its original square.',
          "Black retreats too — and the position is now identical to the very start: same pieces on the same squares, same side to move. That's occurrence #2. If this exact position occurs a third time, with the same player to move each time, either player may claim a draw by threefold repetition — the game doesn't have to be going anywhere for this rule to apply.",
        ],
      },
      {
        label: 'Fifty-Move Rule',
        fen: 'r3k3/8/8/8/8/8/8/R3K3 w - - 99 60',
        moves: ['Rb1'],
        startDescription:
          'Both sides have been shuffling pieces for a while — no pawn has moved and no piece has been captured in 99 half-moves, right at the edge of the fifty-move rule.',
        stepExplanations: [
          "Just a quiet rook move, but it's the 100th half-move without a capture or pawn move — the threshold for the fifty-move rule. From here, either player may claim a draw. FIDE rules also include an automatic 75-move version that ends the game without needing a claim, but the standard fifty-move rule most players mean when they mention it is a claim either player can choose to make, not something that happens on its own.",
        ],
      },
      {
        label: 'Insufficient Material',
        fen: '4k3/8/8/8/4K3/8/8/2B5 w - - 0 1',
        moves: [],
        startDescription:
          "King and bishop versus king. It might look like White has \"more,\" but a lone king and bishop can never force checkmate against a bare king — there simply aren't enough attacking pieces to trap it in a corner. This is called insufficient material, and the game is an automatic draw the moment this material balance is reached, no claim needed — it doesn't matter whose move it is or how the position arose.",
        stepExplanations: [],
      },
    ],
  },
  {
    slug: 'clock-and-timing-rules',
    name: 'Clock & Timing Rules',
    description: 'The clock isn\'t a UI feature bolted onto the game — it\'s a rule, with the same real consequences as any other.',
    type: 'text',
    body: [
      "Most games are played with a time control — a fixed amount of time each player has for the whole game, sometimes with an increment added after every move. In this app, and in most modern tournament chess, the clock isn't a background feature; it's a real rule, with real consequences, exactly like the touch-move rule or the fifty-move rule.",
      "Increment works per move, not as a one-time bonus. In a \"25+10\" time control, both players start with 25 minutes, and 10 seconds are added to a player's clock immediately after they complete each of their own moves — not at the start of the game, and not on the opponent's move. Over a long game, increment is what keeps a game from being decided purely by who pre-moves fastest; it rewards making a move rather than just having time on the board.",
      "If a player's clock reaches zero, they lose on time — immediately, regardless of the position on the board. It doesn't matter if they were completely winning the move before; running out of time ends the game right there.",
      "There is exactly one exception: if the opponent — the player whose clock is still running — has insufficient material to checkmate even with the worst possible play (for example, a lone king, or king and bishop; see Draws in the Rules section for what counts), then the game is a draw instead of a loss for the player who timed out. This is because it would be impossible for the opponent to win the game even with unlimited time, so the rules don't award a win that couldn't have been earned on the board.",
      "Because the clock carries these real consequences, time management is part of the game itself, not separate from it — spending too long on an early move can end up costing far more than a slightly worse position.",
    ],
  },
  {
    slug: 'touch-move-and-illegal-moves',
    name: 'Touch-Move & Illegal Moves',
    description: 'Two conventions from over-the-board tournament play that shape how serious chess is actually played and arbitrated.',
    type: 'text',
    body: [
      "Touch-move is one of the oldest conventions in over-the-board chess: if you deliberately touch one of your own pieces during your turn, you must move it if it has a legal move available. Touch an opponent's piece, and you must capture it if you legally can. The rule exists to stop players from \"trying out\" moves by picking pieces up and putting them back down — once you've touched it, you've committed.",
      "This app enforces legal moves automatically, so touch-move can't really be violated here — you simply can't make an illegal move in the first place, and there's no physical piece to accidentally brush against. But the convention is worth knowing, because it's a real, actively enforced rule in essentially every over-the-board tournament you might play in one day, arbiter and all.",
      "Illegal moves get similar real-world handling: in standard time controls, playing an illegal move (moving into check, castling through check, and so on) typically costs the offending player time on their clock, with an arbiter called over to enforce it and let the opponent adjust their reply — rather than the move simply being disallowed as it is here. Under very fast time controls, a second illegal move can even lose the game outright.",
      "This connects to something you may have noticed elsewhere in this app: Offer Draw and Resign aren't available in the first few moves of a game. That's not just a UI choice — early resignations and draw offers are considered unusual, and sometimes against the spirit of competition, in serious over-the-board play too, which is part of why the app builds in a short delay before either option becomes available.",
    ],
  },
]

export function getRule(slug: string): Rule | undefined {
  return RULES.find((r) => r.slug === slug)
}
