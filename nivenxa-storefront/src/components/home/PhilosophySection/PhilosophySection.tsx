import styles from './PhilosophySection.module.css'

export default function PhilosophySection() {
  return (
    <section className={styles.section}>
      <div className={styles.inner}>

        <div className={styles.left}>
          <span className={styles.heading}>
            The Nivenxa Standard
          </span>
          <p className={styles.line}>
            Natural fabrics.
          </p>
          <p className={styles.line}>
            Thoughtful silhouettes.
          </p>
          <p className={styles.line}>
            Designed for Indian life.
          </p>
        </div>

        <div className={styles.divider} />

        <div className={styles.right}>
          <p className={styles.proof}>
            Built slowly.<br />
            Made responsibly.<br />
            Created to be worn every day.
          </p>
        </div>

      </div>
    </section>
  )
}
