import { Link } from '@/i18n/routing'
import { COLLECTIONS, STORIES } from '@/data/footer'
import styles from './Footer.module.scss'

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>

        {/* Left — brand */}
        <div className={styles.brand}>
          <p className={styles.logo}>NIVENXA</p>
          <p className={styles.tagline}>
            Elevated Indian comfortwear<br />crafted from natural bio-washed fabrics.
          </p>
        </div>

        {/* Centre — Collections */}
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

        {/* Right — Stories */}
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
        <p className={styles.copy}>© 2025 NIVENXA. All rights reserved.</p>
        <p className={styles.copy}>Designed in India. Worn naturally.</p>
      </div>
    </footer>
  )
}
