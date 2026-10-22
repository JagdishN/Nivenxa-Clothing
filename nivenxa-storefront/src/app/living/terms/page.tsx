import Link from 'next/link'
import { LIVING_TERMS_OF_USE } from '@/data/livingTermsOfUse'
import { LEGAL_ENTITY } from '@/lib/legalEntity'
import PolicyAccordion from '@/components/policy/PolicyAccordion'
import PolicyHelp from '@/components/policy/PolicyHelp'
import SiteFooter from '@/components/global/SiteFooter'
import styles from './LivingTerms.module.scss'

export const metadata = {
  title: 'Terms of Use | Nivenxa Living',
  description: 'Clear responsibilities for every apartment — the agreement behind every Nivenxa Living account.',
}

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

export default function LivingTermsPage() {
  return (
    <>
      <div className={styles.page}>
        <div className={styles.hero}>
          <p className={styles.eyebrow}>NIVENXA LIVING / LEGAL</p>
          <h1 className={styles.title}>Terms of Use</h1>
          <p className={styles.subtitle}>Clear responsibilities for every apartment.</p>
          <p className={styles.lastUpdated}>Last updated: 22 October 2026</p>
        </div>

        <p className={styles.intro}>
          These Terms of Use apply to Nivenxa Living at nivenxa.com/living (the &quot;App&quot;), provided by NIVENXA, a partnership
          firm based in Hyderabad, India. By creating an apartment or using the App, you agree to these Terms and our{' '}
          <Link href="/living/privacy">Privacy Policy</Link>.
        </p>

        <PolicyAccordion items={LIVING_TERMS_OF_USE} />
        <PolicyHelp
          title="Questions about these terms?"
          text="Write to our Grievance Officer."
          email={LEGAL_ENTITY.email}
          buttonLabel="Contact us"
          mailtoHref={`mailto:${LEGAL_ENTITY.email}?subject=Nivenxa%20Living%20terms%20question`}
        />
      </div>
      <SiteFooter columns={LIVING_FOOTER_COLUMNS} />
    </>
  )
}
