'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { TimeControlPreset } from './timeControls'

export type LowTimeState = 'normal' | 'elevated' | 'warning' | 'critical'

export function lowTimeStateFor(seconds: number): LowTimeState {
  if (seconds < 10) return 'critical'
  if (seconds < 60) return 'warning'
  if (seconds < 300) return 'elevated'
  return 'normal'
}

export interface UseChessClockResult {
  /** Seconds remaining per side. Frozen (and meaningless to render) when no preset is set. */
  times: { w: number; b: number }
  enabled: boolean
  lowTimeState: (color: 'w' | 'b') => LowTimeState
  /**
   * Re-zeroes both clocks. Takes the target preset explicitly (rather than
   * reading the `preset` prop) because callers invoke this synchronously
   * right after changing that prop via setState — React hasn't re-rendered
   * yet, so a same-render read would still see the *previous* preset.
   */
  reset: (preset: TimeControlPreset | null) => void
}

/**
 * `preset === null` means untimed (Beginner, or no mode chosen yet) — the
 * clock is fully inert, `times` stay frozen at 0 and nothing should render.
 */
export function useChessClock(preset: TimeControlPreset | null, turn: 'w' | 'b', isGameOver: boolean): UseChessClockResult {
  const enabled = preset !== null
  const [times, setTimes] = useState<{ w: number; b: number }>(() => {
    const seconds = (preset?.minutes ?? 0) * 60
    return { w: seconds, b: seconds }
  })
  const prevTurnRef = useRef(turn)
  const presetRef = useRef(preset)
  presetRef.current = preset

  // Countdown — only the side to move loses time.
  useEffect(() => {
    if (!enabled || isGameOver) return
    const id = setInterval(() => {
      setTimes((t) => ({ ...t, [turn]: Math.max(0, t[turn] - 1) }))
    }, 1000)
    return () => clearInterval(id)
  }, [enabled, isGameOver, turn])

  // Increment — applied to whichever color just moved, once per turn change.
  useEffect(() => {
    if (enabled && prevTurnRef.current !== turn) {
      const mover = prevTurnRef.current
      const increment = presetRef.current?.incrementSeconds ?? 0
      setTimes((t) => ({ ...t, [mover]: t[mover] + increment }))
    }
    prevTurnRef.current = turn
  }, [turn, enabled])

  const reset = useCallback((nextPreset: TimeControlPreset | null) => {
    const seconds = (nextPreset?.minutes ?? 0) * 60
    setTimes({ w: seconds, b: seconds })
    prevTurnRef.current = 'w' // a fresh game always starts with White to move
  }, [])

  const lowTimeState = useCallback((color: 'w' | 'b') => lowTimeStateFor(times[color]), [times])

  return { times, enabled, lowTimeState, reset }
}
