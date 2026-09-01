export type TournamentCategory =
  | 'Elite'
  | 'Professional'
  | 'Community'
  | 'Casual'
  | 'Hidden'

export type TournamentDisplayType =
  | 'International'
  | 'State'
  | 'National'
  | 'Club'
  | 'Academy'

export type TournamentLifecycleStatus =
  | 'live'
  | 'upcoming'
  | 'completed'
  | 'cancelled'
  | 'hidden'

export type TournamentSourceName =
  | 'FIDE'
  | 'ChessResults'
  | 'Lichess'
  | 'Chess.com'
  | 'Academy'
  | 'Manual'

export type TournamentLocationMode = 'online' | 'otb' | 'hybrid'

export type TournamentTimeControl =
  | 'Bullet'
  | 'Blitz'
  | 'Rapid'
  | 'Classical'
  | 'Mixed'
  | 'Unknown'

export type TournamentFormat =
  | 'Swiss'
  | 'Round Robin'
  | 'Arena'
  | 'Knockout'
  | 'Team'
  | 'League'
  | 'Unknown'

export interface TournamentPlayerPreview {
  name: string
  title?: string
  rating?: number
  country?: string
}

export interface TournamentPrizePool {
  label: string
  verified: boolean
}

export interface RawTournament {
  externalId: string
  title: string
  sourceName: TournamentSourceName
  sourceUrl: string
  officialUrl?: string
  registrationUrl?: string
  startsAt: string
  endsAt?: string
  country?: string
  venue?: string
  address?: string
  city?: string
  locationMode: TournamentLocationMode
  fideRated?: boolean | null
  timeControl?: string
  format?: string
  tournamentType?: TournamentDisplayType
  organizerName?: string
  organizerVerified?: boolean
  prizePool?: TournamentPrizePool
  topPlayers?: TournamentPlayerPreview[]
  tags?: string[]
}

export interface ChessTournament {
  id: string
  title: string
  category: TournamentCategory
  lifecycleStatus: TournamentLifecycleStatus
  source: {
    name: TournamentSourceName
    url: string
    externalId: string
  }
  links: {
    tournamentUrl: string
    registrationUrl?: string
    mapUrl?: string
  }
  country: string
  tournamentType: TournamentDisplayType
  dates: {
    startsAt: string
    endsAt?: string
  }
  location: {
    mode: TournamentLocationMode
    label: string
    address?: string
  }
  fideRated: boolean | null
  timeControl: TournamentTimeControl
  format: TournamentFormat
  topPlayers: TournamentPlayerPreview[]
  prizePool?: TournamentPrizePool
  organizer: {
    name: string
    verified: boolean
  }
  trust: {
    score: number
    reasons: string[]
  }
}

export interface TournamentGroup {
  status: TournamentLifecycleStatus
  label: string
  tournaments: ChessTournament[]
}

// ─── Engine (Stockfish) types ────────────────────────────────────────────────

/** UCI "Skill Level" — 0 (weakest) to 20 (strongest). */
export type SkillLevel = number

export interface EngineEvaluation {
  type: 'cp' | 'mate'
  value: number
}

export interface EngineTopMove {
  move: string
  evaluation: EngineEvaluation
}

export interface EngineMoveOptions {
  depth?: number
  movetime?: number
}

// ─── Game (chess.js) types ───────────────────────────────────────────────────

export interface ChessGameState {
  fen: string
  turn: 'w' | 'b'
  isCheck: boolean
  isCheckmate: boolean
  isDraw: boolean
  isStalemate: boolean
  /** Distinguishes the reason behind a generic `isDraw` for the post-game result copy. */
  isThreefoldRepetition: boolean
  isInsufficientMaterial: boolean
  isDrawByFiftyMoves: boolean
  isGameOver: boolean
  history: string[]
}

/** The player's color choice at setup — 'random' resolves to 'w'|'b' once a game starts. */
export type ColorChoice = 'w' | 'b' | 'random'

/** What a successful `makeMove` hands back — everything needed to analyze the move afterward. */
export interface MoveResult {
  san: string
  uci: string
  color: 'w' | 'b'
  fenBefore: string
  fenAfter: string
}

// ─── Move analysis / explanation types ───────────────────────────────────────

export type MoveClassification = 'best' | 'excellent' | 'good' | 'inaccuracy' | 'mistake' | 'blunder'

export type ExplanationStatus = 'idle' | 'loading' | 'loaded' | 'error'

export type ExplanationTone = 'simple' | 'technical'

/**
 * How much structure an explanation gets. Not purely a function of tier —
 * Expert is 'minimal' live but 'plain' in post-game Review (see
 * useMoveAnalysis's depthFor, which also considers whether this is a live
 * or review fetch):
 * 'rich'    — Beginner: headline + body + bullets/suggestion + a "Remember" tip.
 * 'brief'   — Intermediate: headline + short body + bullets/suggestion, no tip.
 * 'minimal' — Expert, live only: headline + one short sentence, nothing else.
 * 'plain'   — Master always, Expert in Review: a single free-text paragraph.
 */
export type ExplanationDepth = 'rich' | 'brief' | 'minimal' | 'plain'

/** Structured content for 'rich'/'brief' depths — omitted (all undefined) at 'plain' depth. */
export interface StructuredExplanation {
  /** e.g. "e4 — Good opening move" or "Nivenxa played Nc6". */
  headline?: string
  /** Short list of reasons the move works — omitted when `suggestion` is present instead. */
  bullets?: string[]
  /** A single better-move suggestion, shown instead of `bullets` for a weak move. */
  suggestion?: string
  /** Purpose entries only — "What should you notice?" paragraph. */
  notice?: string
  /** Beginner ('rich') only — a standing tip, unrelated to move quality. */
  remember?: string
}

interface BaseMoveAnalysisEntry extends StructuredExplanation {
  ply: number
  color: 'w' | 'b'
  san: string
  fenBefore: string
  fenAfter: string
  /** Body paragraph at every depth — the whole explanation at 'plain' depth. */
  explanation: string | null
  explanationStatus: ExplanationStatus
}

/** A graded move — player moves always; engine moves only at Expert/Master. */
export interface QualityMoveEntry extends BaseMoveAnalysisEntry {
  kind: 'quality'
  bestMoveUci: string
  bestMoveSan: string
  evalBeforeCp: number
  evalAfterCp: number
  cpLoss: number
  classification: MoveClassification
  /** Whether the stored `explanation` was generated with the best-move alternative revealed. */
  explanationRevealed: boolean
}

/**
 * An ungraded move — engine moves at Beginner/Intermediate, where the engine
 * plays deliberately weak and a quality grade would mislabel that. Explains
 * intent only (what the move develops/threatens/defends), never a verdict.
 */
export interface PurposeMoveEntry extends BaseMoveAnalysisEntry {
  kind: 'purpose'
}

export type MoveAnalysisEntry = QualityMoveEntry | PurposeMoveEntry

export interface ExplainMoveRequestBody {
  fen: string
  move: string
  classification: MoveClassification
  evalBefore: number
  evalAfter: number
  bestMove?: string
  tone?: ExplanationTone
  depth?: ExplanationDepth
}

export interface ExplainMoveResponseBody extends StructuredExplanation {
  explanation: string
}

export interface ExplainEnginePurposeRequestBody {
  fenBefore: string
  move: string
  fenAfter: string
  depth?: ExplanationDepth
}

export interface ExplainEnginePurposeResponseBody extends StructuredExplanation {
  explanation: string
}
