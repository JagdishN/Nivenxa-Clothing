'use client'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { createLivingBrowserClient } from '@/lib/living/supabaseBrowser'
import theme from '../LivingTheme.module.scss'
import styles from './AuthForm.module.scss'

const RESEND_COOLDOWN_SECONDS = 30
const MAX_RESENDS = 3

/**
 * Shared by /living/login and /living/signup — both are the same Supabase
 * email-OTP mechanism, differing only in `shouldCreateUser`. After a
 * successful verify this always navigates to /living/home explicitly —
 * requireMembership() there redirects on to /living/signup by itself if
 * this account doesn't have a membership yet (e.g. a brand-new signup),
 * so one target works for both modes. Deliberately not just
 * router.refresh() and letting the current page's own Server Component
 * redirect itself: that relies on this page's next render seeing the
 * just-written session cookie, which raced and silently failed to
 * navigate at all in practice.
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
  const [resendCount, setResendCount] = useState(0)
  const [cooldown, setCooldown] = useState(0)
  const cooldownTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => () => {
    if (cooldownTimer.current) clearInterval(cooldownTimer.current)
  }, [])

  function startCooldown() {
    setCooldown(RESEND_COOLDOWN_SECONDS)
    if (cooldownTimer.current) clearInterval(cooldownTimer.current)
    cooldownTimer.current = setInterval(() => {
      setCooldown((s) => {
        if (s <= 1) {
          if (cooldownTimer.current) clearInterval(cooldownTimer.current)
          return 0
        }
        return s - 1
      })
    }, 1000)
  }

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
    setResendCount(0)
    startCooldown()
    setStep('code')
  }

  async function resendCode() {
    if (cooldown > 0 || resendCount >= MAX_RESENDS || pending) return
    setError(null)
    setPending(true)
    const supabase = createLivingBrowserClient()
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: mode === 'signup' } })
    setPending(false)
    if (error) {
      setError(error.message)
      return
    }
    setResendCount((n) => n + 1)
    startCooldown()
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
    router.push('/living/home')
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
        <div className={styles.secondaryRow}>
          {resendCount < MAX_RESENDS ? (
            <button type="button" className={styles.switchStep} onClick={resendCode} disabled={cooldown > 0 || pending}>
              {cooldown > 0 ? `Resend code (${cooldown}s)` : 'Resend code'}
            </button>
          ) : (
            <span className={styles.hint}>Maximum resend attempts reached.</span>
          )}
          <button
            type="button"
            className={styles.switchStep}
            onClick={() => {
              if (cooldownTimer.current) clearInterval(cooldownTimer.current)
              setCooldown(0)
              setResendCount(0)
              setStep('contact')
            }}
          >
            ← Use a different email
          </button>
        </div>
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
