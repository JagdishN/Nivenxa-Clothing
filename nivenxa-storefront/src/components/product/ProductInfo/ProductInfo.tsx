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
import ProductDetails, { SizeChartTable } from '../ProductDetails/ProductDetails'
import SetCrossLinks from '../SetCrossLinks/SetCrossLinks'
import { formatPrice, isPurchasable } from '@/utils/formatPrice'
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
  /** What goes in the cart as the size: the plain size, or "Tee 6Y · Pant 8Y" for a set with separate sizes. null = not fully chosen yet. */
  sizeLabel: string | null
  /** Set products only. */
  pantSize: string | null
  onPantSizeChange: (size: string) => void
  separateSizes: boolean
  onSeparateSizesChange: (value: boolean) => void
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
  sizeLabel,
  pantSize,
  onPantSizeChange,
  separateSizes,
  onSeparateSizesChange,
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
    if (!sizeLabel || !isPurchasable(product)) return

    // Add full item data to local cart
    const primaryImage = getPrimaryImage(activeColour.images)
    addItem({
      productHandle: product.handle,
      colourSlug:    activeColour.slug,
      size:          sizeLabel,
      productTitle:  product.name,
      colourName:    activeColour.label,
      colourHex:     activeColour.hex,
      imageUrl:      primaryImage?.src,
      price:         formatPrice(product),
    })

    // Also call the prop (writes to useLocalCart for Shopify prep)
    onAddToBag()

    // Show toast
    setToastMessage('Added to your bag')
    setToastSub(`${product.name}\n${activeColour.label} · Size ${sizeLabel}`)
    setToastVisible(true)
  }, [
    sizeLabel, addItem, onAddToBag, product,
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

  const purchasable = isPurchasable(product)
  const isSet = !!product.set
  const pantChosen = !separateSizes || !!pantSize

  const isDisabled =
    !purchasable ||
    !sizeLabel ||
    !pantChosen ||
    !activeColour.available ||
    !product.sizes.find(s => s.label === selectedSize)?.available

  const ctaLabel = !purchasable
    ? 'MRP PENDING'
    : !activeColour.available
    ? 'OUT OF STOCK'
    : !sizeLabel
    ? 'Choose Your Size'
    : 'ADD TO BAG'

  return (
    <div className={styles.panel}>

      {/* 1. Back link — shows the page the user navigated from, or nothing */}
      <BackLink />

      {/* 2. Product title */}
      <h1 className={styles.title}>{product.name}</h1>

      {/* 3. Price — MRP, inclusive of all taxes (repeated in the Product details block below) */}
      <p className={styles.price}>
        {formatPrice(product)}
        <span className={styles.priceTaxNote}>Inclusive of all taxes</span>
      </p>

      {/* 3b. Short description */}
      {product.description && <p className={styles.description}>{product.description}</p>}

      {/* 3c. Tee / Pant / Set cross-links */}
      <SetCrossLinks product={product} activeColourSlug={activeColour.slug} />

      {/* 4. Trust line */}
      <p className={styles.trustLine}>{product.trustLine}</p>

      {/* 5. Colour selector */}
      <p className={styles.sectionLabel}>AVAILABLE TONES</p>
      <ColourSwatch
        colours={product.colours.filter(c => c.available)}
        activeColour={activeColour}
        onColourChange={onColourChange}
        expanded={swatchExpanded}
        onExpandedChange={onSwatchExpandedChange}
      />

      {/* 6. Size selector */}
      <p className={styles.sectionLabel}>
        {isSet && separateSizes
          ? 'TEE SIZE'
          : product.sizeUnit ? product.sizeUnit.toUpperCase() : 'SIZE'}
        {product.fitLabel && <span className={styles.fitLabel}>{product.fitLabel}</span>}
      </p>
      <SizeSelector
        sizes={product.sizes}
        selectedSize={selectedSize}
        sizeUnit={product.sizeUnit}
        onSelect={onSizeChange}
      />
      {isSet && separateSizes && (
        <>
          <p className={styles.sectionLabel}>PANT SIZE</p>
          <SizeSelector
            sizes={product.sizes}
            selectedSize={pantSize}
            sizeUnit={product.sizeUnit}
            onSelect={onPantSizeChange}
          />
        </>
      )}
      {isSet && (
        <label className={styles.separateToggle}>
          <input
            type="checkbox"
            checked={separateSizes}
            onChange={e => onSeparateSizesChange(e.target.checked)}
          />
          Choose tee and pant sizes separately
        </label>
      )}
      <button
        type="button"
        className={styles.sizeGuide}
        onClick={() => setSizeGuideOpen(true)}
      >
        Size chart →
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

      {/* 9c. Product details — marketer, country of origin, consumer care, MRP, cm size chart */}
      <ProductDetails product={product} />

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
          aria-label="Size chart"
          onClick={() => setSizeGuideOpen(false)}
        >
          <div
            className={styles.modalCard}
            onClick={e => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <p className={styles.modalTitle}>SIZE CHART</p>
              <button
                ref={closeRef}
                type="button"
                className={styles.modalClose}
                onClick={() => setSizeGuideOpen(false)}
                aria-label="Close size chart"
              >
                ✕
              </button>
            </div>
            <div className={styles.modalBody}>
              <SizeChartTable sizeChart={product.sizeChart} />
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
