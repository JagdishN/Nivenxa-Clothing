import Link from 'next/link'
import { OPENINGS } from '@/lib/chess/openings/data'
import styles from './OpeningsList.module.scss'

export default function ChessLearnOpeningsPage() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <Link href="/chess/learn" className={styles.breadcrumb}>
          ← Learn
        </Link>
        <h1 className={styles.heading}>Openings</h1>
        <p className={styles.subtext}>
          Pick an opening to step through its first few moves and see the idea behind each one.
        </p>
      </section>

      <div className={styles.grid}>
        {OPENINGS.map((opening) => (
          <Link key={opening.slug} href={`/chess/learn/openings/${opening.slug}`} className={styles.card}>
            <h2 className={styles.cardTitle}>{opening.name}</h2>
            <p className={styles.cardDesc}>{opening.description}</p>
          </Link>
        ))}
      </div>
    </main>
  )
}
