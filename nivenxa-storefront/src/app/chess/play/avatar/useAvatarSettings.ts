'use client'
import { useCallback, useEffect, useState } from 'react'

const KEY = 'nivenxa.chess.avatar.animation'
const HIDE_KEY = 'nivenxa.chess.avatar.test.hidden' // TEST HOOK (prototype builds only): hides the character, to measure a no-avatar baseline

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

/** Animation preference (default on) and the OS reduced-motion preference. Animation runs only when BOTH allow it. */
export function useAvatarSettings() {
  // Only ever mounted on the client after a game starts, so reading storage / matchMedia in the initialisers is safe.
  const [pref, setPrefState] = useState(() => read(KEY) !== 'off')
  const [reduced, setReduced] = useState(() => (typeof window === 'undefined' ? false : window.matchMedia('(prefers-reduced-motion: reduce)').matches))
  const [hidden] = useState(() => read(HIDE_KEY) === '1')

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const on = () => setReduced(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])

  const setPref = useCallback((next: boolean) => {
    setPrefState(next)
    try {
      window.localStorage.setItem(KEY, next ? 'on' : 'off')
    } catch {
      /* storage unavailable: preference lasts for this page view */
    }
  }, [])

  return { pref, setPref, reduced, animate: pref && !reduced, hidden }
}
