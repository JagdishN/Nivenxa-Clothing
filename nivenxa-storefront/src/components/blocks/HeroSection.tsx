'use client'
import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'
import Image from 'next/image'
import { Link } from '@/i18n/routing'
import { IconChevronDown } from '@tabler/icons-react'
import Button from '../ui/Button'
import TextureOverlay from '../ui/TextureOverlay'
import styles from './HeroSection.module.scss'

export default function HeroSection() {
  const t = useTranslations('hero')

  return (
    <section className={styles.section}>
      <div className={styles.bg} />
      <TextureOverlay opacity={0.6} soft />

      {/* Right-side editorial blocks */}
      <motion.div
        className={styles.blocksWrap}
        initial={{ opacity: 0, x: 60 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
      >
        {/* Block 1 — fabric close-up (detail image, oat-beige) */}
        <div className={`${styles.block} ${styles.block1}`} style={{ backgroundColor: '#C8B89A' }}>
          <Image
            src="/images/Men/OversizedTee's/OAT BEIGE/fabric_close_up.webp"
            alt=""
            fill
            className={styles.blockImg}
            priority
            sizes="(max-width: 768px) 0px, 14vw"
            aria-hidden="true"
          />
          <TextureOverlay opacity={0.5} />
          <div className={styles.blockMeta}>
            <span className={styles.blockTag}>{t('block1Tag')}</span>
            <span className={styles.blockCaption}>{t('block1Caption')}</span>
          </div>
        </div>

        {/* Block 2 — studio-side (oat-beige) */}
        <div className={`${styles.block} ${styles.block2}`} style={{ backgroundColor: '#8B9E7A' }}>
          <Image
            src="/images/Men/OversizedTee's/OAT BEIGE/side_studio_view.webp"
            alt=""
            fill
            className={styles.blockImg}
            priority
            sizes="(max-width: 768px) 0px, 19vw"
            aria-hidden="true"
          />
          <TextureOverlay opacity={0.4} />
          <div className={styles.blockMeta}>
            <span className={styles.blockTag}>{t('block2Tag')}</span>
            <span className={styles.blockCaption}>{t('block2Caption')}</span>
          </div>
        </div>

        {/* Block 3 — cargo dark-olive studio-front */}
        <div className={`${styles.block} ${styles.block3}`} style={{ backgroundColor: '#4A5240' }}>
          <Image
            src="/images/Unisex/cargos/darkolive/front_view.webp"
            alt=""
            fill
            className={styles.blockImg}
            sizes="(max-width: 768px) 0px, 11vw"
            aria-hidden="true"
          />
          <TextureOverlay opacity={0.35} />
          <div className={styles.blockMeta}>
            <span className={styles.blockTag}>{t('block3Tag')}</span>
          </div>
        </div>
      </motion.div>

      {/* Hero copy */}
      <div className={styles.content}>
        <motion.p
          className={styles.eyebrow}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
        >
          {t('eyebrow')}
        </motion.p>

        <motion.h1
          className={styles.title}
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
        >
          {t('titleLine1')}{' '}
          <em className={`${styles.titleAccent} not-italic`}>{t('titleAccent')}</em>{' '}
          {t('titleLine2')}
        </motion.h1>

        <motion.p
          className={styles.body}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.35 }}
        >
          {t('body')}
        </motion.p>

        <motion.div
          className={styles.ctas}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.5 }}
        >
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <Link href={'/shop' as any}>
            <Button>SHOP THE COLLECTION →</Button>
          </Link>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <Link href={'/edits' as any}>
            <Button variant="outline" className={styles.editsCtaBtn}>EXPLORE THE EDITS →</Button>
          </Link>
          <Link href="/stories/our-story">
            <Button variant="outline">{t('ctaStory')}</Button>
          </Link>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        className={styles.scrollIndicator}
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.42 }}
        transition={{ delay: 1.2, duration: 0.8 }}
      >
        <motion.div
          className={styles.scrollLine}
          animate={{ scaleY: [1, 0.35, 1] }}
          transition={{ repeat: Infinity, duration: 2.4, ease: 'easeInOut' }}
        />
      </motion.div>

      {/* Scroll cue — chevron bounce at horizontal centre */}
      <div className={styles.scrollCue} aria-hidden="true">
        <IconChevronDown size={20} />
      </div>
    </section>
  )
}
