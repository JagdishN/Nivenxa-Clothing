'use client'
import { useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { Link, useRouter } from '@/i18n/routing'
import type { Product } from '@/types'
import { useCart } from '@/context/CartContext'
import { useAuth } from '@/context/AuthContext'
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

interface Props {
  product:  Product
  variants: Product[]   // same category — drives color selector
  related:  Product[]   // other products — drives related row
}

export default function ProductStoryClient({ product, variants, related }: Props) {
  const [selected, setSelected]         = useState<Product>(product)
  const [selectedSize, setSelectedSize] = useState<string | null>(null)
  const [lightboxImg, setLightboxImg]   = useState<string | null>(null)
  const [toast, setToast]               = useState<string | null>(null)
  const [nudgeSizes, setNudgeSizes]     = useState(false)
  const toastTimer                      = useRef<ReturnType<typeof setTimeout> | null>(null)

  const router = useRouter()
  const { bumpLocal } = useCart()
  const { customer } = useAuth()

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 2200)
  }, [])

  // All images derive from selected color variant
  const front     = selected.images?.find((i) => i.view === 'front')   ?? selected.images?.[0]
  const back      = selected.images?.find((i) => i.view === 'back')    ?? selected.images?.[1]
  const side      = selected.images?.find((i) => i.view === 'side')    ?? selected.images?.[2]
  const detailImg = selected.images?.find((i) => i.view === 'details') ?? selected.images?.[3]
  const spec      = selected.fabricStory?.spec

  const specValues: string[] = spec
    ? (Object.values(spec).filter(Boolean) as string[])
    : selected.dna
      ? [selected.dna.fabric, selected.dna.structure, selected.dna.finish, selected.dna.movement,
         ...(selected.dna.climate ? [selected.dna.climate] : [])]
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
              ₹{selected.price.toLocaleString('en-IN')}
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

            <motion.div {...FADE_UP(0.52)}>
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
                Add to Bag <span className={styles.ctaArrow}>→</span>
              </button>
            </motion.div>

          </div>
        </div>

        {/* ── CENTER: main product image ───────────────────────────────── */}
        <div
          className={styles.heroCenter}
          onClick={() => front && setLightboxImg(front.src)}
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
                  className={styles.heroCenterImage}
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
            <div className={styles.heroRightSlot} onClick={() => setLightboxImg(back.src)}>
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
                    className={styles.heroRightImage}
                  />
                </motion.div>
              </AnimatePresence>
              <span className={styles.heroViewLabel}>Back</span>
            </div>
          )}
          {detailImg && (
            <div className={styles.heroRightSlot} onClick={() => setLightboxImg(detailImg.src)}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={`detail-${selected.id}`}
                  style={{ position: 'absolute', inset: 0 }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.55 }}
                >
                  <Image
                    src={detailImg.src}
                    alt={`${selected.name} — detail`}
                    fill
                    sizes="26vw"
                    className={styles.heroRightImage}
                  />
                </motion.div>
              </AnimatePresence>
              <span className={styles.heroViewLabel}>Detail</span>
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
                  onClick={() => setLightboxImg(side.src)}
                />
              </motion.div>
            )}

            {/* Col 2 — detail photo */}
            {detailImg && (
              <motion.div className={styles.lifestyleDetailWrap} {...IN_VIEW(0.1)}>
                <Image
                  src={detailImg.src}
                  alt={`${selected.name} — fabric detail`}
                  fill
                  sizes="(max-width:768px) 90vw, 25vw"
                  className={styles.lifestyleImg}
                  onClick={() => setLightboxImg(detailImg.src)}
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
                      <p className={styles.relatedCardPrice}>₹{p.price.toLocaleString('en-IN')}</p>
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

      {/* ── Lightbox ──────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {lightboxImg && (
          <motion.div
            className={styles.lightbox}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.28 }}
            onClick={() => setLightboxImg(null)}
          >
            <motion.div
              className={styles.lightboxInner}
              initial={{ scale: 0.96 }} animate={{ scale: 1 }} exit={{ scale: 0.96 }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              onClick={(e) => e.stopPropagation()}
            >
              <Image src={lightboxImg} alt={selected.name} fill className={styles.lightboxImg} />
              <button className={styles.lightboxClose} onClick={() => setLightboxImg(null)}>✕</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  )
}
