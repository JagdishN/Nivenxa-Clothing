'use client'
import { useCallback, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createChessBrowserClient } from '@/lib/chess/chessSupabaseBrowser'
import { hasChessConsent, recordChessConsent, type ChessAccountType } from '@/lib/chess/chessConsentActions'
import OtpBoxes from '@/components/auth/OtpBoxes'
import { OTP_LENGTH } from '@/lib/auth/otp'
import { useEmailOtp } from '@/lib/auth/useEmailOtp'
import styles from './ChessAuthForm.module.scss'

/**
 * The Chess sign-in / sign-up form, shown inside the Chess auth drawer (ChessAuthDrawer). Same Supabase email-code
 * mechanism as Living (shared hook: src/lib/auth/useEmailOtp.ts), differing in `shouldCreateUser` and in the consent
 * step Chess's Privacy Policy requires:
 *  - sign-up: "Who is this account for?" + agreement FIRST, before any code is sent;
 *  - login: if the verified account has no consent row yet (accounts that predate the feature), the same step appears
 *    once, right after verifying, before continuing.
 * Success is only acted on after the server has confirmed the code; `onSuccess` then closes the drawer and the form
 * navigates to `redirectTo` (already validated by the caller).
 */
export default function ChessOtpForm({ mode, redirectTo, onSuccess }: { mode: 'login' | 'signup'; redirectTo: string; onSuccess?: () => void }) {
  const router = useRouter()
  const [phase, setPhase] = useState<'consent' | 'otp'>(mode === 'signup' ? 'consent' : 'otp')
  const [accountType, setAccountType] = useState<ChessAccountType | ''>('')
  const [agreed, setAgreed] = useState(false)
  const [consentPending, setConsentPending] = useState(false)
  const [consentError, setConsentError] = useState<string | null>(null)

  const finish = useCallback(() => {
    onSuccess?.()
    router.push(redirectTo)
    router.refresh()
  }, [onSuccess, router, redirectTo])

  const otp = useEmailOtp({
    getClient: createChessBrowserClient,
    shouldCreateUser: mode === 'signup',
    notFoundMessage: "We couldn't find an account for that email. Try Sign Up instead.",
    onVerified: async () => {
      if (mode === 'signup') {
        // accountType/agreed were collected in the consent step before the code was sent.
        try {
          await recordChessConsent(accountType as ChessAccountType)
        } catch {
          // Non-fatal: the account exists and is signed in; a missing row is asked for again at the next login.
        }
        finish()
        return
      }
      // Login: only now do we know who this is, so only now can we check whether consent is still needed.
      if (await hasChessConsent()) finish()
      else setPhase('consent')
    },
  })

  function submitConsent(e: FormEvent) {
    e.preventDefault()
    if (!accountType || !agreed) return
    setConsentError(null)
    if (mode === 'signup') {
      setPhase('otp')
      return
    }
    // Existing account, consenting after verifying — record it and continue.
    setConsentPending(true)
    recordChessConsent(accountType)
      .then(finish)
      .catch(() => {
        setConsentPending(false)
        setConsentError('Something went wrong saving that — please try again.')
      })
  }

  if (phase === 'consent') {
    return (
      <form onSubmit={submitConsent}>
        {consentError && (
          <div className={styles.alert} role="alert">
            {consentError}
          </div>
        )}
        <p className={styles.hint} style={{ marginBottom: '0.75rem' }}>
          Who is this account for?
        </p>
        <div className={styles.field}>
          <label className={styles.radioOption}>
            <input type="radio" name="accountType" value="adult" checked={accountType === 'adult'} onChange={() => setAccountType('adult')} required />
            Me — I&rsquo;m 18 or older
          </label>
          <label className={styles.radioOption}>
            <input type="radio" name="accountType" value="child" checked={accountType === 'child'} onChange={() => setAccountType('child')} />
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
              I confirm I am 18 or older and agree to the <Link href="/chess/terms">Terms of Use</Link> and <Link href="/chess/privacy">Privacy Policy</Link>.
            </span>
          </label>
        )}

        {accountType === 'child' && (
          <label className={styles.checkboxOption}>
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} required />
            <span>
              I am this child&rsquo;s parent or legal guardian. I agree to the <Link href="/chess/terms">Terms of Use</Link> on their behalf and consent to
              NIVENXA processing their data as described in the <Link href="/chess/privacy">Privacy Policy</Link>.
            </span>
          </label>
        )}

        <button type="submit" className={styles.button} disabled={consentPending || !accountType || !agreed}>
          {consentPending ? 'Saving…' : 'Continue'}
        </button>
      </form>
    )
  }

  const sending = otp.status === 'sending'
  const verifying = otp.status === 'verifying' || otp.status === 'verified'

  if (otp.step === 'code') {
    return (
      <div>
        <p className={styles.hint} style={{ marginBottom: '1rem' }}>
          We sent a {OTP_LENGTH}-digit code to <strong>{otp.email.trim()}</strong>.
        </p>
        <div className={styles.field}>
          <label className={styles.label} id="chess-otp-label">
            {OTP_LENGTH}-digit code
          </label>
          <OtpBoxes
            className={styles.otpTheme}
            value={otp.code}
            onChange={otp.setCode}
            disabled={verifying}
            invalid={Boolean(otp.error)}
            labelledBy="chess-otp-label"
            describedBy="chess-otp-feedback"
          />
        </div>
        <div id="chess-otp-feedback">
          {verifying && (
            <p className={styles.hint} role="status">
              Verifying…
            </p>
          )}
          {otp.error && (
            <div className={styles.alert} role="alert">
              {otp.error.message}
              {otp.error.kind === 'network' && (
                <>
                  {' '}
                  <button type="button" className={styles.inlineAction} onClick={() => void otp.retryVerification()} disabled={verifying}>
                    Retry verification
                  </button>
                </>
              )}
            </div>
          )}
          {otp.notice && !otp.error && (
            <p className={styles.hint} role="status">
              {otp.notice}
            </p>
          )}
        </div>
        <div className={styles.secondaryRow}>
          <button type="button" className={styles.switchStep} onClick={() => void otp.resendCode()} disabled={verifying || sending || otp.cooldown > 0}>
            {sending ? 'Sending…' : otp.cooldown > 0 ? `Resend code in ${otp.cooldown}s` : 'Resend code'}
          </button>
          <button type="button" className={styles.switchStep} onClick={otp.changeEmail} disabled={verifying}>
            ← Change email
          </button>
        </div>
      </div>
    )
  }

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        void otp.sendCode()
      }}
    >
      {otp.error && (
        <div className={styles.alert} role="alert" id="chess-otp-email-error">
          {otp.error.message}
        </div>
      )}
      <div className={styles.field}>
        <label className={styles.label} htmlFor="chess-otp-email">
          Email address
        </label>
        <input
          id="chess-otp-email"
          className={styles.input}
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={otp.email}
          onChange={(e) => otp.setEmail(e.target.value)}
          disabled={sending}
          aria-invalid={otp.error ? true : undefined}
          aria-describedby={otp.error ? 'chess-otp-email-error' : undefined}
        />
      </div>
      <button type="submit" className={styles.button} disabled={sending}>
        {sending ? 'Sending…' : 'Send code'}
      </button>
    </form>
  )
}
