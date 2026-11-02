'use client'
import type { ProductColour } from '@/types/product'
import styles from './MobileStickyBar.module.css'

interface Props {
  activeColour: ProductColour
  selectedSize: string | null
  onAddToBag: () => void
  isDisabled: boolean
  /** True while the product's MRP hasn't been supplied — the bar can't offer a purchase. */
  priceMissing?: boolean
}

export default function MobileStickyBar({
  activeColour,
  selectedSize,
  onAddToBag,
  isDisabled,
  priceMissing = false,
}: Props) {
  return (
    <div className={styles.bar}>
      <div className={styles.left}>
        <span
          className={styles.swatch}
          style={{ background: activeColour.hex }}
          aria-hidden="true"
        />
        <span className={styles.info}>
          {activeColour.label}
          {' · '}
          <span className={selectedSize ? styles.size : styles.sizeHint}>
            {selectedSize ?? 'Select a size'}
          </span>
        </span>
      </div>
      <button
        type="button"
        className={styles.cta}
        onClick={onAddToBag}
        disabled={isDisabled}
        aria-disabled={isDisabled}
      >
        {priceMissing
          ? 'MRP PENDING'
          : !activeColour.available
          ? 'OUT OF STOCK'
          : !selectedSize
          ? 'SELECT A SIZE'
          : 'ADD TO BAG'}
      </button>
    </div>
  )
}
