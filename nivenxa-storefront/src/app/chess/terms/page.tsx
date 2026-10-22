import Link from 'next/link'
import { CHESS_TERMS_OF_USE } from '@/data/chessTermsOfUse'
import PolicyAccordion from '@/components/policy/PolicyAccordion'
import PolicyHelp from '@/components/policy/PolicyHelp'
import { LEGAL_ENTITY } from '@/lib/legalEntity'
import styles from './ChessTerms.module.scss'

export const metadata = {
  title: 'Terms of Use | Nivenxa Chess',
  description: 'Simple rules for a good game — the agreement behind every Nivenxa Chess account.',
}

export default function ChessTermsPage() {
  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <p className={styles.eyebrow}>NIVENXA CHESS / LEGAL</p>
        <h1 className={styles.title}>Terms of Use</h1>
        <p className={styles.subtitle}>Simple rules for a good game.</p>
        <p className={styles.lastUpdated}>Last updated: 22 October 2026</p>
      </div>

      <p className={styles.intro}>
        These Terms of Use apply to Nivenxa Chess at nivenxa.com/chess (the &quot;App&quot;), provided by NIVENXA, a partnership firm
        based in Hyderabad, India. By creating an account or using the App, you agree to these Terms and our{' '}
        <Link href="/chess/privacy">Privacy Policy</Link>.
      </p>

      <PolicyAccordion items={CHESS_TERMS_OF_USE} />
      <PolicyHelp
        title="Questions about these terms?"
        text="Write to our Grievance Officer."
        email={LEGAL_ENTITY.email}
        buttonLabel="Contact us"
        mailtoHref={`mailto:${LEGAL_ENTITY.email}?subject=Nivenxa%20Chess%20terms%20question`}
      />
    </div>
  )
}
