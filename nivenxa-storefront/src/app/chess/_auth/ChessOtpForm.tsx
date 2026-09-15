'use client'
import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { createChessBrowserClient } from '@/lib/chess/chessSupabaseBrowser'
import styles from './ChessAuthForm.module.scss'

/**
 * Shared by /chess/login and /chess/signup — same Supabase email-OTP
 * mechanism as Living's OtpForm (src/app/living/_auth/OtpForm.tsx), same
 * Supabase project, differing only in `shouldCreateUser` and where success
 * sends the player back to. Chess has no post-verify setup step (no
 * apartment/membership equivalent), so a successful verify goes straight to
 * `redirectTo`.
 */
export default function ChessOtpForm({ mode, redirectTo }: { mode: 'login' | 'signup'; redirectTo: string }) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState<'contact' | 'code'>('contact')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function requestCode(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setPending(true)
    const supabase = createChessBrowserClient()
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: mode === 'signup' } })
    setPending(false)
    if (error) {
      setError(
        mode === 'login' && error.message.toLowerCase().includes('not found')
          ? "We couldn't find an account for that — try Sign Up instead."
          : error.message
      )
      return
    }
    setStep('code')
  }

  async function verifyCode(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setPending(true)
    const supabase = createChessBrowserClient()
    const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'email' })
    setPending(false)
    if (error) {
      setError(error.message)
      return
    }
    router.push(redirectTo)
    router.refresh()
  }

  if (step === 'code') {
    return (
      <form onSubmit={verifyCode}>
        {error && <div className={styles.alert}>{error}</div>}
        <p className={styles.hint} style={{ marginBottom: '1rem' }}>
          We sent a code to {email}.
        </p>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="chess-otp-code">
            6-digit code
          </label>
          <input
            id="chess-otp-code"
            className={styles.input}
            inputMode="numeric"
            autoComplete="one-time-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
          />
        </div>
        <button type="submit" className={styles.button} disabled={pending}>
          {pending ? 'Verifying…' : 'Verify & continue'}
        </button>
        <button type="button" className={styles.switchStep} onClick={() => setStep('contact')}>
          ← Use a different email
        </button>
      </form>
    )
  }

  return (
    <form onSubmit={requestCode}>
      {error && <div className={styles.alert}>{error}</div>}
      <div className={styles.field}>
        <label className={styles.label} htmlFor="chess-otp-email">
          Email address
        </label>
        <input
          id="chess-otp-email"
          className={styles.input}
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <button type="submit" className={styles.button} disabled={pending}>
        {pending ? 'Sending…' : 'Send code'}
      </button>
    </form>
  )
}
