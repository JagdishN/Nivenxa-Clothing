import Link from 'next/link'
import { seoMetadata } from '@/lib/seo'
import { PARENT_PRIVACY_NOTICE } from '@/data/parentPrivacyNotice'
import { LEGAL_ENTITY } from '@/lib/legalEntity'
import PolicyAccordion from '@/components/policy/PolicyAccordion'
import PolicyHelp from '@/components/policy/PolicyHelp'
import SiteFooter from '@/components/global/SiteFooter'
import PageShell from '@/components/global/PageShell'
import styles from './Privacy.module.scss'

export const metadata = seoMetadata({
  title: 'Privacy Notice | NIVENXA',
  description: 'How NIVENXA handles personal data on nivenxa.com and the Nivenxa Technologies pages.',
  path: '/privacy',
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

export default function ParentPrivacyPage() {
  return (
    <PageShell footer={<SiteFooter columns={PARENT_FOOTER_COLUMNS} />}>
      <div className={styles.page}>
        <div className={styles.hero}>
          <p className={styles.eyebrow}>NIVENXA / LEGAL</p>
          <h1 className={styles.title}>Privacy Notice</h1>
          <p className={styles.subtitle}>For nivenxa.com and Nivenxa Technologies.</p>
          <p className={styles.lastUpdated}>Last updated: 22 October 2026</p>
        </div>

        <p className={styles.intro}>
          This notice explains how NIVENXA handles personal data on nivenxa.com and the Nivenxa Technologies pages. Our products have
          their own policies: Studio (<Link href="/studio/en/privacy">/studio/privacy</Link>), Chess (
          <Link href="/chess/privacy">/chess/privacy</Link>) and Living (<Link href="/living/privacy">/living/privacy</Link>).
        </p>

        <PolicyAccordion items={PARENT_PRIVACY_NOTICE} />
        <PolicyHelp
          title="Questions about your data?"
          text="Write to our Grievance Officer."
          email={LEGAL_ENTITY.email}
          buttonLabel="Contact us about privacy"
          mailtoHref={`mailto:${LEGAL_ENTITY.email}?subject=Privacy%20request`}
        />
      </div>
    </PageShell>
  )
}
