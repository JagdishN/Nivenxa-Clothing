export function formatPrice(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}
