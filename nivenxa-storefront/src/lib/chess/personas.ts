import type { SkillLevel } from './types'

/**
 * How a persona samples among its top-N candidate moves — see
 * selectPersonaMove in engine.ts, the one place this actually gets used.
 *  - 'safe'       — picks the top (engine-best) candidate almost always.
 *  - 'balanced'   — moderate lean toward the top candidate, some spread.
 *  - 'aggressive' — meaningful chance of a lower-ranked but still
 *                   engine-approved candidate, for sharper, less "optimal" play.
 */
export type StyleWeight = 'safe' | 'balanced' | 'aggressive'

export interface Persona {
  slug: string
  name: string
  description: string
  /** Overrides the tier's own strength slider while this persona is active — see play/page.tsx. */
  skillLevel: SkillLevel
  /**
   * Stockfish's classic "Contempt"/"UCI_Contempt" option (roughly: how
   * willing the engine is to play on for a win from an equal position
   * rather than steer toward a draw). Sent best-effort via UCI `setoption`
   * — modern NNUE-era Stockfish (including this app's WASM build) has
   * dropped this option from most builds, and UCI engines silently ignore
   * unrecognized option names, so this is harmless either way. In practice
   * multiPvCandidates + styleWeight are what actually make personas feel
   * different; contempt is a bonus if the build happens to support it.
   */
  contempt: number
  /** How many top candidate moves (via MultiPV) to sample from — 1 = always the engine's best move. */
  multiPvCandidates: number
  /** Which of the sampled candidates styleWeight favors — see selectPersonaMove in engine.ts. */
  styleWeight: StyleWeight
}

export const PERSONAS: Persona[] = [
  {
    slug: 'tactician',
    name: 'The Tactician',
    description: 'Hunts for sharp, unbalanced positions rather than settling for a quiet, equal one.',
    skillLevel: 12,
    contempt: 60,
    multiPvCandidates: 3,
    styleWeight: 'aggressive',
  },
  {
    slug: 'wall',
    name: 'The Wall',
    description: 'Solid and hard to crack — plays the objectively best move almost every time.',
    skillLevel: 12,
    contempt: 0,
    multiPvCandidates: 1,
    styleWeight: 'safe',
  },
  {
    slug: 'gambiteer',
    name: 'The Gambiteer',
    description: 'Leans into sharp, material-for-initiative tries, especially in the opening.',
    skillLevel: 12,
    contempt: 80,
    multiPvCandidates: 3,
    styleWeight: 'aggressive',
    // NOTE: this is still plain Stockfish config underneath (higher contempt
    // + a real chance of a lower-ranked candidate) — it makes Nivenxa more
    // willing to play into sharp, material-imbalanced lines, but Stockfish
    // has no concept of "a gambit" and won't reliably reach for a specific
    // opening repertoire (e.g. actually offering the King's Gambit as
    // White). If this persona's opening play doesn't read as distinctly
    // "gambit-y" in practice, the real fix is a small curated list of
    // gambit opening lines to play from for the first several moves,
    // falling back to engine config afterward — a likely follow-up, not
    // built in this pass.
  },
]

export function getPersona(slug: string | null | undefined): Persona | null {
  if (!slug) return null
  return PERSONAS.find((p) => p.slug === slug) ?? null
}
