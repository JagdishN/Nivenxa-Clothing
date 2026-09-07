import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getLivingSession } from '@/lib/living/auth'
import LivingNav from './LivingNav'
import styles from './Landing.module.scss'

const CORE_FLOW = [
  { label: 'Maintenance calculation' },
  { label: 'Monthly bills' },
  { label: 'Expense tracking' },
  { label: 'Collections' },
  { label: 'Payment status' },
  { label: 'Flat-wise ledger' },
]

export default async function LivingLandingPage() {
  const session = await getLivingSession()
  if (session) redirect('/living/app')

  return (
    <>
      <LivingNav />

      <section className={styles.hero}>
        <span className={styles.tagline}>Built for Standalone Apartments</span>
        <h1 className={styles.title}>Maintenance, water billing, and collections — without hiring a society management company.</h1>
        <p className={styles.subtitle}>
          Nivenxa Living is a self-serve tool for standalone apartment buildings — up to 30 flats, run by an owner or a watchman, no
          RWA process in between.
        </p>
        <div className={styles.heroActions}>
          <Link href="/living/signup" className={styles.heroBtnPrimary}>
            Sign Up
          </Link>
          <Link href="/living/login" className={styles.heroBtnGhost}>
            Login
          </Link>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionEyebrow}>The problem</div>
        <h2 className={styles.sectionTitle}>Standalone apartments carry the same headaches as a managed community.</h2>
        <p className={styles.sectionBody}>
          A spreadsheet tallied by hand each month. Payments chased one owner at a time. Water meter readings re-typed from scratch,
          every month, with nothing carried forward — all without the admin overhead or budget to hire it away.
        </p>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionEyebrow}>How it helps</div>
        <h2 className={styles.sectionTitle}>Upload once, and let the math run itself.</h2>
        <p className={styles.sectionBody}>
          Upload your maintenance sheet — we calculate everyone&rsquo;s share. Enter this month&rsquo;s water meter readings — we
          handle the tiered math and carry last month&rsquo;s number forward automatically. See who&rsquo;s paid and who hasn&rsquo;t,
          at a glance.
        </p>
        <div className={styles.flowGrid}>
          {CORE_FLOW.map((step, i) => (
            <div key={step.label} className={styles.flowStep}>
              <div className={styles.flowNum}>{String(i + 1).padStart(2, '0')}</div>
              <p className={styles.flowLabel}>{step.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionEyebrow}>Built for standalone, not societies</div>
        <h2 className={styles.sectionTitle}>No RWA bureaucracy, no per-society sales process.</h2>
        <p className={styles.sectionBody}>
          A tool sized for a 5–30 flat building, not a 500-unit complex — three roles, one apartment, everything scoped to it and
          invisible to anyone outside it.
        </p>
      </section>

      <div className={styles.closingCta}>
        <Link href="/living/signup" className={styles.heroBtnPrimary}>
          Sign Up
        </Link>
      </div>
    </>
  )
}
