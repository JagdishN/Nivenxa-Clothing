import Link from 'next/link'
import { APP_FOOTERS, APP_LINKS, BRAND_LINKS, PARENT_DESCRIPTION, footerCopyright, type FooterApp, type FooterLink } from '@/lib/footerConfig'
import styles from './AppFooter.module.scss'

function FooterLinkItem({ link, current }: { link: FooterLink; current?: boolean }) {
  const external = link.href.startsWith('mailto:')
  return (
    <li>
      {external ? (
        <a href={link.href} className={styles.link}>
          {link.label}
        </a>
      ) : (
        <Link href={link.href} className={styles.link} aria-current={current ? 'page' : undefined}>
          {link.label}
        </Link>
      )}
    </li>
  )
}

/**
 * The one complete footer for Chess, Living and Technologies (Studio keeps its own SiteFooter and never renders this).
 * Everything is visible at once, no disclosure: NIVENXA identity · Brands · Apps · Support & Legal, then a copyright row.
 * App differences are configuration (name, legal links) and colour tokens only. `wide` aligns the content to Living's
 * wide signed-in container.
 */
export default function AppFooter({ app, wide }: { app: FooterApp; wide?: boolean }) {
  const c = APP_FOOTERS[app]
  return (
    <footer className={`${styles.footer} ${styles[`app_${app}`]} ${wide ? styles.wide : ''}`} aria-label={`${c.name} footer`}>
      <div className={styles.inner}>
        <div className={styles.columns}>
          <section className={`${styles.col} ${styles.identity}`} aria-labelledby={`ft-id-${app}`}>
            <h2 id={`ft-id-${app}`} className={styles.title}>
              NIVENXA
            </h2>
            <p className={styles.desc}>{PARENT_DESCRIPTION}</p>
            <p className={styles.current}>
              <span className={styles.appName}>{c.short}</span>
              <span className={styles.by}>
                {c.kind === 'app' ? 'a NIVENXA app' : 'a NIVENXA brand'}
              </span>
            </p>
          </section>
          <nav className={styles.col} aria-labelledby={`ft-brands-${app}`}>
            <h2 id={`ft-brands-${app}`} className={styles.title}>
              Brands
            </h2>
            <ul className={styles.list}>
              {BRAND_LINKS.map((l) => (
                <FooterLinkItem key={l.href} link={l} />
              ))}
            </ul>
          </nav>
          <nav className={styles.col} aria-labelledby={`ft-apps-${app}`}>
            <h2 id={`ft-apps-${app}`} className={styles.title}>
              Apps
            </h2>
            <ul className={styles.list}>
              {APP_LINKS.map((l) => (
                <FooterLinkItem key={l.href} link={l} current={l.label === c.name} />
              ))}
            </ul>
          </nav>
          <nav className={styles.col} aria-labelledby={`ft-support-${app}`}>
            <h2 id={`ft-support-${app}`} className={styles.title}>
              Support &amp; Legal
            </h2>
            <ul className={styles.list}>
              {[c.contact, c.privacy, c.terms].map((l) => (
                <FooterLinkItem key={l.href} link={l} />
              ))}
            </ul>
          </nav>
        </div>
        <p className={styles.copy}>{footerCopyright()}</p>
      </div>
    </footer>
  )
}
