// First-party cookie consent for NIVENXA Studio only — Chess and Living use
// essential cookies only (confirmed: no analytics/ad scripts exist on
// either), so this module and the banner that reads/writes it are never
// mounted there. See CookieConsentBanner.tsx.

// Bumped whenever the cookie-consent terms change in a way that needs fresh
// consent — a stored choice whose policyVersion doesn't match this is
// treated as if no choice had been made at all.
export const COOKIE_CONSENT_POLICY_VERSION = '2026-10-22'

const COOKIE_NAME = 'nivenxa_cookie_consent'
const COOKIE_MAX_AGE_SECONDS = 365 * 24 * 60 * 60

export type ConsentCategory = 'analytics' | 'advertising'

export interface CookieConsentChoice {
  analytics: boolean
  advertising: boolean
  consentedAt: string
  policyVersion: string
}

export function readCookieConsent(): CookieConsentChoice | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]*)`))
  if (!match) return null
  try {
    const parsed = JSON.parse(decodeURIComponent(match[1])) as CookieConsentChoice
    // A different policy version means the terms changed — treat as unconsented so the banner asks again.
    if (parsed.policyVersion !== COOKIE_CONSENT_POLICY_VERSION) return null
    return parsed
  } catch {
    return null
  }
}

export function writeCookieConsent(choice: { analytics: boolean; advertising: boolean }): CookieConsentChoice {
  const value: CookieConsentChoice = {
    analytics: choice.analytics,
    advertising: choice.advertising,
    consentedAt: new Date().toISOString(),
    policyVersion: COOKIE_CONSENT_POLICY_VERSION,
  }
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(JSON.stringify(value))}; path=/; max-age=${COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`
  return value
}

// Known first-party cookie names a category's scripts would have set —
// deleted on revoke so a category that's off doesn't leave stale tracking
// cookies behind. Best-effort: a cookie set on a different domain/subdomain
// than this one (some real _ga deployments are) can't be deleted from here.
const CATEGORY_COOKIE_NAMES: Record<ConsentCategory, string[]> = {
  analytics: ['_ga', '_gid', '_gat'],
  advertising: ['_fbp', '_fbc'],
}

export function purgeCategoryCookies(category: ConsentCategory): void {
  if (typeof document === 'undefined') return
  for (const name of CATEGORY_COOKIE_NAMES[category]) {
    document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`
  }
}
