'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import type { ProductImage, Product, ProductColour } from '@/types/product'
import { getGalleryImages } from '@/utils/getProductImages'
import styles from './ImageZoom.module.css'

interface Props {
  isOpen: boolean
  onClose: () => void
  images: ProductImage[]
  activeIndex: number
  product: Product
  activeColour: ProductColour
  allColours: ProductColour[]
  onColourClose: (colour: ProductColour) => void
}

// Shared zoom icon SVG
function ZoomIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="11" cy="11" r="8"/>
      <line x1="21" y1="21" x2="16.65" y2="16.65"/>
      <line x1="11" y1="8" x2="11" y2="14"/>
      <line x1="8" y1="11" x2="14" y2="11"/>
    </svg>
  )
}

export { ZoomIcon }

export default function ImageZoom({
  isOpen,
  onClose,
  activeIndex,
  product,
  activeColour,
  allColours,
  onColourClose,
}: Props) {
  const [activeImg, setActiveImg] = useState(activeIndex)
  type ZoomLevel = 1 | 1.4 | 2.2
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>(1.4)
  const [zoomOrigin, setZoomOrigin] = useState({ x: 50, y: 50 })
  const [transitioning, setTransitioning] = useState(false)
  const [internalColour, setInternalColour] = useState<ProductColour>(activeColour)

  const imageRef = useRef<HTMLDivElement>(null)
  const lastScrollTime = useRef(0)
  const activeImgRef = useRef(activeIndex)
  const thumbRefs = useRef<(HTMLButtonElement | null)[]>([])
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)
  // Always-current ref so the Escape handler never goes stale
  const handleCloseRef = useRef<() => void>(() => {})

  // ── Sync on open ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      setInternalColour(activeColour)
      setActiveImg(activeIndex)
      setZoomLevel(1.4)
      setTransitioning(false)
    }
  }, [isOpen, activeColour, activeIndex])

  // ── Body scroll lock — position:fixed required for iOS Safari ────────────
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      document.body.style.position = 'fixed'
      document.body.style.width = '100%'
    } else {
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.width = ''
    }
    return () => {
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.width = ''
    }
  }, [isOpen])

  // ── Escape key — uses ref so no dep on handleClose ────────────────────────
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleCloseRef.current()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen])

  // ── triggerTransition — 150 ms fade, safe for native event closures ──────
  const triggerTransition = useCallback((nextIndex: number) => {
    setTransitioning(true)
    setTimeout(() => {
      setActiveImg(nextIndex)
      setZoomLevel(1.4)
      setTransitioning(false)
    }, 150)
  }, [])

  // ── handleClose — fires onColourClose on every exit path ─────────────────
  const handleClose = useCallback(() => {
    onColourClose(internalColour)
    onClose()
  }, [internalColour, onColourClose, onClose])

  // Keep ref in sync every render
  useEffect(() => {
    handleCloseRef.current = handleClose
  })

  // ── handleColourChange — deferred sync ───────────────────────────────────
  // activeImg intentionally NOT reset — customer stays on same image index
  const handleColourChange = useCallback((colour: ProductColour) => {
    setTransitioning(true)
    setTimeout(() => {
      setInternalColour(colour)
      setZoomLevel(1.4)
      setTransitioning(false)
    }, 150)
  }, [])

  // ── Sorted images — always sorted to match product page order ─────────────
  const displayImages = getGalleryImages(internalColour.images)

  // ── Navigation ───────────────────────────────────────────────────────────
  const handlePrev = () => {
    const i = activeImgRef.current
    triggerTransition(i === 0 ? displayImages.length - 1 : i - 1)
  }

  const handleNext = () => {
    const i = activeImgRef.current
    triggerTransition(i === displayImages.length - 1 ? 0 : i + 1)
  }

  // ── Auto-scroll thumbnail into view ──────────────────────────────────────
  // internalColour dep: re-scroll when colour changes so strip updates correctly
  useEffect(() => {
    thumbRefs.current[activeImg]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [activeImg, internalColour])

  // ── Reset zoom on image change ────────────────────────────────────────────
  useEffect(() => {
    setZoomLevel(1.4)
  }, [activeImg])

  // ── Keep activeImgRef current ─────────────────────────────────────────────
  useEffect(() => {
    activeImgRef.current = activeImg
  }, [activeImg])

  // ── Mouse zoom follow ─────────────────────────────────────────────────────
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!imageRef.current || zoomLevel === 1) return
      const rect = imageRef.current.getBoundingClientRect()
      setZoomOrigin({
        x: ((e.clientX - rect.left) / rect.width) * 100,
        y: ((e.clientY - rect.top) / rect.height) * 100,
      })
    },
    [zoomLevel],
  )

  // ── Scroll wheel — native listener so passive:false actually works ────────
  useEffect(() => {
    const el = imageRef.current
    if (!el || !isOpen) return

    const onWheel = (e: WheelEvent) => {
      if (zoomLevel === 2.2) return
      e.preventDefault()
      e.stopPropagation()
      const now = Date.now()
      if (now - lastScrollTime.current < 500) return
      lastScrollTime.current = now
      const total = internalColour.images.length
      const current = activeImgRef.current
      if (e.deltaY > 0) {
        triggerTransition(current === total - 1 ? 0 : current + 1)
      } else {
        triggerTransition(current === 0 ? total - 1 : current - 1)
      }
    }

    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [isOpen, zoomLevel, internalColour.images.length, triggerTransition])

  // ── Click cycles zoom: 1.4 → 2.2 → 1 → 1.4 ──────────────────────────────
  const handleImageClick = useCallback(() => {
    setZoomLevel((prev): ZoomLevel => {
      if (prev === 1.4) return 2.2
      if (prev === 2.2) return 1
      return 1.4
    })
  }, [])

  // ── Touch swipe ───────────────────────────────────────────────────────────
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current
    const dy = e.changedTouches[0].clientY - touchStartY.current
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) {
      if (dx < 0) handleNext()
      else handlePrev()
    }
  }

  // ── Early return ──────────────────────────────────────────────────────────
  if (!isOpen) return null

  const currentImage = displayImages[activeImg] ?? displayImages[0]
  const formattedPrice = `${product.currency}${product.price.toLocaleString('en-IN')}`
  const zoomHintText = zoomLevel === 2.2
    ? 'Click to step back'
    : zoomLevel === 1
    ? 'Click to zoom'
    : 'Click for close-up'

  // ── Per-image editorial — falls back to product-level data ────────────────
  const byImageEntry = product.editorial?.byImage?.[currentImage.type]
  const activeTitle  = byImageEntry ? byImageEntry.headline : product.name
  const activeBody   = byImageEntry?.body ?? product.editorial?.quote ?? product.compositionQuote
  const activeSpecs  = byImageEntry?.specs ?? product.editorial?.specs

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>

        {/* Close */}
        <button
          className={styles.closeBtn}
          onClick={handleClose}
          aria-label="Close"
        >
          ✕
        </button>

        {/* Col 1 — Thumbnails */}
        <div className={styles.thumbCol}>
          {displayImages.map((img, i) => (
            <button
              key={i}
              ref={el => { thumbRefs.current[i] = el }}
              className={`${styles.thumb} ${i === activeImg ? styles.thumbActive : ''}`}
              onClick={() => triggerTransition(i)}
              aria-label={`View image ${i + 1}`}
            >
              <img
                src={img.src}
                alt={img.alt}
                className={styles.thumbImg}
              />
            </button>
          ))}
        </div>

        {/* Col 2 — Zoomable image */}
        <div
          ref={imageRef}
          className={styles.imageCol}
          onClick={handleImageClick}
          onMouseMove={handleMouseMove}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          style={{ cursor: zoomLevel === 2.2 ? 'zoom-out' : 'zoom-in' }}
        >
          <img
            src={currentImage.src}
            alt={currentImage.alt || product.name}
            className={`${styles.mainImage} ${transitioning ? styles.transitioning : ''}`}
            style={{
              transform: `scale(${zoomLevel})`,
              transformOrigin: `${zoomOrigin.x}% ${zoomOrigin.y}%`,
            }}
          />

          <span className={styles.zoomHint}>{zoomHintText}</span>

          <button
            className={`${styles.navBtn} ${styles.navPrev}`}
            onClick={e => { e.stopPropagation(); handlePrev() }}
            aria-label="Previous image"
          >←</button>

          <button
            className={`${styles.navBtn} ${styles.navNext}`}
            onClick={e => { e.stopPropagation(); handleNext() }}
            aria-label="Next image"
          >→</button>

          <span className={styles.counter}>
            {String(activeImg + 1).padStart(2, '0')}
            {' — '}
            {String(displayImages.length).padStart(2, '0')}
          </span>

          <span className={styles.scrollHint}>Scroll to browse</span>
        </div>

        {/* Col 3 — Editorial panel */}
        <div className={styles.editCol}>

          <span className={styles.editEyebrow}>
            {product.collectionName ?? 'NIVENXA ESSENTIAL'}
          </span>

          <h2 className={styles.editTitle}>{activeTitle}</h2>

          <p className={styles.editQuote}>{activeBody}</p>

          {activeSpecs && activeSpecs.length > 0 && (
            <div className={styles.editSpecs}>
              {activeSpecs.map((spec, i) => (
                <div key={i} className={styles.specRow}>
                  <span className={styles.specLabel}>{spec.label}</span>
                  <span className={styles.specValue}>{spec.value}</span>
                </div>
              ))}
            </div>
          )}

          {/* Colour + price — grouped purchase block */}
          <div className={styles.purchaseBlock}>
            <div className={styles.colourSwitcher}>
              <span className={styles.colourSwitcherLabel}>Available Tones</span>
              <div className={styles.swatchRow}>
                {allColours.map(colour => (
                  <button
                    key={colour.slug}
                    className={`${styles.swatch} ${colour.slug === internalColour.slug ? styles.swatchActive : ''}`}
                    style={{ background: colour.hex }}
                    onClick={() => handleColourChange(colour)}
                    title={colour.label}
                    aria-label={colour.label}
                  />
                ))}
              </div>
              <div className={styles.colourPriceRow}>
                <span className={styles.activeName}>{internalColour.label}</span>
                <span className={styles.inlinePrice}>{formattedPrice}</span>
              </div>
              {internalColour.slug !== activeColour.slug && (
                <span className={styles.changeNote}>Will apply on close</span>
              )}
            </div>
          </div>

          <p className={styles.editNote}>
            Select size on product page to add to bag.
          </p>

        </div>
      </div>
    </div>
  )
}
