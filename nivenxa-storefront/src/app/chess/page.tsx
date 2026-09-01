'use client'
import { motion } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import styles from './Chess.module.scss'

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.9, ease: [0.22, 1, 0.36, 1], delay },
})

const FEATURE_CARDS = [
  {
    icon: 'Coach',
    title: 'Learn as You Play',
    desc: 'Get plain-language explanations for every move, so you understand the reasoning — not just the result.',
    iconClassName: 'cardIconPurple',
  },
  {
    icon: 'Puzzle',
    title: 'Puzzles That Build Skill',
    desc: 'Work through curated puzzle sets designed to sharpen tactics, one motif at a time.',
    iconClassName: 'cardIconGold',
    href: '/chess/puzzles',
  },
  {
    icon: 'Level',
    title: 'Grows With You',
    desc: 'An adaptive engine that scales from your first game to your toughest challenge yet.',
    iconClassName: 'cardIconBlue',
  },
]

export default function ChessPage() {
  return (
    <div className={styles.page}>
      <div className={styles.orb1} aria-hidden="true" />
      <div className={styles.orb2} aria-hidden="true" />

      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <motion.p className={styles.eyebrow} {...fadeUp(0.1)}>
            NIVENXA CHESS
          </motion.p>

          <motion.h1 className={styles.heading} {...fadeUp(0.25)}>
            Play smarter.<br />
            <span className={styles.headingAccent}>Every move explained.</span>
          </motion.h1>

          <motion.p className={styles.subtext} {...fadeUp(0.4)}>
            AI-guided coaching that explains the why behind every move — train against an adaptive
            engine and sharpen your game one position at a time.
          </motion.p>

          <motion.div className={styles.ctaRow} {...fadeUp(0.55)}>
            <Link href="/chess/play" className={styles.registerBtn}>
              <span className={styles.registerBtnInner}>
                <span className={styles.btnIcon}>Play</span>
                Start Playing
              </span>
              <span className={styles.registerBtnGlow} aria-hidden="true" />
            </Link>
          </motion.div>
        </div>

        <motion.div
          className={styles.boardWrap}
          initial={{ opacity: 0, scale: 0.94, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
        >
          <div className={styles.boardGlow} aria-hidden="true" />
          <Image
            src="/images/Chess/chess-board.png"
            alt="Nivenxa premium 3D chess board with pieces and timer"
            width={900}
            height={675}
            className={styles.boardImg}
            priority
          />
          <div className={styles.boardReflection} aria-hidden="true" />
        </motion.div>
      </section>

      <section id="learn" className={styles.features}>
        {FEATURE_CARDS.map((card, i) => {
          const content = (
            <>
              <span className={`${styles.cardIcon} ${styles[card.iconClassName]}`}>{card.icon}</span>
              <h3 className={styles.cardTitle}>{card.title}</h3>
              <p className={styles.cardDesc}>{card.desc}</p>
            </>
          )

          return (
            <motion.div
              key={card.title}
              className={styles.card}
              {...fadeUp(0.15 * i)}
              whileHover={{ y: -6, transition: { duration: 0.3 } }}
            >
              {card.href ? (
                <Link href={card.href} className={styles.cardLink}>
                  {content}
                </Link>
              ) : (
                content
              )}
            </motion.div>
          )
        })}
      </section>

      <motion.section
        className={styles.ctaBanner}
        initial={{ opacity: 0, y: 32 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className={styles.ctaBannerInner}>
          <h2 className={styles.ctaBannerTitle}>Ready to make your first move?</h2>
          <p className={styles.ctaBannerSub}>
            Jump into a game against the Nivenxa Chess engine — tuned to your level, ready when you are.
          </p>
          <Link href="/chess/play" className={styles.registerBtn}>
            <span className={styles.registerBtnInner}>
              <span className={styles.btnIcon}>Play</span>
              Start Playing
            </span>
            <span className={styles.registerBtnGlow} aria-hidden="true" />
          </Link>
        </div>
        <div className={styles.ctaBannerOrb} aria-hidden="true" />
      </motion.section>
    </div>
  )
}
