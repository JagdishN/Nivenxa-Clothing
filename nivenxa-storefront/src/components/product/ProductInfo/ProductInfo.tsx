'use client'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from '@/i18n/routing'
import type { Product, ProductColour } from '@/types/product'
import ColourSwatch from '../ColourSwatch/ColourSwatch'
import SizeSelector from '../SizeSelector/SizeSelector'
import StyledWithBlock from '../StyledWith/StyledWith'
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
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false)
  const closeRef = useRef<HTMLButtonElement>(null)

  // Lock body scroll when modal is open
  useEffect(() => {
    if (sizeGuideOpen) {
      document.body.style.overflow = 'hidden'
      closeRef.current?.focus()
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [sizeGuideOpen])

  // Close on Escape key
  useEffect(() => {
    if (!sizeGuideOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setSizeGuideOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [sizeGuideOpen])

  const sizeGuideAccordion = product.accordions?.find(a => a.title.toLowerCase().includes('size'))

  const isDisabled =
    !selectedSize ||
    !activeColour.available ||
    !product.sizes.find(s => s.label === selectedSize)?.available

  const ctaLabel = !activeColour.available
    ? 'OUT OF STOCK'
    : !selectedSize
    ? 'Choose Your Size'
    : 'ADD TO BAG'

  return (
    <div className={styles.panel}>

      {/* 1. Breadcrumb — above title, anchors context */}
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <Link href={`/shop/${product.collectionSlug ?? product.handle}` as any} className={styles.breadcrumb}>
        ← {product.collectionName ?? 'COLLECTION'}
      </Link>

      {/* 2. Product title */}
      <h1 className={styles.title}>{product.name}</h1>

      {/* 3. Price */}
      <p className={styles.price}>
        {product.currency}{product.price.toLocaleString('en-IN')}
      </p>

      {/* 4. Trust line */}
      <p className={styles.trustLine}>{product.trustLine}</p>

      {/* 5. Colour selector */}
      <p className={styles.sectionLabel}>AVAILABLE TONES</p>
      <ColourSwatch
        colours={product.colours}
        activeColour={activeColour}
        onColourChange={onColourChange}
        expanded={swatchExpanded}
        onExpandedChange={onSwatchExpandedChange}
      />

      {/* 6. Size selector */}
      <p className={styles.sectionLabel}>
        {product.sizeUnit ? product.sizeUnit.toUpperCase() : 'SIZE'}
      </p>
      <SizeSelector
        sizes={product.sizes}
        selectedSize={selectedSize}
        sizeUnit={product.sizeUnit}
        onSelect={onSizeChange}
      />
      <button
        type="button"
        className={styles.sizeGuide}
        onClick={() => setSizeGuideOpen(true)}
      >
        Size guide →
      </button>

      {/* 7. Feature bullets */}
      <ul className={styles.bullets}>
        {product.featureBullets.map(bullet => (
          <li key={bullet} className={styles.bullet}>
            — {bullet}
          </li>
        ))}
      </ul>

      {/* 8. CTA */}
      <button
        type="button"
        className={styles.cta}
        onClick={onAddToBag}
        disabled={isDisabled}
        aria-disabled={isDisabled}
      >
        {ctaLabel}
      </button>

      {/* 9. Styled With — colour-aware cross-sell */}
      {product.styledWith && (
        <>
          <div className={styles.styledWithDivider} />
          <StyledWithBlock
            styledWith={product.styledWith}
            activeColourSlug={activeColour.slug}
          />
        </>
      )}

      {/* Size guide modal — portalled to <body> to escape sticky/overflow stacking contexts */}
      {sizeGuideOpen && createPortal(
        <div
          className={styles.modalOverlay}
          role="dialog"
          aria-modal="true"
          aria-label="Size guide"
          onClick={() => setSizeGuideOpen(false)}
        >
          <div
            className={styles.modalCard}
            onClick={e => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <p className={styles.modalTitle}>SIZE GUIDE</p>
              <button
                ref={closeRef}
                type="button"
                className={styles.modalClose}
                onClick={() => setSizeGuideOpen(false)}
                aria-label="Close size guide"
              >
                ✕
              </button>
            </div>
            <div className={styles.modalBody}>
              {sizeGuideAccordion ? (
                <div dangerouslySetInnerHTML={{ __html: sizeGuideAccordion.content }} />
              ) : (
                <p className={styles.modalEmpty}>Size guide not available for this product.</p>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
