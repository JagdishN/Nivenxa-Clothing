'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import type { ProductImage, Product, ProductColour } from '@/types/product'
import { getGalleryImages } from '@/utils/getProductImages'
import styles from './ImageZoom.module.css'

// ─── Zoom constants ───────────────────────────────────────────────────────────
const LB_MIN_SCALE         = 1
const LB_MAX_SCALE         = 5
const LB_ZOOM_STEP         = 0.5
const LB_CLICK_ZOOM_SCALE  = 2   // fixed step a click/tap zooms to from 1x
const LB_TAP_MOVE_THRESHOLD = 5  // px — distinguishes a tap/click from a drag

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
  const [activeImg, setActiveImg]       = useState(activeIndex)
  const [transitioning, setTransitioning] = useState(false)
  const [internalColour, setInternalColour] = useState<ProductColour>(activeColour)

  // ── Zoom / pan state (drives re-renders / CSS) ────────────────────────────
  const [scale,  setScale]  = useState(LB_MIN_SCALE)
  const [transX, setTransX] = useState(0)
  const [transY, setTransY] = useState(0)

  // ── Refs — always-current inside native event closures ────────────────────
  const scaleRef  = useRef(LB_MIN_SCALE)
  const transXRef = useRef(0)
  const transYRef = useRef(0)

  // Mouse / pen drag tracking
  const isDragging = useRef(false)
  const hasDragged = useRef(false)
  const dragStart  = useRef({ px: 0, py: 0, tx: 0, ty: 0 })

  // Pinch tracking
  const pinch = useRef({
    active:    false,
    initDist:  0,
    initScale: 1 as number,
    midX:      0,
    midY:      0,
    initTx:    0,
    initTy:    0,
  })

  // Double-tap timestamp
  const lastTap = useRef(0)

  // Tap/click-vs-drag detection (shared by touch + pointer paths)
  const touchMoved    = useRef(false)
  const pinchOccurred  = useRef(false)

  // DOM + stable function refs
  const imageRef     = useRef<HTMLDivElement>(null)
  const activeImgRef = useRef(activeIndex)
  const thumbRefs    = useRef<(HTMLButtonElement | null)[]>([])
  const handleCloseRef = useRef<() => void>(() => {})
  const handleNextRef  = useRef<() => void>(() => {})
  const handlePrevRef  = useRef<() => void>(() => {})

  // ── Zoom helpers ──────────────────────────────────────────────────────────

  /**
   * Clamp (tx, ty) so the image always fills the container — no white edges.
   * With transform-origin: 0 0 and translate(tx,ty) scale(S):
   *   W·(1−S) ≤ tx ≤ 0,  H·(1−S) ≤ ty ≤ 0
   */
  const clamp = useCallback((s: number, nx: number, ny: number) => {
    const el = imageRef.current
    if (!el) return { x: nx, y: ny }
    const W = el.offsetWidth
    const H = el.offsetHeight
    return {
      x: Math.max(W * (1 - s), Math.min(0, nx)),
      y: Math.max(H * (1 - s), Math.min(0, ny)),
    }
  }, [])

  /** Apply (scale, tx, ty), clamped. Syncs refs + state. */
  const apply = useCallback((s: number, nx: number, ny: number) => {
    const { x, y } = clamp(s, nx, ny)
    scaleRef.current  = s
    transXRef.current = x
    transYRef.current = y
    setScale(s)
    setTransX(x)
    setTransY(y)
  }, [clamp])

  /** Zoom centred on screen point (cx, cy). */
  const zoomAt = useCallback((cx: number, cy: number, delta: number) => {
    const el = imageRef.current
    if (!el) return
    const { left, top } = el.getBoundingClientRect()
    const relX  = cx - left
    const relY  = cy - top
    const prevS = scaleRef.current
    const nextS = Math.max(LB_MIN_SCALE, Math.min(LB_MAX_SCALE, prevS + delta))
    if (nextS === prevS) return
    const ratio = nextS / prevS
    apply(
      nextS,
      relX - (relX - transXRef.current) * ratio,
      relY - (relY - transYRef.current) * ratio,
    )
  }, [apply])

  /** Zoom centred on container midpoint (for +/− buttons). */
  const zoomAtCenter = useCallback((delta: number) => {
    const el = imageRef.current
    if (!el) return
    const { left, top } = el.getBoundingClientRect()
    zoomAt(left + el.offsetWidth / 2, top + el.offsetHeight / 2, delta)
  }, [zoomAt])

  /** Reset zoom to 1× centred. */
  const resetZoom = useCallback(() => apply(LB_MIN_SCALE, 0, 0), [apply])

  /** Click/tap on the image: zoom to a fixed step centred on the point, or reset if already zoomed. */
  const handleImageActivate = useCallback((cx: number, cy: number) => {
    if (scaleRef.current > LB_MIN_SCALE) {
      resetZoom()
    } else {
      zoomAt(cx, cy, LB_CLICK_ZOOM_SCALE - LB_MIN_SCALE)
    }
  }, [resetZoom, zoomAt])

  // ── Sync on open ──────────────────────────────────────────────────────────
  // resetZoom touches scaleRef/transXRef/transYRef, which the lint rule below
  // forbids during render (ref mutation isn't render-safe under Strict Mode's
  // double-invoke). An effect is the correct place for that ref write, so this
  // one setState-in-effect is intentional rather than an oversight.
  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- resets refs (scaleRef etc.) in lockstep with state; see comment above
      setInternalColour(activeColour)
      setActiveImg(activeIndex)
      resetZoom()
      setTransitioning(false)
    }
  }, [isOpen, activeColour, activeIndex, resetZoom])

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

  // ── Escape key ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleCloseRef.current()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen])

  // ── Sorted images ─────────────────────────────────────────────────────────
  const displayImages = getGalleryImages(internalColour.images)

  // ── triggerTransition — 150 ms fade + image change + zoom reset ───────────
  const triggerTransition = useCallback((nextIndex: number) => {
    setTransitioning(true)
    setTimeout(() => {
      setActiveImg(nextIndex)
      resetZoom()
      setTransitioning(false)
    }, 150)
  }, [resetZoom])

  // ── handleClose ───────────────────────────────────────────────────────────
  const handleClose = useCallback(() => {
    onColourClose(internalColour)
    onClose()
  }, [internalColour, onColourClose, onClose])

  // ── handleColourChange ────────────────────────────────────────────────────
  const handleColourChange = useCallback((colour: ProductColour) => {
    setTransitioning(true)
    setTimeout(() => {
      setInternalColour(colour)
      resetZoom()
      setTransitioning(false)
    }, 150)
  }, [resetZoom])

  // ── Navigation ────────────────────────────────────────────────────────────
  const handlePrev = () => {
    const i = activeImgRef.current
    triggerTransition(i === 0 ? displayImages.length - 1 : i - 1)
  }

  const handleNext = () => {
    const i = activeImgRef.current
    triggerTransition(i === displayImages.length - 1 ? 0 : i + 1)
  }

  // ── Keep stable refs current on every render ──────────────────────────────
  useEffect(() => {
    handleCloseRef.current = handleClose
    handleNextRef.current  = handleNext
    handlePrevRef.current  = handlePrev
  })

  // ── Keep activeImgRef current ─────────────────────────────────────────────
  useEffect(() => {
    activeImgRef.current = activeImg
  }, [activeImg])

  // ── Auto-scroll thumbnail into view ──────────────────────────────────────
  useEffect(() => {
    thumbRefs.current[activeImg]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [activeImg, internalColour])

  // ── Scroll wheel — zoom in/out centred on cursor ──────────────────────────
  useEffect(() => {
    const el = imageRef.current
    if (!el || !isOpen) return

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      e.stopPropagation()
      const isZoomingIn = e.deltaY < 0
      zoomAt(e.clientX, e.clientY, isZoomingIn ? LB_ZOOM_STEP : -LB_ZOOM_STEP)
    }

    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [isOpen, zoomAt])

  // ── Touch — pinch zoom / drag pan / swipe navigation ─────────────────────
  useEffect(() => {
    const el = imageRef.current
    if (!el || !isOpen) return

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        // Two-finger pinch start
        e.preventDefault()
        pinchOccurred.current = true
        const t0   = e.touches[0]
        const t1   = e.touches[1]
        const dist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY)
        pinch.current = {
          active:    true,
          initDist:  dist,
          initScale: scaleRef.current,
          midX:      (t0.clientX + t1.clientX) / 2,
          midY:      (t0.clientY + t1.clientY) / 2,
          initTx:    transXRef.current,
          initTy:    transYRef.current,
        }
      } else if (e.touches.length === 1) {
        pinch.current.active = false
        // Fresh single-finger gesture — only reached on a genuine 0→1 touch transition
        pinchOccurred.current = false
        touchMoved.current    = false

        // Double-tap → reset
        const now = Date.now()
        if (now - lastTap.current < 300) {
          e.preventDefault()
          resetZoom()
          lastTap.current = 0
          return
        }
        lastTap.current = now

        // Record start point for tap / pan / swipe detection
        dragStart.current = {
          px: e.touches[0].clientX,
          py: e.touches[0].clientY,
          tx: transXRef.current,
          ty: transYRef.current,
        }
      }
    }

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && pinch.current.active) {
        // Pinch zoom
        e.preventDefault()
        touchMoved.current = true
        const t0   = e.touches[0]
        const t1   = e.touches[1]
        const dist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY)
        const nextS = Math.max(
          LB_MIN_SCALE,
          Math.min(LB_MAX_SCALE, pinch.current.initScale * (dist / pinch.current.initDist)),
        )
        const { midX, midY, initTx, initTy, initScale } = pinch.current
        const { left, top } = el.getBoundingClientRect()
        const relX  = midX - left
        const relY  = midY - top
        const ratio = nextS / initScale
        apply(nextS, relX - (relX - initTx) * ratio, relY - (relY - initTy) * ratio)
      } else if (e.touches.length === 1 && scaleRef.current > LB_MIN_SCALE) {
        // Single-finger pan — only when zoomed; blocks swipe nav at >1×
        e.preventDefault()
        const dx = e.touches[0].clientX - dragStart.current.px
        const dy = e.touches[0].clientY - dragStart.current.py
        if (Math.abs(dx) > LB_TAP_MOVE_THRESHOLD || Math.abs(dy) > LB_TAP_MOVE_THRESHOLD) {
          touchMoved.current = true
        }
        apply(scaleRef.current, dragStart.current.tx + dx, dragStart.current.ty + dy)
      } else if (e.touches.length === 1) {
        // At 1× with one finger: no preventDefault → swipe detection fires in onTouchEnd.
        // Still track movement so a swipe isn't mistaken for a tap.
        const dx = e.touches[0].clientX - dragStart.current.px
        const dy = e.touches[0].clientY - dragStart.current.py
        if (Math.abs(dx) > LB_TAP_MOVE_THRESHOLD || Math.abs(dy) > LB_TAP_MOVE_THRESHOLD) {
          touchMoved.current = true
        }
      }
    }

    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) pinch.current.active = false
      if (e.touches.length === 0 && pinch.current.active === false) {
        // Full release — clear pinch flag for the next gesture (touchstart also
        // resets it on a fresh 0→1 transition, this just keeps state tidy)
        pinchOccurred.current = false
      }

      // A pinch occurred this gesture — its finger-lift events aren't taps/swipes
      if (pinchOccurred.current) return

      if (e.changedTouches.length === 1) {
        const dx = e.changedTouches[0].clientX - dragStart.current.px
        const dy = e.changedTouches[0].clientY - dragStart.current.py

        if (!touchMoved.current) {
          // Tap — toggle zoom at the tap point
          handleImageActivate(e.changedTouches[0].clientX, e.changedTouches[0].clientY)
        } else if (scaleRef.current <= LB_MIN_SCALE && Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) {
          // Swipe navigation — only at 1× (zoomed in → drag pans, not nav)
          if (dx < 0) handleNextRef.current()
          else handlePrevRef.current()
        }
      }
    }

    el.addEventListener('touchstart', onTouchStart, { passive: false })
    el.addEventListener('touchmove',  onTouchMove,  { passive: false })
    el.addEventListener('touchend',   onTouchEnd)
    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove',  onTouchMove)
      el.removeEventListener('touchend',   onTouchEnd)
    }
  }, [isOpen, apply, resetZoom, handleImageActivate])

  // ── Pointer events — mouse/pen drag to pan ────────────────────────────────

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    // Touch is handled by native touch listeners above
    if (e.pointerType === 'touch') return
    // Don't start drag when user clicks a button (nav arrows, zoom controls)
    if ((e.target as HTMLElement).closest('button')) return
    isDragging.current = true
    hasDragged.current = false
    dragStart.current  = {
      px: e.clientX,
      py: e.clientY,
      tx: transXRef.current,
      ty: transYRef.current,
    }
    // Pointer capture keeps events flowing if cursor leaves the element
    ;(e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId)
    // Prevent text-selection during drag
    e.preventDefault()
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!isDragging.current || e.pointerType === 'touch') return
    const dx = e.clientX - dragStart.current.px
    const dy = e.clientY - dragStart.current.py
    if (Math.abs(dx) > LB_TAP_MOVE_THRESHOLD || Math.abs(dy) > LB_TAP_MOVE_THRESHOLD) hasDragged.current = true
    // Pan only when: movement threshold crossed AND zoomed in
    if (hasDragged.current && scaleRef.current > LB_MIN_SCALE) {
      apply(scaleRef.current, dragStart.current.tx + dx, dragStart.current.ty + dy)
    }
  }

  function handlePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (e.pointerType === 'touch') return
    const wasEligible = isDragging.current
    const dragged     = hasDragged.current
    isDragging.current = false
    hasDragged.current = false
    // A click (no drag movement) on the image toggles zoom at the click point
    if (wasEligible && !dragged) {
      handleImageActivate(e.clientX, e.clientY)
    }
  }

  function handleDoubleClick(e: React.MouseEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).closest('button')) return
    e.stopPropagation()
    resetZoom()
  }

  // ── Early return ──────────────────────────────────────────────────────────
  if (!isOpen) return null

  const currentImage   = displayImages[activeImg] ?? displayImages[0]
  const formattedPrice = `${product.currency}${product.price.toLocaleString('en-IN')}`
  const isZoomed       = scale > LB_MIN_SCALE

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

        {/* Col 1 — Thumbnails (unchanged) */}
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

        {/* Col 2 — Centre image with inline zoom/pan */}
        <div
          ref={imageRef}
          className={`${styles.imageCol} ${isZoomed ? styles.imageColZoomed : ''}`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onDoubleClick={handleDoubleClick}
        >
          <img
            src={currentImage.src}
            alt={currentImage.alt || product.name}
            className={`${styles.mainImage} ${transitioning ? styles.transitioning : ''}`}
            style={{
              transform:       `translate(${transX}px, ${transY}px) scale(${scale})`,
              transformOrigin: '0 0',
              willChange:      'transform',
            }}
          />

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

          <span className={styles.scrollHint}>
            {isZoomed ? 'Drag to pan  ·  Double-click to reset' : 'Scroll to zoom'}
          </span>

          {/* +/− zoom controls — desktop only, bottom-right */}
          <div
            className={styles.zoomControls}
            onPointerDown={e => e.stopPropagation()}
            onClick={e => e.stopPropagation()}
          >
            <button
              type="button"
              className={styles.zoomControlBtn}
              onClick={() => zoomAtCenter(LB_ZOOM_STEP)}
              disabled={scale >= LB_MAX_SCALE}
              aria-label="Zoom in"
            >+</button>
            <button
              type="button"
              className={styles.zoomControlBtn}
              onClick={() => zoomAtCenter(-LB_ZOOM_STEP)}
              disabled={scale <= LB_MIN_SCALE}
              aria-label="Zoom out"
            >−</button>
          </div>

        </div>

        {/* Col 3 — Editorial panel (unchanged) */}
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
