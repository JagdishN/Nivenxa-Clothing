import Link from 'next/link'
import styles from './Learn.module.scss'

const CATEGORIES = [
  {
    slug: 'basics',
    title: 'Chess Basics',
    desc: 'Learn the board, pieces, moves, and how the game works.',
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
        <p className={styles.subtext}>
          Bite-sized lessons that explain the ideas behind the moves — openings, tactics, endgame technique, and the rules themselves.
        </p>
      </section>

      <div className={styles.recommendStrip}>
        <p className={styles.recommendHeading}>⭐ New to chess?</p>
        <p className={styles.recommendSubtext}>Start with Chess Basics. Learn how the pieces move, then start playing.</p>
        <div className={styles.recommendLinks}>
          <Link href="/chess/learn/basics" className={styles.recommendLink}>
            Chess Basics
          </Link>
        </div>
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
