'use client'
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
import { safeChessRedirectPath } from '@/lib/auth/safeRedirect'
import ChessAuthDrawer from './ChessAuthDrawer'
import styles from './ChessAuthDrawer.module.scss'

export type ChessAuthMode = 'login' | 'signup'

interface Ctx {
  /** Opens the sign-in drawer over the current page; after signing in the visitor is sent to `redirectTo` (default: here). */
  open: (mode: ChessAuthMode, redirectTo?: string) => void
  /** Shows the "signed out" confirmation (or an honest failure). */
  announce: (message: { kind: 'ok' | 'error'; text: string }) => void
}

const AuthCtx = createContext<Ctx | null>(null)

export function useChessAuth(): Ctx {
  const ctx = useContext(AuthCtx)
  if (!ctx) throw new Error('useChessAuth must be used within ChessAuthProvider')
  return ctx
}

/**
 * Owns the Chess sign-in drawer for every /chess page. The Log In / Sign Up buttons call `open()`; the old
 * /chess/login and /chess/signup URLs redirect to the home page with `?auth=login|signup`, which <AuthAutoOpen/>
 * (rendered by the home page) turns into the same drawer. Closing only hides the drawer — it never navigates.
 */
export default function ChessAuthProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [drawer, setDrawer] = useState<{ mode: ChessAuthMode; redirectTo: string } | null>(null)
  const [toast, setToast] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)

  const open = useCallback(
    (mode: ChessAuthMode, redirectTo?: string) => {
      setDrawer({ mode, redirectTo: safeChessRedirectPath(redirectTo ?? `${pathname}${window.location.search}`) })
    },
    [pathname]
  )
  const close = useCallback(() => {
    setDrawer(null)
    // If we arrived through /chess/login → /chess?auth=login, drop that from the address so a refresh doesn't reopen it.
    const url = new URL(window.location.href)
    if (url.searchParams.has('auth')) {
      url.searchParams.delete('auth')
      url.searchParams.delete('redirect')
      window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`)
    }
  }, [])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), toast.kind === 'error' ? 8000 : 5000)
    return () => clearTimeout(t)
  }, [toast])

  const value = useMemo<Ctx>(() => ({ open, announce: setToast }), [open])

  return (
    <AuthCtx.Provider value={value}>
      {children}
      {drawer && <ChessAuthDrawer key={drawer.mode} mode={drawer.mode} redirectTo={drawer.redirectTo} onClose={close} />}
      {toast && (
        <div className={`${styles.toast} ${toast.kind === 'error' ? styles.toastError : ''}`} role={toast.kind === 'error' ? 'alert' : 'status'}>
          <span>{toast.text}</span>
          <button type="button" className={styles.toastClose} aria-label="Dismiss" onClick={() => setToast(null)}>
            ×
          </button>
        </div>
      )}
    </AuthCtx.Provider>
  )
}

/** Rendered by the home page: opens the drawer when it was reached through an old /chess/login or /chess/signup link. */
export function AuthAutoOpen({ mode, redirectTo }: { mode: ChessAuthMode; redirectTo: string }) {
  const { open } = useChessAuth()
  useEffect(() => {
    open(mode, redirectTo)
    // Once per arrival: the drawer's own close handler clears ?auth= from the URL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, redirectTo])
  return null
}

/** Rendered by the home page after a sign-out: shows the confirmation once, then removes `?signed_out` from the address. */
export function SignedOutNotice() {
  const { announce } = useChessAuth()
  useEffect(() => {
    announce({ kind: 'ok', text: "You've been signed out." })
    const url = new URL(window.location.href)
    url.searchParams.delete('signed_out')
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return null
}
