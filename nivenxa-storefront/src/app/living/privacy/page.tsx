import { IconBan, IconHomeLock, IconUserCheck } from '@tabler/icons-react'
import { LIVING_PRIVACY_POLICY } from '@/data/livingPrivacyPolicy'
import { LEGAL_ENTITY } from '@/lib/legalEntity'
import PolicyStats, { type PolicyStat } from '@/components/policy/PolicyStats'
import PolicyAccordion from '@/components/policy/PolicyAccordion'
import PolicyHelp from '@/components/policy/PolicyHelp'
import SiteFooter from '@/components/global/SiteFooter'
import styles from './LivingPrivacy.module.scss'

export const metadata = {
  title: 'Privacy Policy | Nivenxa Living',
  description: 'How Nivenxa Living handles apartment, resident and billing data.',
}

const STATS: PolicyStat[] = [
  { icon: IconHomeLock, value: 'Private', label: 'Each apartment sees only its own data' },
  { icon: IconUserCheck, value: 'Reviewed', label: 'AI readings checked before saving' },
  { icon: IconBan, value: 'Never', label: 'Sold or rented' },
]

const LIVING_FOOTER_COLUMNS = [
  {
    title: 'Nivenxa Living',
    links: [
      { label: 'Privacy Policy', href: '/living/privacy' },
      { label: 'Terms of Use', href: '/living/terms' },
      { label: 'Contact', href: `mailto:${LEGAL_ENTITY.email}` },
    ],
  },
]

export default function LivingPrivacyPage() {
  return (
    <>
      <div className={styles.page}>
        <div className={styles.hero}>
          <p className={styles.eyebrow}>NIVENXA LIVING / PRIVACY</p>
          <h1 className={styles.title}>Privacy Policy</h1>
          <p className={styles.subtitle}>Your apartment&rsquo;s records, kept within your apartment.</p>
          <p className={styles.lastUpdated}>Last updated: 22 October 2026</p>
        </div>

        <p className={styles.intro}>
          This Privacy Policy explains how NIVENXA (&quot;we&quot;, &quot;our&quot; or &quot;us&quot;) handles personal data in Nivenxa
          Living at nivenxa.com/living (the &quot;App&quot;), a tool for standalone apartments to manage maintenance, water billing,
          expenses and communication. We process personal data in accordance with applicable Indian law, including the Digital
          Personal Data Protection Act, 2023 and the Information Technology Act, 2000.
        </p>

        <PolicyStats stats={STATS} />
        <PolicyAccordion items={LIVING_PRIVACY_POLICY} />
        <PolicyHelp
          title="Questions about your data?"
          text="Start with your apartment admin, or write to us."
          email={LEGAL_ENTITY.email}
          buttonLabel="Contact us about privacy"
          mailtoHref={`mailto:${LEGAL_ENTITY.email}?subject=Nivenxa%20Living%20privacy%20request`}
        />
      </div>
      <SiteFooter columns={LIVING_FOOTER_COLUMNS} />
    </>
  )
}
