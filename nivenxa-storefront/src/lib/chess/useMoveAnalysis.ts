'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useStockfish } from './useStockfish'
import { classifyMove } from './moveClassification'
import { depthFor, shouldAutoExplainLive } from './skillTiers'
import { uciToSan } from './uci'
import { sameMove } from './insightFeed'
import { dropEvidenceFrom, installEvidenceApi, recordEvidence } from './reviewEvidence'
import { isCheckmatePosition, MATE_CP } from './engineEval'
import { buildEvidence, buildMoveFacts, describeDownside, isWeakGrade, resolveExplanation } from './moveFacts'
import type { ExplanationMode, TierConfig } from './skillTiers'
import type {
  EngineEvaluation,
  ExplainEnginePurposeRequestBody,
  ExplainEnginePurposeResponseBody,
  ExplainMoveRequestBody,
  ExplainMoveResponseBody,
  ExplanationTone,
  MoveAnalysisEntry,
  MoveResult,
  QualityMoveEntry,
} from './types'

// Analysis runs on its own Stockfish instance (see useStockfish() below) so it
// never overlaps the gameplay engine's in-flight `go` command on the same
// Worker — engine.ts assumes one outstanding call at a time per instance.
const ANALYSIS_MOVETIME = 500
const ANALYSIS_DEPTH = 14
// Nothing may stay "Reviewing…" forever: past these the panel says the feedback is unavailable (the game is never affected).
export const ANALYSIS_TIMEOUT_MS = 8000
export const COMMENTARY_TIMEOUT_MS = 12000
const STOP_GRACE_MS = 1500

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now())
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

export type Mover = 'player' | 'engine'

function evaluationToCp(evaluation: EngineEvaluation): number {
  if (evaluation.type === 'mate') {
    return evaluation.value === 0 ? 0 : Math.sign(evaluation.value) * 100000
  }
  return evaluation.value
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
  /** Undo: keep only the first `keepPlies` moves; everything belonging to later plies (entries, queued and in-flight work) is dropped. */
  popEntries: (keepPlies: number) => void
}

