'use client'
import { notFound } from 'next/navigation'
import { use, useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { Link } from '@/i18n/routing'
import { products } from '@/lib/products'
import styles from './ProductStory.module.scss'

// Rhythm: BIG → QUICK → MEDIUM → BIG → BIG → QUICK → STRONG
const NAV_SECTIONS = [
  { id: 's-spec',      label: 'Specification' },
  { id: 's-fit',       label: 'Fit'           },
  { id: 's-lifestyle', label: 'Lifestyle'     },
  { id: 's-color',     label: 'Color'         },
  { id: 's-end',       label: 'Styling'       },
]

const FADE_UP = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.9, ease: [0.22, 1, 0.36, 1], delay },
})

const IN_VIEW = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { duration: 0.85, ease: [0.22, 1, 0.36, 1], delay },
})

export default function ProductStoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const product = products.find((p) => p.id === id)
  if (!product) notFound()

  const [activeSection, setActiveSection] = useState('')
  const [lightboxImg, setLightboxImg]     = useState<string | null>(null)
  const [specOpen, setSpecOpen]           = useState(false)
  const navRef = useRef<HTMLDivElement>(null)

  const front   = product.images?.find((i) => i.view === 'front')   ?? product.images?.[0]
  const back    = product.images?.find((i) => i.view === 'back')    ?? product.images?.[1]
  const side    = product.images?.find((i) => i.view === 'side')    ?? product.images?.[2]
  const details = product.images?.find((i) => i.view === 'details') ?? product.images?.[3]
  const spec    = product.fabricStory?.spec

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => { if (e.isIntersecting) setActiveSection(e.target.id) })
      },
      { rootMargin: '-35% 0px -55% 0px' }
    )
    NAV_SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id)
      if (el) obs.observe(el)
    })
    return () => obs.disconnect()
  }, [])

  const scrollTo = (sectionId: string) => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const dnaRows: [string, string][] = product.dna ? [
    ['Fabric',    product.dna.fabric],
    ['Structure', product.dna.structure],
    ['Finish',    product.dna.finish],
    ['Movement',  product.dna.movement],
    ...(product.dna.climate ? [['Climate', product.dna.climate] as [string, string]] : []),
  ] : []

  return (
    <div className={styles.page}>

      {/* ── ← Collection — fixed, always visible ────────────────────────── */}
      <Link href="/shop/cargo-pants" className={styles.backButton}>
        ← Collection
      </Link>

      {/* ── 9. Side nav — animated active indicator ─────────────────────── */}
      <nav className={styles.sideNav} ref={navRef} aria-label="Product sections">
        {NAV_SECTIONS.map((s, i) => {
          const isActive = activeSection === s.id
          return (
            <button
              key={s.id}
              className={`${styles.sideNavItem} ${isActive ? styles.sideNavActive : ''}`}
              onClick={() => scrollTo(s.id)}
            >
              {/* Animated dot */}
              <motion.span
                className={styles.sideNavDot}
                animate={{ scale: isActive ? 1 : 0.5, opacity: isActive ? 1 : 0.25 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              />
              <motion.span
                className={styles.sideNavLabel}
                animate={{
                  opacity:      isActive ? 1    : 0.3,
                  letterSpacing: isActive ? '0.22em' : '0.18em',
                }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              >
                {String(i + 1).padStart(2, '0')} {s.label}
              </motion.span>
            </button>
          )
        })}
      </nav>

      {/* ══ BIG — HERO ═════════════════════════════════════════════════════ */}
      <section className={styles.hero}>
        {/* Static image — no zoom (zoom happened in cinematic entry) */}
        <div className={styles.heroImageWrap}>
          {front ? (
            <Image
              src={front.src}
              alt={product.name}
              fill
              priority
              sizes="100vw"
              className={styles.heroImage}
            />
          ) : (
            <div style={{ background: product.gradient, position: 'absolute', inset: 0 }} />
          )}
          <div className={styles.heroOverlay} />
        </div>

        {/* Bottom-left text stack */}
        <div className={styles.heroContent}>
          {product.status && (
            <motion.span className={styles.heroStatus} {...FADE_UP(0.15)}>
              {product.status}
            </motion.span>
          )}

          <motion.h1 className={styles.heroName} {...FADE_UP(0.25)}>
            {product.name}
          </motion.h1>

          <motion.div className={styles.heroMeta} {...FADE_UP(0.38)}>
            <span className={styles.heroFabricTag}>
              {product.fabricStory?.label ?? product.fabric}
            </span>
            {product.dna && (
              <span className={styles.heroDrapeTag}>{product.dna.structure}</span>
            )}
          </motion.div>

          <motion.div className={styles.heroFooter} {...FADE_UP(0.5)}>
            <span className={styles.heroPrice}>₹{product.price.toLocaleString('en-IN')}</span>
            <button className={styles.addToWardrobeBtn}>
              Add to Wardrobe <span className={styles.ctaArrow}>→</span>
            </button>
          </motion.div>
        </div>

        {/* Scroll cue */}
        <motion.div
          className={styles.scrollCue}
          animate={{ y: [0, 7, 0] }}
          transition={{ duration: 2.6, ease: 'easeInOut', repeat: Infinity }}
        >
          <span className={styles.scrollLine} />
        </motion.div>
      </section>

      {/* ══ QUICK — TECHNICAL STRIP ════════════════════════════════════════ */}
      <section className={styles.techStrip}>
        <div className={styles.techStripInner}>
          {spec && Object.entries(spec).map(([k, v], i) => (
            <motion.div key={k} className={styles.techCell} {...IN_VIEW(i * 0.07)}>
              <span className={styles.techKey}>
                {k.replace(/([A-Z])/g, ' $1').trim()}
              </span>
              <span className={styles.techVal}>{v}</span>
            </motion.div>
          ))}
          {!spec && dnaRows.slice(0, 4).map(([label, value], i) => (
            <motion.div key={label} className={styles.techCell} {...IN_VIEW(i * 0.07)}>
              <span className={styles.techKey}>{label}</span>
              <span className={styles.techVal}>{value}</span>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ══ MEDIUM — GARMENT SPECIFICATION (merged DNA + Construction) ═════ */}
      <section id="s-spec" className={styles.specSection}>
        <div className={styles.specInner}>
          <motion.div className={styles.specHeader} {...IN_VIEW(0)}>
            <p className={styles.specEyebrow}>02 — Garment Specification</p>
            <h2 className={styles.specTitle}>
              {product.fabricStory?.label ?? product.fabric}
            </h2>
            {product.fabricStory?.body && (
              <p className={styles.specBody}>{product.fabricStory.body}</p>
            )}
          </motion.div>

          {/* DNA compact 4-col grid */}
          <motion.div className={styles.dnaStrip} {...IN_VIEW(0.1)}>
            {dnaRows.map(([label, value]) => (
              <div key={label} className={styles.dnaCell}>
                <span className={styles.dnaCellAttr}>{label}</span>
                <span className={styles.dnaCellVal}>{value}</span>
              </div>
            ))}
          </motion.div>

          {/* Construction detail chips */}
          {product.details && (
            <motion.div className={styles.detailChips} {...IN_VIEW(0.18)}>
              {product.details.map((d) => (
                <span key={d} className={styles.detailChip}>{d}</span>
              ))}
            </motion.div>
          )}

          {/* Expandable full story */}
          <div className={styles.specExpand}>
            <button
              className={styles.specExpandToggle}
              onClick={() => setSpecOpen((v) => !v)}
            >
              {specOpen ? 'Less detail' : 'Full specification'}
              <span className={`${styles.specExpandIcon} ${specOpen ? styles.specExpandIconOpen : ''}`}>↓</span>
            </button>
            <AnimatePresence>
              {specOpen && spec && (
                <motion.div
                  className={styles.specExpandContent}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                >
                  {Object.entries(spec).map(([k, v]) => (
                    <div key={k} className={styles.specExpandRow}>
                      <span className={styles.specExpandKey}>{k.replace(/([A-Z])/g, ' $1').trim()}</span>
                      <span className={styles.specExpandVal}>{v}</span>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </section>

      {/* ══ BIG — FIT PHILOSOPHY ═══════════════════════════════════════════ */}
      {product.fitPhilosophy && back && (
        <section id="s-fit" className={styles.fitSection}>
          <div className={styles.fitGrid}>
            <motion.div className={styles.fitImageWrap} {...IN_VIEW(0)}>
              <Image
                src={back.src}
                alt={`${product.name} — back view`}
                fill
                sizes="(max-width:768px) 100vw, 55vw"
                className={styles.fitImage}
                onClick={() => setLightboxImg(back.src)}
              />
              <div className={styles.fitImageLabel}>Back View</div>
            </motion.div>

            <motion.div className={styles.fitText} {...IN_VIEW(0.15)}>
              <p className={styles.fitEyebrow}>03 — Fit Philosophy</p>
              <h2 className={styles.fitHeading}>How It Wears</h2>
              <p className={styles.fitBody}>{product.fitPhilosophy}</p>

              {product.dna && (
                <div className={styles.fitSpecRows}>
                  {[['Silhouette', product.dna.structure], ['Weight', product.dna.fabric]].map(([a, v]) => (
                    <div key={a} className={styles.fitSpecRow}>
                      <span className={styles.fitSpecAttr}>{a}</span>
                      <span className={styles.fitSpecVal}>{v}</span>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>
        </section>
      )}

      {/* ══ BIG — LIFESTYLE EDITORIAL ("How It Lives") ══════════════════════ */}
      <section id="s-lifestyle" className={styles.lifestyleSection}>
        <div className={styles.lifestyleInner}>
          <motion.div className={styles.lifestyleHeader} {...IN_VIEW(0)}>
            <p className={styles.lifestyleEyebrow}>04 — How It Lives</p>
          </motion.div>

          <div className={styles.lifestyleGrid}>
            {/* Main large image */}
            {side && (
              <motion.div className={styles.lifestyleMain} {...IN_VIEW(0)}>
                <Image
                  src={side.src}
                  alt={`${product.name} — side view`}
                  fill
                  sizes="(max-width:768px) 100vw, 60vw"
                  className={styles.lifestyleImg}
                  onClick={() => setLightboxImg(side.src)}
                />
                <div className={styles.lifestyleOverlay}>
                  <p className={styles.lifestyleCaption}>
                    {product.dna?.movement ?? 'Designed for everyday movement'}
                  </p>
                </div>
              </motion.div>
            )}

            <div className={styles.lifestyleSide}>
              {/* Detail shot */}
              {details && (
                <motion.div className={styles.lifestyleDetail} {...IN_VIEW(0.1)}>
                  <Image
                    src={details.src}
                    alt={`${product.name} — detail`}
                    fill
                    sizes="(max-width:768px) 100vw, 35vw"
                    className={styles.lifestyleImg}
                    onClick={() => setLightboxImg(details.src)}
                  />
                  <div className={styles.lifestyleDetailLabel}>Fabric Detail</div>
                </motion.div>
              )}

              {/* Editorial text card */}
              <motion.div className={styles.lifestyleTextCard} {...IN_VIEW(0.18)}
                style={{ background: product.gradient }}
              >
                <p className={styles.lifestyleTextCardLabel}>Climate</p>
                <p className={styles.lifestyleTextCardVal}>
                  {product.dna?.climate ?? 'All-Season Utility'}
                </p>
                {product.designedFor && (
                  <div className={styles.lifestyleDesignedFor}>
                    {product.designedFor.map((d) => (
                      <span key={d} className={styles.lifestyleDesignedItem}>{d}</span>
                    ))}
                  </div>
                )}
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ QUICK — COLOR + CARE inline ════════════════════════════════════ */}
      <section id="s-color" className={styles.quickStrip}>
        <div className={styles.quickStripInner}>
          {product.colorStory && (
            <motion.div className={styles.colorBlock} {...IN_VIEW(0)}>
              <div className={styles.colorSwatch} style={{ background: product.gradient }} />
              <div>
                <p className={styles.colorLabel}>Color</p>
                <p className={styles.colorShade}>{product.colorStory.shade}</p>
                <p className={styles.colorDesc}>{product.colorStory.description}</p>
              </div>
            </motion.div>
          )}

          {product.care && (
            <motion.div className={styles.careBlock} {...IN_VIEW(0.1)}>
              <p className={styles.careLabel}>Care & Longevity</p>
              <p className={styles.careText}>{product.care}</p>
            </motion.div>
          )}
        </div>
      </section>

      {/* ══ STRONG — STYLED WITH + FINAL CTA ══════════════════════════════ */}
      <section id="s-end" className={styles.endSection}>
        {product.stylingWith && (
          <motion.div className={styles.styledWith} {...IN_VIEW(0)}>
            <p className={styles.styledWithEyebrow}>05 — Styled With</p>
            <div className={styles.styledWithGrid}>
              {product.stylingWith.map((item, i) => (
                <motion.div key={item} className={styles.styledWithItem} {...IN_VIEW(i * 0.08)}>
                  <span className={styles.styledWithIndex}>0{i + 1}</span>
                  <span className={styles.styledWithText}>{item}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {product.whyItExists && (
          <motion.div className={styles.whyBlock}
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className={styles.whyText}>{product.whyItExists}</p>
          </motion.div>
        )}

        {/* Final CTA */}
        <motion.div className={styles.finalCta} {...IN_VIEW(0.1)}>
          <div className={styles.finalCtaLeft}>
            <p className={styles.finalCtaName}>{product.name}</p>
            <p className={styles.finalCtaPrice}>₹{product.price.toLocaleString('en-IN')}</p>
          </div>
          <button className={styles.addToWardrobeBtn}>
            Add to Wardrobe <span className={styles.ctaArrow}>→</span>
          </button>
        </motion.div>
      </section>

      {/* ── Lightbox ─────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {lightboxImg && (
          <motion.div
            className={styles.lightbox}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={() => setLightboxImg(null)}
          >
            <motion.div
              className={styles.lightboxInner}
              initial={{ scale: 0.96 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.96 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              onClick={(e) => e.stopPropagation()}
            >
              <Image src={lightboxImg} alt={product.name} fill className={styles.lightboxImg} />
              <button className={styles.lightboxClose} onClick={() => setLightboxImg(null)}>✕</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
