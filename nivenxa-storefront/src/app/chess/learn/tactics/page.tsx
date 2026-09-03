import Link from 'next/link'
import { TACTICS, RECOMMENDED_TACTIC_SLUGS, TACTIC_DIFFICULTY_LABEL, TACTIC_DIFFICULTY_EMOJI, getTactic } from '@/lib/chess/tactics/data'
import styles from './TacticsList.module.scss'

const GROUPS: { difficulty: 'start' | 'next' | 'later'; title: string }[] = [
  { difficulty: 'start', title: 'Start Here' },
  { difficulty: 'next', title: 'Learn Next' },
  { difficulty: 'later', title: 'Learn Later' },
]

export default function ChessLearnTacticsPage() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <Link href="/chess/learn" className={styles.breadcrumb}>
          ← Learn
        </Link>
        <h1 className={styles.heading}>Tactics</h1>
        <p className={styles.subtext}>Learn how to spot winning moves.</p>
        <p className={styles.subtext}>Start with the easy ones and learn one step at a time.</p>
      </section>

      <div className={styles.recommendStrip}>
        <p className={styles.recommendHeading}>⭐ New to tactics?</p>
        <p className={styles.recommendSubtext}>Start with one of these:</p>
        <div className={styles.recommendLinks}>
          {RECOMMENDED_TACTIC_SLUGS.map((slug) => {
            const tactic = getTactic(slug)
            if (!tactic) return null
            return (
              <Link key={slug} href={`/chess/learn/tactics/${slug}`} className={styles.recommendLink}>
                {tactic.name}
              </Link>
            )
          })}
        </div>
      </div>

      {GROUPS.map((group, groupIndex) => {
        const tactics = TACTICS.filter((t) => t.difficulty === group.difficulty)
        return (
          <div key={group.difficulty} className={styles.group}>
            <p className={styles.groupHeading}>{group.title}</p>
            <div className={styles.grid}>
              {tactics.map((tactic, tacticIndex) => (
                <Link
                  key={tactic.slug}
                  href={`/chess/learn/tactics/${tactic.slug}`}
                  className={`${styles.card} ${groupIndex === 0 && tacticIndex === 0 ? styles.cardFirst : ''}`}
                >
                  <h2 className={styles.cardTitle}>{tactic.name}</h2>
                  <p className={styles.cardDesc}>{tactic.summary}</p>
                  <p className={styles.cardDifficulty}>
                    {TACTIC_DIFFICULTY_EMOJI[tactic.difficulty]} {TACTIC_DIFFICULTY_LABEL[tactic.difficulty]}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        )
      })}
    </main>
  )
}
