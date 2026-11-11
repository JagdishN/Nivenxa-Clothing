'use client'
import { createLivingBrowserClient } from '@/lib/living/supabaseBrowser'
import { OTP_LENGTH } from '@/lib/auth/otp'
import { useEmailOtp } from '@/lib/auth/useEmailOtp'
import OtpInput from './OtpInput'
import theme from '../LivingTheme.module.scss'
import styles from './AuthForm.module.scss'

/**
 * Living's email-code sign-in (email step + code step), used by the sign-in drawer and by the /living/signup page.
 * Behaviour comes from the shared hook (src/lib/auth/useEmailOtp.ts), identical to Chess: a complete 6-digit code is
 * verified automatically and only once, wrong/expired/network failures are shown separately and inline, a network
 * failure offers "Retry verification" without retyping, resend has a cooldown, and a resend or email change makes any
 * late answer for the old code irrelevant. Who may enter which apartment is decided later, by membership checks —
 * nothing here changes it. `onVerified` runs only after the server has confirmed the code.
 */
export default function LivingOtpFlow({ shouldCreateUser, onVerified }: { shouldCreateUser: boolean; onVerified: () => Promise<void> | void }) {
  const otp = useEmailOtp({
    getClient: createLivingBrowserClient,
    shouldCreateUser,
    onVerified,
    notFoundMessage: "We couldn't find an account for that email. Try Create Apartment instead.",
  })
  const sending = otp.status === 'sending'
  const verifying = otp.status === 'verifying' || otp.status === 'verified'

  if (otp.step === 'code') {
    return (
      <div>
        <p className={styles.hint} style={{ marginBottom: '1rem' }}>
          We sent a {OTP_LENGTH}-digit code to <strong>{otp.email.trim()}</strong>.
        </p>
        <div className={theme.field}>
          <label className={theme.label} id="living-otp-label">
            {OTP_LENGTH}-digit code
          </label>
          <OtpInput value={otp.code} onChange={otp.setCode} disabled={verifying} invalid={Boolean(otp.error)} labelledBy="living-otp-label" describedBy="living-otp-feedback" />
        </div>
        <div id="living-otp-feedback">
          {verifying && (
            <p className={styles.hint} role="status">
              Verifying…
            </p>
          )}
          {otp.error && (
            <div className={theme.alert} role="alert">
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
        <div className={theme.alert} role="alert" id="living-otp-email-error">
          {otp.error.message}
        </div>
      )}
      <div className={theme.field}>
        <label className={theme.label} htmlFor="living-otp-email">
          Email address
        </label>
        <input
          id="living-otp-email"
          className={theme.input}
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={otp.email}
          onChange={(e) => otp.setEmail(e.target.value)}
          disabled={sending}
          aria-invalid={otp.error ? true : undefined}
          aria-describedby={otp.error ? 'living-otp-email-error' : undefined}
        />
      </div>
      <button type="submit" className={theme.button} disabled={sending} style={{ width: '100%' }}>
        {sending ? 'Sending…' : 'Send code'}
      </button>
    </form>
  )
}
