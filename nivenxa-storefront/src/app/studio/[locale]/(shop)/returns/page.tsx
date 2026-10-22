import { IconArrowsExchange, IconClock, IconReceiptRefund } from '@tabler/icons-react'
import { RETURNS_POLICY } from '@/data/returnsPolicy'
import { LEGAL_ENTITY } from '@/lib/legalEntity'
import PolicyStats, { type PolicyStat } from '@/components/policy/PolicyStats'
import PolicyAccordion from '@/components/policy/PolicyAccordion'
import PolicyHelp from '@/components/policy/PolicyHelp'
import styles from './Returns.module.scss'

export const metadata = {
  title: 'Returns & Exchanges | NIVENXA',
  description: '7-day returns, a free first size exchange, and easy help for damaged or incorrect items.',
}

const STATS: PolicyStat[] = [
  { icon: IconClock, value: '7 days', label: 'Return window from delivery' },
  { icon: IconArrowsExchange, value: 'Free', label: 'First size exchange · same style & colour' },
  { icon: IconReceiptRefund, value: '5–7 days', label: 'Refund initiated after inspection' },
]

// Verbatim per spec — already percent-encoded, do not re-encode.
const REQUEST_MAILTO = `mailto:${LEGAL_ENTITY.email}?subject=Return%2FExchange%20%E2%80%93%20Order%20%23&body=Order%20number%3A%0AProduct%3A%0AReturn%20or%20exchange%3A%0APreferred%20size%20(for%20exchanges)%3A%0AReason%3A`

export default function ReturnsPage() {
  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <p className={styles.eyebrow}>NIVENXA / CUSTOMER CARE</p>
        <h1 className={styles.title}>Returns &amp; Exchanges</h1>
        <p className={styles.subtitle}>Thoughtfully made. Comfortably yours.</p>
      </div>

      <PolicyStats stats={STATS} />
      <PolicyAccordion items={RETURNS_POLICY} />
      <PolicyHelp
        title="Need assistance?"
        text="Our customer care team is here to help."
        email={LEGAL_ENTITY.email}
        buttonLabel="Request a return or exchange"
        mailtoHref={REQUEST_MAILTO}
      />

      <p className={styles.closingNote}>Premium Minimal Comfort.</p>
    </div>
  )
}
