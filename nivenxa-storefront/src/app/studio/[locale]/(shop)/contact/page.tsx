import { Link } from '@/i18n/routing'
import { LEGAL_ENTITY, LEGAL_ENTITY_GRIEVANCE_SLA, LEGAL_ENTITY_NAME_AND_ADDRESS } from '@/lib/legalEntity'
import styles from './Contact.module.scss'

export const metadata = {
  title: 'Contact Us | NIVENXA Studio',
  description: 'How to reach NIVENXA customer care, our Grievance Officer, and our registered business details.',
}

export default function ContactPage() {
  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <p className={styles.eyebrow}>NIVENXA / CUSTOMER CARE</p>
        <h1 className={styles.title}>Contact Us</h1>
        <p className={styles.subtitle}>Real people, here to help.</p>
        <p className={styles.lastUpdated}>Last updated: 22 October 2026</p>
      </div>

      <div className={styles.grid}>
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Customer care</h2>
          <a href={`mailto:${LEGAL_ENTITY.email}`} className={styles.cardLink}>
            {LEGAL_ENTITY.email}
          </a>
          <a href={LEGAL_ENTITY.phoneTel} className={styles.cardLink}>
            {LEGAL_ENTITY.phone}
          </a>
          <p className={styles.cardLine}>[SUPPORT HOURS]</p>
          <p className={styles.cardMuted}>We reply to emails within 1 business day.</p>
        </div>

        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Orders, returns &amp; exchanges</h2>
          <p className={styles.cardLine}>Already placed an order? Start here for delivery timelines or a return.</p>
          <div className={styles.cardLinks}>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <Link href={'/returns' as any} className={styles.cardLink}>
              Returns &amp; Exchanges →
            </Link>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <Link href={'/shipping' as any} className={styles.cardLink}>
              Shipping &amp; Delivery →
            </Link>
          </div>
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
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <Link href={'/returns' as any} className={styles.cardLink}>
              Returns &amp; Exchanges →
            </Link>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <Link href={'/shipping' as any} className={styles.cardLink}>
              Shipping &amp; Delivery →
            </Link>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <Link href={'/privacy' as any} className={styles.cardLink}>
              Privacy Policy →
            </Link>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <Link href={'/terms' as any} className={styles.cardLink}>
              Terms of Service →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
