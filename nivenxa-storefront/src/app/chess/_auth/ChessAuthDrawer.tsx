'use client'
import { useRef } from 'react'
import { useDrawerA11y } from '@/lib/auth/useDrawerA11y'
import theme from '../ChessTheme.module.scss'
import ChessOtpForm from './ChessOtpForm'
import styles from './ChessAuthDrawer.module.scss'
import form from './ChessAuthForm.module.scss'

/**
 * The Chess sign-in / sign-up side panel. It carries the Chess theme class itself (the drawer is rendered outside
 * the page shell) so it keeps Chess's colours and type. Full width on a phone.
 * Escape, the × button and a click on the backdrop close it; focus is trapped inside while open and returns to the
 * Log In button afterwards; page scroll is locked while it is open.
 */
export default function ChessAuthDrawer({
  mode,
  redirectTo,
  onClose,
}: {
  mode: 'login' | 'signup'
  redirectTo: string
  onClose: () => void
}) {
  const panel = useRef<HTMLElement>(null)
  useDrawerA11y(panel, onClose)
  const login = mode === 'login'

  return (
    <div className={`${theme.theme} ${styles.root}`}>
      <div className={styles.backdrop} onClick={onClose} aria-hidden="true" />
      <aside ref={panel} className={styles.drawer} role="dialog" aria-modal="true" aria-labelledby="chess-auth-title">
        <button type="button" className={styles.close} onClick={onClose} aria-label="Close">
          ×
        </button>
        <header className={styles.header}>
          <p className={form.eyebrow}>NIVENXA CHESS</p>
          <h2 id="chess-auth-title" className={form.title}>
            {login ? 'Log In' : 'Sign Up'}
          </h2>
          <p className={form.subtitle}>
            {login
              ? "Enter your email address to sign in. We'll send you a verification code."
              : "Create your account with your email address. We'll send you a verification code."}
          </p>
        </header>
        <ChessOtpForm mode={mode} redirectTo={redirectTo} onSuccess={onClose} />
      </aside>
    </div>
  )
}
