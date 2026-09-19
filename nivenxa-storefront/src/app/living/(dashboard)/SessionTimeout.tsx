'use client'
import { useCallback, useEffect, useRef } from 'react'
import { IDLE_TIMEOUT_MS } from './sessionTimer'

// Any of these resets the idle clock — covers mouse, keyboard, touch, and
// scroll/wheel activity. A click that navigates to another /living page is
// itself a 'mousedown', so client-side route changes already count without
// needing a separate pathname-watching effect.
const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'wheel', 'scroll'] as const

/**
 * Idle-based sign-out for the Living dashboard — mounted once in the
 * dashboard layout, which Next.js keeps alive across client-side
 * navigation, so this survives moving between pages without losing its
 * listeners. Only fires after IDLE_TIMEOUT_MS with NO activity at all; any
 * mouse/keyboard/touch/scroll event re-arms the timer from scratch, so a
 * user actively working (including just navigating around) is never signed
 * out mid-session. Note this is a UX timeout, not a server-enforced
 * security boundary — it relies on this tab's JS still running; Supabase's
 * own session/JWT still governs actual API access underneath it.
 */
export default function SessionTimeout({ onSignOut }: { onSignOut: () => Promise<void> }) {
  const formRef = useRef<HTMLFormElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fire = useCallback(() => {
    formRef.current?.requestSubmit()
  }, [])

  const armTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(fire, IDLE_TIMEOUT_MS)
  }, [fire])

  useEffect(() => {
    armTimer()
    for (const event of ACTIVITY_EVENTS) window.addEventListener(event, armTimer, { passive: true })
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      for (const event of ACTIVITY_EVENTS) window.removeEventListener(event, armTimer)
    }
  }, [armTimer])

  return (
    <form ref={formRef} action={onSignOut} hidden>
      <button type="submit">Sign out</button>
    </form>
  )
}
