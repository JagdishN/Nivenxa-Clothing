import { IconHeadset, IconShieldLock, IconToggleRight } from '@tabler/icons-react'
import { PRIVACY_POLICY } from '@/data/privacyPolicy'
import { LEGAL_ENTITY } from '@/lib/legalEntity'
import PolicyStats, { type PolicyStat } from '@/components/policy/PolicyStats'
import PolicyAccordion from '@/components/policy/PolicyAccordion'
import PolicyHelp from '@/components/policy/PolicyHelp'
import styles from './Privacy.module.scss'

export const metadata = {
  title: 'Privacy Policy | NIVENXA Studio',
  description: 'How NIVENXA collects, uses and protects your personal data, and the rights you have over it.',
}

const STATS: PolicyStat[] = [
  { icon: IconShieldLock, value: 'Never', label: 'Sold or rented' },
  { icon: IconToggleRight, value: 'Opt-in', label: 'Marketing messages only' },
  { icon: IconHeadset, value: LEGAL_ENTITY.grievanceAck, label: 'Grievance acknowledgement' },
]

export default function PrivacyPage() {
  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <p className={styles.eyebrow}>NIVENXA / LEGAL</p>
        <h1 className={styles.title}>Privacy Policy</h1>
        <p className={styles.subtitle}>Your information, handled with care.</p>
        <p className={styles.lastUpdated}>Last updated: 22 October 2026</p>
      </div>

      <p className={styles.intro}>
        This Privacy Policy explains how NIVENXA (&quot;NIVENXA&quot;, &quot;we&quot;, &quot;our&quot; or &quot;us&quot;) collects, uses, shares
        and protects your personal data when you visit or shop at nivenxa.com/studio (the &quot;Site&quot;). We process personal data in
        accordance with applicable Indian law, including the Digital Personal Data Protection Act, 2023, the Information Technology Act,
        2000 and the rules made under them.
      </p>

      <PolicyStats stats={STATS} />
      <PolicyAccordion items={PRIVACY_POLICY} />
      <PolicyHelp
        title="Questions about your data?"
        text="Write to our Grievance Officer."
        email={LEGAL_ENTITY.email}
        buttonLabel="Contact us about privacy"
        mailtoHref={`mailto:${LEGAL_ENTITY.email}?subject=Privacy%20request`}
      />

      <p className={styles.closingNote}>Premium Minimal Comfort.</p>
    </div>
  )
}
