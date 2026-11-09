'use client'
import { motion } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import styles from './Chess.module.scss'

const FEATURE_CARDS = [
  {
    icon: 'Coach',
    title: 'Learn as you play',
    desc: 'Plain-language comments on your moves: every move in Teacher mode, only when it matters in Coach mode.',
    iconClassName: 'cardIconPurple',
  },
  {
    icon: 'Puzzle',
    title: 'Puzzles that build skill',
    desc: 'Curated sets by topic and difficulty, with hints and an explanation of every solution.',
    iconClassName: 'cardIconGold',
    href: '/chess/puzzles',
  },
  {
    icon: 'Level',
    title: 'Grows with you',
    desc: 'An adaptive engine, from your first game to a full no-assistance challenge.',
    iconClassName: 'cardIconBlue',
  },
]

export default function ChessLandingContent({ tournamentSlot }: { tournamentSlot: React.ReactNode }) {
  return (
    <div className={styles.page}>
      <div className={styles.orb1} aria-hidden="true" />
      <div className={styles.orb2} aria-hidden="true" />

      {/* Directly under the nav, above the hero. Streams in on its own: the hero text and actions never wait for it
          (nor are they hidden by an entrance animation — they used to start at opacity 0 and re-fade on every visit). */}
      {tournamentSlot}

      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <p className={styles.eyebrow}>
            NIVENXA CHESS
          </p>

          <h1 className={styles.heading}>
            Play smarter.<br />
            <span className={styles.headingAccent}>Learn why, not just what.</span>
          </h1>

          <p className={styles.subtext}>
            Train against an adaptive engine that teaches as you play. Beginner mode explains your moves; stronger
            levels step back until you want the challenge.
          </p>

          <div className={styles.ctaRow}>
            <Link href="/chess/play" className={styles.registerBtn}>
              <span className={styles.registerBtnInner}>Start playing</span>
              <span className={styles.registerBtnGlow} aria-hidden="true" />
            </Link>
            <Link href="/chess/puzzles" className={styles.secondaryBtn}>
              Try a puzzle
            </Link>
          </div>
        </div>

        <div className={styles.boardWrap}>
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
        </div>
      </section>

      <section id="learn" className={styles.features}>
        {FEATURE_CARDS.map((card) => {
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
    </div>
  )
}
