'use client'
import type { ProductSize } from '@/types/product'
import styles from './SizeSelector.module.css'

interface Props {
  sizes: ProductSize[]
  selectedSize: string | null
  sizeUnit: string | null
  onSelect: (label: string) => void
}

export default function SizeSelector({ sizes, selectedSize, sizeUnit, onSelect }: Props) {
  return (
    <div className={styles.row} role="group" aria-label="Select size">
      {sizes.map(size => (
        <button
          key={size.label}
          type="button"
          className={`${styles.btn} ${selectedSize === size.label ? styles.active : ''} ${!size.available ? styles.unavailable : ''}`}
          onClick={() => size.available && onSelect(size.label)}
          aria-pressed={selectedSize === size.label}
          aria-label={`${size.label} ${sizeUnit ?? 'size'}`}
          aria-disabled={!size.available}
          title={!size.available ? 'Out of stock' : undefined}
          disabled={!size.available}
        >
          {size.label}
        </button>
      ))}
    </div>
  )
}
