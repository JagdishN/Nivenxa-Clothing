// ─────────────────────────────────────────────────────────────────────────
// DRAFT CONTENT — first pass, not yet reviewed.
//
// The moves below are standard, well-known opening theory, but all the prose
// (description, bigIdea, whenToPlay, pros, cons, stepExplanations) is a
// first draft written for this feature and has NOT been checked by a
// chess-knowledgeable human. It's written to a deliberately simple reading
// level — one short sentence per idea, no unexplained chess vocabulary
// ("aggressive," "sharp," "solid," "pressure," etc. — either avoided or
// explained in the same sentence), aiming for "a curious 10-year-old could
// follow this read aloud." Please spot-check it for both chess accuracy AND
// tone before treating it as final published content.
//
// WORD RULE — the goal isn't to ban chess vocabulary forever, it's sequencing:
// see it -> understand it -> name it. Explain the mechanism in plain terms
// the child can check against the board FIRST, then name it as a short,
// separate aside — never lead with the term. Compare:
//   "The knight cannot move because the king is behind it." + "This is
//   called a pin." (good — explained, then named)
//   vs. "Black establishes a pin on Nc3." (bad — names before explaining)
//   vs. never naming it at all (also bad — the child never acquires the word)
// The aside goes in `stepReveal` at the move where the idea first appears on
// the board (see Nimzo-Indian's Bb4, or an opening's own identity moment —
// "This is the Ruy Lopez!" — reuses the same field).
//
// Until a word has been taught this way in a *specific* opening, avoid it in
// that opening's summary/bigIdea/whenToPlay/pros/cons/stepExplanations:
//   position, theory, line, variation, tempo, initiative, structure,
//   exchange, trade, development, central control, counterattack,
//   tactical, positional, gambit, pin
// (An opening's own name is exempt — "Gambit" in King's/Queen's Gambit.)
// Prefer instead: centre, attack, protect, move, bring out, make safe,
// pawn, knight, bishop, queen, king, open, space, weak, strong.
// New openings should be written to this rule from the start, not audited
// into it afterward.
//
// stepPrompts / bigIdeaHighlight — added so Practice mode can prompt with
// "Bring out your knight and attack Black's pawn" instead of a generic
// "What should White play?", and so the Big Idea card can point at a real
// square instead of describing one in prose. Both are DERIVED, not
// separately invented: a stepPrompt is that move's own stepExplanations
// entry reworded from a description into an instruction (same chess fact,
// different grammatical mood), and a bigIdeaHighlight reuses whichever move
// already carries the opening's own "look here" stepHighlights entry. This
// keeps new content anchored to prose that's already been written and
// spot-checked, rather than inventing fresh chess claims per opening (see
// the Tactics puzzle rework's real mistakes for why that matters).
// ─────────────────────────────────────────────────────────────────────────

/** How ready a beginner is to take this opening on — drives both the list-page badge and the detail-page tag. */
export type OpeningDifficulty = 'start' | 'next' | 'later'

export const DIFFICULTY_LABEL: Record<OpeningDifficulty, string> = {
  start: 'Start here',
  next: 'Learn next',
  later: 'Learn later',
}

export const DIFFICULTY_EMOJI: Record<OpeningDifficulty, string> = {
  start: '🟢',
  next: '🟡',
  later: '🟠',
}

/** A description, not a recommendation-to-click — used in the detail page's meta row ("🟢 Beginner friendly"), as distinct from DIFFICULTY_LABEL's list-page badge phrasing ("Start here"). */
export const DIFFICULTY_META_LABEL: Record<OpeningDifficulty, string> = {
  start: 'Beginner friendly',
  next: 'Some experience helpful',
  later: 'For confident players',
}

/** SAN moves, in game order — matches the string form chess.js's `.move()` accepts directly. */
export interface Opening {
  slug: string
  name: string
  /** One short, factual line — what each side plays. Shown on the detail page; the board is right there to make the moves concrete. */
  description: string
  /** One short, idea-only line for the list-card — no move notation. What the opening is *about*, not what gets played. */
  summary: string
  moves: string[]
  /** One explanation per move, aligned by index with `moves`. */
  stepExplanations: string[]
  /** Which side this opening is named/played from. */
  playedBy: 'white' | 'black'
  /** Short standalone sentences — one idea per line — explaining the core plan. */
  bigIdea: string[]
  /** Short standalone sentences — one idea per line — on when to choose this opening. */
  whenToPlay: string[]
  /** 2-4 short, plain-language reasons to play it. */
  pros: string[]
  /** 2-4 short, plain-language things to watch out for. */
  cons: string[]
  difficulty: OpeningDifficulty
  /** Extra square to circle on the board per move, aligned by index with `moves` — e.g. the square a piece newly aims at. Optional; most openings don't need one. */
  stepHighlights?: (string | string[] | undefined)[]
  /** [from, to] arrow to draw per move, aligned by index with `moves` — e.g. "this piece puts pressure on this piece." */
  stepArrows?: ([string, string] | undefined)[]
  /** A short "this is the X!" aside per move, aligned by index with `moves` — for the move where this opening's identity actually diverges from a shared prefix (e.g. Italian vs Ruy Lopez both start 1.e4 e5 2.Nf3 Nc6). */
  stepReveal?: (string | undefined)[]
  /** Per-move imperative instruction for the learner's own moves in Practice mode, aligned by index with `moves` — undefined for the opponent's moves (auto-played, never prompted) and for any move not yet authored, which falls back to the generic "What should White play?" prompt. Derived from that move's own stepExplanations entry reworded as an instruction — never a new chess claim. */
  stepPrompts?: (string | undefined)[]
  /** The one moment from `stepHighlights` worth surfacing in the static Big Idea card itself, not just later in the walkthrough — so a line like "points toward f7" isn't left for the learner to infer. `afterMoveIndex` is how many moves to replay (1 = after `moves[0]`) to reach the position; `square` mirrors that move's stepHighlights entry. */
  bigIdeaHighlight?: { afterMoveIndex: number; square: string; note: string }
  /** Short (2-4 word) headline per move, aligned by index with `moves` — the guided-lesson panel's punchy title line ("Take the centre", "Develop the bishop"), distinct from the full-sentence `stepExplanations`. Optional; falls back to the plain move SAN when absent. */
  stepHeadline?: string[]
  /** Contextual "Good to Know" (💡) / "Be Careful" (⚠️) callouts surfaced during the guided lesson at the move they're actually relevant to, instead of as a disconnected list at the bottom of the page — `text` is reused verbatim from `pros`/`cons`, just re-anchored to a moment on the board. */
  moveTips?: { moveIndex: number; icon: '💡' | '⚠️'; text: string }[]
  /** Short standalone sentences shown once the learner reaches the last move — one idea per line, like `bigIdea`. */
  completionSummary?: string[]
}

