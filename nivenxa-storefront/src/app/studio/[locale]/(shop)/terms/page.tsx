import { Link } from '@/i18n/routing'
import { TERMS_OF_SERVICE } from '@/data/termsOfService'
import PolicyAccordion from '@/components/policy/PolicyAccordion'
import PolicyHelp from '@/components/policy/PolicyHelp'
import styles from './Terms.module.scss'
import { LEGAL_ENTITY } from '@/lib/legalEntity'

export const metadata = {
  title: 'Terms of Service | NIVENXA Studio',
  description: 'The agreement that applies to your use of NIVENXA Studio and any order you place.',
}

export default function TermsPage() {
  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <p className={styles.eyebrow}>NIVENXA / LEGAL</p>
        <h1 className={styles.title}>Terms of Service</h1>
        <p className={styles.subtitle}>The simple agreement behind every order.</p>
        <p className={styles.lastUpdated}>Last updated: 22 October 2026</p>
      </div>

      <p className={styles.intro}>
        These Terms of Service (&quot;Terms&quot;) apply to your use of nivenxa.com/studio (the &quot;Site&quot;) and any purchase you
        make from NIVENXA, a partnership firm based in Hyderabad, India (&quot;NIVENXA&quot;, &quot;we&quot;, &quot;our&quot; or
        &quot;us&quot;). By using the Site or placing an order, you agree to these Terms. Please read them alongside our{' '}
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <Link href={'/privacy' as any}>Privacy Policy</Link>,{' '}
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <Link href={'/returns' as any}>Returns &amp; Exchanges</Link>, and{' '}
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <Link href={'/shipping' as any}>Shipping &amp; Delivery</Link> policies.
      </p>

      <PolicyAccordion items={TERMS_OF_SERVICE} />
      <PolicyHelp
        title="Questions about these terms?"
        text="Our customer care team is here to help."
        email={LEGAL_ENTITY.email}
        buttonLabel="Contact us"
        mailtoHref="/studio/contact"
      />
    </div>
  )
}
