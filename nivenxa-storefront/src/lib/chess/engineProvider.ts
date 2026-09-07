import type { EngineMoveOptions } from './types'
import type { Persona } from './personas'

/**
 * Move-request config for EngineProvider.getMove. A persona, when present,
 * drives style-weighted candidate sampling instead of always returning the
 * single best move — see selectPersonaMove in engine.ts.
 */
export interface EngineMoveConfig extends EngineMoveOptions {
  persona?: Persona | null
}

/**
 * The minimal contract any chess engine backend must satisfy to plug into
 * the app — deliberately small. Stockfish-only conveniences that don't
 * generalize across engines (MultiPV-based getTopMoves, UCI "Skill Level",
 * stop()) live on StockfishEngine itself, not here, so that a genuinely
 * different engine (e.g. Leela Chess Zero) only has to implement these four
 * operations to be swappable in — no rewrite of call sites, just a new
 * class plus wiring up which provider gets instantiated.
 */
export interface EngineProvider {
  init(): Promise<void>
  getMove(fen: string, config?: EngineMoveConfig): Promise<string>
  evaluatePosition(fen: string): Promise<number>
  destroy(): void
}
