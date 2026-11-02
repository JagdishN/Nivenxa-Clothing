'use client'
import { useEffect, useRef, useState } from 'react'
import { Link } from '@/i18n/routing'
import { purgeCategoryCookies, readCookieConsent, writeCookieConsent } from '@/lib/cookieConsent'
import { applyConsent, setConsentModeDefaults } from '@/lib/analyticsLoader'
import styles from './CookieConsentBanner.module.scss'

/**
 * Studio-only — Chess and Living use essential cookies only, so this is
 * never mounted there (see each app's own layout.tsx). Shown on first
 * visit, or again if the stored choice's policy version is stale (handled
 * by readCookieConsent() returning null in that case).
 *
 * The "Cookie settings" entries in SiteFooter.tsx and the Privacy Policy's
 * cookies section (src/data/privacyPolicy.ts) don't call this component
 * directly — they render a <button data-open-cookie-settings>, and this
 * component listens for clicks on that attribute globally, so neither of
 * those (one shared across every app, one plain content data) needs to
 * know this banner exists.
 */
export default function CookieConsentBanner() {
  const [visible, setVisible] = useState(false)
  const [panelOpen, setPanelOpen] = useState(false)
  const [analytics, setAnalytics] = useState(false)
  const [advertising, setAdvertising] = useState(false)
  const bannerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Reading document.cookie is unavoidably client-only — not available
    // during SSR — so this has to run in an effect; wrapped in its own
    // named function (rather than calling setVisible directly in the
    // effect body) for the same reason as PolicyAccordion.tsx's hash-sync
    // effect earlier this session.
    function syncFromStoredConsent() {
      setConsentModeDefaults()
      const stored = readCookieConsent()
      if (stored) {
        applyConsent(stored)
        return
      }
      setVisible(true)
    }
    syncFromStoredConsent()
  }, [])

  useEffect(() => {
    if (!visible) return
    bannerRef.current?.focus()
  }, [visible])

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if ((e.target as HTMLElement | null)?.closest('[data-open-cookie-settings]')) {
        setAnalytics(false)
        setAdvertising(false)
        setVisible(true)
        setPanelOpen(true)
      }
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [])

  function save(choice: { analytics: boolean; advertising: boolean }) {
    writeCookieConsent(choice)
    if (!choice.analytics) purgeCategoryCookies('analytics')
    if (!choice.advertising) purgeCategoryCookies('advertising')
    applyConsent(choice)
    setVisible(false)
    setPanelOpen(false)
  }

  if (!visible) return null

  return (
    <div
      ref={bannerRef}
      className={styles.banner}
      role="region"
      aria-label="Cookie preferences"
      tabIndex={-1}
    >
      {!panelOpen ? (
        <>
          <p className={styles.text}>
            We use essential cookies to run this store. With your permission, we&rsquo;d also like to use analytics and advertising
            cookies to improve the Site and show relevant ads.{' '}
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <Link href={'/privacy#cookies' as any} className={styles.link}>
              Privacy Policy
            </Link>
          </p>
          <div className={styles.actions}>
            <button type="button" className={styles.btn} onClick={() => save({ analytics: true, advertising: true })}>
              Accept all
            </button>
            <button type="button" className={styles.btn} onClick={() => save({ analytics: false, advertising: false })}>
              Reject non-essential
            </button>
            <button type="button" className={styles.btn} onClick={() => setPanelOpen(true)}>
              Manage choices
            </button>
          </div>
        </>
      ) : (
        <>
          <p className={styles.panelTitle}>Manage cookie choices</p>

          <label className={styles.toggleRow}>
            <span>
              <span className={styles.toggleLabel}>Essential</span>
              <span className={styles.toggleHint}>Always on — required to run the Site (cart, checkout, sign-in).</span>
            </span>
            <input type="checkbox" checked disabled />
          </label>

          <label className={styles.toggleRow}>
            <span>
              <span className={styles.toggleLabel}>Analytics</span>
              <span className={styles.toggleHint}>Helps us understand how the Site is used.</span>
            </span>
            <input type="checkbox" checked={analytics} onChange={(e) => setAnalytics(e.target.checked)} />
          </label>

          <label className={styles.toggleRow}>
            <span>
              <span className={styles.toggleLabel}>Advertising</span>
              <span className={styles.toggleHint}>Used to show relevant ads.</span>
            </span>
            <input type="checkbox" checked={advertising} onChange={(e) => setAdvertising(e.target.checked)} />
          </label>

          <div className={styles.actions}>
            <button type="button" className={styles.btn} onClick={() => save({ analytics, advertising })}>
              Save choices
            </button>
          </div>
        </>
      )}
    </div>
  )
}
