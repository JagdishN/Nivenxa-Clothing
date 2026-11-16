import type { Metadata } from 'next'
import { seoMetadata } from '@/lib/seo'
import styles from './page.module.scss'

// This holding page is identical in all 16 locales (it uses no translated text), so every locale names the English
// URL as its canonical instead of presenting sixteen duplicates. When Studio gets genuinely translated pages, give
// each locale its own canonical (and hreflang alternates) here.
export function generateMetadata(): Metadata {
  return seoMetadata({
    title: 'NIVENXA Studio — Coming Soon',
    description: 'NIVENXA Studio: premium Indian comfortwear, crafted with intention and rooted in Indian tradition. Coming soon.',
    path: '/studio/en',
  })
}

// Studio's landing page — a static holding splash, deliberately with no
// Navbar/Footer (see the sibling `(shop)` route group, which is what adds
// those) and no links of any kind. Nothing here should navigate anywhere.
export default function StudioHome() {
  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <h1 className={styles.wordmark}>Nivenxa</h1>
        <div className={styles.ruleTop} aria-hidden="true" />
        <p className={styles.label}>Premium Essentials</p>
        <div className={styles.badgeRow}>
          <span className={styles.dot} aria-hidden="true" />
          <span className={styles.comingSoon}>Coming Soon</span>
        </div>
        <div className={styles.ruleBottom} aria-hidden="true" />
        <p className={styles.taglineLine1}>Crafted with intention.</p>
        <p className={styles.taglineLine2}>Rooted in Indian tradition.</p>
      </div>
      <span className={styles.watermark} aria-hidden="true">
        Nivenxa
      </span>
    </div>
  )
}
