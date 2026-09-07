'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { StockfishEngine } from './engine'
import type { EngineMoveConfig } from './engineProvider'
import type { EngineMoveOptions, EngineTopMove, SkillLevel } from './types'

export interface UseStockfishResult {
  ready: boolean
  error: string | null
  setSkillLevel: (level: SkillLevel) => void
  /** See personas.ts — best-effort, harmless if the current build doesn't expose this UCI option. */
  setContempt: (value: number) => void
  getBestMove: (fen: string, options?: EngineMoveOptions) => Promise<string>
  /** Persona-aware entry point — plain best move when config.persona is unset, see engine.ts's getMove. */
  getMove: (fen: string, config?: EngineMoveConfig) => Promise<string>
  getTopMoves: (fen: string, multiPv: number, options?: EngineMoveOptions) => Promise<EngineTopMove[]>
  evaluatePosition: (fen: string, depth?: number) => Promise<number>
  stop: () => void
}

export function useStockfish(): UseStockfishResult {
  const engineRef = useRef<StockfishEngine | null>(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const engine = new StockfishEngine()
    engineRef.current = engine
    setReady(false)
    setError(null)

    engine
      .init()
      .then(() => setReady(true))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to start the chess engine'))

    return () => {
      engine.destroy()
      if (engineRef.current === engine) engineRef.current = null
    }
  }, [])

  const setSkillLevel = useCallback((level: SkillLevel) => {
    engineRef.current?.setSkillLevel(level)
  }, [])

  const setContempt = useCallback((value: number) => {
    engineRef.current?.setContempt(value)
  }, [])

  const getBestMove = useCallback((fen: string, options?: EngineMoveOptions) => {
    if (!engineRef.current) return Promise.reject(new Error('Chess engine is not ready yet'))
    return engineRef.current.getBestMove(fen, options)
  }, [])

  const getMove = useCallback((fen: string, config?: EngineMoveConfig) => {
    if (!engineRef.current) return Promise.reject(new Error('Chess engine is not ready yet'))
    return engineRef.current.getMove(fen, config)
  }, [])

  const getTopMoves = useCallback((fen: string, multiPv: number, options?: EngineMoveOptions) => {
    if (!engineRef.current) return Promise.reject(new Error('Chess engine is not ready yet'))
    return engineRef.current.getTopMoves(fen, multiPv, options)
  }, [])

  const evaluatePosition = useCallback((fen: string, depth?: number) => {
    if (!engineRef.current) return Promise.reject(new Error('Chess engine is not ready yet'))
    return engineRef.current.evaluatePosition(fen, depth)
  }, [])

  const stop = useCallback(() => {
    engineRef.current?.stop()
  }, [])

  return { ready, error, setSkillLevel, setContempt, getBestMove, getMove, getTopMoves, evaluatePosition, stop }
}
