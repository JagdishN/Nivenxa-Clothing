import type { SkillTier } from './skillTiers'

// Every Analysis input method (paste, PGN upload, manual entry, image/PDF
// OCR, a finished Nivenxa Play game) converges on this one shape before it
// ever reaches the Visual Analysis Player — the Player never knows or cares
// how a game arrived. Deliberately carries moves + metadata only, never
// classification or AI text: the Player always runs its own full Stockfish
// pass on both colors regardless of source, so grading stays uniform even
// for a Play game whose engine moves were never graded live at lower tiers.
export type GameSource = 'paste' | 'pgn-upload' | 'manual' | 'image-ocr' | 'pdf-ocr' | 'nivenxa-play'

export type MoveResolutionStatus = 'confirmed' | 'needs-review'

export interface NormalizedMove {
  ply: number
  color: 'w' | 'b'
  san: string
  fenBefore: string
  fenAfter: string
  resolutionStatus: MoveResolutionStatus
  /** image-ocr/pdf-ocr only — the model's own confidence in this transcription. */
  ocrConfidence?: 'high' | 'low'
  /**
   * The original, unresolved guess — either OCR's raw transcribed text, or
   * the token from a pasted move list that failed to parse. Same field for
   * both, deliberately: Verify Game renders one uncertain-move UI regardless
   * of which input method produced the uncertainty.
   */
  rawGuess?: string
}

export interface NormalizedGameMetadata {
  white?: string
  black?: string
  event?: string
  playedOn?: string
  result?: '1-0' | '0-1' | '1/2-1/2' | '*'
  /** Carried from a Nivenxa Play handoff — seeds the Player's level/depth selector. */
  suggestedTier?: SkillTier
}

export interface NormalizedGame {
  source: GameSource
  metadata: NormalizedGameMetadata
  /** undefined = standard starting position. */
  startingFen?: string
  moves: NormalizedMove[]
  /** True iff any move still has resolutionStatus 'needs-review'. */
  needsVerification: boolean
}

export function gameNeedsVerification(moves: NormalizedMove[]): boolean {
  return moves.some((m) => m.resolutionStatus === 'needs-review')
}
