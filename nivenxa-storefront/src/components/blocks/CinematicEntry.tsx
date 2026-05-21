'use client'
import { useEffect, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { useRouter } from '@/i18n/routing'
import type { Product } from '@/types'
import styles from './CinematicEntry.module.scss'

interface Props {
  product: Product
  onDismiss: () => void
}

// Timing (seconds from overlay mount)
const T = {
  scene1:   1.4,
  scene2:   2.3,
  scene3:   3.1,
  scene4:   3.9,
  scene5:   4.7,
  navigate: 5.8,
}

function buildScenes(product: Product) {
  return [
    {
      key: 's1',
      className: styles.sceneTag,
      text: (product.badges?.[0] ?? product.colorway).toUpperCase(),
      delay: T.scene1,
    },
    {
      key: 's2',
      className: styles.sceneFabric,
      text: product.dna?.fabric ?? product.fabric,
      delay: T.scene2,
    },
    {
      key: 's3',
      className: styles.sceneBody,
      text: product.fabricStory?.lines?.slice(0, 2).join(' ') ?? product.description,
      delay: T.scene3,
    },
    {
      key: 's4',
      className: styles.sceneFit,
      text: product.dna?.structure ?? '',
      delay: T.scene4,
    },
    {
      key: 's5',
      className: styles.sceneCta,
      text: 'Explore Construction',
      delay: T.scene5,
      isCta: true,
    },
  ]
}

export default function CinematicEntry({ product, onDismiss }: Props) {
  const router   = useRouter()
  const [active, setActive] = useState<string[]>([])

  const navigateTo = useCallback(() => {
    onDismiss()
    router.push(`/product/${product.id}` as Parameters<typeof router.push>[0])
  }, [product.id, router, onDismiss])

  useEffect(() => {
    document.body.style.overflow = 'hidden'

    const scenes = buildScenes(product)
    const timers = scenes.map((s) =>
      window.setTimeout(() => setActive((prev) => [...prev, s.key]), s.delay * 1000)
    )

    const navTimer = window.setTimeout(navigateTo, T.navigate * 1000)

    return () => {
      timers.forEach(clearTimeout)
      clearTimeout(navTimer)
      document.body.style.overflow = ''
    }
  }, [product, navigateTo])

  const front = product.images?.find((i) => i.view === 'front') ?? product.images?.[0]
  const scenes = buildScenes(product)

  return createPortal(
    <motion.div
      className={styles.overlay}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* ── Garment image — slow cinematic zoom ──────────────────────────── */}
      <motion.div
        className={styles.imageWrap}
        initial={{ scale: 1 }}
        animate={{ scale: 1.1 }}
        transition={{ duration: 6.5, ease: [0.16, 1, 0.3, 1] }}
      >
        {front ? (
          <Image
            src={front.src}
            alt={product.name}
            fill
            priority
            sizes="100vw"
            className={styles.image}
          />
        ) : (
          <div className={styles.fallbackGradient} style={{ background: product.gradient }} />
        )}
      </motion.div>

      {/* ── Vignette — deepens as zoom progresses ────────────────────────── */}
      <motion.div
        className={styles.vignette}
        initial={{ opacity: 0.5 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 4, ease: 'easeIn' }}
      />

      {/* ── Grain — reduces as atmosphere clears ─────────────────────────── */}
      <motion.div
        className={styles.grain}
        initial={{ opacity: 0.35 }}
        animate={{ opacity: 0.04 }}
        transition={{ duration: 3.5, ease: 'easeOut', delay: 0.3 }}
      />

      {/* ── Atmosphere glow — product colour bleeds through ──────────────── */}
      <motion.div
        className={styles.atmosphereGlow}
        style={{ background: `radial-gradient(ellipse 60% 50% at 50% 100%, ${product.atmosphereColor ?? 'rgba(91,46,145,0.18)'}, transparent)` }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 3, ease: 'easeOut', delay: 1 }}
      />

      {/* ── Sequential text scenes ────────────────────────────────────────── */}
      <div className={styles.scenes}>
        {scenes.map((s) => (
          <AnimatePresence key={s.key}>
            {active.includes(s.key) && (
              <motion.div
                className={`${styles.scene} ${s.className}`}
                initial={{ opacity: 0, y: 18, filter: 'blur(4px)' }}
                animate={{ opacity: 1, y: 0,  filter: 'blur(0px)' }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
              >
                {s.isCta ? (
                  <button className={styles.exploreBtn} onClick={navigateTo}>
                    {s.text}
                    <span className={styles.exploreBtnArrow}>→</span>
                  </button>
                ) : (
                  s.text
                )}
              </motion.div>
            )}
          </AnimatePresence>
        ))}
      </div>

      {/* ── Skip ─────────────────────────────────────────────────────────── */}
      <motion.button
        className={styles.skip}
        onClick={navigateTo}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.6 }}
      >
        Skip →
      </motion.button>
    </motion.div>,
    document.body
  )
}
