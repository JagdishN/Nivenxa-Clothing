import { IconCoinRupee, IconMapPin, IconPackage } from '@tabler/icons-react'
import { SHIPPING_POLICY } from '@/data/shippingPolicy'
import PolicyStats, { type PolicyStat } from '@/components/policy/PolicyStats'
import PolicyAccordion from '@/components/policy/PolicyAccordion'
import PolicyHelp from '@/components/policy/PolicyHelp'
import styles from './Shipping.module.scss'
import { LEGAL_ENTITY } from '@/lib/legalEntity'

export const metadata = {
  title: 'Shipping & Delivery | NIVENXA Studio',
  description: 'Dispatch times, delivery timelines, shipping charges and Cash on Delivery for NIVENXA Studio orders.',
}

const STATS: PolicyStat[] = [
  { icon: IconPackage, value: '[DISPATCH DAYS] days', label: 'To dispatch' },
  { icon: IconCoinRupee, value: 'Free', label: 'Shipping above ₹[FREE SHIPPING THRESHOLD]' },
  { icon: IconMapPin, value: 'Pan-India', label: 'Delivery to serviceable pin codes' },
]

export default function ShippingPage() {
  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <p className={styles.eyebrow}>NIVENXA / CUSTOMER CARE</p>
        <h1 className={styles.title}>Shipping &amp; Delivery</h1>
        <p className={styles.subtitle}>Carefully packed. Reliably delivered.</p>
        <p className={styles.lastUpdated}>Last updated: 22 October 2026</p>
      </div>

      <PolicyStats stats={STATS} />
      <PolicyAccordion items={SHIPPING_POLICY} />
      <PolicyHelp
        title="Questions about your delivery?"
        text="Our customer care team is here to help."
        email={LEGAL_ENTITY.email}
        buttonLabel="Contact Customer Care"
        mailtoHref="/studio/contact"
      />
    </div>
  )
}
