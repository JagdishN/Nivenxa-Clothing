import { IconEyeOff, IconMail, IconUserHeart } from '@tabler/icons-react'
import { CHESS_PRIVACY_POLICY } from '@/data/chessPrivacyPolicy'
import { LEGAL_ENTITY } from '@/lib/legalEntity'
import PolicyStats, { type PolicyStat } from '@/components/policy/PolicyStats'
import PolicyAccordion from '@/components/policy/PolicyAccordion'
import PolicyHelp from '@/components/policy/PolicyHelp'
import styles from './ChessPrivacy.module.scss'

export const metadata = {
  title: 'Privacy Policy | Nivenxa Chess',
  description: "What Nivenxa Chess collects, how it's used, and how we protect young players.",
}

const STATS: PolicyStat[] = [
  { icon: IconMail, value: 'Email only', label: 'All we ask to sign in' },
  { icon: IconEyeOff, value: 'No ads', label: 'No tracking or profiling' },
  { icon: IconUserHeart, value: 'Parent-led', label: 'Accounts for players under 18' },
]

export default function ChessPrivacyPage() {
  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <p className={styles.eyebrow}>NIVENXA CHESS / PRIVACY</p>
        <h1 className={styles.title}>Privacy Policy</h1>
        <p className={styles.subtitle}>Play freely. We keep it simple.</p>
        <p className={styles.lastUpdated}>Last updated: 22 October 2026</p>
      </div>

      <p className={styles.intro}>
        This Privacy Policy explains how NIVENXA (&quot;we&quot;, &quot;our&quot; or &quot;us&quot;) collects, uses and protects personal
        data in Nivenxa Chess at nivenxa.com/chess (the &quot;App&quot;). We process personal data in accordance with applicable Indian
        law, including the Digital Personal Data Protection Act, 2023 and the Information Technology Act, 2000. We collect as little as
        we can.
      </p>

      <PolicyStats stats={STATS} />
      <PolicyAccordion items={CHESS_PRIVACY_POLICY} />
      <PolicyHelp
        title="Questions about your data?"
        text="Write to our Grievance Officer."
        email={LEGAL_ENTITY.email}
        buttonLabel="Contact us about privacy"
        mailtoHref={`mailto:${LEGAL_ENTITY.email}?subject=Nivenxa%20Chess%20privacy%20request`}
      />
    </div>
  )
}
