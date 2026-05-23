'use client'
import { useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { Link, useRouter } from '@/i18n/routing'
import type { Product } from '@/types'
import { useCart } from '@/context/CartContext'
import { useAuth } from '@/context/AuthContext'
import { useCurrency } from '@/context/CurrencyContext'
import ProductFocusViewer from './ProductFocusViewer'
import styles from '@/app/[locale]/product/[id]/ProductStory.module.scss'

const toColorSlug = (colorway: string) => colorway.toLowerCase().replace(/\s+/g, '-')

const FADE_UP = (delay = 0) => ({
  initial: { opacity: 0, y: 14, filter: 'blur(4px)' },
  animate: { opacity: 1, y: 0,  filter: 'blur(0px)' },
  transition: { duration: 0.9, ease: [0.22, 1, 0.36, 1], delay },
})

const IN_VIEW = (delay = 0) => ({
  initial: { opacity: 0, y: 16, filter: 'blur(3px)' },
  whileInView: { opacity: 1, y: 0,  filter: 'blur(0px)' },
  viewport: { once: true, margin: '-60px' },
  transition: { duration: 1.0, ease: [0.22, 1, 0.36, 1], delay },
})

const SIZES = ['S', 'M', 'L', 'XL']

const TEE_PHILOSOPHY = [
  'Relaxed drop-shoulder structure',
  'Premium-weight combed cotton',
  'Muted everyday tones',
  'Soft lived-in texture',
  'Designed for repeat wear',
]

const TEE_HERO_DETAILS = [
  'Relaxed drop-shoulder fit',
  'Premium combed cotton',
  'Soft washed finish',
  'Designed for repeat wear',
]

const CARGO_HERO_DETAILS = [
  'Six-pocket utility silhouette',
  '300–340 GSM bio-washed cotton',
  'Reinforced stress points',
  'Built for everyday movement',
]

interface Props {
  product:  Product
  variants: Product[]   // same category — drives color selector
  related:  Product[]   // other products — drives related row
}

export default function ProductStoryClient({ product, variants, related }: Props) {
  const [selected, setSelected]         = useState<Product>(product)
  const [selectedSize, setSelectedSize] = useState<string | null>(null)
  const [viewerOpen, setViewerOpen]         = useState(false)
  const [viewerInitialView, setViewerInitialView] = useState<string>('front')

  const openViewer = useCallback((view: string) => {
    setViewerInitialView(view)
    setViewerOpen(true)
  }, [])
  const [toast, setToast]               = useState<string | null>(null)
  const [nudgeSizes, setNudgeSizes]     = useState(false)
  const toastTimer                      = useRef<ReturnType<typeof setTimeout> | null>(null)

  const router = useRouter()
  const { bumpLocal } = useCart()
  const { customer } = useAuth()
  const { formatPrice } = useCurrency()

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 2200)
  }, [])

  // All images derive from selected color variant
  const front        = selected.images?.find((i) => i.view === 'front')     ?? selected.images?.[0]
  const back         = selected.images?.find((i) => i.view === 'back')      ?? selected.images?.[1]
  const side         = selected.images?.find((i) => i.view === 'side')      ?? selected.images?.[2]
  const detailImg    = selected.images?.find((i) => i.view === 'details')   ?? selected.images?.[3]
  const lifestyleImg = selected.images?.find((i) => i.view === 'lifestyle') ?? detailImg
  const walkingImg   = selected.images?.find((i) => i.view === 'walking')   ?? lifestyleImg
  const isTee     = selected.category === 'over-tee-shirts'
  const isCargo   = selected.category === 'cargo-pants'
  const spec      = selected.fabricStory?.spec

  const specValues: string[] = spec
    ? (Object.values(spec).filter(Boolean) as string[])
    : selected.dna
      ? [selected.dna.fabric, selected.dna.structure, selected.dna.finish, selected.dna.movement,
         ...(selected.dna.climate ? [selected.dna.climate] : [])].filter((v): v is string => v !== undefined)
      : []

  const handleColorChange = useCallback((variant: Product) => {
    setSelected(variant)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    router.replace(`/shop/${variant.category}/${toColorSlug(variant.colorway)}` as any, { scroll: false })
  }, [router])

  return (
    <div className={styles.page}>

      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <Link href={`/shop/${selected.category}` as any} className={styles.backButton}>← Collection</Link>

      {/* ══ 1. HERO — 3-panel editorial ═══════════════════════════════════ */}
      <section className={styles.hero}>

        {/* ── LEFT: copy panel ────────────────────────────────────────── */}
        <div className={styles.heroLeft}>
          <div className={styles.heroLeftInner}>

            {selected.status && (
              <motion.span className={styles.heroCollection} {...FADE_UP(0.1)}>
                {selected.status}
              </motion.span>
            )}

            <motion.h1 className={styles.heroName} {...FADE_UP(0.2)}>
              {selected.name}
            </motion.h1>

            {selected.fabricStory?.label && (
              <motion.p className={styles.heroDescriptor} {...FADE_UP(0.28)}>
                {selected.fabricStory.label}
              </motion.p>
            )}

            <motion.p className={styles.heroPrice} {...FADE_UP(0.34)}>
              {formatPrice(selected.price)}
            </motion.p>

            {/* Color variant selector */}
            {variants.length > 1 && (
              <motion.div className={styles.heroColors} {...FADE_UP(0.4)}>
                <p className={styles.heroSelectorLabel}>Available tones</p>
                <div className={styles.heroColorSwatches}>
                  {variants.map((v) => (
                    <button
                      key={v.id}
                      className={`${styles.heroColorSwatch} ${v.id === selected.id ? styles.heroColorSwatchActive : ''}`}
                      onClick={() => handleColorChange(v)}
                    >
                      <span className={styles.heroSwatchTexture} style={{ background: v.gradient }} />
                      <span className={styles.heroSwatchName}>{v.colorway}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Size selector */}
            <motion.div className={styles.heroSizes} {...FADE_UP(0.46)}>
              <p className={styles.heroSelectorLabel}>Size</p>
              <div className={`${styles.heroSizeGrid} ${nudgeSizes ? styles.heroSizeGridNudge : ''}`}>
                {SIZES.map((s) => (
                  <button
                    key={s}
                    className={`${styles.heroSizeBtn} ${selectedSize === s ? styles.heroSizeBtnActive : ''}`}
                    onClick={() => { setSelectedSize(s); setNudgeSizes(false) }}
                  >{s}</button>
                ))}
              </div>
            </motion.div>

            {(isTee || isCargo) && (
              <motion.div className={styles.heroEditorialBlock} {...FADE_UP(0.50)}>
                {(isTee ? TEE_HERO_DETAILS : CARGO_HERO_DETAILS).map((line) => (
                  <p key={line} className={styles.heroEditorialLine}>
                    <span className={styles.heroEditorialDiamond}>◇</span>
                    {line}
                  </p>
                ))}
              </motion.div>
            )}

            <motion.div {...FADE_UP(0.56)}>
              <button
                className={styles.addToWardrobeBtn}
                onClick={() => {
                  if (!customer) {
                    showToast('Sign in to add this piece to your bag')
                  } else if (!selectedSize) {
                    setNudgeSizes(true)
                    showToast('Select your size to continue')
                  } else {
                    setNudgeSizes(false)
                    bumpLocal()
                    showToast('Added to Bag')
                  }
                }}
              >
                Add to Bag
                <svg className={styles.ctaArrow} width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
                  <path d="M4 4.5C4 3.12 5.12 2 6.5 2S9 3.12 9 4.5" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round"/>
                  <rect x="2" y="4.5" width="9" height="7" rx="1" stroke="currentColor" strokeWidth="0.9"/>
                </svg>
              </button>
            </motion.div>

          </div>
        </div>

        {/* ── CENTER: main product image ───────────────────────────────── */}
        <div
          className={styles.heroCenter}
          onClick={() => selected.images?.length && openViewer('front')}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={selected.id}
              style={{ position: 'absolute', inset: 0 }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            >
              {front ? (
                <Image
                  src={front.src}
                  alt={selected.name}
                  fill
                  priority
                  sizes="(max-width:768px) 100vw, 48vw"
                  className={`${styles.heroCenterImage}${selected.colorway === 'Dust Sage' ? ` ${styles.heroCenterImageDustSage}` : ''}`}
                />
              ) : (
                <div style={{ background: selected.gradient, position: 'absolute', inset: 0 }} />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* ── RIGHT: secondary views ──────────────────────────────────── */}
        <div className={styles.heroRight}>
          {back && (
            <div className={styles.heroRightSlot} onClick={() => openViewer('back')}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={`back-${selected.id}`}
                  style={{ position: 'absolute', inset: 0 }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.55 }}
                >
                  <Image
                    src={back.src}
                    alt={`${selected.name} — back view`}
                    fill
                    sizes="26vw"
                    className={`${styles.heroRightImage}${selected.colorway === 'Dust Sage' ? ` ${styles.heroRightImageDustSage}` : ''}`}
                  />
                </motion.div>
              </AnimatePresence>
              <span className={styles.heroViewLabel}>Back</span>
            </div>
          )}
          {walkingImg && (
            <div className={styles.heroRightSlot} onClick={() => openViewer('walking')}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={`walking-${selected.id}`}
                  style={{ position: 'absolute', inset: 0 }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.55 }}
                >
                  <Image
                    src={walkingImg.src}
                    alt={`${selected.name} — walking`}
                    fill
                    sizes="26vw"
                    className={styles.heroRightImage}
                  />
                </motion.div>
              </AnimatePresence>
              <span className={styles.heroViewLabel}>Walking</span>
            </div>
          )}
        </div>

      </section>

      {/* ══ 2. EDITORIAL PRODUCT COMPOSITION ═════════════════════════════ */}
      <section id="s-compose" className={styles.composeSection}>
        <div className={styles.composeGrid}>

          <div className={styles.composeLeft}>
            <motion.div className={styles.composeStory} {...IN_VIEW(0)}>
              {selected.fabricStory?.label && (
                <p className={styles.composeStoryLabel}>{selected.fabricStory.label}</p>
              )}
              <p className={styles.composeStoryText}>
                {selected.fabricStory?.body ?? selected.description}
              </p>
            </motion.div>
          </div>

          <div className={styles.composeRight}>
            <div className={styles.composeSticky}>
              <div className={styles.specPanel}>
                <p className={styles.specPanelEyebrow}>Composition</p>
                <motion.p className={styles.specPanelHero} {...IN_VIEW(0)}>
                  {selected.fabric}
                </motion.p>
                {spec && (
                  <motion.p className={styles.specPanelInline} {...IN_VIEW(0.06)}>
                    {([spec.weave, spec.softness ? `${spec.softness} hand feel` : null, spec.finish]
                      .filter(Boolean) as string[]).join(' / ')}
                  </motion.p>
                )}
                {!spec && specValues.length > 0 && (
                  <motion.p className={styles.specPanelInline} {...IN_VIEW(0.06)}>
                    {specValues.join(' / ')}
                  </motion.p>
                )}
              </div>

              {selected.details && selected.details.length > 0 && (() => {
                const mid   = Math.ceil(selected.details.length / 2)
                const line1 = selected.details.slice(0, mid)
                const line2 = selected.details.slice(mid)
                return (
                  <motion.div className={styles.detailBlock} {...IN_VIEW(0.1)}>
                    <p className={styles.constructionLabel}>Construction Details</p>
                    <p className={styles.detailInline}>
                      {line1.map((d) => <span key={d} className={styles.detailInlineItem}>{d}</span>)}
                    </p>
                    {line2.length > 0 && (
                      <p className={styles.detailInline}>
                        {line2.map((d) => <span key={d} className={styles.detailInlineItem}>{d}</span>)}
                      </p>
                    )}
                  </motion.div>
                )
              })()}
            </div>
          </div>

        </div>
      </section>

      {/* ══ 3. LIFESTYLE / CAMPAIGN ═══════════════════════════════════════ */}
      <section id="s-lifestyle" className={styles.lifestyleSection}>
        <div className={styles.lifestyleInner}>
          <div className={styles.lifestyleGrid}>

            {/* Col 1 — large side image */}
            {side && (
              <motion.div className={styles.lifestyleSideWrap} {...IN_VIEW(0)}>
                <Image
                  src={side.src}
                  alt={`${selected.name} — side view`}
                  fill
                  sizes="(max-width:768px) 90vw, 50vw"
                  className={styles.lifestyleImg}
                  onClick={() => openViewer('side')}
                />
              </motion.div>
            )}

            {/* Col 2 — lifestyle photo */}
            {lifestyleImg && (
              <motion.div className={styles.lifestyleDetailWrap} {...IN_VIEW(0.1)}>
                <Image
                  src={lifestyleImg.src}
                  alt={`${selected.name} — lifestyle`}
                  fill
                  sizes="(max-width:768px) 90vw, 25vw"
                  className={styles.lifestyleImg}
                  onClick={() => openViewer('lifestyle')}
                />
              </motion.div>
            )}

            {/* Col 3 — editorial text (right) */}
            <motion.div className={styles.lifestyleEditorialCol} {...IN_VIEW(0.18)}>
              {selected.dna?.movement && (
                <div className={styles.lifestyleStatement}>
                  <p className={styles.lifestyleStatementText}>{selected.dna.movement}</p>
                </div>
              )}

              {isTee ? (
                <div className={styles.lifestylePhilosophyBlock}>
                  <p className={styles.lifestylePhilosophyLabel}>GARMENT PHILOSOPHY</p>
                  {TEE_PHILOSOPHY.map((line) => (
                    <p key={line} className={styles.lifestylePhilosophyLine}>
                      <span className={styles.lifestylePhilosophyDiamond}>◇</span>
                      {line}
                    </p>
                  ))}
                </div>
              ) : (
                <>
                  {selected.dna?.climate && (
                    <p className={styles.lifestyleEditorialLabel}>{selected.dna.climate}</p>
                  )}
                  {selected.designedFor && (
                    <ul className={styles.lifestyleEditorialList}>
                      {selected.designedFor.map((d) => (
                        <li key={d} className={styles.lifestyleEditorialItem}>{d}</li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </motion.div>

          </div>
        </div>
      </section>

      {/* ══ 4. RELATED PRODUCTS ═══════════════════════════════════════════ */}
      {related.length > 0 && (
        <section id="s-related" className={styles.relatedSection}>
          <motion.div className={styles.relatedHeader} {...IN_VIEW(0)}>
            <p className={styles.relatedEyebrow}>Also From The Collection</p>
          </motion.div>
          <div className={styles.relatedGrid}>
            {related.map((p, i) => {
              const pFront = p.images?.find((img) => img.view === 'front') ?? p.images?.[0]
              return (
                <motion.div key={p.id} className={styles.relatedCard} {...IN_VIEW(i * 0.1)}>
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  <Link href={`/shop/${p.category}/${toColorSlug(p.colorway)}` as any} className={styles.relatedCardLink}>
                    <div className={styles.relatedCardImageWrap}>
                      {pFront ? (
                        <Image
                          src={pFront.src}
                          alt={p.name}
                          fill
                          sizes="(max-width: 768px) 90vw, 30vw"
                          className={styles.relatedCardImg}
                        />
                      ) : (
                        <div style={{ background: p.gradient, position: 'absolute', inset: 0 }} />
                      )}
                    </div>
                    <div className={styles.relatedCardInfo}>
                      <p className={styles.relatedCardName}>{p.name}</p>
                      <p className={styles.relatedCardPrice}>{formatPrice(p.price)}</p>
                      <span className={styles.relatedCardCta}>View →</span>
                    </div>
                  </Link>
                </motion.div>
              )
            })}
          </div>
        </section>
      )}

      {/* ── Toast ────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            className={styles.toast}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0  }}
            exit={{ opacity: 0,   y: -6 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Focus Viewer ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {viewerOpen && selected.images && selected.images.length > 0 && (
          <ProductFocusViewer
            product={selected}
            variants={variants}
            images={selected.images}
            initialView={viewerInitialView}
            onClose={() => setViewerOpen(false)}
            onVariantChange={handleColorChange}
          />
        )}
      </AnimatePresence>

    </div>
  )
}
