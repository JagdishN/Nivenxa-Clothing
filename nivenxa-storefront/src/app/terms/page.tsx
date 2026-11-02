import Link from 'next/link'
import { seoMetadata } from '@/lib/seo'
import { LEGAL_ENTITY_BUSINESS_BLOCK, LEGAL_ENTITY_GRIEVANCE_LINE } from '@/lib/legalEntity'
import SiteFooter from '@/components/global/SiteFooter'
import styles from './Terms.module.scss'

export const metadata = seoMetadata({
  title: 'Website Terms | NIVENXA',
  description: 'The terms that apply to nivenxa.com and the Nivenxa Technologies pages.',
  path: '/terms',
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

export default function ParentTermsPage() {
  return (
    <>
      <div className={styles.page}>
        <div className={styles.hero}>
          <p className={styles.eyebrow}>NIVENXA / LEGAL</p>
          <h1 className={styles.title}>Website Terms</h1>
          <p className={styles.lastUpdated}>Last updated: 22 October 2026</p>
        </div>

        <div className={styles.body}>
          <p>
            These terms apply to nivenxa.com and the Nivenxa Technologies pages. Our products have their own terms: Studio (
            <Link href="/studio/en/terms">/studio/terms</Link>), Chess (<Link href="/chess/terms">/chess/terms</Link>) and Living (
            <Link href="/living/terms">/living/terms</Link>).
          </p>
          <p>The NIVENXA name, logo and site content belong to NIVENXA and may not be reused commercially without permission.</p>
          <p>
            Information on these pages is provided for general purposes. Nivenxa Technologies&rsquo; services are governed by a
            separate written agreement with each client.
          </p>
          <p>
            Please don&rsquo;t misuse the site, for example by attempting unauthorised access or disrupting its operation.
          </p>
          <p>These terms are governed by the laws of India, and courts in Hyderabad, Telangana have jurisdiction.</p>

          <div className={styles.contact}>
            <p className={styles.contactLine}>{LEGAL_ENTITY_GRIEVANCE_LINE}</p>
            <p className={styles.contactLine}>{LEGAL_ENTITY_BUSINESS_BLOCK}</p>
          </div>
        </div>
      </div>
      <SiteFooter columns={PARENT_FOOTER_COLUMNS} />
    </>
  )
}
