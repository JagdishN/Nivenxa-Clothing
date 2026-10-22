// No analytics or advertising script exists anywhere in this codebase yet
// (confirmed during Step 0 of the Studio legal-pages task — no GA, no GTM,
// no Meta pixel, on any route). This file is the GATE those scripts must
// go through once someone actually adds one, not a wrapper around anything
// live today — applyConsent() below is deliberately a no-op until a real
// measurement/pixel ID is configured, so nothing fires, consented or not,
// until there's something real to fire.
//
// Usage once a real id exists: read it from
// NEXT_PUBLIC_GA_MEASUREMENT_ID / NEXT_PUBLIC_META_PIXEL_ID (not set today)
// and call applyConsent(choice) — already wired up from
// CookieConsentBanner.tsx on every save/accept/reject.

declare global {
  interface Window {
    dataLayer?: unknown[]
    fbq?: ((...args: unknown[]) => void) & { callMethod?: unknown }
  }
}

function gtag(...args: unknown[]) {
  window.dataLayer = window.dataLayer ?? []
  window.dataLayer.push(args)
}

/**
 * Google Consent Mode v2 — defaults must be set before gtag.js itself ever
 * loads, which is why this runs unconditionally (not gated on consent) the
 * first time any page that might load analytics mounts, regardless of what
 * the visitor has chosen. The actual script tag only loads once analytics
 * consent is granted — see loadGoogleAnalytics() below.
 */
export function setConsentModeDefaults(): void {
  gtag('consent', 'default', {
    analytics_storage: 'denied',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
  })
}

function loadGoogleAnalytics(measurementId: string): void {
  if (document.getElementById('ga-script')) return
  gtag('consent', 'update', { analytics_storage: 'granted' })
  const script = document.createElement('script')
  script.id = 'ga-script'
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`
  document.head.appendChild(script)
  gtag('js', new Date())
  gtag('config', measurementId)
}

function loadMetaPixel(pixelId: string): void {
  if (document.getElementById('meta-pixel-script')) return
  gtag('consent', 'update', { ad_storage: 'granted', ad_user_data: 'granted', ad_personalization: 'granted' })
  const script = document.createElement('script')
  script.id = 'meta-pixel-script'
  script.async = true
  script.src = 'https://connect.facebook.net/en_US/fbevents.js'
  document.head.appendChild(script)
  script.onload = () => {
    window.fbq?.('init', pixelId)
    window.fbq?.('track', 'PageView')
  }
}

function unloadScript(id: string): void {
  document.getElementById(id)?.remove()
}

/**
 * Called on every accept/reject/save — loads exactly the scripts whose
 * category is granted and nothing else; removes a script tag whose
 * category was just revoked (the tag's own cookies are purged separately,
 * see purgeCategoryCookies() in cookieConsent.ts). Both branches are
 * currently no-ops: no NEXT_PUBLIC_GA_MEASUREMENT_ID / NEXT_PUBLIC_META_PIXEL_ID
 * is configured, so there's nothing to load or remove either way yet.
 */
export function applyConsent(choice: { analytics: boolean; advertising: boolean }): void {
  const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID
  if (gaId) {
    if (choice.analytics) loadGoogleAnalytics(gaId)
    else unloadScript('ga-script')
  }

  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID
  if (pixelId) {
    if (choice.advertising) loadMetaPixel(pixelId)
    else unloadScript('meta-pixel-script')
  }
}
