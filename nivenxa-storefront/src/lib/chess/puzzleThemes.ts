// Pure data (no Supabase import) so client components — loading skeletons, the solver — can use theme labels without pulling the server data layer into their bundle.

/** Curated theme set from the puzzle import script — see scripts/import-puzzles.ts. */
export const PUZZLE_THEMES = [
  'fork',
  'pin',
  'skewer',
  'discoveredAttack',
  'hangingPiece',
  'backRankMate',
  'endgame',
  'mateIn1',
  'mateIn2',
  'doubleCheck',
  'deflection',
  'sacrifice',
  'capturingDefender',
  'intermezzo',
  'clearance',
  'attraction',
  'interference',
  'trappedPiece',
] as const
export type PuzzleTheme = (typeof PUZZLE_THEMES)[number]

export const THEME_LABELS: Record<string, string> = {
  fork: 'Forks',
  pin: 'Pins',
  skewer: 'Skewers',
  discoveredAttack: 'Discovered Attacks',
  hangingPiece: 'Hanging Pieces',
  backRankMate: 'Back-Rank Mates',
  endgame: 'Endgames',
  mateIn1: 'Mate in One',
  mateIn2: 'Mate in Two',
  doubleCheck: 'Double Checks',
  deflection: 'Deflection',
  sacrifice: 'Sacrifices',
  capturingDefender: 'Removing the Defender',
  intermezzo: 'In-Between Moves',
  clearance: 'Clearance',
  attraction: 'Decoys',
  interference: 'Interference',
  trappedPiece: 'Trapped Pieces',
}
