'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { StockfishEngine } from './engine'
import type { EngineMoveOptions, EngineTopMove, SkillLevel } from './types'

export interface UseStockfishResult {
  ready: boolean
  error: string | null
  setSkillLevel: (level: SkillLevel) => void
  getBestMove: (fen: string, options?: EngineMoveOptions) => Promise<string>
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

  const getBestMove = useCallback((fen: string, options?: EngineMoveOptions) => {
    if (!engineRef.current) return Promise.reject(new Error('Chess engine is not ready yet'))
    return engineRef.current.getBestMove(fen, options)
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

  return { ready, error, setSkillLevel, getBestMove, getTopMoves, evaluatePosition, stop }
}
