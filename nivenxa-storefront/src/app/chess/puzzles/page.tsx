import styles from './Puzzles.module.scss'

const TIERS = ['Beginner', 'Intermediate', 'Expert']

export default function ChessPuzzlesPage() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <p className={styles.eyebrow}>NIVENXA CHESS</p>
        <h1 className={styles.heading}>Puzzles</h1>
        <p className={styles.subtext}>
          Tiered puzzle sets to build your tactics, from first patterns to advanced combinations. Coming soon.
        </p>
      </section>

      <div className={styles.grid}>
        {TIERS.map((tier) => (
          <div key={tier} className={styles.tile}>
            <span className={styles.tileTier}>{tier}</span>
            <span className={styles.tileLabel}>Puzzle sets render here</span>
          </div>
        ))}
      </div>
    </main>
  )
}
