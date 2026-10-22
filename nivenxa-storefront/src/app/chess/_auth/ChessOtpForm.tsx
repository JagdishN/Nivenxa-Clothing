'use client'
import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createChessBrowserClient } from '@/lib/chess/chessSupabaseBrowser'
import { hasChessConsent, recordChessConsent, type ChessAccountType } from '@/lib/chess/chessConsentActions'
import styles from './ChessAuthForm.module.scss'

type Step = 'consent' | 'contact' | 'code'

/**
 * Shared by /chess/login and /chess/signup — same Supabase email-OTP
 * mechanism as Living's OtpForm (src/app/living/_auth/OtpForm.tsx), same
 * Supabase project, differing only in `shouldCreateUser` and where success
 * sends the player back to. Chess has no post-verify setup step beyond
 * consent (no apartment/membership equivalent) — a successful verify (and,
 * where needed, consent) goes straight to `redirectTo`.
 *
 * Consent ("Who is this account for?" + the matching required checkbox) is
 * required by the Privacy Policy (/chess/privacy#children) before an
 * account can be used at all:
 *  - New sign-ups see it FIRST, before the email field is even used to send
 *    a code — the brief's "before sending the sign-in email" requirement.
 *  - Returning users who verify successfully but have no consent row yet
 *    (every account that existed before this feature shipped) see the same
 *    step once, right after verifying, before being sent on to `redirectTo`.
 */
export default function ChessOtpForm({ mode, redirectTo }: { mode: 'login' | 'signup'; redirectTo: string }) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState<Step>(mode === 'signup' ? 'consent' : 'contact')
  const [accountType, setAccountType] = useState<ChessAccountType | ''>('')
  const [agreed, setAgreed] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function submitConsent(e: FormEvent) {
    e.preventDefault()
    if (!accountType || !agreed) return
    if (mode === 'signup') {
      setStep('contact')
      return
    }
    // Existing user, consenting after verify — record it now and continue.
    setPending(true)
    recordChessConsent(accountType)
      .then(() => {
        router.push(redirectTo)
        router.refresh()
      })
      .catch(() => {
        setPending(false)
        setError('Something went wrong saving that — please try again.')
      })
  }

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
    if (error) {
      setPending(false)
      setError(error.message)
      return
    }

    if (mode === 'signup') {
      // accountType/agreed were already collected in the 'consent' step
      // above, before the code was ever sent.
      try {
        await recordChessConsent(accountType as ChessAccountType)
      } catch {
        // Non-fatal — the account exists and is signed in either way; worst
        // case this falls through to the "existing user missing consent"
        // path next time they sign in, which asks again.
      }
      setPending(false)
      router.push(redirectTo)
      router.refresh()
      return
    }

    // Login: only now do we know who they are, so only now can we check
    // whether they still need to go through consent.
    const alreadyConsented = await hasChessConsent()
    setPending(false)
    if (alreadyConsented) {
      router.push(redirectTo)
      router.refresh()
      return
    }
    setStep('consent')
  }

  if (step === 'consent') {
    return (
      <form onSubmit={submitConsent}>
        {error && <div className={styles.alert}>{error}</div>}
        <p className={styles.hint} style={{ marginBottom: '0.75rem' }}>
          Who is this account for?
        </p>
        <div className={styles.field}>
          <label className={styles.radioOption}>
            <input
              type="radio"
              name="accountType"
              value="adult"
              checked={accountType === 'adult'}
              onChange={() => setAccountType('adult')}
              required
            />
            Me — I&rsquo;m 18 or older
          </label>
          <label className={styles.radioOption}>
            <input
              type="radio"
              name="accountType"
              value="child"
              checked={accountType === 'child'}
              onChange={() => setAccountType('child')}
            />
            My child — I&rsquo;m their parent or guardian
          </label>
        </div>

        {accountType === 'child' && (
          <p className={styles.hint} style={{ marginBottom: '0.75rem' }}>
            Use your own email on the next step, not your child&rsquo;s — we&rsquo;ll sign in with your email on their behalf.
          </p>
        )}

        {accountType === 'adult' && (
          <label className={styles.checkboxOption}>
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} required />
            <span>
              I confirm I am 18 or older and agree to the <Link href="/chess/terms">Terms of Use</Link> and{' '}
              <Link href="/chess/privacy">Privacy Policy</Link>.
            </span>
          </label>
        )}

        {accountType === 'child' && (
          <label className={styles.checkboxOption}>
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} required />
            <span>
              I am this child&rsquo;s parent or legal guardian. I agree to the <Link href="/chess/terms">Terms of Use</Link> on their
              behalf and consent to NIVENXA processing their data as described in the <Link href="/chess/privacy">Privacy Policy</Link>.
            </span>
          </label>
        )}

        <button type="submit" className={styles.button} disabled={pending || !accountType || !agreed}>
          {pending ? 'Saving…' : 'Continue'}
        </button>
      </form>
    )
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
