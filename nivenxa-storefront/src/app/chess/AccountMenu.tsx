'use client'
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import Link from 'next/link'
import styles from './ChessNav.module.scss'

/**
 * The signed-in account control: an avatar button (the first letter of the email) that opens a small menu with the
 * FULL email address, a "My Activity" link and "Log out". A disclosure, not a hover menu: it opens with click, tap,
 * Enter or Space; Escape closes it and returns focus to the button; a press or Tab outside closes it.
 */
export default function AccountMenu({ email, onLogOut, signingOut }: { email: string; onLogOut: () => void; signingOut: boolean }) {
  const [open, setOpen] = useState(false)
  const wrap = useRef<HTMLDivElement>(null)
  const button = useRef<HTMLButtonElement>(null)
  const panelId = useId()
  // Positioned against the viewport from the button's own rectangle, so the menu can never run off either edge.
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null)

  useLayoutEffect(() => {
    if (!open || !button.current) return
    const place = () => {
      const r = button.current!.getBoundingClientRect()
      const width = Math.min(352, window.innerWidth - 24) // mirrors .accountPanel's width
      const right = Math.min(Math.max(12, window.innerWidth - r.right), window.innerWidth - width - 12)
      setPos({ top: r.bottom + 8, right: Math.max(12, right) })
    }
    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const outside = (e: Event) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', outside)
    document.addEventListener('focusin', outside)
    return () => {
      document.removeEventListener('pointerdown', outside)
      document.removeEventListener('focusin', outside)
    }
  }, [open])

  return (
    <div
      ref={wrap}
      className={styles.accountWrap}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && open) {
          e.stopPropagation()
          setOpen(false)
          button.current?.focus()
        }
      }}
    >
      <button
        ref={button}
        type="button"
        className={styles.avatar}
        aria-label="Account menu"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
      >
        <span aria-hidden="true">{email.charAt(0).toUpperCase()}</span>
      </button>
      {open && (
        <div id={panelId} className={styles.accountPanel} style={pos ?? { visibility: 'hidden' }}>
          <p className={styles.accountLabel}>Signed in as</p>
          <p className={styles.accountEmail}>{email}</p>
          <Link href="/chess/activity" className={styles.accountItem} onClick={() => setOpen(false)}>
            My Activity
          </Link>
          <button type="button" className={styles.accountItem} onClick={onLogOut} disabled={signingOut} aria-busy={signingOut}>
            {signingOut ? 'Signing out…' : 'Log out'}
          </button>
        </div>
      )}
    </div>
  )
}
