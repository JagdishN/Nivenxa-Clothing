'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/routing'
import type { Product, ProductStatus } from '@/types'
import TextureOverlay from '../ui/TextureOverlay'
import styles from './ProductCard.module.scss'

interface ProductCardProps {
  product: Product
  large?: boolean
}

const STATUS_CLASS: Record<ProductStatus, string> = {
  'NIVENXA ESSENTIAL': styles.statusEssential,
  'NEW SEASON':        styles.statusNew,
  'LIMITED RUN':       styles.statusLimited,
  'ARCHIVE WASH':      styles.statusArchive,
}

export default function ProductCard({ product, large = false }: ProductCardProps) {
  const t = useTranslations('product')
  const [hovered, setHovered]     = useState(false)
  const [lensPos, setLensPos]     = useState({ x: 50, y: 50 })
  const [showDNA, setShowDNA]     = useState(false)
  const front    = product.images?.find((i) => i.view === 'front') ?? product.images?.[0]
  const back     = product.images?.find((i) => i.view === 'back')  ?? product.images?.[1]
  const activeImg = hovered && back ? back : front

  const hasImages  = Boolean(activeImg)
  const hasMulti   = (product.images?.length ?? 0) > 1

  // Track cursor for fabric lens position
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setLensPos({
      x: ((e.clientX - rect.left) / rect.width)  * 100,
      y: ((e.clientY - rect.top)  / rect.height) * 100,
    })
  }

  return (
    <div
      className={[styles.card, large ? styles.cardLarge : ''].filter(Boolean).join(' ')}
      style={{ '--atmosphere': product.atmosphereColor ?? 'transparent' } as React.CSSProperties}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setShowDNA(false) }}
      onMouseMove={handleMouseMove}
    >
      {/* 10. Atmospheric background glow per product */}
      <div className={styles.atmosphere} aria-hidden="true" />

      {/* ── Image zone ─────────────────────────────────────────────────────── */}
      <div className={large ? `${styles.imageWrap} ${styles.imageWrapLarge}` : `${styles.imageWrap} ${styles.imageWrapStd}`}>

        {/* 6. Cinematic gradient shift on hover */}
        <div
          className={styles.atmosphereShift}
          style={{ opacity: hovered ? 1 : 0 }}
          aria-hidden="true"
        />

        {/* Image / gradient fill */}
        <div className={styles.imageFill}>
          {hasImages ? (
            <AnimatePresence mode="wait">
              <motion.div
                key={activeImg!.view}
                className={styles.imageInner}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              >
                <Image
                  src={activeImg!.src}
                  alt={`${product.name} — ${activeImg!.view}`}
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className={styles.productImage}
                />
                {/* 2. Fabric texture grain over real photos at 3% */}
                <TextureOverlay opacity={0.03} />
              </motion.div>
            </AnimatePresence>
          ) : (
            <div
              className={styles.gradient}
              style={{ '--gradient': product.gradient } as React.CSSProperties}
            >
              <TextureOverlay opacity={0.8} />
            </div>
          )}
        </div>

        {/* 11. Status badge */}
        {product.status && (
          <span className={`${styles.status} ${STATUS_CLASS[product.status] ?? ''}`}>
            {product.status}
          </span>
        )}

        {/* Colorway badge */}
        <div className={styles.badge}>{product.colorway}</div>

        {/* View dots */}
        {hasMulti && (
          <div className={styles.viewDots}>
            {product.images!.map((img) => (
              <span
                key={img.view}
                className={`${styles.dot} ${activeImg?.view === img.view ? styles.dotActive : ''}`}
              />
            ))}
          </div>
        )}

        {/* 9. Fabric close-up lens — only when a real image exists to zoom into */}
        {hovered && hasImages && (
          <div
            className={styles.fabricLens}
            style={{ left: `${lensPos.x}%`, top: `${lensPos.y}%` }}
            aria-hidden="true"
          >
            <div
              className={styles.fabricLensInner}
              style={{ backgroundImage: `url(${activeImg?.src ?? ''})`,
                       backgroundPosition: `${lensPos.x}% ${lensPos.y}%` }}
            >
              <TextureOverlay opacity={0.12} />
            </div>
          </div>
        )}

        {/* 7. "Explore Piece →" — navigates to product story */}
        <motion.div
          className={styles.exploreCta}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: hovered ? 1 : 0, y: hovered ? 0 : 8 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <Link
            href={`/shop/${product.category}/${product.colorway.toLowerCase().replace(/\s+/g, '-')}` as any}
            className={styles.exploreCtaLink}
            tabIndex={hovered ? 0 : -1}
          >
            Explore Piece
            <span className={styles.exploreArrow}>→</span>
          </Link>
        </motion.div>

        {/* 1. Ghost luxury Add to Cart — appears on hover only */}
        <div className={styles.addToCart}>
          <button className={styles.addToCartBtn}>
            {t('addToCart')}
            <span className={styles.ctaArrow}>→</span>
          </button>
        </div>
      </div>

      {/* ── Info zone ──────────────────────────────────────────────────────── */}
      <div className={styles.info}>
        {/* 1. Material storytelling */}
        {product.fabricStory ? (
          <div className={styles.fabricStory}>
            <p className={styles.fabricLabel}>{product.fabricStory.label}</p>
            <motion.div
              className={styles.fabricLines}
              initial={false}
              animate={{ opacity: hovered ? 1 : 0, height: hovered ? 'auto' : 0 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            >
              {product.fabricStory.lines.map((line) => (
                <p key={line} className={styles.fabricLine}>{line}</p>
              ))}
            </motion.div>
          </div>
        ) : (
          <p className={styles.fabricLabel}>{product.fabric}</p>
        )}

        {/* 6. Signature measurement lines frame the name */}
        <div className={styles.nameWrap}>
          <h3 className={styles.name}>{product.name}</h3>
        </div>
        <p className={styles.price}>₹{product.price.toLocaleString('en-IN')}</p>

        {/* 2. Fabric intelligence badges */}
        {product.badges && product.badges.length > 0 && (
          <div className={styles.badges}>
            {product.badges.map((b) => (
              <span key={b} className={styles.badgeChip}>{b}</span>
            ))}
          </div>
        )}

        {/* Product DNA — garment intelligence panel */}
        {product.dna && (
          <div className={styles.dnaSection}>
            <button
              className={styles.dnaToggle}
              onClick={() => setShowDNA((v) => !v)}
              aria-expanded={showDNA}
            >
              <span className={styles.dnaToggleLabel}>PRODUCT DNA</span>
              <span className={`${styles.dnaChevron} ${showDNA ? styles.dnaChevronOpen : ''}`}>▾</span>
            </button>
            <AnimatePresence>
              {showDNA && (
                <motion.div
                  className={styles.dnaTable}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                >
                  {([
                    ['Fabric',    product.dna.fabric],
                    ['Structure', product.dna.structure],
                    ['Finish',    product.dna.finish],
                    ['Movement',  product.dna.movement],
                    ...(product.dna.climate ? [['Climate', product.dna.climate] as [string, string]] : []),
                  ] as [string, string][]).map(([label, value]) => (
                    <div key={label} className={styles.dnaRow}>
                      <span className={styles.dnaAttr}>{label}</span>
                      <span className={styles.dnaVal}>{value}</span>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  )
}
