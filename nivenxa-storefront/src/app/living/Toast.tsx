'use client'
import { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import styles from './Toast.module.scss'

interface ToastMessage {
  text: string
  kind: 'notice' | 'error'
}

/**
 * Every Server Action in /living flashes a message back through
 * ?notice=...&error=... on its redirect — that's the one channel a plain
 * <form action={serverAction}> has for "here's what happened." This picks
 * those params up client-side, shows them as a floating toast instead of an
 * inline page banner, then strips them from the URL (via router.replace, no
 * new history entry) so a refresh or back-navigation doesn't re-trigger it.
 * Mounted once in living/layout.tsx — every route under /living gets it for free.
 */
export default function Toast() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [message, setMessage] = useState<ToastMessage | null>(null)
  const lastKey = useRef<string | null>(null)

  useEffect(() => {
    const notice = searchParams.get('notice')
    const error = searchParams.get('error')
    if (!notice && !error) return

    const key = `${pathname}?notice=${notice ?? ''}&error=${error ?? ''}`
    if (lastKey.current === key) return
    lastKey.current = key
    setMessage(error ? { text: error, kind: 'error' } : { text: notice as string, kind: 'notice' })

    const params = new URLSearchParams(searchParams.toString())
    params.delete('notice')
    params.delete('error')
    const qs = params.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams])

  useEffect(() => {
    if (!message) return
    const timer = setTimeout(() => setMessage(null), 5000)
    return () => clearTimeout(timer)
  }, [message])

  if (!message) return null

  return (
    <div className={styles.wrap} role="status" aria-live="polite">
      <div className={message.kind === 'error' ? styles.toastError : styles.toastInfo}>
        <span>{message.text}</span>
        <button type="button" className={styles.dismiss} onClick={() => setMessage(null)} aria-label="Dismiss">
          ×
        </button>
      </div>
    </div>
  )
}
