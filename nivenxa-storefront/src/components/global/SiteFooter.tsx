import Link from 'next/link'
import styles from './SiteFooter.module.scss'

export interface SiteFooterLink {
  label: string
  href: string
}

export interface SiteFooterColumn {
  title: string
  links: SiteFooterLink[]
}

export interface SiteFooterSocialLink {
  label: 'Instagram' | 'YouTube'
  href: string
}

export interface SiteFooterProps {
  /** One or more app-specific columns, rendered before the shared NIVENXA column — Chess/Living pass exactly one ("Nivenxa Chess"/"Nivenxa Living"); Studio passes two ("Customer care", "Legal"). */
  columns: SiteFooterColumn[]
  /** Only Studio has these today — same Instagram/YouTube icons as the pre-SiteFooter Studio footer, kept exactly. Omitted entirely for Chess/Living. */
  socialLinks?: SiteFooterSocialLink[]
  /**
   * The exact label (within `columns`) that should reopen the cookie-consent
   * panel instead of navigating — e.g. "Cookie settings". Rendered as a
   * <button data-open-cookie-settings> rather than a <Link>, so this
   * component stays a plain server component: CookieConsentBanner.tsx (a
   * client component mounted once in Studio's shop layout) listens for
   * clicks on that attribute globally, rather than this needing an onClick
   * prop handed down from a Server Component, which isn't possible.
   */
  cookieSettingsLabel?: string
}

// Every real, currently-reachable NIVENXA product — shown on every app's
// footer via this one shared component, not duplicated per app. "Studio"
// points at /studio/en specifically: the Studio app has no locale-detection
// middleware, so the bare /studio path 404s (confirmed) — /studio/en is the
// real, always-resolvable entry point.
const NIVENXA_LINKS: SiteFooterLink[] = [
  { label: 'Studio', href: '/studio/en' },
  { label: 'Chess', href: '/chess' },
  { label: 'Living', href: '/living' },
  { label: 'Technologies', href: '/technologies' },
]

/**
 * Minimal site-wide footer, shared across every NIVENXA app — each app
 * passes its own column(s) and (optionally) social links; the NIVENXA-wide
 * product list stays fixed here since it's the same regardless of which
 * app renders it.
 */
export default function SiteFooter({ columns, socialLinks, cookieSettingsLabel }: SiteFooterProps) {
  const year = new Date().getFullYear()
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.brand}>
          <p className={styles.wordmark}>NIVENXA</p>
          <p className={styles.tagline}>Independent ventures. Built with intention.</p>

          {socialLinks && socialLinks.length > 0 && (
            <div className={styles.social}>
              {socialLinks.map(({ label, href }) => (
                <a key={label} href={href} target="_blank" rel="noopener noreferrer" className={styles.socialLink}>
                  {label === 'Instagram' && (
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                      <circle cx="12" cy="12" r="4.5" />
                      <circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" stroke="none" />
                    </svg>
                  )}
                  {label === 'YouTube' && (
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 0 0 1.46 6.42 29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58 2.78 2.78 0 0 0 1.95 1.96C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.96-1.96A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z" />
                      <polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="currentColor" stroke="none" />
                    </svg>
                  )}
                  <span>{label}</span>
                </a>
              ))}
            </div>
          )}
        </div>

        {columns.map((col) => (
          <div className={styles.column} key={col.title}>
            <p className={styles.columnTitle}>{col.title}</p>
            <ul className={styles.links}>
              {col.links.map(({ label, href }) => (
                <li key={label}>
                  {label === cookieSettingsLabel ? (
                    <button type="button" className={styles.link} data-open-cookie-settings>
                      {label}
                    </button>
                  ) : (
                    <Link href={href} className={styles.link}>
                      {label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div className={styles.column}>
          <p className={styles.columnTitle}>NIVENXA</p>
          <ul className={styles.links}>
            {NIVENXA_LINKS.map(({ label, href }) => (
              <li key={label}>
                <Link href={href} className={styles.link}>
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className={styles.bottom}>
        <p className={styles.copy}>© {year} NIVENXA · Hyderabad, India</p>
      </div>
    </footer>
  )
}
