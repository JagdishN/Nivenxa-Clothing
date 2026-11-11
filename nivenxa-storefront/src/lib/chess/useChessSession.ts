'use client'
import { useEffect, useState } from 'react'
import { createChessBrowserClient } from './chessSupabaseBrowser'

export interface ChessSessionState {
  /** False until the first session check finished (so callers do not treat "not known yet" as "signed out"). */
  checked: boolean
  signedIn: boolean
  /** Only used to tell accounts apart in the UI. Ownership is always decided by the server session, never by this value. */
  userId: string | null
  /** Increases on every sign-in, token refresh or sign-out, so dependants can re-check their account data. */
  epoch: number
}

/** The visitor's account state, following sign-in and sign-out. Without configured accounts everyone is a guest. */
export function useChessSession(): ChessSessionState {
  const [state, setState] = useState<ChessSessionState>({ checked: false, signedIn: false, userId: null, epoch: 0 })
  useEffect(() => {
    let supabase: ReturnType<typeof createChessBrowserClient>
    try {
      supabase = createChessBrowserClient()
    } catch {
      setState({ checked: true, signedIn: false, userId: null, epoch: 0 }) // eslint-disable-line react-hooks/set-state-in-effect -- accounts not configured here
      return
    }
    let live = true
    // The state object only changes when the account really changes or the player signs in again (a token refresh is not a change), so
    // dependants are not re-run (and re-render) on every background refresh.
    const apply = (s: { user: { id: string } } | null, bump = false) =>
      live &&
      setState((p) => {
        const userId = s?.user.id ?? null
        if (p.checked && p.signedIn === !!s && p.userId === userId && !bump) return p
        return { checked: true, signedIn: !!s, userId, epoch: p.epoch + 1 }
      })
    supabase.auth.getSession().then(({ data }) => apply(data.session)).catch(() => live && setState((p) => ({ checked: true, signedIn: false, userId: null, epoch: p.epoch + 1 })))
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => apply(session, event === 'SIGNED_IN'))
    return () => {
      live = false
      subscription.unsubscribe()
    }
  }, [])
  return state
}
