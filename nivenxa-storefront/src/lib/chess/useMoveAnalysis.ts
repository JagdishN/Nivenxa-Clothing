'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Chess } from 'chess.js'
import { useStockfish } from './useStockfish'
import { classifyMove } from './moveClassification'
import type { ExplanationMode, TierConfig } from './skillTiers'
import type {
  EngineEvaluation,
  ExplainEnginePurposeRequestBody,
  ExplainEnginePurposeResponseBody,
  ExplainMoveRequestBody,
  ExplainMoveResponseBody,
  ExplanationDepth,
  ExplanationTone,
  MoveAnalysisEntry,
  MoveResult,
  QualityMoveEntry,
} from './types'

// Beginner gets the full headline/bullets/remember treatment, Intermediate a
// shorter version of the same structure. Expert is the odd one out: a very
// short live one-liner ('minimal') but the original detailed paragraph
// ('plain') once reviewed post-game — `isReview` is `revealBestMove`, which
// is true exactly for the post-game Review fetch and false for the live one
// (see fetchExplanation's two call sites below). Master is always 'plain'
// since it's never shown live at all.
function depthFor(tierId: TierConfig['id'], isReview: boolean): ExplanationDepth {
  if (tierId === 'beginner') return 'rich'
  if (tierId === 'intermediate') return 'brief'
  if (tierId === 'expert') return isReview ? 'plain' : 'minimal'
  return 'plain'
}

// Analysis runs on its own Stockfish instance (see useStockfish() below) so it
// never overlaps the gameplay engine's in-flight `go` command on the same
// Worker — engine.ts assumes one outstanding call at a time per instance.
const ANALYSIS_MOVETIME = 500
const ANALYSIS_DEPTH = 14

export type Mover = 'player' | 'engine'

function evaluationToCp(evaluation: EngineEvaluation): number {
  if (evaluation.type === 'mate') {
    return evaluation.value === 0 ? 0 : Math.sign(evaluation.value) * 100000
  }
  return evaluation.value
}

function uciToSan(fen: string, uci: string): string {
  try {
    const scratch = new Chess(fen)
    const move = scratch.move({
      from: uci.slice(0, 2),
      to: uci.slice(2, 4),
      promotion: uci.length > 4 ? uci.slice(4, 5) : undefined,
    })
    return move?.san ?? uci
  } catch {
    return uci
  }
}

export interface RequestExplanationOptions {
  tone?: ExplanationTone
  /** Whether the prompt may name the engine's best-move alternative. Only safe once the game is over. Ignored for 'purpose' entries. */
  revealBestMove?: boolean
}

export interface UseMoveAnalysisResult {
  /**
   * All analyzed moves, in game (ply) order — the single source of truth for
   * both the post-game Review list and the live feed (page.tsx renders the
   * last few entries directly; there's no separate "current explanation"
   * slot here, on purpose — see the note on insertEntry below).
   */
  entries: MoveAnalysisEntry[]
  analyzeMove: (result: MoveResult, mover: Mover) => void
  requestExplanation: (ply: number, opts?: RequestExplanationOptions) => void
  reset: () => void
  popEntries: (count?: number) => void
}

