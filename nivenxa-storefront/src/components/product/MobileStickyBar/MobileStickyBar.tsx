'use client'
import type { ProductColour } from '@/types/product'
import styles from './MobileStickyBar.module.css'

interface Props {
  activeColour: ProductColour
  selectedSize: string | null
  onAddToBag: () => void
  currency: string
  price: number
  isDisabled: boolean
}

export default function MobileStickyBar({
  activeColour,
  selectedSize,
  onAddToBag,
  currency,
  price,
  isDisabled,
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
        {!activeColour.available
          ? 'OUT OF STOCK'
          : !selectedSize
          ? 'SELECT A SIZE'
          : 'ADD TO BAG'}
      </button>
    </div>
  )
}