export function useMoveAnalysis(tier: TierConfig, explanationMode: ExplanationMode): UseMoveAnalysisResult {
  const { ready: analysisReady, getTopMoves, evaluateWithReply, stop: stopAnalysis } = useStockfish()
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
  // The game this hook is serving; bumped ONLY by reset() (restart / new game). Every entry carries it, so a late result can
  // never be written into another game's entry, even when the same move is played at the same ply.
  const sessionRef = useRef(0)
  // Analysis jobs still wanted, by ply. Undo drops only the plies it removes, so analysis of moves that are STILL on the board
  // (queued behind a slow one) is no longer thrown away, which used to leave those moves "Reviewing…" forever.
  const jobsRef = useRef(new Map<number, number>())
  const jobIdRef = useRef(0)
  // The game's OWN move list (SAN by ply), recorded as moves are played: the canonical history handed to commentary. It never has gaps
  // (the entries list can: a move whose analysis is pending or failed has no entry), and undo/new game truncate it with the entries.
  const movesRef = useRef<string[]>([])
  // At most two commentary requests run at once; waiting ones start by priority (mistakes/blunders first, then your moves, then
  // TIVVI's), so a confirmed mistake is never queued behind notes about quiet moves.
  const runningRef = useRef(0)
  const waitingRef = useRef<{ priority: number; seq: number; start: () => void }[]>([])
  const seqRef = useRef(0)
  const drainCommentary = useCallback(() => {
    while (runningRef.current < 2 && waitingRef.current.length > 0) {
      waitingRef.current.sort((a, b) => a.priority - b.priority || a.seq - b.seq)
      runningRef.current++
      waitingRef.current.shift()!.start()
    }
  }, [])
  const acquireCommentarySlot = useCallback(
    (priority: number) =>
      new Promise<() => void>((resolve) => {
        waitingRef.current.push({
          priority,
          seq: seqRef.current++,
          start: () =>
            resolve(() => {
              runningRef.current--
              drainCommentary()
            }),
        })
        drainCommentary()
      }),
    [drainCommentary]
  )

  // `expect` makes a late async result harmless: it only lands on the SAME move (ply, san and positions). After an undo
  // followed by a different move at the same ply, or after a new game, a response for the old move is dropped.
  const patchEntry = useCallback((ply: number, patch: Partial<MoveAnalysisEntry>, expect?: MoveAnalysisEntry) => {
    setEntries((prev) => prev.map((e) => (e.ply === ply && (!expect || (sameMove(expect, e) && e.session === expect.session)) ? ({ ...e, ...patch } as MoveAnalysisEntry) : e)))
  }, [])

  const fetchExplanation = useCallback(async (entry: MoveAnalysisEntry, tone: ExplanationTone, revealBestMove: boolean) => {
    patchEntry(
      entry.ply,
      {
        explanationStatus: 'loading',
        ...(entry.kind === 'quality' ? { explanationRevealed: revealBestMove } : {}),
      },
      entry
    )

    const depth = depthFor(tier.id, revealBestMove)
    const queuedAt = now()
    const priority = entry.kind === 'quality' ? (entry.classification === 'mistake' || entry.classification === 'blunder' ? 0 : 1) : 2
    const release = await acquireCommentarySlot(priority)
    // The move may have been undone (or its game ended) while this request waited for a slot: then no request is made at all.
    if (entry.session !== sessionRef.current || movesRef.current[entry.ply] !== entry.san) {
      release()
      return
    }
    const startedAt = now()
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), COMMENTARY_TIMEOUT_MS)
    const timing = () => ({ ...(entry.timing ?? {}), commentaryQueueMs: Math.round(startedAt - queuedAt), commentaryMs: Math.round(now() - startedAt) })
    // The canonical moves before this one, from the game itself. If this move does not replay from its own positions there is
    // nothing true to say about it, so no explanation is requested.
    const historySan = movesRef.current.slice(0, entry.ply)
    const facts = buildMoveFacts({ fenBefore: entry.fenBefore, fenAfter: entry.fenAfter, san: entry.san, ply: entry.ply, historySan })

    // What the grading search itself proved about this move (never from the model): used to steer and to check the text.
    const evidence = facts && entry.kind === 'quality' ? buildEvidence(facts, { grade: entry.classification, replyUci: entry.replyUci, pvUci: entry.pvUci, bestSan: revealBestMove && entry.classification !== 'best' ? entry.bestMoveSan : undefined }) : null

    // Shows what can be trusted for this move: the model's text, the engine's own verified line, or "Explanation unavailable".
    const settle = (data: ExplainMoveResponseBody | ExplainEnginePurposeResponseBody | null) => {
      const fields = data ? [data.headline, data.explanation, ...(data.bullets ?? []), data.suggestion, data.notice] : null
      const r = resolveExplanation(data && data.source !== 'rejected' ? fields : null, facts!, evidence)
      const down = evidence && facts ? describeDownside(facts, evidence) : null
      const d = data as (ExplainMoveResponseBody & { rawText?: string }) | null
      recordEvidence(entry.session ?? 0, entry.ply, {
        color: entry.color, san: entry.san, fenBefore: entry.fenBefore, fenAfter: entry.fenAfter,
        commentary: {
          requestedAt: new Date(Date.now() - (timing().commentaryMs ?? 0)).toISOString(), respondedAt: new Date().toISOString(), revealBestMove,
          facts, evidence,
          returned: d ? { headline: d.headline, explanation: d.explanation, bullets: d.bullets, suggestion: d.suggestion, source: d.source, reason: d.reason, rawText: d.rawText } : undefined,
          validation: { kind: r.kind, reason: r.kind === 'model' ? undefined : r.reason },
          displayed: { source: r.kind, summary: r.kind === 'evidence' ? r.text : r.kind === 'unavailable' ? 'Explanation unavailable.' : r.kind === 'model' ? down ?? data?.headline ?? data?.explanation : r.text, explanation: r.kind === 'model' ? data?.explanation : null, moveFact: r.kind === 'unavailable' ? r.fact : undefined },
        },
      })
      const marks = evidence?.highlights ?? []
      const blank = { headline: undefined, bullets: undefined, suggestion: undefined, notice: undefined, remember: undefined }
      if (r.kind === 'model' && data) {
        patchEntry(entry.ply, { explanation: data.explanation, headline: data.headline, bullets: data.bullets, suggestion: data.suggestion, notice: data.notice, remember: data.remember, explanationSource: 'model', downside: down ?? undefined, highlights: marks, moveFact: undefined, explanationStatus: 'loaded', timing: timing() }, entry)
      } else if (r.kind === 'evidence') {
        patchEntry(entry.ply, { ...blank, explanation: r.text, explanationSource: 'evidence', downside: r.text, highlights: marks, moveFact: undefined, explanationStatus: 'loaded', timing: timing() }, entry)
      } else if (r.kind === 'unavailable') {
        patchEntry(entry.ply, { ...blank, explanation: null, explanationSource: 'unavailable', moveFact: r.fact, explanationStatus: 'loaded', timing: timing() }, entry)
      } else {
        patchEntry(entry.ply, { ...blank, explanation: r.kind === 'fact' ? r.text : null, explanationSource: 'facts', moveFact: undefined, explanationStatus: 'loaded', timing: timing() }, entry)
      }
    }

    try {
      if (!facts) throw new Error('Move does not match its positions')
      // A weak grade the engine line cannot explain (no verified loss) is never sent to the model: nothing it could say would be checkable.
      if (entry.kind === 'quality' && evidence && isWeakGrade(entry.classification) && !describeDownside(facts, evidence)) {
        settle(null)
        return
      }
      let data: ExplainMoveResponseBody | ExplainEnginePurposeResponseBody

      if (entry.kind === 'quality') {
        // Only used server-side at 'rich'/'brief' depth (beginner/next-level),
        // where the route builds a minimal prompt from fen/recentMovesSan/move/
        // level alone, dropping classification/eval/bestMove/tone entirely —
        // see src/lib/chess/aiExplainMove.ts. Harmless to always include here.
        const recentMovesSan = historySan.slice(-5)

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
          recentMovesSan,
          fenAfter: entry.fenAfter,
          ply: entry.ply,
          historySan: historySan.slice(-8),
          replyUci: entry.replyUci,
          pvUci: entry.pvUci,
        }
        const res = await fetch('/api/chess/explain-move', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: controller.signal,
        })
        if (!res.ok) throw new Error('Request failed')
        data = await res.json()
      } else {
        const body: ExplainEnginePurposeRequestBody = {
          fenBefore: entry.fenBefore,
          move: entry.san,
          fenAfter: entry.fenAfter,
          depth,
          ply: entry.ply,
          historySan: historySan.slice(-8),
        }
        const res = await fetch('/api/chess/explain-engine-purpose', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: controller.signal,
        })
        if (!res.ok) throw new Error('Request failed')
        data = await res.json()
      }

      // Checked again here against this move's own positions and its engine grade before anything can be shown.
      settle(data)
    } catch {
      // The commentary service failed or timed out. The grade stays; if the engine's own line proves a concrete downside that is
      // shown, otherwise the entry says so plainly. Nothing is invented.
      if (facts && entry.kind === 'quality') settle(null)
      else patchEntry(entry.ply, { explanationStatus: 'error', timing: timing() }, entry)
    } finally {
      clearTimeout(timer)
      release()
    }
  }, [patchEntry, tier.id, acquireCommentarySlot])

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
      if (explanationMode === 'live' && !entry.analysisUnavailable && shouldAutoExplainLive(tier.id, entry)) fetchExplanation(entry, tier.tone, false)
    },
    [explanationMode, tier.id, tier.tone, fetchExplanation]
  )

  const pendingGradedRef = useRef<{ result: MoveResult; ply: number; jobId: number }[]>([])

  /** Runs an engine call but never waits forever: on timeout the engine is told to stop and given a moment to settle before the queue moves on. */
  const guarded = useCallback(
    async <T,>(call: Promise<T>): Promise<T> => {
      let timer: ReturnType<typeof setTimeout> | undefined
      const timedOut = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('analysis timeout')), ANALYSIS_TIMEOUT_MS)
      })
      try {
        return await Promise.race([call, timedOut])
      } catch (err) {
        stopAnalysis()
        await Promise.race([call.catch(() => undefined), sleep(STOP_GRACE_MS)])
        throw err
      } finally {
        if (timer) clearTimeout(timer)
      }
    },
    [stopAnalysis]
  )

  const runGradedAnalysis = useCallback(
    (result: MoveResult, ply: number, jobId: number) => {
      const session = sessionRef.current
      const enqueuedAt = now()
      const wanted = () => session === sessionRef.current && jobsRef.current.get(ply) === jobId

      queueRef.current = queueRef.current.then(async () => {
        if (!wanted()) return
        const startedAt = now()
        const base = {
          ply,
          color: result.color,
          san: result.san,
          fenBefore: result.fenBefore,
          fenAfter: result.fenAfter,
          session,
        }
        try {
          const topMoves = await guarded(getTopMoves(result.fenBefore, 1, { movetime: ANALYSIS_MOVETIME }))
          const best = topMoves[0]
          const afterSearch = await guarded(evaluateWithReply(result.fenAfter, ANALYSIS_DEPTH))
          const evalAfterRaw = afterSearch.score
          if (!wanted()) return

          const evalBeforeCp = best ? evaluationToCp(best.evaluation) : 0
          // A move that DELIVERS checkmate has no "after" search (the position is over, the engine reports 0): it is the best possible
          // outcome, never a loss.
          const evalAfterCp = isCheckmatePosition(result.fenAfter) ? MATE_CP : -evalAfterRaw
          const cpLoss = Math.max(0, evalBeforeCp - evalAfterCp)
          const isEngineBest = !!best && best.move === result.uci
          const classification = classifyMove(cpLoss, isEngineBest)
          const bestMoveUci = best?.move ?? ''
          const bestMoveSan = bestMoveUci ? uciToSan(result.fenBefore, bestMoveUci) : ''

          const qualityEntry: QualityMoveEntry = {
            kind: 'quality',
            ...base,
            bestMoveUci,
            bestMoveSan,
            evalBeforeCp,
            evalAfterCp,
            cpLoss,
            classification,
            replyUci: afterSearch.bestMove,
            pvUci: afterSearch.pv?.slice(0, 10),
            explanation: null,
            explanationStatus: 'idle',
            explanationRevealed: false,
            timing: { queueMs: Math.round(startedAt - enqueuedAt), analysisMs: Math.round(now() - startedAt) },
          }
          installEvidenceApi()
          recordEvidence(session, ply, {
            color: result.color, san: result.san, fenBefore: result.fenBefore, fenAfter: result.fenAfter, tier: tier.id,
            grade: { classification, evalBeforeCp, evalAfterCp, cpLoss, bestMoveUci, bestMoveSan, pvUci: afterSearch.pv?.slice(0, 10) },
            timing: qualityEntry.timing,
          })
          insertEntry(qualityEntry)
        } catch {
          // The engine could not grade this move in time. Record that, so the panel says "unavailable" instead of
          // "Reviewing…" forever. Gameplay is unaffected and the move simply has no grade.
          if (!wanted()) return
          recordEvidence(session, ply, { color: result.color, san: result.san, fenBefore: result.fenBefore, fenAfter: result.fenAfter, tier: tier.id, analysisUnavailable: true })
          insertEntry({
            kind: 'purpose',
            ...base,
            explanation: null,
            explanationStatus: 'error',
            analysisUnavailable: true,
            timing: { queueMs: Math.round(startedAt - enqueuedAt), analysisMs: Math.round(now() - startedAt) },
          })
        }
      })
    },
    [getTopMoves, evaluateWithReply, insertEntry, guarded]
  )

  const analyzeMove = useCallback(
    (result: MoveResult, mover: Mover) => {
      const graded = mover === 'player' || tier.id === 'expert' || tier.id === 'master'
      const ply = plyCounterRef.current++
      movesRef.current[ply] = result.san
      movesRef.current.length = ply + 1
      const jobId = ++jobIdRef.current
      jobsRef.current.set(ply, jobId)

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
          session: sessionRef.current,
        })
        return
      }

      if (!analysisReady) {
        // The analysis engine (a separate Stockfish instance) hasn't finished loading yet: queue this move rather than
        // dropping it, so its ply is never permanently missing from `entries`.
        pendingGradedRef.current.push({ result, ply, jobId })
        return
      }

      runGradedAnalysis(result, ply, jobId)
    },
    [analysisReady, tier.id, insertEntry, runGradedAnalysis]
  )

  // Flush anything that arrived before the analysis engine finished loading.
  useEffect(() => {
    if (!analysisReady || pendingGradedRef.current.length === 0) return
    const pending = pendingGradedRef.current
    pendingGradedRef.current = []
    for (const { result, ply, jobId } of pending) runGradedAnalysis(result, ply, jobId)
  }, [analysisReady, runGradedAnalysis])

  const reset = useCallback(() => {
    sessionRef.current += 1
    jobsRef.current.clear()
    plyCounterRef.current = 0
    movesRef.current = []
    waitingRef.current = []
    queueRef.current = Promise.resolve()
    pendingGradedRef.current = []
    setEntries([])
  }, [])

  /**
   * Undo: keep only the first `keepPlies` moves. Entries AND queued/in-flight work for later plies are dropped by ply (not by
   * "the last N entries", which removed the wrong ones while a move's analysis was still pending); earlier moves keep theirs.
   */
  const popEntries = useCallback((keepPlies: number) => {
    const keep = Math.max(0, keepPlies)
    for (const ply of [...jobsRef.current.keys()]) if (ply >= keep) jobsRef.current.delete(ply)
    pendingGradedRef.current = pendingGradedRef.current.filter((p) => p.ply < keep)
    plyCounterRef.current = keep
    movesRef.current.length = Math.min(movesRef.current.length, keep)
    dropEvidenceFrom(sessionRef.current, keep)
    setEntries((prev) => prev.filter((e) => e.ply < keep))
  }, [])

  return { entries, analyzeMove, requestExplanation, reset, popEntries }
}
