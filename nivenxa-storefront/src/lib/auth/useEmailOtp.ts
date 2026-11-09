'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { classifyOtpError, cleanOtp, isCompleteOtp, isValidEmail, otpErrorMessage, OTP_LENGTH, type OtpErrorKind } from './otp'

export const RESEND_COOLDOWN_SECONDS = 30

export type OtpStep = 'email' | 'code'
export type OtpStatus = 'idle' | 'sending' | 'verifying' | 'verified'
export interface OtpError {
  kind: OtpErrorKind | 'email'
  message: string
}

interface Options {
  getClient: () => SupabaseClient
  /** true for sign-up (a new account may be created), false for log-in (an unknown email is an error). */
  shouldCreateUser: boolean
  /** Runs after the SERVER has confirmed the code (verifyOtp succeeded) — and only then. Errors it throws are shown inline. */
  onVerified: () => Promise<void> | void
  /** Wording for "no account for this email" (login only). */
  notFoundMessage?: string
}

/**
 * Email one-time-code sign-in, shared by Chess and Living so both behave identically:
 *  - a complete 6-digit code (typed, pasted or autofilled) is verified automatically, once;
 *  - an unchanged code that was already rejected is never re-submitted; a corrected complete code is;
 *  - only one request is ever in flight; resend / change email bump a generation counter so any response that
 *    arrives afterwards for the old code is ignored;
 *  - wrong/expired, network and rate-limit failures are reported separately, and a network failure keeps the code
 *    so `retryVerification()` can re-check it without typing again.
 * The code itself is never logged or sent anywhere except the verifyOtp call.
 */
export function useEmailOtp({ getClient, shouldCreateUser, onVerified, notFoundMessage }: Options) {
  const [email, setEmailState] = useState('')
  const [step, setStep] = useState<OtpStep>('email')
  const [code, setCodeState] = useState('')
  const [status, setStatus] = useState<OtpStatus>('idle')
  const [error, setError] = useState<OtpError | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [cooldown, setCooldown] = useState(0)

  const generation = useRef(0) // bumped by resend / change email / unmount: older responses are dropped
  const busy = useRef(false)
  const lastSubmitted = useRef('') // the last complete code sent to the server
  const lastRejection = useRef<OtpError | null>(null) // why that code was refused (shown again if the same code is re-entered)
  const onVerifiedRef = useRef(onVerified)
  useEffect(() => {
    onVerifiedRef.current = onVerified
  }, [onVerified])

  useEffect(() => {
    const g = generation
    return () => {
      g.current++ // unmounted: ignore anything still in flight
    }
  }, [])

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  const invalidate = useCallback(() => {
    generation.current++
    busy.current = false
    lastSubmitted.current = ''
    lastRejection.current = null
  }, [])

  const send = useCallback(
    async (isResend: boolean): Promise<boolean> => {
      if (busy.current) return false
      const address = email.trim()
      if (!isValidEmail(address)) {
        setError({ kind: 'email', message: 'Enter a valid email address, like name@example.com.' })
        return false
      }
      busy.current = true
      const g = ++generation.current
      lastSubmitted.current = ''
      lastRejection.current = null
      setError(null)
      setNotice(null)
      setStatus('sending')
      try {
        const { error: err } = await getClient().auth.signInWithOtp({ email: address, options: { shouldCreateUser } })
        if (g !== generation.current) return false
        if (err) {
          const kind = classifyOtpError(err)
          const notFound = !shouldCreateUser && notFoundMessage && err.message.toLowerCase().includes('not found')
          setError({ kind, message: notFound ? notFoundMessage : otpErrorMessage(kind, 'send', err.message) })
          return false
        }
        setCodeState('')
        setCooldown(RESEND_COOLDOWN_SECONDS)
        setStep('code')
        if (isResend) setNotice('A new code is on its way. Use the newest email.')
        return true
      } catch (e) {
        if (g !== generation.current) return false
        setError({ kind: 'network', message: otpErrorMessage(classifyOtpError(e as Error), 'send') })
        return false
      } finally {
        if (g === generation.current) {
          busy.current = false
          setStatus('idle')
        }
      }
    },
    [email, getClient, shouldCreateUser, notFoundMessage]
  )

  const verify = useCallback(
    async (token: string, force = false) => {
      if (busy.current || !isCompleteOtp(token)) return
      if (token === lastSubmitted.current && !force) return // that exact code was already rejected
      busy.current = true
      const g = generation.current
      lastSubmitted.current = token
      setError(null)
      setNotice(null)
      setStatus('verifying') // "Verifying…" shows immediately, before any await
      try {
        const { error: err } = await getClient().auth.verifyOtp({ email: email.trim(), token, type: 'email' })
        if (g !== generation.current) return
        if (err) {
          const kind = classifyOtpError(err)
          if (kind === 'network') lastSubmitted.current = '' // nothing was decided: allow an identical retry
          const failure: OtpError = { kind, message: otpErrorMessage(kind, 'verify', err.message) }
          lastRejection.current = kind === 'network' ? null : failure
          setError(failure)
          setStatus('idle')
          busy.current = false
          return
        }
        setStatus('verified')
        try {
          await onVerifiedRef.current()
        } catch (e) {
          if (g !== generation.current) return
          setStatus('idle')
          busy.current = false
          setError({ kind: 'other', message: e instanceof Error && e.message.length < 140 ? e.message : 'Signed in, but something went wrong. Please try again.' })
        }
      } catch (e) {
        if (g !== generation.current) return
        lastSubmitted.current = ''
        setError({ kind: 'network', message: otpErrorMessage(classifyOtpError(e as Error), 'verify') })
        setStatus('idle')
        busy.current = false
      }
    },
    [email, getClient]
  )

  const setEmail = (v: string) => {
    setEmailState(v)
    if (error?.kind === 'email') setError(null)
  }

  /** Called with whatever the code field now holds (typed, pasted, autofilled): cleans it and verifies once it is complete. */
  const setCode = (raw: string) => {
    if (busy.current && status === 'verifying') return // a check is running; ignore edits until it answers
    const digits = cleanOtp(raw)
    setCodeState(digits)
    if (digits !== code) setError(null)
    if (digits.length === OTP_LENGTH && digits === lastSubmitted.current && lastRejection.current) {
      setError(lastRejection.current) // the same refused code again: explain, don't ask the server again
      return
    }
    if (digits.length === OTP_LENGTH) void verify(digits)
  }

  return {
    email,
    setEmail,
    step,
    code,
    setCode,
    status,
    error,
    notice,
    cooldown,
    sendCode: () => send(false),
    resendCode: () => {
      if (cooldown > 0) return Promise.resolve(false)
      invalidate()
      return send(true)
    },
    retryVerification: () => verify(code, true),
    changeEmail: () => {
      invalidate()
      setStep('email')
      setCodeState('')
      setError(null)
      setNotice(null)
      setCooldown(0)
      setStatus('idle')
    },
    /** For callers that need to stop/ignore everything in flight (e.g. the drawer closing). */
    cancel: invalidate,
  }
}
