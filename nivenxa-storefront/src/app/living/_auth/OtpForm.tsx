'use client'
import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { createLivingBrowserClient } from '@/lib/living/supabaseBrowser'
import theme from '../LivingTheme.module.scss'
import styles from './AuthForm.module.scss'

/**
 * Shared by /living/login and /living/signup — both are the same Supabase
 * email-OTP mechanism, differing only in `shouldCreateUser` and what
 * happens after verification (the parent Server Component re-runs on
 * router.refresh() and redirects from there — see login/page.tsx and
 * signup/page.tsx).
 *
 * Email-only for now — phone OTP needs an SMS gateway (Twilio/MSG91/etc.)
 * wired up in the Supabase dashboard first, which isn't done yet. Dropped
 * from the UI rather than left as a dead tab; /api/geo's country_calling_code
 * field is still there for whenever phone comes back.
 */
export default function OtpForm({ mode }: { mode: 'login' | 'signup' }) {
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
    const supabase = createLivingBrowserClient()
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
    const supabase = createLivingBrowserClient()
    const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'email' })
    setPending(false)
    if (error) {
      setError(error.message)
      return
    }
    router.refresh()
  }

  if (step === 'code') {
    return (
      <form onSubmit={verifyCode}>
        {error && <div className={theme.alert}>{error}</div>}
        <p className={styles.hint} style={{ marginBottom: '1rem' }}>
          We sent a code to {email}.
        </p>
        <div className={theme.field}>
          <label className={theme.label} htmlFor="otp-code">
            6-digit code
          </label>
          <input
            id="otp-code"
            className={theme.input}
            inputMode="numeric"
            autoComplete="one-time-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
          />
        </div>
        <button type="submit" className={theme.button} disabled={pending} style={{ width: '100%' }}>
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
      {error && <div className={theme.alert}>{error}</div>}
      <div className={theme.field}>
        <label className={theme.label} htmlFor="otp-email">
          Email address
        </label>
        <input
          id="otp-email"
          className={theme.input}
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <button type="submit" className={theme.button} disabled={pending} style={{ width: '100%' }}>
        {pending ? 'Sending…' : 'Send code'}
      </button>
    </form>
  )
}
