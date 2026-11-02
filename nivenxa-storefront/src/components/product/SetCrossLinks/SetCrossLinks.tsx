'use client'
import { Link } from '@/i18n/routing'
import type { Product } from '@/types/product'
import { products, getProductById } from '@/data/products'
import styles from './SetCrossLinks.module.css'

interface Props {
  product: Product
  activeColourSlug: string
}

function findSetFor(productId: string): Product | undefined {
  return products.find(p => p.set && (p.set.teeProductId === productId || p.set.pantProductId === productId))
}

/**
 * The three ways to buy the Kids Tee + Pant range, cross-linked:
 *  - Tee / Pant page  -> "Complete the set" (the combo that uses this tee/pant colour)
 *  - Set page         -> "Buy pieces separately" (the combo's tee + pant pages)
 */
export default function SetCrossLinks({ product, activeColourSlug }: Props) {
  // Set page
  if (product.set) {
    const combo = product.set.combos.find(c => c.colourSlug === activeColourSlug)
    if (!combo) return null
    const tee = getProductById(combo.tee.productId)
    const pant = getProductById(combo.pant.productId)
    if (!tee || !pant) return null
    return (
      <div className={styles.block}>
        <p className={styles.label}>Buy pieces separately</p>
        <ul className={styles.list}>
          <li>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <Link href={`/shop/${tee.handle}/${combo.tee.colourSlug}` as any} className={styles.link}>
              {tee.name} →
            </Link>
          </li>
          <li>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <Link href={`/shop/${pant.handle}/${combo.pant.colourSlug}` as any} className={styles.link}>
              {pant.name} →
            </Link>
          </li>
        </ul>
      </div>
    )
  }

  // Standalone Tee / Pant page
  const setProduct = findSetFor(product.id)
  const combo = setProduct?.set?.combos.find(c =>
    c.tee.productId === product.id
      ? c.tee.colourSlug === activeColourSlug
      : c.pant.productId === product.id && c.pant.colourSlug === activeColourSlug,
  )
  if (!setProduct || !combo) return null
  const comboLabel = setProduct.colours.find(c => c.slug === combo.colourSlug)?.label
  return (
    <div className={styles.block}>
      <p className={styles.label}>Complete the set</p>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <Link href={`/shop/${setProduct.handle}/${combo.colourSlug}` as any} className={styles.link}>
        {comboLabel} →
      </Link>
    </div>
  )
}