export function useMoveAnalysis(tier: TierConfig, explanationMode: ExplanationMode): UseMoveAnalysisResult {
  const { ready: analysisReady, getTopMoves, evaluatePosition } = useStockfish()
  const [entries, setEntries] = useState<MoveAnalysisEntry[]>([])
  const entriesRef = useRef(entries)
  entriesRef.current = entries

  // Only 'quality' analysis flows through this queue — it needs serializing
  // to avoid overlapping UCI commands on the shared analysis Worker, which
  // isn't reentrant and previously crashed it (a WASM "unreachable" trap).
  // 'purpose' entries never touch that Worker, so they push immediately
  // instead of waiting behind it — quality analysis takes ~2 sequential UCI
  // round-trips (hundreds of ms) while a purpose note has near-zero latency
  // by comparison. Each move keeps its own ply-keyed slot in `entries`
  // regardless of arrival order, so an engine reply landing before the
  // player's own (slower) analysis never overwrites or hides it — the UI
  // renders from this array directly instead of a single "latest" value.
  const queueRef = useRef<Promise<void>>(Promise.resolve())
  const plyCounterRef = useRef(0)
  // Bumped on reset/undo so any analysis already queued for a position that
  // no longer exists (e.g. New Game clicked while a search was mid-flight)
  // gets silently discarded instead of appearing in the new game's list.
  const generationRef = useRef(0)

  const patchEntry = useCallback((ply: number, patch: Partial<MoveAnalysisEntry>) => {
    setEntries((prev) => prev.map((e) => (e.ply === ply ? ({ ...e, ...patch } as MoveAnalysisEntry) : e)))
  }, [])

  const fetchExplanation = useCallback(async (entry: MoveAnalysisEntry, tone: ExplanationTone, revealBestMove: boolean) => {
    patchEntry(entry.ply, {
      explanationStatus: 'loading',
      ...(entry.kind === 'quality' ? { explanationRevealed: revealBestMove } : {}),
    })

    const depth = depthFor(tier.id, revealBestMove)

    try {
      let data: ExplainMoveResponseBody | ExplainEnginePurposeResponseBody

      if (entry.kind === 'quality') {
        const body: ExplainMoveRequestBody = {
          fen: entry.fenBefore,
          move: entry.san,
          classification: entry.classification,
          evalBefore: entry.evalBeforeCp,
          evalAfter: entry.evalAfterCp,
          // Omitted entirely (not just for 'best' moves) unless revealing is safe —
          // the API route only names an alternative move when this is present, so
          // this is what keeps live feedback from giving away the answer.
          bestMove: revealBestMove && entry.classification !== 'best' ? entry.bestMoveSan : undefined,
          tone,
          depth,
        }
        const res = await fetch('/api/chess/explain-move', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (!res.ok) throw new Error('Request failed')
        data = await res.json()
      } else {
        const body: ExplainEnginePurposeRequestBody = {
          fenBefore: entry.fenBefore,
          move: entry.san,
          fenAfter: entry.fenAfter,
          depth,
        }
        const res = await fetch('/api/chess/explain-engine-purpose', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (!res.ok) throw new Error('Request failed')
        data = await res.json()
      }

      patchEntry(entry.ply, {
        explanation: data.explanation,
        headline: data.headline,
        bullets: data.bullets,
        suggestion: data.suggestion,
        notice: data.notice,
        remember: data.remember,
        explanationStatus: 'loaded',
      })
    } catch {
      patchEntry(entry.ply, { explanationStatus: 'error' })
    }
  }, [patchEntry, tier.id])

  const requestExplanation = useCallback(
    (ply: number, opts?: RequestExplanationOptions) => {
      const entry = entriesRef.current.find((e) => e.ply === ply)
      if (!entry || entry.explanationStatus === 'loading') return
      const revealBestMove = opts?.revealBestMove ?? false
      if (entry.explanationStatus === 'loaded') {
        // Purpose entries have no reveal concept — once loaded, always done.
        // Quality entries only need a re-fetch if upgrading from a
        // non-revealing live explanation to a revealing post-game one.
        if (entry.kind === 'purpose' || entry.explanationRevealed || !revealBestMove) return
      }
      fetchExplanation(entry, opts?.tone ?? tier.tone, revealBestMove)
    },
    [fetchExplanation, tier.tone]
  )

  const insertEntry = useCallback(
    (entry: MoveAnalysisEntry) => {
      setEntries((prev) => (prev.some((e) => e.ply === entry.ply) ? prev : [...prev, entry].sort((a, b) => a.ply - b.ply)))
      if (explanationMode === 'live') fetchExplanation(entry, tier.tone, false)
    },
    [explanationMode, tier.tone, fetchExplanation]
  )

  // Moves that arrived while the analysis engine was still loading — see the
  // analysisReady branch below. Drained once the engine comes up, so a fast
  // first move never permanently loses its slot in `entries`.
  const pendingGradedRef = useRef<{ result: MoveResult; ply: number }[]>([])

  const runGradedAnalysis = useCallback(
    (result: MoveResult, ply: number) => {
      const generation = generationRef.current

      queueRef.current = queueRef.current.then(async () => {
        if (generation !== generationRef.current) return
        try {
          const topMoves = await getTopMoves(result.fenBefore, 1, { movetime: ANALYSIS_MOVETIME })
          const best = topMoves[0]
          const evalAfterRaw = await evaluatePosition(result.fenAfter, ANALYSIS_DEPTH)
          if (generation !== generationRef.current) return

          const evalBeforeCp = best ? evaluationToCp(best.evaluation) : 0
          const evalAfterCp = -evalAfterRaw
          const cpLoss = Math.max(0, evalBeforeCp - evalAfterCp)
          const isEngineBest = !!best && best.move === result.uci
          const classification = classifyMove(cpLoss, isEngineBest)
          const bestMoveUci = best?.move ?? ''
          const bestMoveSan = bestMoveUci ? uciToSan(result.fenBefore, bestMoveUci) : ''

          const qualityEntry: QualityMoveEntry = {
            kind: 'quality',
            ply,
            color: result.color,
            san: result.san,
            fenBefore: result.fenBefore,
            fenAfter: result.fenAfter,
            bestMoveUci,
            bestMoveSan,
            evalBeforeCp,
            evalAfterCp,
            cpLoss,
            classification,
            explanation: null,
            explanationStatus: 'idle',
            explanationRevealed: false,
          }
          insertEntry(qualityEntry)
        } catch {
          // Analysis engine failed for this move — skip silently, gameplay is unaffected.
        }
      })
    },
    [getTopMoves, evaluatePosition, insertEntry]
  )

  const analyzeMove = useCallback(
    (result: MoveResult, mover: Mover) => {
      const graded = mover === 'player' || tier.id === 'expert' || tier.id === 'master'
      const ply = plyCounterRef.current++

      if (!graded) {
        // No Stockfish analysis call at all — push immediately, no queueing needed.
        insertEntry({
          kind: 'purpose',
          ply,
          color: result.color,
          san: result.san,
          fenBefore: result.fenBefore,
          fenAfter: result.fenAfter,
          explanation: null,
          explanationStatus: 'idle',
        })
        return
      }

      if (!analysisReady) {
        // The analysis engine (a separate Stockfish instance) hasn't
        // finished loading yet — queue this move rather than dropping it, so
        // its ply doesn't end up permanently missing from `entries` once the
        // engine comes up (that gap previously desynced the Moves tab's
        // White/Black column pairing from the move actually played there).
        pendingGradedRef.current.push({ result, ply })
        return
      }

      runGradedAnalysis(result, ply)
    },
    [analysisReady, tier.id, insertEntry, runGradedAnalysis]
  )

  // Flush anything that arrived before the analysis engine finished loading.
  useEffect(() => {
    if (!analysisReady || pendingGradedRef.current.length === 0) return
    const pending = pendingGradedRef.current
    pendingGradedRef.current = []
    for (const { result, ply } of pending) runGradedAnalysis(result, ply)
  }, [analysisReady, runGradedAnalysis])

  const reset = useCallback(() => {
    generationRef.current += 1
    plyCounterRef.current = 0
    queueRef.current = Promise.resolve()
    pendingGradedRef.current = []
    setEntries([])
  }, [])

  const popEntries = useCallback((count = 1) => {
    generationRef.current += 1
    pendingGradedRef.current = []
    setEntries((prev) => {
      const removeCount = Math.min(count, prev.length)
      plyCounterRef.current = Math.max(0, plyCounterRef.current - removeCount)
      return prev.slice(0, prev.length - removeCount)
    })
  }, [])

  return { entries, analyzeMove, requestExplanation, reset, popEntries }
}
