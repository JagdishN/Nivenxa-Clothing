'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Chess } from 'chess.js'
import type { Key } from 'chessground/types'
import { useStockfish } from './useStockfish'
import { classifyMove } from './moveClassification'
import { evaluationToCp } from './engineEval'
import { uciToSan } from './uci'
import type { EngineEvaluation } from './types'

export type PracticeStatus = 'loading' | 'ready' | 'trying' | 'correct' | 'wrong' | 'revealed'

// Same escalation shape as PuzzleSolver.tsx's THEME_HINTS/highlight staging —
// a plain-language nudge first, then the piece to move, never the answer
// outright until "Show Answer" is used.
const HINT_TEXT_AFTER_ATTEMPTS = 2
const HINT_HIGHLIGHT_AFTER_ATTEMPTS = 3
const WRONG_PREVIEW_MS = 700
const EVAL_MOVETIME = 700
const EVAL_DEPTH = 14

const EMPTY_DESTS = new Map<Key, Key[]>()

interface Solution {
  uci: string
  san: string
  from: Key
  to: Key
  evalCp: number
}

function legalDests(fen: string): Map<Key, Key[]> {
  const dests = new Map<Key, Key[]>()
  try {
    for (const m of new Chess(fen).moves({ verbose: true })) {
      const from = m.from as Key
      const existing = dests.get(from)
      if (existing) existing.push(m.to as Key)
      else dests.set(from, [m.to as Key])
    }
  } catch {
    // Malformed FEN — nothing legal.
  }
  return dests
}

export interface UsePracticePositionResult {
  status: PracticeStatus
  /** What the board should render — briefly shows a wrong attempt's resulting position before reverting. */
  fen: string
  turnColor: 'white' | 'black'
  dests: Map<Key, Key[]>
  wrongAttempts: number
  hintText: string | null
  hintSquares: Key[] | undefined
  solutionSan: string | null
  /** [from, to] of the correct move — only set once revealed (via "Show Answer" or a correct attempt), for drawing on the board. */
  solutionArrow: Key[] | undefined
  attemptMove: (from: Key, to: Key, promotion?: string) => void
  revealAnswer: () => void
}

/**
 * Generalizes PuzzleSolver.tsx's "find the move on a real board" interaction
 * for an arbitrary position rather than a stored Lichess solution: fetches
 * Stockfish's own top move once for `startFen`, then grades every attempt
 * with the same classifyMove math the rest of Analysis uses (best/excellent
 * counts as correct — an exact top-1 match isn't required, so a genuinely
 * equal alternative isn't marked wrong). Owns its own Stockfish instance,
 * separate from useGameAnalysis's batch-grading instance on the same page —
 * the engine is non-reentrant, so the two must never share a Worker.
 */
export function usePracticePosition(startFen: string | null): UsePracticePositionResult {
  const { ready, getTopMoves, evaluatePosition } = useStockfish()
  const [status, setStatus] = useState<PracticeStatus>('loading')
  const [fen, setFen] = useState(startFen ?? new Chess().fen())
  const [wrongAttempts, setWrongAttempts] = useState(0)
  // Rendered output (hintSquares/solutionSan/solutionArrow) derives from
  // this, so it lives in state rather than a ref — a ref mutation alone
  // wouldn't be guaranteed to schedule the re-render that shows it.
  const [solution, setSolution] = useState<Solution | null>(null)
  const revertTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const generationRef = useRef(0)

  useEffect(() => {
    const generation = ++generationRef.current
    if (revertTimerRef.current) clearTimeout(revertTimerRef.current)
    setSolution(null)
    setWrongAttempts(0)

    if (!startFen || !ready) {
      setStatus('loading')
      setFen(startFen ?? new Chess().fen())
      return
    }

    setStatus('loading')
    setFen(startFen)
    let cancelled = false

    getTopMoves(startFen, 1, { movetime: EVAL_MOVETIME }).then((top) => {
      if (cancelled || generation !== generationRef.current) return
      const best = top[0]
      if (best) {
        setSolution({
          uci: best.move,
          san: uciToSan(startFen, best.move),
          from: best.move.slice(0, 2) as Key,
          to: best.move.slice(2, 4) as Key,
          evalCp: evaluationToCp(best.evaluation as EngineEvaluation),
        })
      }
      setStatus('ready')
    })

    return () => {
      cancelled = true
      if (revertTimerRef.current) clearTimeout(revertTimerRef.current)
    }
  }, [startFen, ready, getTopMoves])

  const attemptMove = useCallback(
    (from: Key, to: Key, promotion = 'q') => {
      if (!startFen || !solution || status === 'correct' || status === 'revealed' || status === 'trying') return

      const scratch = new Chess(startFen)
      let move
      try {
        move = scratch.move({ from, to, promotion })
      } catch {
        return
      }
      if (!move) return

      setStatus('trying')
      const fenAfter = scratch.fen()

      evaluatePosition(fenAfter, EVAL_DEPTH).then((evalAfterRaw) => {
        const evalAfterCp = -evalAfterRaw
        const cpLoss = Math.max(0, solution.evalCp - evalAfterCp)
        const isTop1 = move!.lan === solution.uci
        const classification = classifyMove(cpLoss, isTop1)

        if (classification === 'best' || classification === 'excellent') {
          setFen(fenAfter)
          setStatus('correct')
          return
        }

        setWrongAttempts((n) => n + 1)
        setStatus('wrong')
        setFen(fenAfter)
        revertTimerRef.current = setTimeout(() => {
          setFen(startFen)
          setStatus('ready')
        }, WRONG_PREVIEW_MS)
      })
    },
    [startFen, status, solution, evaluatePosition]
  )

  const revealAnswer = useCallback(() => {
    if (!startFen || !solution) return
    if (revertTimerRef.current) clearTimeout(revertTimerRef.current)
    const scratch = new Chess(startFen)
    try {
      scratch.move(solution.san)
      setFen(scratch.fen())
    } catch {
      // Solution SAN somehow no longer legal — leave the position as-is.
    }
    setStatus('revealed')
  }, [startFen, solution])

  const done = status === 'correct' || status === 'revealed'
  const hintText =
    !done && wrongAttempts >= HINT_TEXT_AFTER_ATTEMPTS
      ? 'Look for a forcing move — a check, a capture, or a threat your opponent must answer.'
      : null
  const hintSquares: Key[] | undefined =
    !done && wrongAttempts >= HINT_HIGHLIGHT_AFTER_ATTEMPTS && solution ? [solution.from] : undefined

  return {
    status,
    fen,
    turnColor: fen.split(' ')[1] === 'b' ? 'black' : 'white',
    dests: status === 'ready' ? legalDests(startFen ?? fen) : EMPTY_DESTS,
    wrongAttempts,
    hintText,
    hintSquares,
    solutionSan: solution?.san ?? null,
    solutionArrow: done && solution ? [solution.from, solution.to] : undefined,
    attemptMove,
    revealAnswer,
  }
}
