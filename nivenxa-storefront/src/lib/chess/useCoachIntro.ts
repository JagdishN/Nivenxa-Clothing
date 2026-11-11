'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { clearAccountExpired, markAccountExpired } from './sessionExpiry'
import { cleanIds, introCount, loadGuestIds, mergeIds, saveGuestIds } from './coachIntro'

export interface CoachIntroState {
  /** Completed coach games (0..3). */
  completed: number
  /** Known once the first read (browser, and the account when signed in) has finished. */
  ready: boolean
  /** True when progress is only in this browser (a guest, or an account whose progress could not be saved yet). */
  browserOnly: boolean
  /** Records one completed game (idempotent per game id). */
  record: (localId: string) => void
}

async function api(method: 'GET' | 'POST', ids?: string[], userId?: string | null): Promise<string[] | null> {
  try {
    const res = await fetch('/api/chess/coach-intro', { method, headers: ids ? { 'Content-Type': 'application/json' } : undefined, body: ids ? JSON.stringify({ ids }) : undefined })
    if (res.status === 401) markAccountExpired(userId ?? null) // sign-in no longer valid: progress stays in this browser
    if (!res.ok) return null
    clearAccountExpired()
    const data = (await res.json()) as { ids?: unknown }
    return cleanIds(data.ids)
  } catch {
    return null
  }
}

/**
 * Coach-introduction progress. Guests: kept in this browser. Signed in: kept on the account. On sign-in any guest progress is merged
 * (union by game id: never double counted, never lowers existing account progress). If the account cannot be reached, progress
 * stays in the browser and is merged on the next visit.
 */
export function useCoachIntro(signedIn: boolean, sessionChecked: boolean, userId: string | null = null, epoch = 0): CoachIntroState {
  const [ids, setIds] = useState<string[]>([])
  const [ready, setReady] = useState(false)
  const [browserOnly, setBrowserOnly] = useState(true)
  const signedInRef = useRef(signedIn)
  useEffect(() => {
    signedInRef.current = signedIn
  })

  useEffect(() => {
    if (!sessionChecked) return
    let live = true
    const local = loadGuestIds()
    if (!signedIn) {
      setIds(local) // eslint-disable-line react-hooks/set-state-in-effect -- reading browser storage after mount
      setBrowserOnly(true)
      setReady(true)
      return
    }
    ;(async () => {
      const merged = local.length > 0 ? await api('POST', local, userId) : await api('GET', undefined, userId)
      if (!live) return
      if (merged) {
        if (local.length > 0) saveGuestIds([]) // merged into the account: not kept as browser progress any more
        setIds(merged)
        setBrowserOnly(false)
      } else {
        setIds(local) // the account could not be reached: keep what this browser has and retry next time
        setBrowserOnly(true)
      }
      setReady(true)
    })()
    return () => {
      live = false
    }
  }, [signedIn, sessionChecked, userId, epoch])

  const record = useCallback((localId: string) => {
    const next = mergeIds(loadGuestIds(), [localId])
    saveGuestIds(next) // always in the browser first, so a failed save never loses the game
    setIds((cur) => mergeIds(cur, [localId]))
    if (signedInRef.current) {
      void api('POST', [localId], userId).then((serverIds) => {
        if (!serverIds) return
        saveGuestIds(loadGuestIds().filter((x) => x !== localId))
        setIds((cur) => mergeIds(cur, serverIds))
        setBrowserOnly(false)
      })
    }
  }, [userId])

  return { completed: introCount(ids), ready, browserOnly, record }
}