export const OPENINGS: Opening[] = [
  {
    slug: 'italian-game',
    name: 'Italian Game',
    description: 'White plays e4. Black answers with e5.',
    summary: 'Bring out your pieces quickly and control the centre.',
    moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5'],
    playedBy: 'white',
    bigIdea: ['White brings pieces out fast.', 'White\'s bishop points toward f7.'],
    whenToPlay: ['Try the Italian Game if you are new to chess.', 'It is simple to learn and easy to play.'],
    pros: ['Every move has a clear job.', 'You can make your king safe quickly.', 'You can attack early if Black is careless.'],
    cons: ['Black can defend the attack.', 'Don\'t attack too early with only one piece.'],
    difficulty: 'start',
    stepExplanations: [
      'White moves a pawn to the centre.\nNow the bishop and queen can come out.',
      'Black moves a pawn to the centre too.',
      'White brings out a knight.\nThe knight attacks Black\'s pawn.',
      'Black brings out a knight.\nThe knight protects the pawn.',
      'White brings out the bishop.\nIt looks at the weak pawn near Black\'s king.',
      'Black brings out the bishop.\nIt looks toward White\'s king too.',
    ],
    stepHighlights: [undefined, undefined, undefined, undefined, 'f7', undefined],
    stepReveal: [undefined, undefined, undefined, undefined, 'This is the Italian Game!', undefined],
    stepPrompts: [
      'Move a pawn to the centre. This opens the way for your bishop and queen.',
      undefined,
      'Bring out your knight and attack Black\'s pawn.',
      undefined,
      'Bring out your bishop and aim it at the weak pawn near Black\'s king.',
      undefined,
    ],
    bigIdeaHighlight: { afterMoveIndex: 5, square: 'f7', note: 'f7 is defended only by Black\'s king, so it can become a target early.' },
    stepHeadline: ['Take the centre', 'Black fights back', 'Attack the pawn', 'Defend the pawn', 'Develop the bishop', 'Black develops too'],
    moveTips: [
      { moveIndex: 4, icon: '💡', text: 'You can attack early if Black is careless.' },
      { moveIndex: 5, icon: '⚠️', text: 'Don\'t attack too early with only one piece.' },
    ],
    completionSummary: ['White and Black brought out their pieces quickly.', 'Now both sides are ready to castle.'],
  },
  {
    slug: 'sicilian-defence',
    name: 'Sicilian Defence',
    description: 'White plays e4. Black answers with c5.',
    summary: 'Black uses the c-pawn to fight for the centre.',
    moves: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4'],
    playedBy: 'black',
    bigIdea: ['Black does not copy White.', 'Black moves the c-pawn to c5 and fights for the centre from the side.'],
    whenToPlay: ['Try the Sicilian if you like attacking, exciting games.', 'Play it when White starts with e4.'],
    pros: ['Black can fight back from the start.', 'It can lead to fun, attacking games.'],
    cons: ['White can choose many different moves.', 'Be careful — White may attack quickly.'],
    difficulty: 'later',
    stepExplanations: [
      'White moves a pawn to the centre.',
      'Black moves the c-pawn.\nBlack fights for the centre from the side.',
      'White brings out a knight.\nThe knight gets ready to help in the centre.',
      'Black moves a pawn one step.\nThis helps Black get ready to bring out more pieces.',
      'White moves another pawn to the centre.\nWhite wants to open the centre.',
      'Black\'s pawn takes White\'s pawn.',
      'White\'s knight takes the pawn.\nNow the knight stands in the centre.',
    ],
    stepHighlights: [undefined, 'c5', undefined, undefined, undefined, undefined, undefined],
    stepPrompts: [
      undefined,
      'Move your c-pawn to fight for the centre from the side.',
      undefined,
      'Move a pawn one step to get ready to bring out more pieces.',
      undefined,
      'Capture White\'s pawn.',
      undefined,
    ],
    bigIdeaHighlight: { afterMoveIndex: 2, square: 'c5', note: 'Black fights for the centre from the side instead of copying White\'s e5.' },
    stepHeadline: [
      'Take the centre',
      'Fight from the side',
      'Bring out the knight',
      'Support the centre',
      'Open the centre',
      'Capture the pawn',
      'Recapture in the centre',
    ],
    moveTips: [
      { moveIndex: 1, icon: '💡', text: 'Black can fight back from the start.' },
      { moveIndex: 6, icon: '⚠️', text: 'Be careful — White may attack quickly.' },
    ],
    completionSummary: ['Black played c5 right away, without copying White.', 'That is the heart of the Sicilian Defence.'],
  },
  {
    slug: 'queens-gambit',
    name: "Queen's Gambit",
    description: 'White plays d4. Black answers with d5.',
    summary: 'White offers a pawn to control more of the centre.',
    moves: ['d4', 'd5', 'c4', 'e6', 'Nc3', 'Nf6'],
    playedBy: 'white',
    bigIdea: ['White offers a pawn as bait.', 'If Black takes it, White gets more control of the centre.'],
    whenToPlay: ['Try the Queen\'s Gambit if you want a strong centre.', 'It is a good opening when you are learning chess.'],
    pros: ['White builds a strong centre.', 'White can bring the pieces out easily.'],
    cons: ['Black may take the pawn you offer.', 'Don\'t worry — that is part of the plan.'],
    difficulty: 'next',
    stepExplanations: [
      'White moves a pawn to the centre.',
      'Black moves a pawn to the centre too.',
      'White offers the c-pawn as bait.',
      'Black does not take the pawn.\nBlack protects the centre instead.',
      'White brings out a knight.\nThe knight helps control the centre.',
      'Black brings out a knight too.\nThe knight attacks White\'s pawn.',
    ],
    stepReveal: [undefined, undefined, 'This is the Queen\'s Gambit!', undefined, undefined, undefined],
    stepPrompts: [
      'Move your queen\'s pawn to the centre.',
      undefined,
      'Offer your c-pawn as bait.',
      undefined,
      'Bring out your knight to help control the centre.',
      undefined,
    ],
    bigIdeaHighlight: { afterMoveIndex: 3, square: 'c4', note: 'White\'s c-pawn is offered as bait — if Black takes it, White gets extra control of the centre.' },
    stepHeadline: ['Take the centre', 'Black matches it', 'Offer a pawn', 'Protect the centre', 'Bring out the knight', 'Attack the pawn'],
    moveTips: [
      { moveIndex: 2, icon: '💡', text: 'White builds a strong centre.' },
      { moveIndex: 5, icon: '⚠️', text: 'Black may take the pawn you offer.' },
    ],
  },
  {
    slug: 'french-defence',
    name: 'French Defence',
    description: 'White plays e4. Black answers with e6.',
    summary: 'Black builds a strong wall of pawns.',
    moves: ['e4', 'e6', 'd4', 'd5', 'Nc3', 'Nf6'],
    playedBy: 'black',
    bigIdea: ['Black builds a strong centre with pawns.', 'Black gets ready to fight White\'s pawns.'],
    whenToPlay: ['Try the French Defence if you want a strong way to play as Black.', 'It is a good opening when you like to build your game slowly.'],
    pros: ['Black builds a strong and safe setup.', 'Black fights for the centre with pawns.'],
    cons: ['One bishop may be hard to bring out.', 'Make sure all your pieces get a chance to move.'],
    difficulty: 'next',
    stepExplanations: [
      'White moves a pawn to the centre.',
      'Black moves a pawn one step.\nThis gets d5 ready.',
      'White puts another pawn in the centre.',
      'Black moves a pawn to the centre.\nNow Black fights White\'s pawns.',
      'White brings out a knight.\nThe knight helps protect the centre.',
      'Black brings out a knight.\nThe knight attacks White\'s pawn.',
    ],
    stepHighlights: [undefined, undefined, undefined, 'd5', undefined, undefined],
    stepPrompts: [
      undefined,
      'Move a pawn one step to get d5 ready.',
      undefined,
      'Move a pawn to the centre to fight White\'s pawns.',
      undefined,
      'Bring out your knight and attack White\'s pawn.',
    ],
    bigIdeaHighlight: { afterMoveIndex: 4, square: 'd5', note: 'Black\'s pawn on d5 stands firm in the centre, ready to meet White\'s pawns.' },
    stepHeadline: ['Take the centre', 'Prepare d5', 'Build a bigger centre', 'Challenge the centre', 'Defend the centre', 'Attack the pawn'],
    moveTips: [
      { moveIndex: 3, icon: '💡', text: 'Black fights for the centre with pawns.' },
      { moveIndex: 5, icon: '⚠️', text: 'One bishop may be hard to bring out.' },
    ],
    completionSummary: ['Black played e6 first, then d5.', 'That is the heart of the French Defence.'],
  },
  {
    slug: 'ruy-lopez',
    name: 'Ruy Lopez',
    description: 'White plays e4. Black answers with e5.',
    summary: "White's bishop puts pressure on Black's knight.",
    moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6'],
    playedBy: 'white',
    bigIdea: ['White brings out the bishop and puts pressure on Black\'s knight.', 'That knight helps protect the centre.'],
    whenToPlay: ['Try the Ruy Lopez when you are ready to learn more.', 'It teaches you how to put pressure on Black.'],
    pros: ['White brings pieces out quickly.', 'The bishop puts pressure on Black\'s knight.'],
    cons: ['Black can make the bishop move again.', 'Don\'t rush your attack.'],
    difficulty: 'later',
    stepExplanations: [
      'White moves a pawn to the centre.',
      'Black moves a pawn to the centre too.',
      'White brings out a knight.\nThe knight attacks Black\'s pawn.',
      'Black brings out a knight.\nThe knight protects the pawn.',
      'White brings out the bishop.\nThe bishop puts pressure on Black\'s knight.',
      'Black moves a pawn and attacks the bishop.\nNow the bishop must choose where to go.',
    ],
    stepHighlights: [undefined, undefined, undefined, undefined, 'c6', undefined],
    stepArrows: [undefined, undefined, undefined, undefined, ['b5', 'c6'], undefined],
    stepReveal: [undefined, undefined, undefined, undefined, 'This is the Ruy Lopez!', undefined],
    stepPrompts: [
      'Move a pawn to the centre.',
      undefined,
      'Bring out your knight and attack Black\'s pawn.',
      undefined,
      'Bring out your bishop and put pressure on Black\'s knight.',
      undefined,
    ],
    bigIdeaHighlight: { afterMoveIndex: 5, square: 'c6', note: 'White\'s bishop pressures the knight on c6 — if it ever moves, White might capture there.' },
    stepHeadline: ['Take the centre', 'Black fights back', 'Attack the pawn', 'Defend the pawn', 'Pressure the knight', 'Question the bishop'],
    moveTips: [
      { moveIndex: 4, icon: '💡', text: 'The bishop puts pressure on Black\'s knight.' },
      { moveIndex: 5, icon: '⚠️', text: 'Black can make the bishop move again.' },
    ],
    completionSummary: ['You brought out your pieces and put pressure on Black\'s knight.'],
  },
  {
    slug: 'caro-kann-defence',
    name: 'Caro-Kann Defence',
    description: 'White plays e4. Black answers with c6.',
    summary: 'Black builds a safe, strong setup.',
    moves: ['e4', 'c6', 'd4', 'd5', 'exd5', 'cxd5'],
    playedBy: 'black',
    bigIdea: ['Black gets ready to fight for the centre with d5.', 'Black can bring the bishop out before it gets blocked.'],
    whenToPlay: ['Try the Caro-Kann if you want a safe way to play as Black.', 'It is a good opening when you are learning chess.'],
    pros: ['Black builds a strong and safe setup.', 'Black can bring a bishop out early.'],
    cons: ['White may take the pawn on d5.', 'Be ready to take back.'],
    difficulty: 'start',
    stepExplanations: [
      'White moves a pawn to the centre.',
      'Black moves the c-pawn.\nThis gets d5 ready.',
      'White moves a second pawn to the centre.',
      'Black moves a pawn to the centre.\nNow Black attacks White\'s pawn.',
      'White takes Black\'s pawn.',
      'Black takes back with the c-pawn.\nNow the centre is open.',
    ],
    stepHighlights: [undefined, undefined, undefined, 'd5', undefined, undefined],
    stepPrompts: [
      undefined,
      'Move your c-pawn to get d5 ready.',
      undefined,
      'Move a pawn to the centre and attack White\'s pawn.',
      undefined,
      'Capture back with your c-pawn.',
    ],
    bigIdeaHighlight: { afterMoveIndex: 4, square: 'd5', note: 'Black\'s pawn on d5 meets White\'s pawn head-on in the centre.' },
    stepHeadline: ['Take the centre', 'Prepare d5', 'Build a bigger centre', 'Challenge the centre', 'Capture the pawn', 'Recapture in the centre'],
    moveTips: [
      { moveIndex: 3, icon: '💡', text: 'Black builds a strong and safe setup.' },
      { moveIndex: 4, icon: '⚠️', text: 'White may take the pawn on d5.' },
    ],
    completionSummary: ['Black played c6 first, then d5.', 'That is the heart of the Caro-Kann.'],
  },
  {
    slug: 'kings-indian-defence',
    name: "King's Indian Defence",
    description: 'White plays d4. Black answers with Nf6.',
    summary: 'Black lets White take the centre, then attacks it.',
    moves: ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'e4', 'O-O'],
    playedBy: 'black',
    bigIdea: ['Black lets White build a strong centre.', 'Black brings out pieces and gets ready to fight back.'],
    whenToPlay: ['Try the King\'s Indian if you like attacking as Black.', 'First get your pieces ready, then fight for the centre.'],
    pros: ['Black brings out the pieces quickly.', 'Black can attack the centre later.'],
    cons: ['White gets lots of pawns in the centre.', 'Black should not wait too long to fight back.'],
    difficulty: 'later',
    stepExplanations: [
      'White moves a pawn to the centre.',
      'Black brings out a knight.\nThe knight helps control the centre.',
      'White moves another pawn forward.\nWhite now has more control of the centre.',
      'Black moves a pawn to make room for the bishop.',
      'White brings out a knight.\nWhite builds more control in the centre.',
      'Black brings out the bishop.\nThe bishop looks toward the centre.',
      'White moves a third pawn to the centre.',
      'Black castles.\nThe king is safe now.',
    ],
    stepHighlights: [undefined, undefined, undefined, undefined, undefined, 'g7', undefined, undefined],
    stepPrompts: [
      undefined,
      'Bring out your knight to help control the centre.',
      undefined,
      'Move a pawn to make room for your bishop.',
      undefined,
      'Bring out your bishop so it looks toward the centre.',
      undefined,
      'Castle to make your king safe.',
    ],
    bigIdeaHighlight: { afterMoveIndex: 6, square: 'g7', note: 'Black\'s bishop aims at the centre from the side, ready to strike later.' },
    stepHeadline: [
      'Take the centre',
      'Watch the centre',
      'Expand further',
      'Prepare the bishop',
      'Bring out the knight',
      'Aim at the centre',
      'Claim more space',
      'Make the king safe',
    ],
    moveTips: [
      { moveIndex: 5, icon: '💡', text: 'Black can attack the centre later.' },
      { moveIndex: 7, icon: '⚠️', text: 'Black should not wait too long to fight back.' },
    ],
    completionSummary: ['You let White build the centre while you got your pieces ready.'],
  },
  {
    slug: 'london-system',
    name: 'London System',
    description: 'White plays d4. Black answers with d5.',
    summary: 'White builds a simple and strong setup.',
    moves: ['d4', 'd5', 'Nf3', 'Nf6', 'Bf4', 'e6'],
    playedBy: 'white',
    bigIdea: ['White can use the same simple setup in many games.', 'White brings out the pieces and builds a strong centre.'],
    whenToPlay: ['Try the London System if you want a simple setup as White.', 'It is a good opening when you are learning chess.'],
    pros: ['The setup is easy to remember.', 'White can bring the pieces out safely.'],
    cons: ['Don\'t make the same moves without looking at Black\'s moves.', 'Make sure your king gets safe too.'],
    difficulty: 'start',
    stepExplanations: [
      'White moves a pawn to the centre.',
      'Black moves a pawn to the centre too.',
      'White brings out a knight.\nThe knight helps control the centre.',
      'Black brings out a knight too.',
      'White brings out the bishop.\nThe bishop helps control the centre.',
      'Black moves a pawn and opens the way for a bishop.',
    ],
    stepHighlights: [undefined, undefined, undefined, undefined, 'f4', undefined],
    stepPrompts: [
      'Move your queen\'s pawn to the centre.',
      undefined,
      'Bring out your knight to help control the centre.',
      undefined,
      'Bring out your bishop before your pawns block it in.',
      undefined,
    ],
    bigIdeaHighlight: { afterMoveIndex: 5, square: 'f4', note: 'White\'s bishop comes out to f4 before the pawns can block it in — the key idea of this setup.' },
    stepHeadline: ['Take the centre', 'Black matches it', 'Bring out the knight', 'Black develops too', 'Develop the bishop', 'Prepare development'],
    moveTips: [
      { moveIndex: 4, icon: '💡', text: 'White can bring the pieces out safely.' },
      { moveIndex: 5, icon: '⚠️', text: 'Make sure your king gets safe too.' },
    ],
  },
  {
    slug: 'scandinavian-defence',
    name: 'Scandinavian Defence',
    description: 'White plays e4. Black answers with d5.',
    summary: "Black attacks White's pawn right away.",
    moves: ['e4', 'd5', 'exd5', 'Qxd5', 'Nc3', 'Qa5'],
    playedBy: 'black',
    bigIdea: ['Black lets White capture in the centre, then takes back with the queen.', 'This makes it easy to bring pieces out, but the queen is less safe for a while.'],
    whenToPlay: [
      'Play the Scandinavian if you want a simple plan against e4.',
      'It is a good choice if you do not mind moving your queen early and staying careful.',
    ],
    pros: ['Easy to learn, with a clear plan from move one.', 'Avoids many long lists of exact moves you would need to memorize.'],
    cons: [
      'Bringing the queen out early means White gets to bring out pieces while also attacking it.',
      'Black must be careful — a careless queen move can waste a turn.',
    ],
    difficulty: 'later',
    stepExplanations: [
      'White pushes a pawn two squares to the centre.',
      'Black pushes back right away, challenging White\'s pawn head-on.',
      'White captures Black\'s pawn.',
      'Black takes the pawn back with the queen. The queen is out in the open now.',
      'White brings a knight out. It attacks the queen and forces Black to move it again.',
      'Black moves the queen to a safer square. It still watches e5 and helps Black bring more pieces out.',
    ],
    stepHighlights: [undefined, undefined, undefined, 'd5', undefined, undefined],
    stepPrompts: [
      undefined,
      'Push your pawn to challenge White\'s pawn head-on.',
      undefined,
      'Take back with your queen.',
      undefined,
      'Move your queen to a safer square that still watches e5.',
    ],
    bigIdeaHighlight: { afterMoveIndex: 4, square: 'd5', note: 'Black\'s queen takes back on d5 and comes straight into the open.' },
    stepHeadline: ['Take the centre', 'Challenge right away', 'Capture the pawn', 'Recapture with the queen', 'Attack the queen', 'Move to safety'],
    moveTips: [
      { moveIndex: 1, icon: '💡', text: 'Easy to learn, with a clear plan from move one.' },
      {
        moveIndex: 3,
        icon: '⚠️',
        text: 'Bringing the queen out early means White gets to bring out pieces while also attacking it.',
      },
    ],
  },
  {
    slug: 'english-opening',
    name: 'English Opening',
    description: 'White starts with c4 and fights for the centre from the side.',
    summary: "White uses the c-pawn to control the centre.",
    moves: ['c4', 'e5', 'Nc3', 'Nf6', 'Nf3', 'Nc6'],
    playedBy: 'white',
    bigIdea: ['White moves the c-pawn instead of a centre pawn.', 'The pawn helps White fight for the centre from the side.'],
    whenToPlay: ['Try the English Opening if you want to start with the c-pawn.', 'It is a different way to fight for the centre.'],
    pros: ['White can bring the pieces out safely.', 'White can fight for the centre in different ways.'],
    cons: ['Black may put pawns in the centre.', 'Don\'t let Black take all the centre.'],
    difficulty: 'next',
    stepExplanations: [
      'White moves the c-pawn forward.\nThe pawn helps fight for the centre.',
      'Black puts a pawn in the centre.',
      'White brings out a knight.\nThe knight helps control the centre.',
      'Black brings out a knight too.',
      'White brings out another knight.\nThe knight adds more control in the centre.',
      'Black brings out a knight too.\nThe knight protects the pawn.',
    ],
    stepHighlights: ['c4', undefined, undefined, undefined, undefined, undefined],
    stepReveal: ['This is the English Opening!', undefined, undefined, undefined, undefined, undefined],
    stepPrompts: [
      'Move your c-pawn forward to fight for the centre from the side.',
      undefined,
      'Bring out your knight to help control the centre.',
      undefined,
      'Bring out your other knight for more control in the centre.',
      undefined,
    ],
    bigIdeaHighlight: { afterMoveIndex: 1, square: 'c4', note: 'White\'s pawn on c4 fights for the centre from the side, instead of straight down the centre.' },
    stepHeadline: [
      'Fight from the side',
      'Black takes the centre',
      'Bring out the knight',
      'Black develops too',
      'Bring out the other knight',
      'Black defends the pawn',
    ],
    moveTips: [
      { moveIndex: 0, icon: '💡', text: 'White can fight for the centre in different ways.' },
      { moveIndex: 5, icon: '⚠️', text: 'Black may put pawns in the centre.' },
    ],
    completionSummary: ['You started with c4 and fought for the centre from the side.'],
  },
  {
    slug: 'kings-gambit',
    name: "King's Gambit",
    description: 'White plays e4. Then White offers a pawn with f4.',
    summary: 'White offers a pawn for a faster attack.',
    moves: ['e4', 'e5', 'f4', 'exf4', 'Nf3', 'g5'],
    playedBy: 'white',
    bigIdea: ['White gives away a pawn on purpose.', 'In return, White gets to attack Black\'s king faster.'],
    whenToPlay: [
      'Play the King\'s Gambit if you enjoy fast, risky attacks.',
      'It is a good choice if you do not mind giving up a pawn for a quicker attack.',
    ],
    pros: ['Can lead to a very fast attack on Black\'s king.', 'Surprises opponents who do not know how to defend against it.'],
    cons: ['White is down a pawn if the attack does not work out.', 'Needs careful play, or the extra pawn becomes a real problem for White.'],
    difficulty: 'later',
    stepExplanations: [
      'White pushes a pawn two squares to the centre.',
      'Black answers the same way, in the centre too.',
      'White pushes another pawn forward and offers it to Black. This is called a gambit — White gives up a pawn for a faster attack.',
      'Black takes the pawn. Now White is down a pawn, but gets to attack quickly.',
      'White brings a knight out. It also stops Black from giving a check on h4.',
      'Black pushes a pawn to hold on to the extra pawn on f4.',
    ],
    stepHighlights: [undefined, undefined, 'f4', undefined, undefined, undefined],
    stepPrompts: [
      'Move a pawn to the centre.',
      undefined,
      'Push your f-pawn forward and offer it to Black.',
      undefined,
      'Bring out your knight — it also stops a check on h4.',
      undefined,
    ],
    bigIdeaHighlight: { afterMoveIndex: 3, square: 'f4', note: 'White offers the f-pawn to open lines toward Black\'s king.' },
    stepHeadline: ['Take the centre', 'Black fights back', 'Offer a pawn', 'Black takes the pawn', 'Bring out the knight', 'Hold the extra pawn'],
    moveTips: [
      { moveIndex: 2, icon: '💡', text: 'Can lead to a very fast attack on Black\'s king.' },
      { moveIndex: 5, icon: '⚠️', text: 'White is down a pawn if the attack does not work out.' },
    ],
  },
  {
    slug: 'scotch-game',
    name: 'Scotch Game',
    description: 'White plays e4. Black answers with e5.',
    summary: 'White opens the centre early for a fast, simple game.',
    moves: ['e4', 'e5', 'Nf3', 'Nc6', 'd4', 'exd4'],
    playedBy: 'white',
    bigIdea: ['White moves the d-pawn to the centre early.', 'This opens the centre and gives the pieces more space.'],
    whenToPlay: ['Try the Scotch Game if you like simple, active games.', 'It is easy to understand and fun to play.'],
    pros: ['The centre opens early.', 'Your pieces get more room to move.'],
    cons: ['The centre opens quickly.', 'Watch out for early attacks.'],
    difficulty: 'next',
    stepExplanations: [
      'White pushes a pawn two squares to the centre.',
      'Black answers the same way, in the centre too.',
      'White brings a knight out. It attacks Black\'s pawn on e5.',
      'Black brings a knight out to defend that pawn.',
      'White pushes a second pawn to the centre right away. This opens the centre earlier than most other e4 openings.',
      'Black takes White\'s pawn.\nNow the centre is open.',
    ],
    stepHighlights: [undefined, undefined, undefined, undefined, 'd4', undefined],
    stepPrompts: [
      'Move a pawn to the centre.',
      undefined,
      'Bring out your knight and attack Black\'s pawn on e5.',
      undefined,
      'Push your d-pawn to the centre to open things up early.',
      undefined,
    ],
    bigIdeaHighlight: { afterMoveIndex: 5, square: 'd4', note: 'White\'s second central pawn opens the centre earlier than most other e4 openings.' },
    stepHeadline: ['Take the centre', 'Black fights back', 'Attack the pawn', 'Defend the pawn', 'Open the centre', 'Black takes the pawn'],
    moveTips: [
      { moveIndex: 4, icon: '💡', text: 'Your pieces get more room to move.' },
      { moveIndex: 5, icon: '⚠️', text: 'Watch out for early attacks.' },
    ],
  },
  {
    slug: 'vienna-game',
    name: 'Vienna Game',
    description: 'White plays e4. Black answers with e5.',
    summary: 'White brings out a knight and gets ready to attack.',
    moves: ['e4', 'e5', 'Nc3', 'Nf6', 'f4', 'd5'],
    playedBy: 'white',
    bigIdea: ['White brings out the knight early.', 'White can then get ready to attack.'],
    whenToPlay: ['Try the Vienna Game if you like attacking.', 'It is a fun way to bring your knight out early.'],
    pros: ['White brings out a piece quickly.', 'White can start an attack early.'],
    cons: ['Don\'t attack with only one piece.', 'Black can defend too.'],
    difficulty: 'next',
    stepExplanations: [
      'White moves a pawn to the centre.',
      'Black moves a pawn to the centre too.',
      'White brings out a knight.\nThe knight helps control the centre.',
      'Black brings out a knight and attacks White\'s pawn.',
      'White moves the f-pawn forward to start an attack.',
      'Black fights back in the centre.',
    ],
    stepHighlights: [undefined, undefined, 'c3', undefined, undefined, undefined],
    stepPrompts: [
      'Move a pawn to the centre.',
      undefined,
      'Bring out your knight to help control the centre.',
      undefined,
      'Move your f-pawn forward to start an attack.',
      undefined,
    ],
    bigIdeaHighlight: { afterMoveIndex: 3, square: 'c3', note: 'White\'s knight comes out to c3 early, keeping the f-pawn free to attack later.' },
    stepHeadline: ['Take the centre', 'Black fights back', 'Bring out the knight', 'Attack the pawn', 'Prepare an attack', 'Black strikes back'],
    moveTips: [
      { moveIndex: 2, icon: '💡', text: 'White brings out a piece quickly.' },
      { moveIndex: 5, icon: '⚠️', text: 'Black can defend too.' },
    ],
  },
  {
    slug: 'petrovs-defence',
    name: "Petrov's Defence",
    description: 'White plays e4. Black answers with e5.',
    summary: 'Black attacks back instead of just defending.',
    moves: ['e4', 'e5', 'Nf3', 'Nf6', 'Nxe5', 'd6'],
    playedBy: 'black',
    bigIdea: ['Black does not protect the pawn right away.', 'Black attacks White\'s pawn instead.'],
    whenToPlay: ['Try the Petrov if you want a safe way to play as Black.', 'It is simple to learn and keeps your pieces active.'],
    pros: ['Black brings pieces out quickly.', 'Black can keep the king safe.'],
    cons: ['White may try an early trick.', 'Be careful before taking a pawn.'],
    difficulty: 'next',
    stepExplanations: [
      'White moves a pawn to the centre.',
      'Black moves a pawn to the centre too.',
      'White brings out a knight.\nThe knight attacks Black\'s pawn.',
      'Black brings out a knight.\nBlack attacks White\'s pawn too.',
      'White\'s knight takes Black\'s pawn.',
      'Black moves a pawn and attacks the knight.\nThe knight must move.',
    ],
    stepHighlights: [undefined, undefined, undefined, ['e4', 'e5'], undefined, undefined],
    stepPrompts: [
      undefined,
      'Move a pawn to the centre too.',
      undefined,
      'Bring out your knight and attack White\'s pawn too.',
      undefined,
      'Move a pawn to attack White\'s knight.',
    ],
    bigIdeaHighlight: { afterMoveIndex: 4, square: 'e4', note: 'Black\'s knight attacks White\'s pawn on e4 instead of defending e5 first.' },
    stepHeadline: ['Take the centre', 'Black fights back', 'Attack the pawn', 'Counter-attack instead', 'Capture the pawn', 'Attack the knight'],
    moveTips: [
      { moveIndex: 3, icon: '💡', text: 'Black brings pieces out quickly.' },
      { moveIndex: 5, icon: '⚠️', text: 'Be careful before taking a pawn.' },
    ],
  },
  {
    slug: 'dutch-defence',
    name: 'Dutch Defence',
    description: 'White plays d4. Black answers with f5.',
    summary: "Black moves the f-pawn to fight for the centre.",
    moves: ['d4', 'f5', 'g3', 'Nf6', 'Bg2', 'g6'],
    playedBy: 'black',
    bigIdea: ['Black moves the f-pawn early.', 'This helps Black fight for the centre.'],
    whenToPlay: ['Try the Dutch Defence if you like attacking as Black.', 'Play it when White starts with d4.'],
    pros: ['Black can start an attack early.', 'Black\'s pieces can quickly join the game.'],
    cons: ['Moving the f-pawn can make your king less safe.', 'Be careful if White attacks your king.'],
    difficulty: 'later',
    stepExplanations: [
      'White moves a pawn to the centre.',
      'Black moves the f-pawn forward.\nBlack wants to fight for the centre.',
      'White moves a pawn to make room for the bishop.',
      'Black brings out a knight.\nThe knight helps control the centre.',
      'White brings out the bishop.\nThe bishop looks toward the centre.',
      'Black moves a pawn to make room for the bishop.',
    ],
    stepHighlights: [undefined, 'f5', undefined, undefined, undefined, undefined],
    stepReveal: [undefined, 'This is the Dutch Defence!', undefined, undefined, undefined, undefined],
    stepPrompts: [
      undefined,
      'Move your f-pawn forward to fight for the centre.',
      undefined,
      'Bring out your knight to help control the centre.',
      undefined,
      'Move a pawn to make room for your bishop.',
    ],
    bigIdeaHighlight: { afterMoveIndex: 2, square: 'f5', note: 'Black\'s pawn on f5 fights for the centre from the side, instead of the usual d5.' },
    stepHeadline: ['Take the centre', 'Fight from the side', 'Prepare the bishop', 'Bring out the knight', 'Aim at the centre', 'Prepare the other bishop'],
    moveTips: [
      { moveIndex: 1, icon: '💡', text: 'Black can start an attack early.' },
      { moveIndex: 5, icon: '⚠️', text: 'Moving the f-pawn can make your king less safe.' },
    ],
    completionSummary: ['You used the f-pawn to fight for the centre.'],
  },
  {
    slug: 'nimzo-indian-defence',
    name: 'Nimzo-Indian Defence',
    description: 'White plays d4. Black answers with Nf6.',
    summary: "Black puts pressure on White's knight and the centre.",
    moves: ['d4', 'Nf6', 'c4', 'e6', 'Nc3', 'Bb4'],
    playedBy: 'black',
    bigIdea: ['Black brings out the bishop and attacks White\'s knight.', 'The knight cannot move easily because the king is behind it.'],
    whenToPlay: ['Try the Nimzo-Indian when White plays d4, c4 and Nc3.', 'Black uses pieces to fight for the centre.'],
    pros: ['Black puts pressure on White\'s knight.', 'Black fights the centre with pieces.'],
    cons: ['Be careful before taking the knight.', 'If White does not play Nc3, choose another plan.'],
    difficulty: 'later',
    stepExplanations: [
      'White moves a pawn to the centre.',
      'Black brings out a knight.\nThe knight helps control the centre.',
      'White moves another pawn forward.\nWhite wants more control of the centre.',
      'Black moves a pawn one step.\nThis makes room for the bishop.',
      'White brings out a knight.\nThe knight helps White in the centre.',
      'Black brings out the bishop.\nThe knight cannot move easily because the king is behind it.',
    ],
    stepHighlights: [undefined, undefined, undefined, undefined, undefined, 'c3'],
    stepReveal: [undefined, undefined, undefined, undefined, undefined, 'This is called a pin.'],
    stepPrompts: [
      undefined,
      'Bring out your knight to help control the centre.',
      undefined,
      'Move a pawn one step to make room for your bishop.',
      undefined,
      'Bring out your bishop and attack White\'s knight — the king is right behind it, so the knight can\'t easily move away.',
    ],
    bigIdeaHighlight: { afterMoveIndex: 6, square: 'c3', note: 'White\'s knight can\'t move easily — its own king is right behind it.' },
    stepHeadline: ['Take the centre', 'Watch the centre', 'Expand further', 'Prepare development', 'Bring out the knight', 'Attack the knight'],
    moveTips: [
      { moveIndex: 5, icon: '💡', text: 'Black puts pressure on White\'s knight.' },
      { moveIndex: 5, icon: '⚠️', text: 'Be careful before taking the knight.' },
    ],
    completionSummary: ['You used your bishop to pin White\'s knight.'],
  },
]

