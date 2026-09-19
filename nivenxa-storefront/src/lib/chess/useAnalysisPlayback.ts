'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { QualityMoveEntry } from './types'

export type PlaybackSpeed = 0.5 | 1 | 1.5 | 2

/** Time between automatic moves at 1x speed. */
const BASE_STEP_MS = 900

// Classifications that trigger an automatic pause when "Pause at Key
// Moments" is on. Deliberately excludes best/excellent/good — per spec,
// normal moves replay through automatically; pausing on every single move
// (including strong ones) would defeat "do not pause after every move."
const KEY_MOMENT_CLASSIFICATIONS = new Set(['inaccuracy', 'mistake', 'blunder'])

export type AnalysisDetailMode = 'key' | 'every'

export interface UseAnalysisPlaybackOptions {
  totalPlies: number
  entries: QualityMoveEntry[]
  initialAutoplay?: boolean
}

export interface UseAnalysisPlaybackResult {
  currentPly: number
  isPlaying: boolean
  speed: PlaybackSpeed
  pauseAtKeyMoments: boolean
  detailMode: AnalysisDetailMode
  atStart: boolean
  atEnd: boolean
  /** The entry for the move that led to `currentPly` (i.e. entries[currentPly - 1]) — what the explanation panel shows. */
  currentEntry: QualityMoveEntry | undefined
  play: () => void
  pause: () => void
  toggle: () => void
  stepForward: () => void
  stepBackward: () => void
  goToStart: () => void
  goToEnd: () => void
  jumpTo: (ply: number) => void
  setSpeed: (speed: PlaybackSpeed) => void
  setPauseAtKeyMoments: (value: boolean) => void
  setDetailMode: (mode: AnalysisDetailMode) => void
}

/**
 * Drives currentPly forward automatically (Watch Full Game / Start Analysis
 * autoplay), pausing indefinitely — not a timed auto-resume — the instant it
 * lands on a mistake/blunder/inaccuracy ply when pauseAtKeyMoments is on, so
 * the coach's "take a moment" framing isn't undercut by the game continuing
 * on its own. The player always retains manual control (jumpTo/step*) even
 * while autoplay is running.
 */
export function useAnalysisPlayback({ totalPlies, entries, initialAutoplay = false }: UseAnalysisPlaybackOptions): UseAnalysisPlaybackResult {
  const [currentPly, setCurrentPly] = useState(0)
  const [isPlaying, setIsPlaying] = useState(initialAutoplay)
  const [speed, setSpeed] = useState<PlaybackSpeed>(1)
  const [pauseAtKeyMoments, setPauseAtKeyMoments] = useState(true)
  const [detailMode, setDetailMode] = useState<AnalysisDetailMode>('key')

  const entryByPly = useMemo(() => new Map(entries.map((e) => [e.ply, e])), [entries])
  const atStart = currentPly === 0
  const atEnd = currentPly >= totalPlies

  useEffect(() => {
    if (!isPlaying || atEnd) return

    const timer = setTimeout(() => {
      const justPlayed = entryByPly.get(currentPly)
      if (pauseAtKeyMoments && justPlayed && KEY_MOMENT_CLASSIFICATIONS.has(justPlayed.classification)) {
        setIsPlaying(false)
      }
      setCurrentPly((p) => Math.min(totalPlies, p + 1))
    }, BASE_STEP_MS / speed)

    return () => clearTimeout(timer)
  }, [isPlaying, atEnd, speed, pauseAtKeyMoments, currentPly, entryByPly, totalPlies])

  const play = useCallback(() => setIsPlaying((prev) => prev || currentPly < totalPlies), [currentPly, totalPlies])
  const pause = useCallback(() => setIsPlaying(false), [])
  const toggle = useCallback(() => setIsPlaying((prev) => (prev ? false : currentPly < totalPlies)), [currentPly, totalPlies])
  const stepForward = useCallback(() => {
    setIsPlaying(false)
    setCurrentPly((p) => Math.min(totalPlies, p + 1))
  }, [totalPlies])
  const stepBackward = useCallback(() => {
    setIsPlaying(false)
    setCurrentPly((p) => Math.max(0, p - 1))
  }, [])
  const goToStart = useCallback(() => {
    setIsPlaying(false)
    setCurrentPly(0)
  }, [])
  const goToEnd = useCallback(() => {
    setIsPlaying(false)
    setCurrentPly(totalPlies)
  }, [totalPlies])
  const jumpTo = useCallback(
    (ply: number) => {
      setIsPlaying(false)
      setCurrentPly(Math.max(0, Math.min(totalPlies, ply)))
    },
    [totalPlies]
  )

  return {
    currentPly,
    isPlaying,
    speed,
    pauseAtKeyMoments,
    detailMode,
    atStart,
    atEnd,
    currentEntry: currentPly > 0 ? entryByPly.get(currentPly - 1) : undefined,
    play,
    pause,
    toggle,
    stepForward,
    stepBackward,
    goToStart,
    goToEnd,
    jumpTo,
    setSpeed,
    setPauseAtKeyMoments,
    setDetailMode,
  }
}
