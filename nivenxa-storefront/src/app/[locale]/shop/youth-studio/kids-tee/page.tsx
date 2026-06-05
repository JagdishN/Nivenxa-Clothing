import styles from './KidsTee.module.css'

export default function KidsTee() {
  return (
    <div className={styles.section}>
      <p className={styles.eyebrow}>Youth Studio</p>
      <h1 className={styles.title}>Kids Tee</h1>
      <div className={styles.rule} />
      <p className={styles.soon}>Coming Soon</p>
    </div>
  )
}
