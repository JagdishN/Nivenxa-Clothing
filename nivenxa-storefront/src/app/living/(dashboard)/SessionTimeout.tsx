'use client'
import { useEffect, useRef } from 'react'
import { SESSION_DURATION_MS, clearSessionStart, getSessionStart } from './sessionTimer'

/**
 * Client-side 30-minute session cap — mounted once in the dashboard layout,
 * which Next.js keeps alive across client-side navigation (only a full
 * reload or leaving /living tears it down), so the timer isn't reset just by
 * moving between pages. Note this is a UX timeout, not a server-enforced
 * security boundary — it relies on this tab's JS still running; Supabase's
 * own session/JWT still governs actual API access underneath it.
 */
export default function SessionTimeout({ onSignOut }: { onSignOut: () => Promise<void> }) {
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    const remaining = SESSION_DURATION_MS - (Date.now() - getSessionStart())

    const fire = () => {
      clearSessionStart()
      formRef.current?.requestSubmit()
    }

    if (remaining <= 0) {
      fire()
      return
    }
    const timer = setTimeout(fire, remaining)
    return () => clearTimeout(timer)
  }, [])

  return (
    <form ref={formRef} action={onSignOut} hidden>
      <button type="submit">Sign out</button>
    </form>
  )
}
