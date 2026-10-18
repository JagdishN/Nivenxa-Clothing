import Link from 'next/link'
import { OPENING_CATEGORIES, OPENINGS, DIFFICULTY_LABEL, DIFFICULTY_EMOJI } from '@/lib/chess/openings/data'
import styles from './OpeningsList.module.scss'

// One icon per category (not per opening) — visual polish to match Chess
// Basics' card icons without a new per-opening data field. Reused by every
// opening within that category.
const CATEGORY_ICON: Record<string, string> = {
  'e4-e5': '⚔️',
  'e4-other': '🛡️',
  d4: '♛',
  c4: '🧭',
}

// One running number across the whole page (01, 02, 03…), matching Chess
// Basics — built once, at module load, as a plain lookup rather than a
// mutable counter incremented during render (which this project's
// react-hooks/immutability lint rule rejects, even for a mutation local to
// one render pass).
const CARD_NUMBER: Record<string, number> = (() => {
  const map: Record<string, number> = {}
  let n = 0
  for (const category of OPENING_CATEGORIES) {
    for (const slug of category.openingSlugs) {
      n += 1
      map[slug] = n
    }
  }
  return map
})()

export default function ChessLearnOpeningsPage() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <Link href="/chess/learn" className={styles.breadcrumb}>
          ← Learn
        </Link>
        <h1 className={styles.heading}>Openings</h1>
        <p className={styles.subtext}>Learn how to start a chess game and why your first moves matter.</p>
        <p className={styles.difficultyKey}>
          Difficulty: {DIFFICULTY_EMOJI.start} {DIFFICULTY_LABEL.start} · {DIFFICULTY_EMOJI.next} {DIFFICULTY_LABEL.next} ·{' '}
          {DIFFICULTY_EMOJI.later} {DIFFICULTY_LABEL.later}
        </p>
      </section>

      {/* One recommendation, not a two-tier chain of links on top of the
          catalogue below — every opening already has its own card, so a
          second navigation system on top of the grid was more to parse
          than a beginner needs. */}
      <div className={styles.recommendStrip}>
        <p className={styles.recommendHeading}>
          New to openings?{' '}
          <Link href="/chess/learn/openings/italian-game" className={styles.recommendChainLink}>
            Start with the Italian Game
          </Link>
        </p>
      </div>

      {OPENING_CATEGORIES.map((category) => (
        <div key={category.slug} className={styles.group}>
          <p className={styles.groupHeading}>{category.title}</p>
          <p className={styles.groupIntro}>{category.intro}</p>
          <p className={styles.groupNotation}>{category.notation}</p>
          <div className={styles.grid}>
            {category.openingSlugs.map((slug) => {
              const opening = OPENINGS.find((o) => o.slug === slug)
              if (!opening) return null
              return (
                <Link
                  key={slug}
                  href={`/chess/learn/openings/${slug}`}
                  className={`${styles.card} ${opening.difficulty === 'start' ? styles.cardRecommended : ''}`}
                >
                  <span className={styles.cardTop}>
                    <span className={styles.cardIcon} aria-hidden="true">
                      {CATEGORY_ICON[category.slug] ?? '♟️'}
                    </span>
                    <span className={styles.cardNumber}>{String(CARD_NUMBER[slug]).padStart(2, '0')}</span>
                  </span>
                  <h2 className={styles.cardTitle}>{opening.name}</h2>
                  <p className={styles.cardDesc}>{opening.summary}</p>
                  <span className={styles.cardFooter}>
                    <span
                      className={`${styles.cardSide} ${opening.playedBy === 'white' ? styles.cardSideWhite : styles.cardSideBlack}`}
                    >
                      <span className={styles.cardSideIcon} aria-hidden="true">
                        {opening.playedBy === 'white' ? '♔' : '♚'}
                      </span>
                      {opening.playedBy === 'white' ? 'For White' : 'For Black'}
                    </span>
                    <span className={styles.cardDifficulty}>
                      {DIFFICULTY_EMOJI[opening.difficulty]} {DIFFICULTY_LABEL[opening.difficulty]}
                    </span>
                    <span className={styles.cardCta}>Learn →</span>
                  </span>
                </Link>
              )
            })}
          </div>
        </div>
      ))}
    </main>
  )
}
