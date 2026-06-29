'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import type { Product, ProductColour } from '@/types/product'
import { getPrimaryImage } from '@/utils/getProductImages'
import { useCart } from '@/context/CartContext'
import Toast from '@/components/global/Toast/Toast'
import BackLink from '@/components/global/BackLink/BackLink'
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
  const [toastVisible,  setToastVisible]  = useState(false)
  const [toastMessage,  setToastMessage]  = useState('')
  const [toastSub,      setToastSub]      = useState('')
  const closeRef = useRef<HTMLButtonElement>(null)
  const { addItem, openDrawer } = useCart()

  const closeToast = useCallback(() => setToastVisible(false), [])

  // Auto-dismiss toast — managed here so the timer is reliable across re-renders
  useEffect(() => {
    if (!toastVisible) return
    const t = setTimeout(() => setToastVisible(false), 3700)
    return () => clearTimeout(t)
  }, [toastVisible])

  const handleAddToBag = useCallback(() => {
    if (!selectedSize) return

    // Add full item data to local cart
    const primaryImage = getPrimaryImage(activeColour.images)
    addItem({
      productHandle: product.handle,
      colourSlug:    activeColour.slug,
      size:          selectedSize,
      productTitle:  product.name,
      colourName:    activeColour.label,
      colourHex:     activeColour.hex,
      imageUrl:      primaryImage?.src,
      price:         `${product.currency}${product.price.toLocaleString('en-IN')}`,
    })

    // Also call the prop (writes to useLocalCart for Shopify prep)
    onAddToBag()

    // Show toast
    setToastMessage('Added to your bag')
    setToastSub(`${product.name}\n${activeColour.label} · Size ${selectedSize}`)
    setToastVisible(true)
  }, [
    selectedSize, addItem, onAddToBag,
    product.handle, product.name, product.currency, product.price,
    activeColour.slug, activeColour.label, activeColour.hex, activeColour.images,
  ])

  // Lock body scroll when size guide modal is open
  useEffect(() => {
    if (sizeGuideOpen) {
      document.body.style.overflow = 'hidden'
      closeRef.current?.focus()
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [sizeGuideOpen])

  // Close size guide on Escape key
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

      {/* 1. Back link — shows the page the user navigated from, or nothing */}
      <BackLink />

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
        onClick={handleAddToBag}
        disabled={isDisabled}
        aria-disabled={isDisabled}
      >
        {ctaLabel}
      </button>

      {/* 9a. Style it with — editorial styling shot for the active colour */}
      {activeColour.styleImage && (
        <>
          <div className={styles.styledWithDivider} />
          <div className={styles.styleWithPhoto}>
            <p className={styles.sectionLabel}>Style it with</p>
            <img
              src={activeColour.styleImage.src}
              alt={activeColour.styleImage.alt}
              className={styles.styleWithImg}
            />
          </div>
        </>
      )}

      {/* 9b. Styled With — colour-aware cross-sell */}
      {product.styledWith && (
        <>
          <div className={styles.styledWithDivider} />
          <StyledWithBlock
            styledWith={product.styledWith}
            activeColourSlug={activeColour.slug}
          />
        </>
      )}

      {/* 10. Add-to-bag toast */}
      <Toast
        visible={toastVisible}
        message={toastMessage}
        subMessage={toastSub}
        onViewBag={() => openDrawer()}
        onClose={closeToast}
      />

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
