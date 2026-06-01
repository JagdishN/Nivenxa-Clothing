'use client'
import { Link } from '@/i18n/routing'
import type { Product, ProductColour } from '@/types/product'
import ColourSwatch from '../ColourSwatch/ColourSwatch'
import SizeSelector from '../SizeSelector/SizeSelector'
import styles from './ProductInfo.module.css'

interface Props {
  product: Product
  activeColour: ProductColour
  selectedSize: string | null
  onColourChange: (colour: ProductColour) => void
  onSizeChange: (size: string) => void
  onAddToBag: () => void
  swatchExpanded: boolean
  onSwatchExpandedChange: (value: boolean) => void
}

export default function ProductInfo({
  product,
  activeColour,
  selectedSize,
  onColourChange,
  onSizeChange,
  onAddToBag,
  swatchExpanded,
  onSwatchExpandedChange,
}: Props) {
  const isDisabled =
    !selectedSize ||
    !activeColour.available ||
    !product.sizes.find(s => s.label === selectedSize)?.available

  const ctaLabel = !activeColour.available
    ? 'OUT OF STOCK'
    : !selectedSize
    ? 'SELECT A SIZE'
    : 'ADD TO BAG'

  return (
    <div className={styles.panel}>
      {/* 1. Breadcrumb */}
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <Link href={`/shop/${product.handle}` as any} className={styles.breadcrumb}>
        ← COLLECTION
      </Link>

      {/* 2. Badge */}
      {product.badge && (
        <p className={styles.badge}>{product.badge}</p>
      )}

      {/* 3. Product name */}
      <h1 className={styles.title}>{product.name}</h1>

      {/* 4. Price */}
      <p className={styles.price}>
        {product.currency}{product.price.toLocaleString('en-IN')}
      </p>

      {/* 5. Trust line */}
      <p className={styles.trustLine}>{product.trustLine}</p>

      {/* 6. Colour selector — overflow + activeName handled inside ColourSwatch */}
      <p className={styles.sectionLabel}>AVAILABLE TONES</p>
      <ColourSwatch
        colours={product.colours}
        activeColour={activeColour}
        onColourChange={onColourChange}
        expanded={swatchExpanded}
        onExpandedChange={onSwatchExpandedChange}
      />

      {/* 8. Size selector */}
      <p className={styles.sectionLabel}>
        {product.sizeUnit ? product.sizeUnit.toUpperCase() : 'SIZE'}
      </p>
      <SizeSelector
        sizes={product.sizes}
        selectedSize={selectedSize}
        sizeUnit={product.sizeUnit}
        onSelect={onSizeChange}
      />
      <button type="button" className={styles.sizeGuide}>
        Size guide →
      </button>

      {/* 9. Feature bullets */}
      <ul className={styles.bullets}>
        {product.featureBullets.map(bullet => (
          <li key={bullet} className={styles.bullet}>
            — {bullet}
          </li>
        ))}
      </ul>

      {/* 10. CTA */}
      <button
        type="button"
        className={styles.cta}
        onClick={onAddToBag}
        disabled={isDisabled}
        aria-disabled={isDisabled}
      >
        {ctaLabel}
      </button>
    </div>
  )
}
