import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/routing'
import styles from './Footer.module.scss'

export default function Footer() {
  const t = useTranslations('footer')
  const tn = useTranslations('nav')

  const COLLECTIONS = [
    { key: 'shopAll', href: '/shop' },
    { key: 'women',   href: '/shop/women' },
    { key: 'kids',    href: '/shop/kids' },
    { key: 'unisex',  href: '/shop/unisex' },
  ] as const

  const ABOUT_KEYS = ['ourStory', 'craftsmanship', 'sustainability', 'contact'] as const

  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.brand}>
          <p className={styles.logo}>NIVENXA</p>
          <p className={styles.tagline}>{t('tagline')}</p>
        </div>

        <div>
          <p className={styles.colTitle}>{t('collectionsHeading')}</p>
          <ul className={styles.links}>
            {COLLECTIONS.map(({ key, href }) => (
              <li key={key}>
                <Link href={href} className={styles.link}>{tn(key)}</Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className={styles.colTitle}>{t('aboutHeading')}</p>
          <ul className={styles.links}>
            {ABOUT_KEYS.map((key) => (
              <li key={key}>
                <a href="#" className={styles.link}>{t(`aboutLinks.${key}`)}</a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className={styles.bottom}>
        <p className={styles.copy}>{t('copyright')}</p>
        <p className={styles.copy}>{t('madeIn')}</p>
      </div>
    </footer>
  )
}
