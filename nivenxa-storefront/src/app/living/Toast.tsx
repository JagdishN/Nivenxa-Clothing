'use client'
import { useEffect, useState } from 'react'
import type { LivingFlashMessage } from '@/lib/living/flash'
import styles from './Toast.module.scss'

/**
 * Renders the flash message the server-rendered layout read for THIS
 * request (see lib/living/flash.ts + middleware.ts's one-time-cookie
 * cleanup) — no URL involved at all, unlike the old ?notice=/?error=
 * query-param version. `initial` is a fresh prop on every navigation
 * (living/layout.tsx is force-dynamic), so each new non-null value is
 * shown once and auto-dismissed.
 */
export default function Toast({ initial }: { initial: LivingFlashMessage | null }) {
  const [message, setMessage] = useState(initial)
  const [lastInitial, setLastInitial] = useState(initial)

  // "Adjusting state when a prop changes," done during render rather than in
  // an effect (react.dev's own recommended pattern for this) — Toast is
  // mounted once by the layout and stays mounted across client-side
  // navigations, so a fresh `initial` on a later render is exactly the
  // "new flash message arrived" signal, without an extra render's delay.
  if (initial !== lastInitial) {
    setLastInitial(initial)
    setMessage(initial)
  }

  useEffect(() => {
    if (!message) return
    const timer = setTimeout(() => setMessage(null), 5000)
    return () => clearTimeout(timer)
  }, [message])

  if (!message) return null

  return (
    <div className={styles.wrap} role="status" aria-live="polite">
      <div className={message.kind === 'error' ? styles.toastError : styles.toastInfo}>
        <span>{message.message}</span>
        <button type="button" className={styles.dismiss} onClick={() => setMessage(null)} aria-label="Dismiss">
          ×
        </button>
      </div>
    </div>
  )
}
