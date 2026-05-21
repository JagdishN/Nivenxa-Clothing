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
    icon: 'Elite',
    title: 'Elite Tournaments',
    desc: 'Compete in curated championships, verified arenas, and trusted local events.',
    iconClassName: 'cardIconGold',
  },
  {
    icon: 'Coach',
    title: 'AI-Powered Training',
    desc: 'Sharpen your openings, middlegame tactics, and endgame mastery with intelligent coaching.',
    iconClassName: 'cardIconPurple',
  },
  {
    icon: 'Clock',
    title: 'Live Chess Clock',
    desc: 'Time-controlled matches with Bullet, Blitz, Rapid, and Classical formats.',
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
            Play Chess.<br />
            <span className={styles.headingAccent}>Rule the Board.</span>
          </motion.h1>

          <motion.p className={styles.subtext} {...fadeUp(0.4)}>
            Premium tournaments. Exclusive rewards. Join a curated chess community crafted for serious players.
          </motion.p>

          <motion.div className={styles.ctaRow} {...fadeUp(0.55)}>
            <Link href="/account/register" className={styles.registerBtn}>
              <span className={styles.registerBtnInner}>
                <span className={styles.btnIcon}>Join</span>
                Register Now
              </span>
              <span className={styles.registerBtnGlow} aria-hidden="true" />
            </Link>
            <Link href="/chess/learn-more" className={styles.outlineBtn}>
              Learn More
            </Link>
          </motion.div>

          <motion.div className={styles.badges} {...fadeUp(0.7)}>
            <span className={styles.badge}><span className={styles.badgeIcon}>Elite</span> Premium Tournaments</span>
            <span className={styles.badgeDot} aria-hidden="true" />
            <span className={styles.badge}><span className={styles.badgeIcon}>Daily</span> Daily Challenges</span>
            <span className={styles.badgeDot} aria-hidden="true" />
            <span className={styles.badge}><span className={styles.badgeIcon}>Trust</span> Verified Events</span>
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
            src="/chess-board.png"
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
        {FEATURE_CARDS.map((card, i) => (
          <motion.div
            key={card.title}
            className={styles.card}
            {...fadeUp(0.15 * i)}
            whileHover={{ y: -6, transition: { duration: 0.3 } }}
          >
            <span className={`${styles.cardIcon} ${styles[card.iconClassName]}`}>{card.icon}</span>
            <h3 className={styles.cardTitle}>{card.title}</h3>
            <p className={styles.cardDesc}>{card.desc}</p>
          </motion.div>
        ))}
      </section>

      <motion.section
        className={styles.ctaBanner}
        initial={{ opacity: 0, y: 32 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className={styles.ctaBannerInner}>
          <h2 className={styles.ctaBannerTitle}>Ready to make your move?</h2>
          <p className={styles.ctaBannerSub}>Browse live and upcoming tournaments curated by Nivenxa Chess.</p>
          <Link href="/chess/tournaments" className={styles.registerBtn}>
            <span className={styles.registerBtnInner}>
              <span className={styles.btnIcon}>Elite</span>
              Explore Tournaments
            </span>
            <span className={styles.registerBtnGlow} aria-hidden="true" />
          </Link>
        </div>
        <div className={styles.ctaBannerOrb} aria-hidden="true" />
      </motion.section>
    </div>
  )
}
