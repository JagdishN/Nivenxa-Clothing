'use client'
import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import type { Product, ProductImage } from '@/types'
import styles from './ProductFocusViewer.module.scss'

interface Section {
  title:  string
  body:   string
  imgIdx: number
  scale:  number
  y:      string
}

const VIEW_META: Record<string, { title: string; body: string; scale: number; y: string }> = {
  front:              { title: 'Full Silhouette',       body: 'The complete form — silhouette, proportion, and how the garment falls from shoulder to hem.',        scale: 1.0,  y: '0%' },
  back:               { title: 'Complete Look',          body: 'Every angle considered. How this piece resolves — from front silhouette to back construction.',       scale: 1.0,  y: '0%' },
  side:               { title: 'Movement & Form',        body: 'How the silhouette moves in space. Ease, drape, and the architecture of unrestricted everyday wear.', scale: 1.0,  y: '-3%' },
  details:            { title: 'Weave & Surface',        body: 'Macro surface character. The grain of the cloth, its finish — the identity of the fabric up close.',  scale: 1.35, y: '0%' },
  lifestyle:          { title: 'Lifestyle',              body: 'Styled and worn. The garment in context — how it lives outside the studio.',                          scale: 1.0,  y: '0%' },
  walking:            { title: 'In Motion',              body: 'How the silhouette moves. Drape, ease, and the flow of unrestricted everyday wear.',                  scale: 1.0,  y: '0%' },
  'pocket-depth-phone': { title: 'Pocket Depth',         body: 'Phone-compatible depth — generous enough for daily carry without adding visual bulk.',               scale: 1.0,  y: '0%' },
  'pocket-slash':       { title: 'Front Slash Pocket',  body: 'Deep angled entry for relaxed utility access.',                                                       scale: 1.0,  y: '0%' },
  'pocket-cargo-side':  { title: 'Side Cargo Pocket',   body: 'Structured patch pocket with clean-finished opening — volume without bulk.',                          scale: 1.0,  y: '0%' },
  'pocket-back-patch':  { title: 'Back Patch Pocket',   body: 'Flat back patch construction — minimal profile, maximum utility.',                                    scale: 1.0,  y: '0%' },
  'pocket-closure':     { title: 'Pocket Closure',      body: 'Reinforced bar-tack at all stress points. Built to outlast the wear.',                               scale: 1.0,  y: '0%' },
  'pocket-depth':       { title: 'Pocket Depth',        body: 'Gusseted construction adds depth without adding visual weight.',                                       scale: 1.0,  y: '0%' },
  'pocket-flap':        { title: 'Pocket Flap Detail',  body: 'Clean-finished flap with precision topstitch — construction as visual language.',                     scale: 1.0,  y: '0%' },
}

// Ordered sequence for the zoom viewer
const PRIMARY_VIEW_ORDER = ['front', 'back', 'side', 'lifestyle', 'walking', 'pocket-depth-phone', 'pocket-depth'] as const

function buildSections(imgs: ProductImage[]): Section[] {
  return imgs.map((img, i) => {
    const meta = VIEW_META[img.view] ?? { title: img.view, body: '', scale: 1.0, y: '0%' }
    return { ...meta, imgIdx: i }
  })
}

interface Props {
  product:         Product
  variants:        Product[]
  images:          ProductImage[]
  initialView?:    string
  onClose:         () => void
  onVariantChange: (variant: Product) => void
}

