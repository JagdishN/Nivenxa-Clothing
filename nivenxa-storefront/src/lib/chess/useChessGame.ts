'use client'
import { useCallback, useState } from 'react'
import { Chess } from 'chess.js'
import type { Key } from 'chessground/types'
import type { ChessGameState, MoveResult } from './types'

function computeState(chess: Chess): ChessGameState {
  return {
    fen: chess.fen(),
    turn: chess.turn(),
    isCheck: chess.isCheck(),
    isCheckmate: chess.isCheckmate(),
    isDraw: chess.isDraw(),
    isStalemate: chess.isStalemate(),
    isThreefoldRepetition: chess.isThreefoldRepetition(),
    isInsufficientMaterial: chess.isInsufficientMaterial(),
    isDrawByFiftyMoves: chess.isDrawByFiftyMoves(),
    isGameOver: chess.isGameOver(),
    history: chess.history(),
  }
}

function computeDests(chess: Chess): Map<Key, Key[]> {
  const dests = new Map<Key, Key[]>()
  for (const move of chess.moves({ verbose: true })) {
    const from = move.from as Key
    const to = move.to as Key
    const existing = dests.get(from)
    if (existing) existing.push(to)
    else dests.set(from, [to])
  }
  return dests
}

export interface UseChessGameResult extends ChessGameState {
  dests: Map<Key, Key[]>
  makeMove: (from: string, to: string, promotion?: string) => MoveResult | null
  reset: () => void
  /** Pops up to `count` half-moves (best-effort — stops early if history runs out). */
  undo: (count?: number) => void
}

/** Wraps a chess.js instance, exposing React-reactive game state. */
export function useChessGame(): UseChessGameResult {
  const [chess] = useState(() => new Chess())
  const [state, setState] = useState<ChessGameState>(() => computeState(chess))
  const [dests, setDests] = useState<Map<Key, Key[]>>(() => computeDests(chess))

  const sync = useCallback(() => {
    setState(computeState(chess))
    setDests(computeDests(chess))
  }, [chess])

  const makeMove = useCallback(
    (from: string, to: string, promotion = 'q'): MoveResult | null => {
      try {
        const move = chess.move({ from, to, promotion })
        if (!move) return null
        sync()
        return {
          san: move.san,
          uci: move.lan,
          color: move.color,
          fenBefore: move.before,
          fenAfter: move.after,
        }
      } catch {
        return null
      }
    },
    [chess, sync]
  )

  const reset = useCallback(() => {
    chess.reset()
    sync()
  }, [chess, sync])

  const undo = useCallback(
    (count = 1) => {
      let undone = 0
      for (let i = 0; i < count; i++) {
        if (!chess.undo()) break
        undone++
      }
      if (undone > 0) sync()
    },
    [chess, sync]
  )

  return { ...state, dests, makeMove, reset, undo }
}
