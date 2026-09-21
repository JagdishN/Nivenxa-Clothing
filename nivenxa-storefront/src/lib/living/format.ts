import type { PaymentMethod, PaymentStatus } from './types'

const currencyFormatter = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 })
const currencyFormatterCompact = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })

export function formatCurrency(amount: number): string {
  return currencyFormatter.format(amount)
}

/** Rounded to the nearest rupee, no paise — for headline dashboard tiles only (Overview's Financial Summary). Anywhere money is reconciled (bills, ledgers, receipts) keeps exact paise via formatCurrency. */
export function formatCurrencyCompact(amount: number): string {
  return currencyFormatterCompact.format(amount)
}

/** "Today, 10:42 AM" / "Yesterday, 3:15 PM" / "12 Sep, 6:05 PM" — Recent Activity's timestamp, from a real created_at (not a user-editable date field). */
export function formatActivityTimestamp(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const time = d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })
  const isSameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  if (isSameDay(d, now)) return `Today, ${time}`
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (isSameDay(d, yesterday)) return `Yesterday, ${time}`
  return `${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}, ${time}`
}

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Cash',
  upi: 'UPI',
  bank_transfer: 'Bank transfer',
  cheque: 'Cheque',
  other: 'Other',
  advance: 'Advance',
}

export function formatPaymentMethod(method: PaymentMethod): string {
  return PAYMENT_METHOD_LABELS[method]
}

const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  paid: 'Paid',
  partial: 'Partial',
  unpaid: 'Unpaid',
  not_billed: 'Not billed',
}

export function formatPaymentStatus(status: PaymentStatus): string {
  return PAYMENT_STATUS_LABELS[status]
}

/**
 * Never render a raw signed balance to anyone — this is the one place that decides what a
 * positive/negative/zero balance actually MEANS in plain language. `reimbursementOwed` is that
 * flat's separate "association owes resident" figure (see getReimbursementBalanceForFlat) — when a
 * negative balance is actually driven by an unsettled reimbursement rather than a plain overpayment,
 * this says so explicitly instead of the generic "Advance available" copy. `audience: 'resident'`
 * says "you"; `audience: 'admin'` (the default) names the flat/resident via `subjectLabel`.
 */
export function formatBalanceMeaning(
  balance: number,
  reimbursementOwed: number,
  options: { audience?: 'resident' | 'admin'; subjectLabel?: string } = {}
): string {
  const { audience = 'admin', subjectLabel = 'resident' } = options
  if (Math.abs(balance) < 0.005) return 'Bill Status: Paid'
  if (balance > 0) return `Amount due ${formatCurrency(balance)}`
  const magnitude = formatCurrency(Math.abs(balance))
  if (reimbursementOwed > 0.005) {
    return audience === 'resident' ? `Association owes you ${magnitude}` : `Association owes ${subjectLabel} ${magnitude}`
  }
  return `Advance available ${magnitude}`
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

/** One calendar month before `monthKey` — e.g. "2026-09-01" -> "2026-08-01". */
export function monthBefore(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number)
  return monthKeyFor(new Date(year, month - 2, 1))
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

/** Digits-only, best-effort Indian mobile number for a wa.me link — 10 digits gets the country code prepended; anything else that's plausibly already got one is used as-is; anything else means no direct number to share to. */
export function waNumberFor(contact: string | null): string | null {
  if (!contact) return null
  const digits = contact.replace(/\D/g, '')
  if (digits.length === 10) return `91${digits}`
  if (digits.length >= 11 && digits.length <= 15) return digits
  return null
}
