import Link from 'next/link'
import styles from './Learn.module.scss'

const CATEGORIES = [
  {
    slug: 'basics',
    title: 'Chess Basics',
    desc: 'Learn the board, meet the pieces, see how they move, and learn how to win.',
    flow: 'Learn → Try the moves yourself',
  },
  {
    slug: 'openings',
    title: 'Openings',
    desc: 'Learn simple ways to start a chess game.',
    flow: 'Watch the moves → Try the opening yourself',
  },
  {
    slug: 'tactics',
    title: 'Tactics',
    desc: 'Learn how to spot strong and winning moves.',
    flow: 'See the idea → Find the winning move',
  },
  {
    slug: 'endgames',
    title: 'Endgames',
    desc: 'Learn how to finish a game and win.',
    flow: 'Learn the idea → Finish the position yourself',
  },
  {
    slug: 'rules',
    title: 'Rules',
    desc: 'Learn the important rules of chess.',
    flow: 'See the rule → Try a simple example',
  },
]

export default function ChessLearnPage() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <p className={styles.eyebrow}>NIVENXA CHESS</p>
        <h1 className={styles.heading}>Learn</h1>
        <p className={styles.subtext}>Learn chess with short lessons, clear examples and moves you can try.</p>
      </section>

      <div className={styles.recommendStrip}>
        <p className={styles.recommendHeading}>
          New to chess?{' '}
          <Link href="/chess/learn/basics" className={styles.recommendLink}>
            Start Chess Basics →
          </Link>
        </p>
      </div>

      <div className={styles.grid}>
        {CATEGORIES.map((category, i) => (
          <Link key={category.slug} href={`/chess/learn/${category.slug}`} className={styles.categoryCard}>
            <span className={styles.categoryNumber}>{i + 1}</span>
            <h2 className={styles.categoryTitle}>{category.title}</h2>
            <p className={styles.categoryDesc}>{category.desc}</p>
            <p className={styles.categoryFlow}>{category.flow}</p>
          </Link>
        ))}
      </div>
    </main>
  )
}
