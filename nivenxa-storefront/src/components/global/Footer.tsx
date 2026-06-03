import { Link } from '@/i18n/routing'
import { COLLECTIONS, STORIES, SOCIAL } from '@/data/footer'
import styles from './Footer.module.scss'

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>

        {/* Col 1 — brand + social */}
        <div className={styles.brand}>
          <p className={styles.logo}>NIVENXA</p>
          <p className={styles.tagline}>
            Elevated Indian comfortwear<br />crafted from natural bio-washed fabrics.
          </p>
          {/* Social links */}
          <div className={styles.social}>
            {SOCIAL.map(({ label, href }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.socialLink}
              >
                {label === 'Instagram' && (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="1.6"
                    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                    <circle cx="12" cy="12" r="4.5"/>
                    <circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" stroke="none"/>
                  </svg>
                )}
                {label === 'YouTube' && (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="1.6"
                    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 0 0 1.46 6.42 29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58 2.78 2.78 0 0 0 1.95 1.96C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.96-1.96A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z"/>
                    <polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="currentColor" stroke="none"/>
                  </svg>
                )}
                <span>{label}</span>
              </a>
            ))}
          </div>
        </div>

        {/* Col 2 — Collections */}
        <div>
          <p className={styles.colTitle}>Collections</p>
          <ul className={styles.links}>
            {COLLECTIONS.map(({ label, href }) => (
              <li key={label}>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                <Link href={href as any} className={styles.link}>{label}</Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Col 3 — Stories */}
        <div>
          <p className={styles.colTitle}>Stories</p>
          <ul className={styles.links}>
            {STORIES.map(({ label, href }) => (
              <li key={label}>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                <Link href={href as any} className={styles.link}>{label}</Link>
              </li>
            ))}
          </ul>
        </div>


      </div>

      <div className={styles.bottom}>
        <p className={styles.copy}>© 2026 NIVENXA. All rights reserved.</p>
        <p className={styles.copy}>Designed in India. Worn naturally.</p>
      </div>
    </footer>
  )
}