export function getOpening(slug: string): Opening | undefined {
  return OPENINGS.find((o) => o.slug === slug)
}

// "the Italian Game" reads naturally; "the Petrov's Defence" doesn't — a name
// already built around a personal possessive ("X's Defence") stands on its
// own, so prepending "the" doubles the determiner. Royal-title possessives
// ("King's Gambit", "Queen's Gambit") are conventional fixed phrases and
// still take "the".
export function withArticle(name: string): string {
  if (/^(King's|Queen's)\b/i.test(name)) return `the ${name}`
  if (/^\w+'s\b/.test(name)) return name
  return `the ${name}`
}

// ─────────────────────────────────────────────────────────────────────────
// Categories for the openings list page — a browsing aid, not a strict
// taxonomy, grouped by the actual moves played (1.e4 e5, 1.e4 other, 1.d4,
// 1.c4). Overlap between groups is intentional, not a bug. The list page's
// own "New to openings?" recommend strip is derived live from each
// opening's `difficulty` instead of a fixed slug list here — a fixed list
// (the old "Start Here" category) is exactly what let Queen's Gambit get
// recommended as a beginner pick while its own card said "🟡 Learn next".
//
// Within each group, openingSlugs is ordered start -> next -> later on
// purpose: the reading order itself teaches "learn this first, then this,
// then this" without needing to say so — so keep new entries sorted by
// difficulty when adding to a group, don't just append.
// ─────────────────────────────────────────────────────────────────────────
export interface OpeningCategory {
  slug: string
  /** Real chess-family naming ("Open Games", "Queen's Pawn Openings"), not a literal "White plays X" description. */
  title: string
  /** One short, plain-language line under the title — what both sides are actually doing, before any notation appears. */
  intro: string
  /** The real move notation for this family, shown right under `intro` — e.g. "1. e4 e5" — the bridge from the plain-language line to actual chess notation. */
  notation: string
  openingSlugs: string[]
}

export const OPENING_CATEGORIES: OpeningCategory[] = [
  {
    slug: 'e4-e5',
    title: 'Open Games',
    intro: "Both sides move their king's pawn.",
    notation: '1. e4 e5',
    openingSlugs: ['italian-game', 'scotch-game', 'vienna-game', 'petrovs-defence', 'ruy-lopez', 'kings-gambit'],
  },
  {
    slug: 'e4-other',
    title: 'Other Defences to e4',
    intro: 'Black chooses a different way to fight for the centre.',
    notation: '1. e4 …',
    openingSlugs: ['caro-kann-defence', 'french-defence', 'sicilian-defence', 'scandinavian-defence'],
  },
  {
    slug: 'd4',
    title: "Queen's Pawn Openings",
    intro: 'White starts with the queen’s pawn.',
    notation: '1. d4',
    openingSlugs: ['london-system', 'queens-gambit', 'kings-indian-defence', 'nimzo-indian-defence', 'dutch-defence'],
  },
  {
    slug: 'c4',
    title: 'Flank Openings',
    intro: 'White fights for the centre from the side.',
    notation: '1. c4',
    openingSlugs: ['english-opening'],
  },
]

// The "next opening" a learner is pointed to after finishing one — the same
// order the list page reads in (category by category, start -> next -> later
// within each). Built once from OPENING_CATEGORIES rather than hand-maintained,
// so it can't drift out of sync with the list page.
const LEARNING_PATH: string[] = (() => {
  const seen = new Set<string>()
  const path: string[] = []
  for (const category of OPENING_CATEGORIES) {
    for (const slug of category.openingSlugs) {
      if (!seen.has(slug)) {
        seen.add(slug)
        path.push(slug)
      }
    }
  }
  return path
})()

/** The opening that follows `slug` in the learning path — undefined at the end of the path or for an unknown slug. */
export function getNextOpeningInPath(slug: string): Opening | undefined {
  const index = LEARNING_PATH.indexOf(slug)
  if (index === -1 || index === LEARNING_PATH.length - 1) return undefined
  return getOpening(LEARNING_PATH[index + 1])
}