export default function ProductFocusViewer({ product, variants, images: initialImages, initialView, onClose, onVariantChange }: Props) {
  const startIdx = (() => {
    if (!initialView) return 0
    const imgs = product.images ?? initialImages
    const filtered = PRIMARY_VIEW_ORDER
      .map(view => imgs.find(im => im.view === view))
      .filter((im): im is ProductImage => im !== undefined)
    const idx = filtered.findIndex(im => im.view === initialView)
    return idx >= 0 ? idx : 0
  })()

  const [selectedVariant, setSelectedVariant] = useState<Product>(product)
  const [activeSec,       setActiveSec]       = useState(startIdx)
  const [activeThumb,     setActiveThumb]     = useState(startIdx)
  const panelRef   = useRef<HTMLDivElement>(null)
  const deltaAccum = useRef(0)

  const allImages     = selectedVariant.images ?? initialImages
  const currentImages = PRIMARY_VIEW_ORDER
    .map(view => allImages.find(im => im.view === view))
    .filter((im): im is ProductImage => im !== undefined)
  const sections      = buildSections(currentImages)

  const safeSec = Math.min(activeSec, sections.length - 1)
  const sec     = sections[safeSec]
  const img     = currentImages[sec?.imgIdx ?? 0]

  const advance = useCallback((dir: 1 | -1) => {
    deltaAccum.current = 0
    setActiveSec(prev => {
      const next = Math.min(Math.max(prev + dir, 0), sections.length - 1)
      setActiveThumb(sections[next].imgIdx)
      return next
    })
  }, [sections])

  const handleVariantChange = useCallback((variant: Product) => {
    if (variant.id === selectedVariant.id) return
    const currentView   = img?.view
    const newFiltered   = PRIMARY_VIEW_ORDER
      .map(view => (variant.images ?? []).find(im => im.view === view))
      .filter((im): im is ProductImage => im !== undefined)
    const newSections   = buildSections(newFiltered)

    let nextSec = Math.min(activeSec, newSections.length - 1)
    if (currentView) {
      const match = newFiltered.findIndex(im => im.view === currentView)
      if (match >= 0) nextSec = match
    }

    setSelectedVariant(variant)
    setActiveSec(nextSec)
    setActiveThumb(newSections[nextSec]?.imgIdx ?? 0)
  }, [selectedVariant.id, img?.view, activeSec])

  // Sync parent state + URL only when the viewer closes
  const handleClose = useCallback(() => {
    onVariantChange(selectedVariant)
    onClose()
  }, [selectedVariant, onVariantChange, onClose])

  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      e.stopPropagation()
      deltaAccum.current += e.deltaY
      if (Math.abs(deltaAccum.current) >= 90) {
        advance(deltaAccum.current > 0 ? 1 : -1)
      }
    }
    document.addEventListener('wheel', onWheel, { passive: false })
    return () => document.removeEventListener('wheel', onWheel)
  }, [advance])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape')    { handleClose(); return }
      if (e.key === 'ArrowDown') { e.preventDefault(); advance(1)  }
      if (e.key === 'ArrowUp')   { e.preventDefault(); advance(-1) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [handleClose, advance])

  const goTo = (idx: number) => {
    deltaAccum.current = 0
    setActiveSec(idx)
    setActiveThumb(sections[idx].imgIdx)
  }

  const thumbClick = (imgIdx: number) => {
    const sIdx = sections.findIndex(s => s.imgIdx === imgIdx)
    if (sIdx >= 0) goTo(sIdx)
  }

  return (
    <motion.div
      className={styles.overlay}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      onClick={handleClose}
    >
      <motion.div
        ref={panelRef}
        className={styles.panel}
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 18 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        onClick={e => e.stopPropagation()}
      >

        {/* ── Thumbnail Rail ─────────────────────────────────────── */}
        <div className={styles.rail}>
          {currentImages.map((im, i) => (
            <button
              key={`${selectedVariant.id}-${im.view}`}
              className={`${styles.thumb} ${activeThumb === i ? styles.thumbActive : ''}`}
              onClick={() => thumbClick(i)}
            >
              <Image src={im.src} alt={im.view} fill sizes="8vw" className={styles.thumbImg} />
            </button>
          ))}
        </div>

        {/* ── Editorial Canvas ────────────────────────────────────── */}
        <div className={styles.canvas}>

          {/* Image layer */}
          <AnimatePresence mode="wait">
            <motion.div
              key={`${selectedVariant.id}-${sec?.imgIdx}`}
              className={styles.canvasFill}
              initial={{ opacity: 0, scale: 1.03, x: 10 }}
              animate={{ opacity: 1, scale: 1,    x: 0  }}
              exit={{ opacity: 0,   scale: 0.98,  x: -8 }}
              transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
            >
              <motion.div
                className={styles.canvasZoom}
                animate={{ scale: sec?.scale ?? 1, y: sec?.y ?? '0%' }}
                transition={{ duration: 1.8, ease: [0.22, 1, 0.36, 1] }}
              >
                {img && (
                  <Image
                    src={img.src}
                    alt={selectedVariant.name}
                    fill priority
                    sizes="85vw"
                    className={styles.canvasImg}
                  />
                )}
              </motion.div>
            </motion.div>
          </AnimatePresence>

          {/* Floating story card — top right */}
          <div className={styles.floatingWrap}>
            <AnimatePresence mode="wait">
              <motion.div
                key={`${selectedVariant.id}-${safeSec}`}
                className={styles.floatingCard}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0,   y: -6 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              >
                <span className={styles.floatingNum}>
                  {String(safeSec + 1).padStart(2, '0')} / {String(sections.length).padStart(2, '0')}
                </span>
                <p className={styles.floatingTitle}>{sec?.title}</p>
                <p className={styles.floatingBody}>{sec?.body}</p>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Color swatches — bottom center */}
          {variants.length > 1 && (
            <div className={styles.swatches}>
              {variants.map(v => (
                <button
                  key={v.id}
                  className={`${styles.swatch} ${selectedVariant.id === v.id ? styles.swatchActive : ''}`}
                  onClick={() => handleVariantChange(v)}
                  title={v.colorway}
                >
                  <span className={styles.swatchChip} style={{ background: v.gradient }} />
                </button>
              ))}
            </div>
          )}

          {/* Progress counter — right edge */}
          <div className={styles.progressCounter}>
            <span className={styles.progressCurrent}>{String(safeSec + 1).padStart(2, '0')}</span>
            <span className={styles.progressSep}>/</span>
            <span className={styles.progressTotal}>{String(sections.length).padStart(2, '0')}</span>
          </div>

          {/* Scroll hint */}
          <AnimatePresence>
            {safeSec === 0 && (
              <motion.p
                className={styles.scrollHint}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4, delay: 0.8 }}
              >
                Scroll to explore
              </motion.p>
            )}
          </AnimatePresence>

        </div>

        <button className={styles.close} onClick={handleClose}>✕</button>

      </motion.div>
    </motion.div>
  )
}
