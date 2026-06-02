import styles from './CompositionHero.module.css'

interface Props {
  category: string
  compositionQuote: string
}

export default function CompositionHero({ category, compositionQuote }: Props) {
  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <p className={styles.eyebrow}>COMPOSITION</p>
        <h2 className={styles.title}>{category}</h2>
        <blockquote className={styles.quote}>{compositionQuote}</blockquote>
      </div>
    </section>
  )
}
