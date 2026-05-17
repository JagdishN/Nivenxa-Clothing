'use client'
import { motion } from 'framer-motion'
import TextureOverlay from '@/components/ui/TextureOverlay'
import { EASE_OUT_EXPO } from '@/lib/motion'
import styles from './ComingSoonPage.module.scss'

const SLOW = 2.4

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: SLOW, ease: EASE_OUT_EXPO, delay },
})

const revealRule = (delay = 0) => ({
  initial: { opacity: 0, scaleX: 0 },
  animate: { opacity: 1, scaleX: 1 },
  transition: { duration: SLOW * 0.85, ease: EASE_OUT_EXPO, delay },
  style: { transformOrigin: 'center' } as React.CSSProperties,
})

export default function ComingSoonPage() {
  return (
    <div className={styles.root}>

      {/* Grain texture — drifts imperceptibly slow */}
      <motion.div
        className={styles.grainWrap}
        animate={{ x: [0, 5, -5, 0], y: [0, 4, -4, 0] }}
        transition={{ duration: 24, ease: 'easeInOut', repeat: Infinity }}
      >
        <TextureOverlay opacity={0.5} soft />
      </motion.div>

      {/* Ghost watermark — fades in slowly then floats */}
      <motion.span
        className={styles.ghost}
        aria-hidden="true"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, y: [0, -10, 0] }}
        transition={{
          opacity: { duration: 3.8, ease: EASE_OUT_EXPO, delay: 1.0 },
          y: {
            duration: 12,
            ease: 'easeInOut',
            repeat: Infinity,
            repeatType: 'mirror',
            delay: 5.5,
          },
        }}
      >
        NIVENXA
      </motion.span>

      {/* Centred editorial block */}
      <div className={styles.center}>

        <motion.p className={styles.wordmark} {...fadeUp(0.4)}>
          NIVENXA
        </motion.p>

        <motion.div className={styles.rule} {...revealRule(0.85)} />

        <motion.p className={styles.eyebrow} {...fadeUp(1.25)}>
          Premium Essentials
        </motion.p>

        <motion.p className={styles.comingSoon} {...fadeUp(1.7)}>
          Coming Soon
        </motion.p>

        <motion.div className={styles.divider} {...revealRule(2.1)} />

        <motion.p className={styles.prose} {...fadeUp(2.4)}>
          Crafted with intention.<br />
          Rooted in Indian tradition.
        </motion.p>

      </div>

    </div>
  )
}
