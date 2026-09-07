import type { PaymentMethod, PaymentStatus } from './types'

const currencyFormatter = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 })

export function formatCurrency(amount: number): string {
  return currencyFormatter.format(amount)
}

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Cash',
  upi: 'UPI',
  bank_transfer: 'Bank transfer',
  cheque: 'Cheque',
  other: 'Other',
}

export function formatPaymentMethod(method: PaymentMethod): string {
  return PAYMENT_METHOD_LABELS[method]
}

const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  paid: 'Paid',
  partial: 'Partial',
  unpaid: 'Unpaid',
}

export function formatPaymentStatus(status: PaymentStatus): string {
  return PAYMENT_STATUS_LABELS[status]
}

export function formatMonthLabel(monthDateString: string): string {
  const date = new Date(monthDateString + (monthDateString.length === 7 ? '-01' : ''))
  return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
}

/** First-of-month `YYYY-MM-01` for `date` — the shape every living_* table's `month` column uses. */
export function monthKeyFor(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`
}

/** Calendar days in `monthKey`'s month (28-31) — day 0 of the next month is the last day of this one. */
export function daysInMonth(monthKey: string): number {
  const [year, month] = monthKey.split('-').map(Number)
  return new Date(year, month, 0).getDate()
}

/**
 * A maintenance period's actual date range, e.g. "1 Aug – 31 Aug 2026" or,
 * spanning a year boundary, "1 Aug 2026 – 31 Jan 2027" — not assumed to be
 * a calendar month. Drops the repeated year when both dates fall in the
 * same one.
 */
export function formatPeriodLabel(periodStart: string, periodEnd: string): string {
  const start = new Date(periodStart)
  const end = new Date(periodEnd)
  const sameYear = start.getFullYear() === end.getFullYear()
  const startLabel = start.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: sameYear ? undefined : 'numeric' })
  const endLabel = end.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  return `${startLabel} – ${endLabel}`
}
