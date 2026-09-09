'use client'
import { createContext, useContext, useState } from 'react'
import AuthDrawer from './AuthDrawer'

export type AuthDrawerMode = 'login' | 'signup'

interface AuthDrawerContextValue {
  open: (mode: AuthDrawerMode) => void
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
export default function AuthDrawerProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<AuthDrawerMode | null>(null)

  return (
    <AuthDrawerContext.Provider value={{ open: setMode }}>
      {children}
      <AuthDrawer mode={mode} onClose={() => setMode(null)} />
    </AuthDrawerContext.Provider>
  )
}
