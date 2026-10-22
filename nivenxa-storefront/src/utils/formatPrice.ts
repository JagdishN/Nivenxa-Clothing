import type { Product } from '@/types/product'

/** Shown wherever an MRP has not been supplied yet — visible on purpose so it can't be missed before launch. */
export const MRP_PLACEHOLDER = '[MRP]'

/** "₹1,999" for a confirmed MRP, "[MRP]" while it's still `null`. */
export function formatPrice(product: Pick<Product, 'price' | 'currency'>): string {
  return product.price == null
    ? MRP_PLACEHOLDER
    : `${product.currency}${product.price.toLocaleString('en-IN')}`
}

/** A product can only be bought when it's live (not coming soon) and has a confirmed MRP. */
export function isPurchasable(product: Pick<Product, 'price' | 'comingSoon'>): boolean {
  return !product.comingSoon && product.price != null
}
