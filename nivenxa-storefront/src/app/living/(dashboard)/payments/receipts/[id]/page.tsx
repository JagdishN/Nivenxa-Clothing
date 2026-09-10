import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireMembership } from '@/lib/living/auth'
import { formatCurrency, formatPaymentMethod, waNumberFor } from '@/lib/living/format'
import { getPaymentById } from '@/lib/living/queries'
import theme from '../../../../LivingTheme.module.scss'
import PrintButton from '../../../PrintButton'
import styles from './Receipt.module.scss'

export default async function LivingReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { supabase, membership, apartment } = await requireMembership()
  const payment = await getPaymentById(supabase, apartment.id, id)
  if (!payment) notFound()
  if (membership.role === 'owner' && payment.flat_id !== membership.flat_id) notFound()

  const backHref = membership.role === 'owner' ? '/living/my-payments' : '/living/payments'
  const { flat } = payment
  const dateLabel = new Date(payment.payment_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })

  const waText = [
    `Payment Receipt${payment.receipt_no ? ` — ${payment.receipt_no}` : ''}`,
    `Flat ${flat.flat_no}${flat.owner_name ? ` · ${flat.owner_name}` : ''}`,
    `Amount: ${formatCurrency(payment.amount)}`,
    `Date: ${dateLabel}`,
    `Method: ${formatPaymentMethod(payment.method)}`,
    apartment.name,
  ].join('\n')
  const waNumber = waNumberFor(flat.owner_contact)
  const waHref = `https://wa.me/${waNumber ?? ''}?text=${encodeURIComponent(waText)}`

  return (
    <div className={styles.sheet}>
      <p className={`${theme.muted} ${styles.noPrint}`} style={{ marginBottom: '1rem' }}>
        <Link href={backHref} className={theme.muted}>
          ← Back to Payments
        </Link>
      </p>

      <div className={theme.card}>
        <div className={styles.badge}>
          <span>✓</span> Payment recorded
        </div>

        <div className={styles.receiptNo}>{payment.receipt_no ?? 'Receipt number unavailable for this payment'}</div>
        <div className={styles.amount}>{formatCurrency(payment.amount)}</div>

        <div className={styles.rows}>
          <div className={styles.row}>
            <span className={styles.rowLabel}>Apartment</span>
            <span>{apartment.name}</span>
          </div>
          <div className={styles.row}>
            <span className={styles.rowLabel}>Flat</span>
            <span>{flat.flat_no}</span>
          </div>
          <div className={styles.row}>
            <span className={styles.rowLabel}>Resident</span>
            <span>{flat.owner_name ?? '—'}</span>
          </div>
          <div className={styles.row}>
            <span className={styles.rowLabel}>Date</span>
            <span>{dateLabel}</span>
          </div>
          <div className={styles.row}>
            <span className={styles.rowLabel}>Method</span>
            <span>{formatPaymentMethod(payment.method)}</span>
          </div>
          {payment.reference_note && (
            <div className={styles.row}>
              <span className={styles.rowLabel}>Reference</span>
              <span>{payment.reference_note}</span>
            </div>
          )}
        </div>

        <div className={`${styles.actions} ${styles.noPrint}`}>
          <PrintButton className={theme.buttonGhost} />
          <a href={waHref} target="_blank" rel="noopener noreferrer" className={theme.buttonGhost}>
            Share on WhatsApp
          </a>
        </div>
      </div>
    </div>
  )
}
