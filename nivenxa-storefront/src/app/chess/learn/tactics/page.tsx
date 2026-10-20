import Link from 'next/link'
import { TACTICS } from '@/lib/chess/tactics/data'
import styles from './TacticsList.module.scss'

const GROUPS: { difficulty: 'start' | 'next' | 'later'; title: string }[] = [
  { difficulty: 'start', title: 'Start Here' },
  { difficulty: 'next', title: 'Learn Next' },
  { difficulty: 'later', title: 'Learn Later' },
]

// One running number across the whole page, matching Chess Basics — built
// once, at module load, as a plain lookup rather than a mutable counter
// incremented during render (which this project's react-hooks/immutability
// lint rule rejects, even for a mutation local to one render pass).
const CARD_NUMBER: Record<string, number> = (() => {
  const map: Record<string, number> = {}
  let n = 0
  for (const group of GROUPS) {
    for (const tactic of TACTICS.filter((t) => t.difficulty === group.difficulty)) {
      n += 1
      map[tactic.slug] = n
    }
  }
  return map
})()

// One icon per tactic — visual polish to match Chess Basics' card icons.
// Each tactic is a genuinely distinct idea, so a per-tactic pick (rather
// than one shared icon per difficulty group) is the more meaningful choice
// here, and at 18 entries still a quick, no-new-data-layer addition.
const TACTIC_ICON: Record<string, string> = {
  'hanging-pieces': '🎯',
  checks: '❗',
  'attack-and-capture': '⚔️',
  forks: '🔱',
  pins: '📌',
  skewers: '🗡️',
  'double-attack': '💥',
  'discovered-attack': '🔍',
  'removing-the-defender': '🪓',
  deflection: '↪️',
  'back-rank-mate': '🏰',
  'double-check': '⚡',
  'in-between-move': '⏸️',
  overloading: '📦',
  clearance: '🧹',
  decoy: '🎣',
  interference: '🚧',
  'trapped-piece': '🕸️',
}

export default function ChessLearnTacticsPage() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <Link href="/chess/learn" className={styles.breadcrumb}>
          ← Back to Learn
        </Link>
        <h1 className={styles.heading}>Tactics</h1>
        <p className={styles.subtext}>Learn to spot winning moves, starting with simple ideas.</p>
      </section>

      {/* One recommendation, not a link list on top of the Start Here group
          that already leads with this same tactic — the list also used to
          leave out Attack & Capture despite it being a beginner card, which
          this avoids by just pointing at one proven starting point. */}
      <div className={styles.recommendStrip}>
        <p className={styles.recommendHeading}>
          New to tactics?{' '}
          <Link href="/chess/learn/tactics/hanging-pieces" className={styles.recommendLink}>
            Start with Hanging Pieces
          </Link>
        </p>
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
                  <span className={styles.cardTop}>
                    <span className={styles.cardIcon} aria-hidden="true">
                      {TACTIC_ICON[tactic.slug] ?? '♟️'}
                    </span>
                    <span className={styles.cardNumber}>{String(CARD_NUMBER[tactic.slug]).padStart(2, '0')}</span>
                  </span>
                  <h2 className={styles.cardTitle}>{tactic.name}</h2>
                  <p className={styles.cardDesc}>{tactic.summary}</p>
                  {/* No per-card difficulty label here — the Start Here /
                      Learn Next / Learn Later heading above each group
                      already says this once; repeating it per card was the
                      same fact twice. */}
                  <span className={styles.cardFooter}>
                    <span className={styles.cardCta}>Learn →</span>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )
      })}
    </main>
  )
}
