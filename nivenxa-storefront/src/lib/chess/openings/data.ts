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
// Prefer instead: middle, attack, protect, move, bring out, make safe,
// pawn, knight, bishop, queen, king, open, space, weak, strong.
// New openings should be written to this rule from the start, not audited
// into it afterward.
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
  /** Short standalone sentences shown once the learner reaches the last move — one idea per line, like `bigIdea`. */
  completionSummary?: string[]
}

export const OPENINGS: Opening[] = [
  {
    slug: 'italian-game',
    name: 'Italian Game',
    description: 'White plays e4. Black answers with e5.',
    summary: 'Bring out your pieces fast and attack the middle.',
    moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5'],
    playedBy: 'white',
    bigIdea: ['White brings pieces out fast.', 'White\'s bishop looks at a weak spot near Black\'s king.'],
    whenToPlay: ['Try the Italian Game if you are new to chess.', 'It is simple to learn and easy to play.'],
    pros: ['Every move has a clear job.', 'You can make your king safe quickly.', 'You can attack early if Black is careless.'],
    cons: ['Black can defend the attack.', 'Don\'t attack too early with only one piece.'],
    difficulty: 'start',
    stepExplanations: [
      'White moves a pawn to the middle.\nNow the bishop and queen can come out.',
      'Black moves a pawn to the middle too.',
      'White brings out a knight.\nThe knight attacks Black\'s pawn.',
      'Black brings out a knight.\nThe knight protects the pawn.',
      'White brings out the bishop.\nIt looks at the weak pawn near Black\'s king.',
      'Black brings out the bishop.\nIt looks toward White\'s king too.',
    ],
    stepHighlights: [undefined, undefined, undefined, undefined, 'f7', undefined],
    stepReveal: [undefined, undefined, undefined, undefined, 'This is the Italian Game!', undefined],
    completionSummary: ['White and Black brought out their pieces quickly.', 'Now both sides are ready to castle.'],
  },
  {
    slug: 'sicilian-defence',
    name: 'Sicilian Defence',
    description: 'White plays e4. Black answers with c5.',
    summary: 'Black uses the c-pawn to fight for the middle.',
    moves: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4'],
    playedBy: 'black',
    bigIdea: ['Black does not copy White.', 'Black moves the c-pawn to c5 and fights for the middle from the side.'],
    whenToPlay: ['Try the Sicilian if you like attacking, exciting games.', 'Play it when White starts with e4.'],
    pros: ['Black can fight back from the start.', 'It can lead to fun, attacking games.'],
    cons: ['White can choose many different moves.', 'Be careful — White may attack quickly.'],
    difficulty: 'later',
    stepExplanations: [
      'White moves a pawn to the middle.',
      'Black moves the c-pawn.\nBlack fights for the middle from the side.',
      'White brings out a knight.\nThe knight gets ready to help in the middle.',
      'Black moves a pawn one step.\nThis helps Black get ready to bring out more pieces.',
      'White moves another pawn to the middle.\nWhite wants to open the middle.',
      'Black\'s pawn takes White\'s pawn.',
      'White\'s knight takes the pawn.\nNow the knight stands in the middle.',
    ],
    stepHighlights: [undefined, 'c5', undefined, undefined, undefined, undefined, undefined],
    completionSummary: ['Black played c5 right away, without copying White.', 'That is the heart of the Sicilian Defence.'],
  },
  {
    slug: 'queens-gambit',
    name: "Queen's Gambit",
    description: 'White plays d4. Black answers with d5.',
    summary: 'White offers a pawn to control more of the middle.',
    moves: ['d4', 'd5', 'c4', 'e6', 'Nc3', 'Nf6'],
    playedBy: 'white',
    bigIdea: ['White offers a pawn as bait.', 'If Black takes it, White gets more control of the middle.'],
    whenToPlay: ['Try the Queen\'s Gambit if you want a strong middle.', 'It is a good opening when you are learning chess.'],
    pros: ['White builds a strong middle.', 'White can bring the pieces out easily.'],
    cons: ['Black may take the pawn you offer.', 'Don\'t worry — that is part of the plan.'],
    difficulty: 'next',
    stepExplanations: [
      'White moves a pawn to the middle.',
      'Black moves a pawn to the middle too.',
      'White offers the c-pawn as bait.',
      'Black does not take the pawn.\nBlack protects the middle instead.',
      'White brings out a knight.\nThe knight helps control the middle.',
      'Black brings out a knight too.\nThe knight attacks White\'s pawn.',
    ],
    stepReveal: [undefined, undefined, 'This is the Queen\'s Gambit!', undefined, undefined, undefined],
  },
  {
    slug: 'french-defence',
    name: 'French Defence',
    description: 'White plays e4. Black answers with e6.',
    summary: 'Black builds a strong wall of pawns.',
    moves: ['e4', 'e6', 'd4', 'd5', 'Nc3', 'Nf6'],
    playedBy: 'black',
    bigIdea: ['Black builds a strong middle with pawns.', 'Black gets ready to fight White\'s pawns.'],
    whenToPlay: ['Try the French Defence if you want a strong way to play as Black.', 'It is a good opening when you like to build your game slowly.'],
    pros: ['Black builds a strong and safe setup.', 'Black fights for the middle with pawns.'],
    cons: ['One bishop may be hard to bring out.', 'Make sure all your pieces get a chance to move.'],
    difficulty: 'next',
    stepExplanations: [
      'White moves a pawn to the middle.',
      'Black moves a pawn one step.\nThis gets d5 ready.',
      'White puts another pawn in the middle.',
      'Black moves a pawn to the middle.\nNow Black fights White\'s pawns.',
      'White brings out a knight.\nThe knight helps protect the middle.',
      'Black brings out a knight.\nThe knight attacks White\'s pawn.',
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
    bigIdea: ['White brings out the bishop and puts pressure on Black\'s knight.', 'That knight helps protect the middle.'],
    whenToPlay: ['Try the Ruy Lopez when you are ready to learn more.', 'It teaches you how to put pressure on Black.'],
    pros: ['White brings pieces out quickly.', 'The bishop puts pressure on Black\'s knight.'],
    cons: ['Black can make the bishop move again.', 'Don\'t rush your attack.'],
    difficulty: 'later',
    stepExplanations: [
      'White moves a pawn to the middle.',
      'Black moves a pawn to the middle too.',
      'White brings out a knight.\nThe knight attacks Black\'s pawn.',
      'Black brings out a knight.\nThe knight protects the pawn.',
      'White brings out the bishop.\nThe bishop puts pressure on Black\'s knight.',
      'Black moves a pawn and attacks the bishop.\nNow the bishop must choose where to go.',
    ],
    stepArrows: [undefined, undefined, undefined, undefined, ['b5', 'c6'], undefined],
    stepReveal: [undefined, undefined, undefined, undefined, 'This is the Ruy Lopez!', undefined],
    completionSummary: ['You brought out your pieces and put pressure on Black\'s knight.'],
  },
  {
    slug: 'caro-kann-defence',
    name: 'Caro-Kann Defence',
    description: 'White plays e4. Black answers with c6.',
    summary: 'Black builds a safe, strong setup.',
    moves: ['e4', 'c6', 'd4', 'd5', 'exd5', 'cxd5'],
    playedBy: 'black',
    bigIdea: ['Black gets ready to fight for the middle with d5.', 'Black can bring the bishop out before it gets blocked.'],
    whenToPlay: ['Try the Caro-Kann if you want a safe way to play as Black.', 'It is a good opening when you are learning chess.'],
    pros: ['Black builds a strong and safe setup.', 'Black can bring a bishop out early.'],
    cons: ['White may take the pawn on d5.', 'Be ready to take back.'],
    difficulty: 'start',
    stepExplanations: [
      'White moves a pawn to the middle.',
      'Black moves the c-pawn.\nThis gets d5 ready.',
      'White moves a second pawn to the middle.',
      'Black moves a pawn to the middle.\nNow Black attacks White\'s pawn.',
      'White takes Black\'s pawn.',
      'Black takes back with the c-pawn.\nNow the middle is open.',
    ],
    completionSummary: ['Black played c6 first, then d5.', 'That is the heart of the Caro-Kann.'],
  },
  {
    slug: 'kings-indian-defence',
    name: "King's Indian Defence",
    description: 'White plays d4. Black answers with Nf6.',
    summary: 'Black lets White take the middle, then attacks it.',
    moves: ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'e4', 'O-O'],
    playedBy: 'black',
    bigIdea: ['Black lets White build a strong middle.', 'Black brings out pieces and gets ready to fight back.'],
    whenToPlay: ['Try the King\'s Indian if you like attacking as Black.', 'First get your pieces ready, then fight for the middle.'],
    pros: ['Black brings out the pieces quickly.', 'Black can attack the middle later.'],
    cons: ['White gets lots of pawns in the middle.', 'Black should not wait too long to fight back.'],
    difficulty: 'later',
    stepExplanations: [
      'White moves a pawn to the middle.',
      'Black brings out a knight.\nThe knight helps control the middle.',
      'White moves another pawn forward.\nWhite now has more control of the middle.',
      'Black moves a pawn to make room for the bishop.',
      'White brings out a knight.\nWhite builds more control in the middle.',
      'Black brings out the bishop.\nThe bishop looks toward the middle.',
      'White moves a third pawn to the middle.',
      'Black castles.\nThe king is safe now.',
    ],
    completionSummary: ['You let White build the middle while you got your pieces ready.'],
  },
  {
    slug: 'london-system',
    name: 'London System',
    description: 'White plays d4. Black answers with d5.',
    summary: 'White builds a simple and strong setup.',
    moves: ['d4', 'd5', 'Nf3', 'Nf6', 'Bf4', 'e6'],
    playedBy: 'white',
    bigIdea: ['White can use the same simple setup in many games.', 'White brings out the pieces and builds a strong middle.'],
    whenToPlay: ['Try the London System if you want a simple setup as White.', 'It is a good opening when you are learning chess.'],
    pros: ['The setup is easy to remember.', 'White can bring the pieces out safely.'],
    cons: ['Don\'t make the same moves without looking at Black\'s moves.', 'Make sure your king gets safe too.'],
    difficulty: 'start',
    stepExplanations: [
      'White moves a pawn to the middle.',
      'Black moves a pawn to the middle too.',
      'White brings out a knight.\nThe knight helps control the middle.',
      'Black brings out a knight too.',
      'White brings out the bishop.\nThe bishop helps control the middle.',
      'Black moves a pawn and opens the way for a bishop.',
    ],
  },
  {
    slug: 'scandinavian-defence',
    name: 'Scandinavian Defence',
    description: 'White plays e4. Black answers with d5.',
    summary: "Black attacks White's pawn right away.",
    moves: ['e4', 'd5', 'exd5', 'Qxd5', 'Nc3', 'Qa5'],
    playedBy: 'black',
    bigIdea: ['Black lets White capture in the middle, then takes back with the queen.', 'This makes it easy to bring pieces out, but the queen is less safe for a while.'],
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
      'White pushes a pawn two squares to the middle.',
      'Black pushes back right away, challenging White\'s pawn head-on.',
      'White captures Black\'s pawn.',
      'Black takes the pawn back with the queen. The queen is out in the open now.',
      'White brings a knight out. It attacks the queen and forces Black to move it again.',
      'Black moves the queen to a safer square. It still watches e5 and helps Black bring more pieces out.',
    ],
  },
  {
    slug: 'english-opening',
    name: 'English Opening',
    description: 'White starts with c4 and fights for the middle from the side.',
    summary: "White uses the c-pawn to control the middle.",
    moves: ['c4', 'e5', 'Nc3', 'Nf6', 'Nf3', 'Nc6'],
    playedBy: 'white',
    bigIdea: ['White moves the c-pawn instead of a middle pawn.', 'The pawn helps White fight for the middle from the side.'],
    whenToPlay: ['Try the English Opening if you want to start with the c-pawn.', 'It is a different way to fight for the middle.'],
    pros: ['White can bring the pieces out safely.', 'White can fight for the middle in different ways.'],
    cons: ['Black may put pawns in the middle.', 'Don\'t let Black take all the middle.'],
    difficulty: 'next',
    stepExplanations: [
      'White moves the c-pawn forward.\nThe pawn helps fight for the middle.',
      'Black puts a pawn in the middle.',
      'White brings out a knight.\nThe knight helps control the middle.',
      'Black brings out a knight too.',
      'White brings out another knight.\nThe knight adds more control in the middle.',
      'Black brings out a knight too.\nThe knight protects the pawn.',
    ],
    stepReveal: ['This is the English Opening!', undefined, undefined, undefined, undefined, undefined],
    completionSummary: ['You started with c4 and fought for the middle from the side.'],
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
      'White pushes a pawn two squares to the middle.',
      'Black answers the same way, in the middle too.',
      'White pushes another pawn forward and offers it to Black. This is called a gambit — White gives up a pawn for a faster attack.',
      'Black takes the pawn. Now White is down a pawn, but gets to attack quickly.',
      'White brings a knight out. It also stops Black from giving a check on h4.',
      'Black pushes a pawn to hold on to the extra pawn on f4.',
    ],
  },
  {
    slug: 'scotch-game',
    name: 'Scotch Game',
    description: 'White plays e4. Black answers with e5.',
    summary: 'White opens the middle early for a fast, simple game.',
    moves: ['e4', 'e5', 'Nf3', 'Nc6', 'd4', 'exd4'],
    playedBy: 'white',
    bigIdea: ['White moves the d-pawn to the middle early.', 'This opens the middle and gives the pieces more space.'],
    whenToPlay: ['Try the Scotch Game if you like simple, active games.', 'It is easy to understand and fun to play.'],
    pros: ['The middle opens early.', 'Your pieces get more room to move.'],
    cons: ['The middle opens quickly.', 'Watch out for early attacks.'],
    difficulty: 'next',
    stepExplanations: [
      'White pushes a pawn two squares to the middle.',
      'Black answers the same way, in the middle too.',
      'White brings a knight out. It attacks Black\'s pawn on e5.',
      'Black brings a knight out to defend that pawn.',
      'White pushes a second pawn to the middle right away. This opens the middle earlier than most other e4 openings.',
      'Black takes White\'s pawn.\nNow the middle is open.',
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
      'White moves a pawn to the middle.',
      'Black moves a pawn to the middle too.',
      'White brings out a knight.\nThe knight helps control the middle.',
      'Black brings out a knight and attacks White\'s pawn.',
      'White moves the f-pawn forward to start an attack.',
      'Black fights back in the middle.',
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
      'White moves a pawn to the middle.',
      'Black moves a pawn to the middle too.',
      'White brings out a knight.\nThe knight attacks Black\'s pawn.',
      'Black brings out a knight.\nBlack attacks White\'s pawn too.',
      'White\'s knight takes Black\'s pawn.',
      'Black moves a pawn and attacks the knight.\nThe knight must move.',
    ],
    stepHighlights: [undefined, undefined, undefined, ['e4', 'e5'], undefined, undefined],
  },
  {
    slug: 'dutch-defence',
    name: 'Dutch Defence',
    description: 'White plays d4. Black answers with f5.',
    summary: "Black moves the f-pawn to fight for the middle.",
    moves: ['d4', 'f5', 'g3', 'Nf6', 'Bg2', 'g6'],
    playedBy: 'black',
    bigIdea: ['Black moves the f-pawn early.', 'This helps Black fight for the middle.'],
    whenToPlay: ['Try the Dutch Defence if you like attacking as Black.', 'Play it when White starts with d4.'],
    pros: ['Black can start an attack early.', 'Black\'s pieces can quickly join the game.'],
    cons: ['Moving the f-pawn can make your king less safe.', 'Be careful if White attacks your king.'],
    difficulty: 'later',
    stepExplanations: [
      'White moves a pawn to the middle.',
      'Black moves the f-pawn forward.\nBlack wants to fight for the middle.',
      'White moves a pawn to make room for the bishop.',
      'Black brings out a knight.\nThe knight helps control the middle.',
      'White brings out the bishop.\nThe bishop looks toward the middle.',
      'Black moves a pawn to make room for the bishop.',
    ],
    stepReveal: [undefined, 'This is the Dutch Defence!', undefined, undefined, undefined, undefined],
    completionSummary: ['You used the f-pawn to fight for the middle.'],
  },
  {
    slug: 'nimzo-indian-defence',
    name: 'Nimzo-Indian Defence',
    description: 'White plays d4. Black answers with Nf6.',
    summary: "Black puts pressure on White's knight and the middle.",
    moves: ['d4', 'Nf6', 'c4', 'e6', 'Nc3', 'Bb4'],
    playedBy: 'black',
    bigIdea: ['Black brings out the bishop and attacks White\'s knight.', 'The knight cannot move easily because the king is behind it.'],
    whenToPlay: ['Try the Nimzo-Indian when White plays d4, c4 and Nc3.', 'Black uses pieces to fight for the middle.'],
    pros: ['Black puts pressure on White\'s knight.', 'Black fights the middle with pieces.'],
    cons: ['Be careful before taking the knight.', 'If White does not play Nc3, choose another plan.'],
    difficulty: 'later',
    stepExplanations: [
      'White moves a pawn to the middle.',
      'Black brings out a knight.\nThe knight helps control the middle.',
      'White moves another pawn forward.\nWhite wants more control of the middle.',
      'Black moves a pawn one step.\nThis makes room for the bishop.',
      'White brings out a knight.\nThe knight helps White in the middle.',
      'Black brings out the bishop.\nThe knight cannot move easily because the king is behind it.',
    ],
    stepReveal: [undefined, undefined, undefined, undefined, undefined, 'This is called a pin.'],
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
// taxonomy. "Start Here" is a recommendation (its four openings also appear
// in their family below, and its pick doesn't have to be the easiest member
// of that family — Queen's Gambit is recommended here but ranks "next"
// within White plays d4, where London is the easier starting point). The
// rest group by the actual moves played (1.e4 e5, 1.e4 other, 1.d4, 1.c4).
// Overlap between groups is intentional, not a bug.
//
// Within each group, openingSlugs is ordered start -> next -> later on
// purpose: the reading order itself teaches "learn this first, then this,
// then this" without needing to say so — so keep new entries sorted by
// difficulty when adding to a group, don't just append.
// ─────────────────────────────────────────────────────────────────────────
export interface OpeningCategory {
  slug: string
  title: string
  openingSlugs: string[]
}

export const OPENING_CATEGORIES: OpeningCategory[] = [
  {
    slug: 'start-here',
    title: 'Start Here',
    openingSlugs: ['italian-game', 'queens-gambit', 'london-system', 'caro-kann-defence'],
  },
  {
    slug: 'e4-e5',
    title: 'White plays e4 · Black plays e5',
    openingSlugs: ['italian-game', 'scotch-game', 'vienna-game', 'petrovs-defence', 'ruy-lopez', 'kings-gambit'],
  },
  {
    slug: 'e4-other',
    title: 'White plays e4 · Black plays something else',
    openingSlugs: ['caro-kann-defence', 'french-defence', 'sicilian-defence', 'scandinavian-defence'],
  },
  {
    slug: 'd4',
    title: 'White plays d4',
    openingSlugs: ['london-system', 'queens-gambit', 'kings-indian-defence', 'nimzo-indian-defence', 'dutch-defence'],
  },
  {
    slug: 'c4',
    title: 'White plays c4',
    openingSlugs: ['english-opening'],
  },
]

// The "next opening" a learner is pointed to after finishing one — the same
// order the list page reads in (category by category, start -> next -> later
// within each), skipping the "Start Here" strip since it's a recommendation,
// not a step in the path. Built once from OPENING_CATEGORIES rather than
// hand-maintained, so it can't drift out of sync with the list page.
const LEARNING_PATH: string[] = (() => {
  const seen = new Set<string>()
  const path: string[] = []
  for (const category of OPENING_CATEGORIES) {
    if (category.slug === 'start-here') continue
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
