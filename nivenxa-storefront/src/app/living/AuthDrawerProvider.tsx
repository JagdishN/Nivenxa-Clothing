'use client'
import { createContext, useContext, useState } from 'react'
import AuthDrawer from './AuthDrawer'

export type AuthDrawerMode = 'login' | 'signup'

interface AuthDrawerContextValue {
  open: (mode: AuthDrawerMode, redirectTo?: string) => void
}

const AuthDrawerContext = createContext<AuthDrawerContextValue | null>(null)

/** Throws on purpose — a missing provider is a wiring bug, not a state to render around. */
export function useAuthDrawer(): AuthDrawerContextValue {
  const ctx = useContext(AuthDrawerContext)
  if (!ctx) throw new Error('useAuthDrawer must be used within AuthDrawerProvider')
  return ctx
}

/**
 * Wraps the public /living pages (landing, and anywhere else a Login/Sign Up
 * trigger lives) so any nested client component can open the same drawer via
 * useAuthDrawer() — no prop-drilling `open`/`onClose` through Server Component
 * pages. Mirrors the storefront's own SignInDrawer + Navbar-held-state
 * pattern, just lifted into context since the triggers here live in more
 * than one Server Component (LivingNav, the landing page's hero + closing CTA).
 */
export default function AuthDrawerProvider({
  children,
  initialMode = null,
  initialRedirect = '/living/home',
}: {
  children: React.ReactNode
  /** Set by the landing page when it was reached through an old /living/login link: the drawer starts open. */
  initialMode?: AuthDrawerMode | null
  /** Where a successful sign-in goes (validated on the server; /living/home unless a safe destination was given). */
  initialRedirect?: string
}) {
  const [state, setState] = useState<{ mode: AuthDrawerMode; redirectTo: string } | null>(initialMode ? { mode: initialMode, redirectTo: initialRedirect } : null)

  // Closing only hides the drawer. If it was opened through ?auth=login, drop that from the address so a refresh
  // doesn't reopen it — without navigating or re-rendering the landing page.
  function close() {
    setState(null)
    const url = new URL(window.location.href)
    if (url.searchParams.has('auth')) {
      url.searchParams.delete('auth')
      url.searchParams.delete('redirect')
      window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`)
    }
  }

  return (
    <AuthDrawerContext.Provider value={{ open: (mode, redirectTo) => setState({ mode, redirectTo: redirectTo ?? '/living/home' }) }}>
      {children}
      <AuthDrawer mode={state?.mode ?? null} redirectTo={state?.redirectTo ?? '/living/home'} onClose={close} />
    </AuthDrawerContext.Provider>
  )
}
