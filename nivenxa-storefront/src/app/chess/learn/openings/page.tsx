import Link from 'next/link'
import { OPENING_CATEGORIES, DIFFICULTY_LABEL, DIFFICULTY_EMOJI, getOpening } from '@/lib/chess/openings/data'
import styles from './OpeningsList.module.scss'

export default function ChessLearnOpeningsPage() {
  const startHere = OPENING_CATEGORIES.find((category) => category.slug === 'start-here')
  const remainingCategories = OPENING_CATEGORIES.filter((category) => category.slug !== 'start-here')

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <Link href="/chess/learn" className={styles.breadcrumb}>
          ← Learn
        </Link>
        <h1 className={styles.heading}>Openings</h1>
        <p className={styles.subtext}>Choose an opening and learn how it works.</p>
      </section>

      {/* A short recommendation strip, not a card grid — "Start Here" is a
          suggestion, and its four openings already have full cards below in
          their own category, so a second full-size copy here would just be
          duplicate content pushing the real categories further down. */}
      {startHere && (
        <div className={styles.recommendStrip}>
          <p className={styles.recommendHeading}>⭐ New to openings?</p>
          <p className={styles.recommendSubtext}>Start with one of these:</p>
          <div className={styles.recommendLinks}>
            {startHere.openingSlugs.map((slug) => {
              const opening = getOpening(slug)
              if (!opening) return null
              return (
                <Link key={slug} href={`/chess/learn/openings/${slug}`} className={styles.recommendLink}>
                  {opening.name}
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {remainingCategories.map((category, categoryIndex) => (
        <div key={category.slug} className={styles.group}>
          <p className={styles.groupHeading}>{category.title}</p>
          <div className={styles.grid}>
            {category.openingSlugs.map((slug, openingIndex) => {
              const opening = getOpening(slug)
              if (!opening) return null
              return (
                <Link
                  key={slug}
                  href={`/chess/learn/openings/${slug}`}
                  className={`${styles.card} ${categoryIndex === 0 && openingIndex === 0 ? styles.cardFirst : ''}`}
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
