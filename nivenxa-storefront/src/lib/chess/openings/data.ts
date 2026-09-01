// ─────────────────────────────────────────────────────────────────────────
// DRAFT CONTENT — first pass, not yet reviewed.
//
// The moves below are standard, well-known opening theory, but the prose
// explanations are a first draft written for this feature and have NOT been
// checked by a chess-knowledgeable human. Please review for accuracy before
// treating this as final published content — opening theory needs to be
// correct, not just plausible-sounding.
// ─────────────────────────────────────────────────────────────────────────

/** SAN moves, in game order — matches the string form chess.js's `.move()` accepts directly. */
export interface Opening {
  slug: string
  name: string
  description: string
  moves: string[]
  /** One explanation per move, aligned by index with `moves`. */
  stepExplanations: string[]
}

export const OPENINGS: Opening[] = [
  {
    slug: 'italian-game',
    name: 'Italian Game',
    description: 'A classical, fast-developing opening that fights for the centre and eyes Black’s weak f7 square.',
    moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5'],
    stepExplanations: [
      'White stakes a claim in the centre and opens lines for the queen and the light-squared bishop.',
      'Black mirrors White, meeting the centre pawn immediately and claiming equal space.',
      'White develops a knight toward the centre, attacking Black’s e5 pawn and preparing to castle.',
      'Black develops a knight to defend e5 and adds a second attacker on the centre.',
      'White’s bishop swings to the Italian diagonal, aiming at Black’s weakest point, f7.',
      'Black develops symmetrically, eyeing f2 and preparing to castle quickly.',
    ],
  },
  {
    slug: 'sicilian-defence',
    name: 'Sicilian Defence',
    description: 'Black’s sharpest reply to 1.e4 — fighting for the centre from the side rather than meeting it head-on.',
    moves: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4'],
    stepExplanations: [
      'White opens with the most direct central advance.',
      'Black avoids symmetry, staking a claim on d4 without occupying it and keeping the position unbalanced.',
      'White develops naturally and prepares to strike the centre with d4.',
      'Black supports a future ...e5 or ...Nf6 without blocking in the dark-squared bishop.',
      'White strikes the centre directly, aiming to open lines and gain space.',
      'Black trades on d4, disrupting White’s centre and gaining a tempo on the knight that recaptures.',
    ],
  },
  {
    slug: 'queens-gambit',
    name: "Queen's Gambit",
    description: 'White offers a wing pawn to gain a freer hand in the centre — rarely accepted for long, but influential either way.',
    moves: ['d4', 'd5', 'c4', 'e6', 'Nc3', 'Nf6'],
    stepExplanations: [
      'White claims the centre with the queen’s pawn, opening the diagonal for the dark-squared bishop.',
      'Black meets White’s pawn directly, contesting the centre square for square.',
      'White offers the c-pawn to lure Black’s d-pawn away from the centre — the "gambit," though it’s rarely kept.',
      'Black declines the gambit, reinforcing d5 and preparing to develop the light-squared bishop.',
      'White develops naturally, adding a second attacker on d5.',
      'Black develops symmetrically, adding a defender to the centre and preparing to castle.',
    ],
  },
  {
    slug: 'french-defence',
    name: 'French Defence',
    description: 'A solid, resilient defence to 1.e4 that accepts a temporarily boxed-in bishop for a sturdy pawn chain.',
    moves: ['e4', 'e6', 'd4', 'd5', 'Nc3', 'Bb4'],
    stepExplanations: [
      'White grabs the centre with the king’s pawn.',
      'Black prepares ...d5 without blocking in the dark-squared bishop, though the light-squared bishop will be temporarily hemmed in.',
      'White builds a full pawn centre.',
      'Black strikes back at White’s centre immediately.',
      'White develops and adds a defender to e4, inviting further central tension.',
      'Black pins the knight against the king, entering the sharp Winawer Variation.',
    ],
  },
  {
    slug: 'ruy-lopez',
    name: 'Ruy Lopez',
    description: 'One of the oldest and most respected openings — White pins Black’s defending knight to the king from the very first moves.',
    moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6'],
    stepExplanations: [
      'White claims the centre with the king’s pawn.',
      'Black meets it symmetrically, claiming equal space.',
      'White develops a knight and attacks Black’s e5 pawn.',
      'Black defends the pawn by developing a knight of their own.',
      'White pins Black’s defending knight against the king — the signature idea of the Ruy Lopez.',
      'Black immediately questions the bishop, the most popular reply, known as the Morphy Defence.',
    ],
  },
  {
    slug: 'caro-kann-defence',
    name: 'Caro-Kann Defence',
    description: 'A solid, slightly passive defence to 1.e4 that avoids the light-squared bishop getting shut in.',
    moves: ['e4', 'c6', 'd4', 'd5', 'Nc3', 'dxe4'],
    stepExplanations: [
      'White stakes a claim in the centre.',
      'Black prepares ...d5 while keeping a path open for the light-squared bishop to develop outside the pawn chain.',
      'White builds a full pawn centre.',
      'Black challenges White’s centre directly.',
      'White defends e4 and develops a piece, inviting Black to resolve the central tension.',
      'Black trades off the central tension; after White recaptures with the knight, Black’s position is solid, if a little passive.',
    ],
  },
]

export function getOpening(slug: string): Opening | undefined {
  return OPENINGS.find((o) => o.slug === slug)
}
