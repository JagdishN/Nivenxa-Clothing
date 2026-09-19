import Link from 'next/link'
import { OPENING_CATEGORIES, OPENINGS, DIFFICULTY_LABEL, DIFFICULTY_EMOJI, type OpeningDifficulty } from '@/lib/chess/openings/data'
import styles from './OpeningsList.module.scss'

// Derived live from each opening's own `difficulty`, not a separately
// maintained slug list — that's what let Queen's Gambit get recommended
// here while its own card said "🟡 Learn next" (see data.ts's comment on
// OPENING_CATEGORIES). Two tiers, so the strip's own meaning stays
// consistent with the badges the cards below already show.
function openingsAt(difficulty: OpeningDifficulty) {
  return OPENINGS.filter((o) => o.difficulty === difficulty)
}

export default function ChessLearnOpeningsPage() {
  const startHere = openingsAt('start')
  const tryNext = openingsAt('next')

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <Link href="/chess/learn" className={styles.breadcrumb}>
          ← Learn
        </Link>
        <h1 className={styles.heading}>Openings</h1>
        <p className={styles.subtext}>Learn simple opening ideas and understand why the first moves matter.</p>
        <p className={styles.difficultyKey}>
          Difficulty: {DIFFICULTY_EMOJI.start} {DIFFICULTY_LABEL.start} · {DIFFICULTY_EMOJI.next} {DIFFICULTY_LABEL.next} ·{' '}
          {DIFFICULTY_EMOJI.later} {DIFFICULTY_LABEL.later}
        </p>
      </section>

      <div className={styles.recommendStrip}>
        <p className={styles.recommendHeading}>Not sure where to start?</p>
        <div className={styles.recommendChain}>
          {startHere.map((opening) => (
            <Link key={opening.slug} href={`/chess/learn/openings/${opening.slug}`} className={styles.recommendChainLink}>
              {opening.name} <span className={styles.recommendArrow}>→</span>
            </Link>
          ))}
        </div>

        <p className={styles.recommendSecondaryHeading}>Ready for more?</p>
        <div className={styles.recommendSecondaryLinks}>
          {tryNext.map((opening) => (
            <Link key={opening.slug} href={`/chess/learn/openings/${opening.slug}`} className={styles.recommendSecondaryLink}>
              {opening.name}
              <span className={styles.recommendSecondaryArrow}>→</span>
            </Link>
          ))}
        </div>
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
                  <h2 className={styles.cardTitle}>{opening.name}</h2>
                  <p className={styles.cardDesc}>{opening.summary}</p>
                  <p className={styles.cardDifficulty}>
                    {DIFFICULTY_EMOJI[opening.difficulty]} {DIFFICULTY_LABEL[opening.difficulty]}
                  </p>
                </Link>
              )
            })}
          </div>
        </div>
      ))}
    </main>
  )
}
