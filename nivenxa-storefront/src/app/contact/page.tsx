import Link from 'next/link'
import { seoMetadata } from '@/lib/seo'
import { LEGAL_ENTITY, LEGAL_ENTITY_GRIEVANCE_SLA, LEGAL_ENTITY_NAME_AND_ADDRESS } from '@/lib/legalEntity'
import SiteFooter from '@/components/global/SiteFooter'
import styles from './Contact.module.scss'

export const metadata = seoMetadata({
  title: 'Contact | NIVENXA',
  description: 'How to reach NIVENXA, Nivenxa Technologies, our Grievance Officer, and our registered business details.',
  path: '/contact',
})

const PARENT_FOOTER_COLUMNS = [
  {
    title: 'Ventures',
    links: [
      { label: 'Studio', href: '/studio/en' },
      { label: 'Chess', href: '/chess' },
      { label: 'Living', href: '/living' },
      { label: 'Technologies', href: '/technologies' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy Notice', href: '/privacy' },
      { label: 'Website Terms', href: '/terms' },
      { label: 'Contact', href: '/contact' },
    ],
  },
]

export default function ParentContactPage() {
  return (
    <>
      <div className={styles.page}>
        <div className={styles.hero}>
          <p className={styles.eyebrow}>NIVENXA / CONTACT</p>
          <h1 className={styles.title}>Contact</h1>
          <p className={styles.subtitle}>General and Technologies enquiries.</p>
        </div>

        <div className={styles.grid}>
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>General &amp; Technologies enquiries</h2>
            <a href={`mailto:${LEGAL_ENTITY.email}`} className={styles.cardLink}>
              {LEGAL_ENTITY.email}
            </a>
            <a href={LEGAL_ENTITY.phoneTel} className={styles.cardLink}>
              {LEGAL_ENTITY.phone}
            </a>
            <p className={styles.cardMuted}>We reply to emails within 1 business day.</p>
          </div>

          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Shopping help</h2>
            <p className={styles.cardLine}>Already shopping with NIVENXA Studio? Our Studio customer care team can help directly.</p>
            <Link href="/studio/en/contact" className={styles.cardLink}>
              Studio Contact →
            </Link>
          </div>

          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Grievance Officer</h2>
            <p className={styles.cardLine}>{LEGAL_ENTITY.grievanceOfficer}</p>
            <a href={`mailto:${LEGAL_ENTITY.email}`} className={styles.cardLink}>
              {LEGAL_ENTITY.email}
            </a>
            <a href={LEGAL_ENTITY.phoneTel} className={styles.cardLink}>
              {LEGAL_ENTITY.phone}
            </a>
            <p className={styles.cardMuted}>{LEGAL_ENTITY_GRIEVANCE_SLA}</p>
          </div>

          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Business details</h2>
            <p className={styles.cardLine}>
              {LEGAL_ENTITY_NAME_AND_ADDRESS.split('\n').map((line, i) => (
                <span key={i}>
                  {line}
                  <br />
                </span>
              ))}
            </p>
            <p className={styles.cardMuted}>GSTIN: {LEGAL_ENTITY.gstin}</p>
          </div>

          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Policies</h2>
            <div className={styles.cardLinks}>
              <Link href="/privacy" className={styles.cardLink}>
                Privacy Notice (nivenxa.com) →
              </Link>
              <Link href="/terms" className={styles.cardLink}>
                Website Terms (nivenxa.com) →
              </Link>
              <Link href="/studio/en/privacy" className={styles.cardLink}>
                Studio Privacy &amp; Terms →
              </Link>
              <Link href="/chess/privacy" className={styles.cardLink}>
                Chess Privacy &amp; Terms →
              </Link>
              <Link href="/living/privacy" className={styles.cardLink}>
                Living Privacy &amp; Terms →
              </Link>
            </div>
          </div>
        </div>
      </div>
      <SiteFooter columns={PARENT_FOOTER_COLUMNS} />
    </>
  )
}
