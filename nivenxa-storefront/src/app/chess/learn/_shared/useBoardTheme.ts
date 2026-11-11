'use client'
import { useCallback, useEffect, useState } from 'react'

export type BoardTheme = 'cream' | 'green' | 'purple'

export const THEME_STORAGE_KEY = 'chess-board-theme'

export const BOARD_THEMES: { value: BoardTheme; label: string; light: string; dark: string }[] = [
  { value: 'cream', label: 'Cream & Brown', light: '#f0d9b5', dark: '#b58863' },
  { value: 'green', label: 'White & Green', light: '#F4F5EE', dark: '#487451' },
  { value: 'purple', label: 'Purple & Cream', light: '#F5EEDC', dark: '#705080' },
]

function readTheme(): BoardTheme | null {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    return stored === 'cream' || stored === 'green' || stored === 'purple' ? stored : null
  } catch {
    return null
  }
}

/**
 * The learner's chosen board colours, shared by every Chess Basics lesson (board-style and piece-style alike) so a
 * choice made in The Chessboard is still in force in Meet Your Pieces, Set Up the Board and How Pawns Move. The
 * first client render always uses 'cream' (matching the server markup); the stored choice is applied right after
 * mount, and a change made in another tab is picked up too.
 */
export function useBoardTheme(): [BoardTheme, (theme: BoardTheme) => void] {
  const [theme, setThemeState] = useState<BoardTheme>('cream')

  useEffect(() => {
    const stored = readTheme()
    if (stored) setThemeState(stored)
    const onStorage = (e: StorageEvent) => {
      if (e.key === THEME_STORAGE_KEY) {
        const next = readTheme()
        if (next) setThemeState(next)
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const setTheme = useCallback((next: BoardTheme) => {
    setThemeState(next)
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next)
    } catch {
      // Private-mode/blocked storage — the choice just won't persist.
    }
  }, [])

  return [theme, setTheme]
}
