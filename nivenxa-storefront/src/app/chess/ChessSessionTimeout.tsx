'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createChessBrowserClient } from '@/lib/chess/chessSupabaseBrowser'
import styles from './ChessSessionTimeout.module.scss'

const WARNING_AFTER_MS = 15 * 60 * 1000 // idle time before the warning appears
const COUNTDOWN_MS = 60 * 1000 // grace period after the warning, before auto sign-out
const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'wheel', 'scroll'] as const

/**
 * Idle-based session warning for Nivenxa Chess — distinct from Living's
 * fixed 60-minute cap (no idle detection, no warning there); this one only
 * counts down while the player is actually inactive. Mounted once in
 * chess/layout.tsx so it survives client-side navigation between chess
 * pages. Does nothing unless a Chess session exists (checked client-side,
 * same pattern as ChessNav, so signed-out visitors never pay for the
 * listeners and static pages stay static).
 *
 * After 15 minutes with no mouse/keyboard/touch/scroll activity, a warning
 * appears with a 60-second countdown. Only clicking Extend resolves it —
 * passive activity (a stray mouse brush) while the warning is up is
 * deliberately ignored, otherwise the warning could vanish without the
 * player ever consciously choosing to stay signed in.
 */
export default function ChessSessionTimeout() {
  const router = useRouter()
  const [signedIn, setSignedIn] = useState(false)
  const [warningVisible, setWarningVisible] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(COUNTDOWN_MS / 1000)

  const warnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const warningVisibleRef = useRef(false)

  const clearTimers = useCallback(() => {
    if (warnTimerRef.current) clearTimeout(warnTimerRef.current)
    if (countdownRef.current) clearInterval(countdownRef.current)
    warnTimerRef.current = null
    countdownRef.current = null
  }, [])

  const signOut = useCallback(async () => {
    clearTimers()
    warningVisibleRef.current = false
    setWarningVisible(false)
    const supabase = createChessBrowserClient()
    await supabase.auth.signOut()
    router.push('/chess/analysis')
    router.refresh()
  }, [clearTimers, router])

  const startWarningCountdown = useCallback(() => {
    warningVisibleRef.current = true
    setWarningVisible(true)
    setSecondsLeft(COUNTDOWN_MS / 1000)
    countdownRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          signOut()
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }, [signOut])

  const armWarningTimer = useCallback(() => {
    if (warnTimerRef.current) clearTimeout(warnTimerRef.current)
    warnTimerRef.current = setTimeout(startWarningCountdown, WARNING_AFTER_MS)
  }, [startWarningCountdown])

  const handleActivity = useCallback(() => {
    if (warningVisibleRef.current) return // warning is up — only Extend/Log Out resolves it
    armWarningTimer()
  }, [armWarningTimer])

  const handleExtend = useCallback(async () => {
    clearTimers()
    warningVisibleRef.current = false
    setWarningVisible(false)
    armWarningTimer()
    // Proactively refresh the underlying token too, not just the idle clock —
    // "extend" should mean the real session, not just this tab's UI state.
    const supabase = createChessBrowserClient()
    await supabase.auth.refreshSession()
  }, [armWarningTimer, clearTimers])

  useEffect(() => {
    const supabase = createChessBrowserClient()
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session))
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => setSignedIn(!!session))
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!signedIn) {
      // Only side effects on external systems here (timers, a ref) — never
      // setState directly in an effect body. The render guard below
      // (`!signedIn` in the early return) is what actually hides the
      // warning if a sign-out happens while it's showing.
      clearTimers()
      warningVisibleRef.current = false
      return
    }
    armWarningTimer()
    for (const event of ACTIVITY_EVENTS) window.addEventListener(event, handleActivity, { passive: true })
    return () => {
      clearTimers()
      for (const event of ACTIVITY_EVENTS) window.removeEventListener(event, handleActivity)
    }
  }, [signedIn, armWarningTimer, handleActivity, clearTimers])

  if (!warningVisible || !signedIn) return null

  const minutes = Math.floor(secondsLeft / 60)
  const seconds = secondsLeft % 60
  const display = `${minutes}:${String(seconds).padStart(2, '0')}`

  return (
    <div className={styles.overlay} role="alertdialog" aria-modal="true" aria-labelledby="chess-session-timeout-title">
      <div className={styles.card}>
        <h2 id="chess-session-timeout-title" className={styles.title}>
          Still there?
        </h2>
        <p className={styles.body}>
          You&apos;ve been idle for a while. For your security, you&apos;ll be signed out in <strong>{display}</strong> unless
          you extend your session.
        </p>
        <div className={styles.actions}>
          <button type="button" className={styles.extendBtn} onClick={handleExtend}>
            Extend Session
          </button>
          <button type="button" className={styles.logOutBtn} onClick={signOut}>
            Log Out Now
          </button>
        </div>
      </div>
    </div>
  )
}
