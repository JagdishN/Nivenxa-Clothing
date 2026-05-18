'use client'
import { motion } from 'framer-motion'
import Link from 'next/link'
import styles from './LearnMore.module.scss'

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 28 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.9, ease: [0.22, 1, 0.36, 1], delay },
})

const inView = (delay = 0) => ({
  initial: { opacity: 0, y: 32 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { duration: 0.85, ease: [0.22, 1, 0.36, 1], delay },
})

const TIMELINE = [
  {
    title: 'Ancient India — 6th Century',
    content: `Chess originated from the Indian strategy game Chaturanga, developed during the Gupta Empire.\n\nThe game represented military strategy through infantry, cavalry, elephants, and chariots — forming the foundation of modern chess.`,
    index: '01',
  },
  {
    title: 'Persia & Strategic Evolution',
    content: `As chess spread into Persia, it evolved into Shatranj — a refined intellectual game embraced by scholars, royalty, and strategists.\n\nMany modern chess terms trace their roots to this Persian era.`,
    index: '02',
  },
  {
    title: 'Europe & Modern Chess',
    content: `By the 15th century, modern chess rules emerged in Europe, transforming the game into the dynamic strategic system recognized around the world today.\n\nThe queen became the most powerful piece, accelerating the pace and complexity of play.`,
    index: '03',
  },
  {
    title: 'The Digital Intelligence Era',
    content: `Modern chess entered a new era through artificial intelligence, advanced engines, and online competition.\n\nFrom Deep Blue to neural-network engines, technology redefined how players study, analyze, and understand strategy.`,
    index: '04',
  },
]

const CHAMPIONS = [
  {
    tournament: 'FIDE World Championship 2021',
    player: 'Magnus Carlsen — Norway',
    symbol: '♔',
    description: `Widely regarded as one of the greatest chess players in history, Carlsen dominated the modern era through positional mastery, psychological precision, and extraordinary consistency.`,
  },
  {
    tournament: 'FIDE World Championship 2023',
    player: 'Ding Liren — China',
    symbol: '♛',
    description: `Ding Liren became the first Chinese World Chess Champion, marking a historic moment in global chess history through calm resilience and elite endgame precision.`,
  },
  {
    tournament: 'Candidates & Elite International Events',
    player: 'Gukesh Dommaraju — India',
    symbol: '♞',
    description: `Representing the next generation of elite chess talent, Gukesh emerged as one of the youngest players to compete at the highest international level, bringing renewed global attention to Indian chess.`,
  },
  {
    tournament: 'FIDE Grand Prix & Rapid Events',
    player: 'Hikaru Nakamura — United States',
    symbol: '♟',
    description: `Known for tactical creativity and rapid-play brilliance, Nakamura helped modernize chess culture through competitive excellence and digital influence.`,
  },
]

const AI_FEATURES = [
  {
    icon: '◈',
    title: 'Strategic Analysis',
    content: `Evaluate positional strengths, tactical opportunities, and critical turning points after every game.`,
  },
  {
    icon: '◉',
    title: 'Opening Intelligence',
    content: `Study modern opening systems, move accuracy, and preparation patterns used by elite players.`,
  },
  {
    icon: '◐',
    title: 'Endgame Precision',
    content: `Master conversion techniques, piece coordination, and practical endgame strategy with AI-assisted insights.`,
  },
]

const TOURNAMENT_FEATURES = [
  {
    icon: '♜',
    title: 'Rated Competitive Events',
    content: `Participate in structured tournaments with intelligent pairing systems and transparent rankings.`,
  },
  {
    icon: '✦',
    title: 'Luxury Digital Experience',
    content: `Minimal interfaces, focused gameplay, and distraction-free competition environments.`,
  },
  {
    icon: '◎',
    title: 'Global Chess Community',
    content: `Connect with players who value strategy, discipline, and intelligent competition.`,
  },
]

function Label({ children }: { children: React.ReactNode }) {
  return <p className={styles.label}>{children}</p>
}

export default function LearnMorePage() {
  return (
    <div className={styles.page}>

      {/* Back nav */}
      <div className={styles.backBar}>
        <Link href="/chess" className={styles.backLink}>
          ← Back to Chess
        </Link>
      </div>

      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className={styles.hero}>
        <div className={styles.heroOrb} aria-hidden="true" />
        <motion.div className={styles.heroInner} {...fadeUp(0.1)}>
          <Label>THE NIVENXA EXPERIENCE</Label>
          <motion.h1 className={styles.heroHeading} {...fadeUp(0.2)}>
            More Than a<br />
            <span className={styles.accent}>Chess Platform</span>
          </motion.h1>
          <motion.p className={styles.heroParagraph} {...fadeUp(0.35)}>
            NIVENXA Chess is designed for players who value strategy, discipline, and intelligent competition.
            <br /><br />
            Built with a quiet luxury philosophy, the platform combines modern technology, premium design, and timeless chess culture into a refined digital experience.
          </motion.p>
        </motion.div>
        <div className={styles.heroRule} />
      </section>

      {/* ── PHILOSOPHY ───────────────────────────────────────── */}
      <section className={styles.section}>
        <motion.div className={styles.sectionInner} {...inView(0)}>
          <Label>PHILOSOPHY</Label>
          <h2 className={styles.sectionHeading}>The Art of Strategic Thinking</h2>
          <div className={styles.philosophyGrid}>
            <p className={styles.philosophyProse}>
              Chess has always represented more than victory.
              <br /><br />
              It is patience under pressure.
              Discipline in uncertainty.
              Precision in movement.
              And intelligence expressed through restraint.
            </p>
            <p className={styles.philosophyProse}>
              NIVENXA Chess was created for players who appreciate the deeper culture of strategy — where every move carries meaning, and every decision shapes the outcome.
            </p>
          </div>
        </motion.div>
      </section>

      {/* ── HISTORY ──────────────────────────────────────────── */}
      <section className={styles.section}>
        <motion.div {...inView(0)}>
          <Label>THE HISTORY OF CHESS</Label>
          <h2 className={styles.sectionHeading}>A Game That Shaped Civilizations</h2>
          <p className={styles.sectionIntro}>
            For more than a thousand years, chess has evolved across empires, cultures, and generations — becoming one of humanity&apos;s greatest strategic games.
          </p>
        </motion.div>

        <div className={styles.timeline}>
          {TIMELINE.map((card, i) => (
            <motion.div key={card.title} className={styles.timelineCard} {...inView(i * 0.1)}>
              <span className={styles.timelineIndex}>{card.index}</span>
              <div className={styles.timelineBody}>
                <h3 className={styles.timelineTitle}>{card.title}</h3>
                <p className={styles.timelineContent}>
                  {card.content.split('\n\n').map((para, j) => (
                    <span key={j}>{para}<br /><br /></span>
                  ))}
                </p>
              </div>
              <div className={styles.timelineAccent} aria-hidden="true" />
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── MODERN CHAMPIONS ─────────────────────────────────── */}
      <section className={styles.sectionDark}>
        <div className={styles.sectionInner}>
          <motion.div {...inView(0)}>
            <Label>MODERN CHAMPIONS</Label>
            <h2 className={styles.sectionHeadingLight}>Masters of the Modern Era</h2>
            <p className={styles.sectionIntroLight}>
              The modern generation of chess champions continues to push the boundaries of human calculation, creativity, and competitive excellence.
            </p>
          </motion.div>

          <div className={styles.championsGrid}>
            {CHAMPIONS.map((c, i) => (
              <motion.div key={c.player} className={styles.championCard} {...inView(i * 0.1)}>
                <div className={styles.championSymbol}>{c.symbol}</div>
                <p className={styles.championTournament}>{c.tournament}</p>
                <h3 className={styles.championPlayer}>{c.player}</h3>
                <p className={styles.championDesc}>{c.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── AI INTELLIGENCE ──────────────────────────────────── */}
      <section className={styles.section}>
        <motion.div {...inView(0)}>
          <Label>AI-POWERED TRAINING</Label>
          <h2 className={styles.sectionHeading}>Where Strategy Meets Intelligence</h2>
          <p className={styles.sectionIntro}>
            NIVENXA Chess combines modern analysis systems with advanced chess engines to help players understand not only the best move — but the deeper strategic reasoning behind it.
            <br /><br />
            Every analysis is designed to improve: calculation, positional understanding, opening preparation, and endgame precision.
          </p>
        </motion.div>

        <div className={styles.featureGrid}>
          {AI_FEATURES.map((f, i) => (
            <motion.div key={f.title} className={styles.featureCard} {...inView(i * 0.12)}>
              <span className={styles.featureIcon}>{f.icon}</span>
              <h3 className={styles.featureTitle}>{f.title}</h3>
              <p className={styles.featureContent}>{f.content}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── TOURNAMENT EXPERIENCE ─────────────────────────────── */}
      <section className={styles.section}>
        <motion.div {...inView(0)}>
          <Label>COMPETITIVE EXPERIENCE</Label>
          <h2 className={styles.sectionHeading}>Designed for Modern Competition</h2>
          <p className={styles.sectionIntro}>
            NIVENXA tournaments are built around fairness, precision, and competitive integrity.
            <br /><br />
            From rapid formats to elite championships, every event is designed to deliver a refined and immersive chess experience.
          </p>
        </motion.div>

        <div className={styles.featureGrid}>
          {TOURNAMENT_FEATURES.map((f, i) => (
            <motion.div key={f.title} className={styles.featureCard} {...inView(i * 0.12)}>
              <span className={styles.featureIcon}>{f.icon}</span>
              <h3 className={styles.featureTitle}>{f.title}</h3>
              <p className={styles.featureContent}>{f.content}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── FINAL CTA ─────────────────────────────────────────── */}
      <motion.section
        className={styles.cta}
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className={styles.ctaOrb} aria-hidden="true" />
        <div className={styles.ctaInner}>
          <p className={styles.labelMuted}>THE NEXT MOVE</p>
          <h2 className={styles.ctaHeading}>Enter the Next Era of Chess</h2>
          <p className={styles.ctaParagraph}>
            Experience a modern chess platform built around intelligence, elegance, and strategic mastery.
          </p>
          <div className={styles.ctaButtons}>
            <Link href="/account/register" className={styles.ctaPrimary}>
              <span>♛</span> Create Free Account
            </Link>
            <Link href="/chess/tournaments" className={styles.ctaSecondary}>
              Explore Tournaments
            </Link>
          </div>
        </div>
      </motion.section>

    </div>
  )
}
