import Link from 'next/link'
import styles from './Learn.module.scss'

const CATEGORIES = [
  {
    slug: 'openings',
    title: 'Openings',
    desc: 'Step through the ideas behind well-known openings, one move at a time.',
    available: true,
  },
  {
    slug: 'tactics',
    title: 'Tactics',
    desc: 'Pattern-based lessons on forks, pins, skewers, and other tactical motifs.',
    available: false,
  },
  {
    slug: 'endgames',
    title: 'Endgames',
    desc: 'Core endgame technique — king and pawn endings, basic mates, and more.',
    available: false,
  },
]

export default function ChessLearnPage() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <p className={styles.eyebrow}>NIVENXA CHESS</p>
        <h1 className={styles.heading}>Learn</h1>
        <p className={styles.subtext}>
          Bite-sized lessons that explain the ideas behind the moves — start with openings, more categories on the way.
        </p>
      </section>

      <div className={styles.grid}>
        {CATEGORIES.map((category) =>
          category.available ? (
            <Link key={category.slug} href={`/chess/learn/${category.slug}`} className={styles.categoryCard}>
              <h2 className={styles.categoryTitle}>{category.title}</h2>
              <p className={styles.categoryDesc}>{category.desc}</p>
            </Link>
          ) : (
            <div key={category.slug} className={styles.categoryCardDisabled}>
              <span className={styles.categoryBadge}>Coming soon</span>
              <h2 className={styles.categoryTitle}>{category.title}</h2>
              <p className={styles.categoryDesc}>{category.desc}</p>
            </div>
          )
        )}
      </div>
    </main>
  )
}
