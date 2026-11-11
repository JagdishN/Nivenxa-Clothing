// Pure helpers shared by the Chess and Living email-code sign-in (unit tested).

export const OTP_LENGTH = 6

/** Keeps digits only and caps at the code length — a pasted "123 456", an autofilled value or a typed digit all end up the same. */
export function cleanOtp(raw: string, length = OTP_LENGTH): string {
  return raw.replace(/\D/g, '').slice(0, length)
}

export const isCompleteOtp = (code: string, length = OTP_LENGTH) => new RegExp(`^\\d{${length}}$`).test(code)

/** Light client-side check only (the server decides who may sign in): something@something.tld, no spaces. */
export function isValidEmail(email: string): boolean {
  const e = email.trim()
  return e.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e)
}

export type OtpErrorKind = 'incorrect' | 'expired' | 'network' | 'rate' | 'other'

/**
 * Supabase answers a wrong code AND an expired one with the same "Token has expired or is invalid", so those two can't
 * be told apart from the response: that case is reported as 'incorrect' with copy that covers both. 'expired' is only
 * used when the server says so without also saying invalid. A thrown fetch/abort (no response) is 'network'.
 */
export function classifyOtpError(err: { message?: string; status?: number; code?: string; name?: string } | null | undefined): OtpErrorKind {
  const m = (err?.message ?? '').toLowerCase()
  const code = (err?.code ?? '').toLowerCase()
  if (err?.status === 429 || code.includes('rate_limit') || m.includes('rate limit') || m.includes('security purposes') || m.includes('too many')) return 'rate'
  if (
    !err?.status &&
    (m.includes('fetch') || m.includes('network') || m.includes('failed to') || m.includes('timeout') || m.includes('load failed') || err?.name === 'AuthRetryableFetchError')
  ) {
    return 'network'
  }
  if (m.includes('invalid')) return 'incorrect'
  if (m.includes('expired')) return 'expired'
  if (code === 'otp_expired') return 'incorrect'
  return 'other'
}

export function otpErrorMessage(kind: OtpErrorKind, step: 'send' | 'verify', raw?: string): string {
  switch (kind) {
    case 'incorrect':
      return "That code isn't right, or it may have expired. Check the digits, or send a new code."
    case 'expired':
      return 'That code has expired. Send a new code to continue.'
    case 'network':
      return step === 'verify' ? "We couldn't reach the server to check your code." : "We couldn't reach the server. Check your connection and try again."
    case 'rate':
      return 'Too many tries in a short time. Please wait a minute and try again.'
    default:
      return raw && raw.length < 140 ? raw : 'Something went wrong. Please try again.'
  }
}
