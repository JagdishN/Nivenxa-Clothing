import styles from './CompositionHero.module.css'

interface Props {
  category: string
  compositionQuote: string
}

export default function CompositionHero({ compositionQuote }: Props) {
  return (
    <section className={styles.section}>
      <div className={styles.compositionHeader}>
        <div className={styles.left}>
          <p className={styles.eyebrow}>MATERIAL</p>
        </div>
        <div className={styles.right}>
          <blockquote className={styles.quote}>{compositionQuote}</blockquote>
        </div>
      </div>
    </section>
  )
}
