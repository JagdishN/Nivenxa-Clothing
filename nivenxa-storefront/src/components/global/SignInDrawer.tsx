'use client'
import { useState, useTransition, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { registerCustomer } from '@/lib/shopify-auth'
import { EASE_OUT_EXPO } from '@/lib/motion'
import {
  isNonEmpty,
  isValidIdentifier,
  isValidPassword,
  isValidOtp,
} from '@/lib/validation'
import OtpInput from '@/components/ui/OtpInput'
import styles from './SignInDrawer.module.scss'

type DrawerView = 'signin' | 'register' | 'forgot'
type ForgotStep = 'identifier' | 'otp' | 'newPassword'
type FieldErrors = Record<string, string>

const OTP_SECONDS = 30

interface Props {
  open:    boolean
  onClose: () => void
}

// ─── Required label ───────────────────────────────────────────────────────────
function Req() {
  return <span className={styles.required} aria-hidden="true">*</span>
}

// ─── Field error ──────────────────────────────────────────────────────────────
function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null
  return <span className={styles.fieldError}>{msg}</span>
}

export default function SignInDrawer({ open, onClose }: Props) {
  const { login }    = useAuth()
  const { toast }    = useToast()
  const router       = useRouter()
  const [isPending, startTransition] = useTransition()

  // ── Sign In ───────────────────────────────────────────────────────────────
  const [identifier,  setIdentifier]  = useState('')
  const [password,    setPassword]    = useState('')
  const [siErrors,    setSiErrors]    = useState<FieldErrors>({})

  // ── View routing ──────────────────────────────────────────────────────────
  const [view,       setView]       = useState<DrawerView>('signin')
  const [forgotStep, setForgotStep] = useState<ForgotStep>('identifier')

  // ── Register ──────────────────────────────────────────────────────────────
  const [regFirstName, setRegFirstName] = useState('')
  const [regLastName,  setRegLastName]  = useState('')
  const [regId,        setRegId]        = useState('')
  const [regPassword,  setRegPassword]  = useState('')
  const [regConfirm,   setRegConfirm]   = useState('')
  const [regErrors,    setRegErrors]    = useState<FieldErrors>({})

  // ── Forgot password ───────────────────────────────────────────────────────
  const [forgotId,        setForgotId]        = useState('')
  const [otp,             setOtp]             = useState('')
  const [newPassword,     setNewPassword]     = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fpErrors,        setFpErrors]        = useState<FieldErrors>({})

  // ── OTP timer ─────────────────────────────────────────────────────────────
  const [timerSec,    setTimerSec]    = useState(OTP_SECONDS)
  const [timerActive, setTimerActive] = useState(false)

  // Reset on close
  useEffect(() => {
    if (open) return
    setView('signin'); setForgotStep('identifier')
    setSiErrors({}); setRegErrors({}); setFpErrors({})
    setOtp(''); setTimerActive(false)
  }, [open])

  // Escape + scroll lock
  useEffect(() => {
    if (!open) return
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onEsc)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onEsc); document.body.style.overflow = '' }
  }, [open, onClose])

  // OTP countdown
  useEffect(() => {
    if (!timerActive || timerSec <= 0) { if (timerSec <= 0) setTimerActive(false); return }
    const id = setInterval(() => setTimerSec((s) => s - 1), 1000)
    return () => clearInterval(id)
  }, [timerActive, timerSec])

  // ── Validation ────────────────────────────────────────────────────────────

  function validateSignIn(): FieldErrors {
    const e: FieldErrors = {}
    if (!isNonEmpty(identifier))       e.identifier = 'Phone number or email is required.'
    else if (!isValidIdentifier(identifier)) e.identifier = 'Check your email or phone number and try again.'
    if (!isNonEmpty(password))         e.password = 'Password is required.'
    return e
  }

  function validateRegister(): FieldErrors {
    const e: FieldErrors = {}
    if (!isNonEmpty(regFirstName))     e.firstName  = 'First name is required.'
    if (!isNonEmpty(regLastName))      e.lastName   = 'Last name is required.'
    if (!isNonEmpty(regId))            e.regId      = 'Phone number or email is required.'
    else if (!isValidIdentifier(regId)) e.regId     = 'Check your email or phone number and try again.'
    if (!isNonEmpty(regPassword))      e.regPassword = 'Password is required.'
    else if (!isValidPassword(regPassword)) e.regPassword = 'Password must be at least 8 characters.'
    if (!isNonEmpty(regConfirm))       e.regConfirm = 'Please confirm your password.'
    else if (regPassword !== regConfirm)   e.regConfirm = 'Passwords do not match.'
    return e
  }

  function validateForgotId(): FieldErrors {
    const e: FieldErrors = {}
    if (!isNonEmpty(forgotId))              e.forgotId = 'Phone number or email is required.'
    else if (!isValidIdentifier(forgotId))  e.forgotId = 'Check your email or phone number and try again.'
    return e
  }

  function validateOtp(): FieldErrors {
    const e: FieldErrors = {}
    if (!isValidOtp(otp)) e.otp = 'Enter a valid 4–6 digit OTP.'
    return e
  }

  function validateNewPassword(): FieldErrors {
    const e: FieldErrors = {}
    if (!isNonEmpty(newPassword))            e.newPassword = 'Password is required.'
    else if (!isValidPassword(newPassword))  e.newPassword = 'Password must be at least 8 characters.'
    if (!isNonEmpty(confirmPassword))        e.confirmPassword = 'Please confirm your password.'
    else if (newPassword !== confirmPassword) e.confirmPassword = 'Passwords do not match.'
    return e
  }

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handleSignIn(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    const errs = validateSignIn()
    if (Object.keys(errs).length) { setSiErrors(errs); return }
    setSiErrors({})
    startTransition(async () => {
      const { errors } = await login(identifier, password)
      if (errors.length > 0) {
        toast('error', errors[0].message)
      } else {
        toast('success', 'Welcome back to NIVENXA.')
        onClose(); router.push('/account')
      }
    })
  }

  function handleRegister(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    const errs = validateRegister()
    if (Object.keys(errs).length) { setRegErrors(errs); return }
    setRegErrors({})
    startTransition(async () => {
      const { errors } = await registerCustomer({
        firstName: regFirstName,
        lastName:  regLastName,
        email:     regId,
        password:  regPassword,
      })
      if (errors.length > 0) {
        toast('error', errors[0].message)
      } else {
        await login(regId, regPassword)
        toast('success', 'Account created. Welcome to NIVENXA.')
        onClose(); router.push('/account')
      }
    })
  }

  function handleSendOtp(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    const errs = validateForgotId()
    if (Object.keys(errs).length) { setFpErrors(errs); return }
    setFpErrors({})
    startTransition(async () => {
      // TODO: await sendPasswordResetOtp(forgotId)
      setForgotStep('otp'); setTimerSec(OTP_SECONDS); setTimerActive(true)
      toast('success', `OTP sent to ${forgotId}.`)
    })
  }

  function handleResendOtp() {
    setOtp(''); setTimerSec(OTP_SECONDS); setTimerActive(true)
    toast('success', 'OTP resent.')
  }

  function handleVerifyOtp(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    const errs = validateOtp()
    if (Object.keys(errs).length) { setFpErrors(errs); return }
    setFpErrors({})
    startTransition(async () => {
      // TODO: await verifyOtp(forgotId, otp)
      setForgotStep('newPassword')
    })
  }

  function handleResetPassword(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    const errs = validateNewPassword()
    if (Object.keys(errs).length) { setFpErrors(errs); return }
    setFpErrors({})
    startTransition(async () => {
      // TODO: await resetPassword(forgotId, otp, newPassword)
      toast('success', 'Password updated successfully.')
      onClose()
    })
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <AnimatePresence>
      {open && (
        <>
          <div className={styles.backdropClick} onClick={onClose} aria-hidden="true" />

          <motion.aside
            className={`${styles.drawer} ${view === 'register' ? styles.drawerTall : ''}`}
            role="dialog" aria-modal="true" aria-label="Account"
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ duration: 0.9, ease: EASE_OUT_EXPO }}
          >
            <button className={styles.close} onClick={onClose} aria-label="Close">&#x2715;</button>

            {/* ── Sign In ──────────────────────────────────────────────────── */}
            {view === 'signin' && (
              <>
                <header className={styles.header}>
                  <p className={styles.eyebrow}>Account</p>
                  <h2 className={styles.title}>Sign In</h2>
                  <p className={styles.subtitle}>Access orders, saved pieces, and account details.</p>
                </header>

                <form className={styles.form} onSubmit={handleSignIn} noValidate>
                  <div className={styles.field}>
                    <label className={styles.label} htmlFor="si-id">Phone Number / Email <Req /></label>
                    <input id="si-id" type="text" className={`${styles.input} ${siErrors.identifier ? styles.inputError : ''}`}
                      value={identifier} onChange={(e) => setIdentifier(e.target.value)}
                      autoComplete="username" placeholder="Email or phone number" />
                    <FieldError msg={siErrors.identifier} />
                  </div>

                  <div className={styles.field}>
                    <label className={styles.label} htmlFor="si-pw">Password <Req /></label>
                    <input id="si-pw" type="password" className={`${styles.input} ${siErrors.password ? styles.inputError : ''}`}
                      value={password} onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password" />
                    <FieldError msg={siErrors.password} />
                  </div>

                  <button type="submit" className={styles.submitBtn} disabled={isPending}>
                    {isPending ? 'Signing In' : 'Sign In'}
                  </button>

                  <button type="button" className={styles.forgotLink}
                    onClick={() => { setView('forgot'); setForgotStep('identifier') }}>
                    Forgot password?
                  </button>
                </form>

                <div className={styles.createAccount}>
                  <span className={styles.createAccountText}>New to NIVENXA?</span>
                  <button type="button" className={styles.createAccountLink}
                    onClick={() => setView('register')}>
                    Create account
                  </button>
                </div>
              </>
            )}

            {/* ── Register ─────────────────────────────────────────────────── */}
            {view === 'register' && (
              <>
                <header className={styles.header}>
                  <button type="button" className={styles.backLink} onClick={() => setView('signin')}>← Sign In</button>
                  <h2 className={styles.title}>Create Account</h2>
                  <p className={styles.subtitle}>Create your NIVENXA account to access saved pieces, order history, and upcoming collections.</p>
                </header>

                <form className={styles.formDense} onSubmit={handleRegister} noValidate>
                  <div className={styles.nameRow}>
                    <div className={styles.field}>
                      <label className={styles.label} htmlFor="reg-fn">First Name <Req /></label>
                      <input id="reg-fn" type="text" className={`${styles.input} ${regErrors.firstName ? styles.inputError : ''}`}
                        value={regFirstName} onChange={(e) => setRegFirstName(e.target.value)}
                        autoComplete="given-name" />
                      <FieldError msg={regErrors.firstName} />
                    </div>
                    <div className={styles.field}>
                      <label className={styles.label} htmlFor="reg-ln">Last Name <Req /></label>
                      <input id="reg-ln" type="text" className={`${styles.input} ${regErrors.lastName ? styles.inputError : ''}`}
                        value={regLastName} onChange={(e) => setRegLastName(e.target.value)}
                        autoComplete="family-name" />
                      <FieldError msg={regErrors.lastName} />
                    </div>
                  </div>

                  <div className={styles.field}>
                    <label className={styles.label} htmlFor="reg-id">Phone Number / Email <Req /></label>
                    <input id="reg-id" type="text" className={`${styles.input} ${regErrors.regId ? styles.inputError : ''}`}
                      value={regId} onChange={(e) => setRegId(e.target.value)}
                      autoComplete="username" placeholder="Email or phone number" />
                    <FieldError msg={regErrors.regId} />
                  </div>

                  <div className={styles.field}>
                    <label className={styles.label} htmlFor="reg-pw">Password <Req /></label>
                    <input id="reg-pw" type="password" className={`${styles.input} ${regErrors.regPassword ? styles.inputError : ''}`}
                      value={regPassword} onChange={(e) => setRegPassword(e.target.value)}
                      autoComplete="new-password" minLength={8} />
                    <FieldError msg={regErrors.regPassword} />
                  </div>

                  <div className={styles.field}>
                    <label className={styles.label} htmlFor="reg-cp">Confirm Password <Req /></label>
                    <input id="reg-cp" type="password" className={`${styles.input} ${regErrors.regConfirm ? styles.inputError : ''}`}
                      value={regConfirm} onChange={(e) => setRegConfirm(e.target.value)}
                      autoComplete="new-password" />
                    <FieldError msg={regErrors.regConfirm} />
                  </div>

                  <button type="submit" className={styles.submitBtn} disabled={isPending}>
                    {isPending ? 'Creating account…' : 'Create Account'}
                  </button>
                </form>
              </>
            )}

            {/* ── Forgot Password ───────────────────────────────────────────── */}
            {view === 'forgot' && (
              <>
                <header className={styles.header}>
                  <button type="button" className={styles.backLink} onClick={() => setView('signin')}>← Sign In</button>
                  <h2 className={styles.title}>
                    {forgotStep === 'newPassword' ? 'New Password' : 'Reset Password'}
                  </h2>
                  <p className={styles.subtitle}>
                    {forgotStep === 'identifier' && "We'll send an OTP to your email or phone."}
                    {forgotStep === 'otp'         && `OTP sent to ${forgotId}.`}
                    {forgotStep === 'newPassword'  && 'Create a new password for your account.'}
                  </p>
                </header>

                {forgotStep === 'identifier' && (
                  <form className={styles.form} onSubmit={handleSendOtp} noValidate>
                    <div className={styles.field}>
                      <label className={styles.label} htmlFor="fp-id">Phone Number / Email <Req /></label>
                      <input id="fp-id" type="text" className={`${styles.input} ${fpErrors.forgotId ? styles.inputError : ''}`}
                        value={forgotId} onChange={(e) => setForgotId(e.target.value)}
                        placeholder="Email or phone number" autoComplete="username" />
                      <FieldError msg={fpErrors.forgotId} />
                    </div>
                    <button type="submit" className={styles.submitBtn} disabled={isPending}>
                      {isPending ? 'Sending…' : 'Send OTP'}
                    </button>
                  </form>
                )}

                {forgotStep === 'otp' && (
                  <form className={styles.form} onSubmit={handleVerifyOtp} noValidate>
                    <div className={styles.field}>
                      <label className={styles.label}>Enter OTP <Req /></label>
                      <OtpInput value={otp} onChange={setOtp} />
                      <FieldError msg={fpErrors.otp} />
                    </div>
                    <button type="submit" className={styles.submitBtn} disabled={isPending || otp.length < 4}>
                      {isPending ? 'Verifying…' : 'Verify'}
                    </button>
                    <div className={styles.resendRow}>
                      {timerActive
                        ? <span className={styles.timerText}>Resend OTP in {timerSec}s</span>
                        : <button type="button" className={styles.resendBtn} onClick={handleResendOtp}>Resend OTP</button>
                      }
                    </div>
                  </form>
                )}

                {forgotStep === 'newPassword' && (
                  <form className={styles.form} onSubmit={handleResetPassword} noValidate>
                    <div className={styles.field}>
                      <label className={styles.label} htmlFor="fp-np">New Password <Req /></label>
                      <input id="fp-np" type="password" className={`${styles.input} ${fpErrors.newPassword ? styles.inputError : ''}`}
                        value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                        autoComplete="new-password" minLength={8} />
                      <FieldError msg={fpErrors.newPassword} />
                    </div>
                    <div className={styles.field}>
                      <label className={styles.label} htmlFor="fp-cp">Confirm Password <Req /></label>
                      <input id="fp-cp" type="password" className={`${styles.input} ${fpErrors.confirmPassword ? styles.inputError : ''}`}
                        value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                        autoComplete="new-password" />
                      <FieldError msg={fpErrors.confirmPassword} />
                    </div>
                    <button type="submit" className={styles.submitBtn} disabled={isPending}>
                      {isPending ? 'Updating…' : 'Update Password'}
                    </button>
                  </form>
                )}
              </>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
