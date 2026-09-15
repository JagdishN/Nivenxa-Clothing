'use client'
import { useEffect, useRef, useState } from 'react'
import { useStockfish } from './useStockfish'
import { classifyMove } from './moveClassification'
import { uciToSan, sanToUci } from './uci'
import { evaluationToCp } from './engineEval'
import type { NormalizedGame } from './analysisTypes'
import type { QualityMoveEntry } from './types'

// Same tuning as useMoveAnalysis.ts's live/review pipeline — Analysis has no
// live-play latency pressure, so these could go higher, but starting from
// the same proven values keeps behavior predictable across the app.
const ANALYSIS_MOVETIME = 500
const ANALYSIS_DEPTH = 14

export interface UseGameAnalysisResult {
  /** Populated incrementally, in ply order, as the batch pass completes each move — the Player can render partial results while grading continues. */
  entries: QualityMoveEntry[]
  /** 0..1 — moves graded so far / total confirmed moves. */
  progress: number
  /** Whether this hook's own Stockfish instance has finished loading (distinct from `progress` — grading can't start until this is true). */
  ready: boolean
  error: string | null
}

/**
 * Runs a full Stockfish pass over every confirmed move in a NormalizedGame,
 * both colors, uniformly — unlike Play's useMoveAnalysis, which skips
 * grading the engine's own moves at Beginner/Intermediate. Analysis always
 * re-grades from scratch regardless of source, so every game gets the same
 * treatment whether it came from Play, a paste, or an upload.
 *
 * Owns its own Stockfish Worker instance (via useStockfish), kept separate
 * from any instance a sibling "Try It Yourself" practice hook might own on
 * the same page — the underlying engine is non-reentrant (one `go` in
 * flight at a time per instance), so batch grading and live practice
 * queries can never share one.
 */
export function useGameAnalysis(game: NormalizedGame | null): UseGameAnalysisResult {
  const { ready, error, getTopMoves, evaluatePosition } = useStockfish()
  const [entries, setEntries] = useState<QualityMoveEntry[]>([])
  const [progress, setProgress] = useState(0)
  // Bumped whenever the pass should abandon its in-flight work — a new game
  // loaded, or this component unmounting mid-pass — so stale async results
  // from a previous game/unmount never land in state.
  const generationRef = useRef(0)

  useEffect(() => {
    const generation = ++generationRef.current
    setEntries([])
    setProgress(0)

    if (!game || !ready) return
    const moves = game.moves.filter((m) => m.resolutionStatus === 'confirmed')
    if (moves.length === 0) return

    let cancelled = false

    ;(async () => {
      const results: QualityMoveEntry[] = []
      for (let i = 0; i < moves.length; i++) {
        if (cancelled || generation !== generationRef.current) return
        const move = moves[i]
        try {
          const [topMoves, evalAfterRaw] = await Promise.all([
            getTopMoves(move.fenBefore, 1, { movetime: ANALYSIS_MOVETIME }),
            evaluatePosition(move.fenAfter, ANALYSIS_DEPTH),
          ])
          if (cancelled || generation !== generationRef.current) return

          const best = topMoves[0]
          const evalBeforeCp = best ? evaluationToCp(best.evaluation) : 0
          const evalAfterCp = -evalAfterRaw
          const cpLoss = Math.max(0, evalBeforeCp - evalAfterCp)
          const playedUci = sanToUci(move.fenBefore, move.san)
          const isEngineBest = !!best && !!playedUci && best.move === playedUci
          const classification = classifyMove(cpLoss, isEngineBest)
          const bestMoveUci = best?.move ?? ''
          const bestMoveSan = bestMoveUci ? uciToSan(move.fenBefore, bestMoveUci) : ''

          results.push({
            kind: 'quality',
            ply: move.ply,
            color: move.color,
            san: move.san,
            fenBefore: move.fenBefore,
            fenAfter: move.fenAfter,
            bestMoveUci,
            bestMoveSan,
            evalBeforeCp,
            evalAfterCp,
            cpLoss,
            classification,
            explanation: null,
            explanationStatus: 'idle',
            explanationRevealed: false,
          })

          if (!cancelled && generation === generationRef.current) {
            setEntries([...results])
            setProgress((i + 1) / moves.length)
          }
        } catch {
          // This ply's grading failed (engine hiccup) — skip it rather than
          // aborting the whole pass; the Player treats a ply with no entry
          // as ungraded (no pause, no explanation) instead of crashing.
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [game, ready, getTopMoves, evaluatePosition])

  return { entries, progress, ready, error }
}
