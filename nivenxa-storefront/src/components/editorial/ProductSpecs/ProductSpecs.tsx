import type { ProductSpec, FitBar } from '@/types/product'
import styles from './ProductSpecs.module.css'

interface Props {
  specs: ProductSpec[]
  fitBars: FitBar[]
  modelNote: string | null
}

export default function ProductSpecs({ specs, fitBars, modelNote }: Props) {
  return (
    <section className={styles.section}>
      {/* Left col — Garment Specifications */}
      <div className={styles.col}>
        <p className={styles.colTitle}>GARMENT SPECIFICATIONS</p>
        <div className={styles.specList}>
          {specs.map((spec, i) => (
            <div
              key={spec.key}
              className={`${styles.specRow} ${i === specs.length - 1 ? styles.lastRow : ''}`}
            >
              <span className={styles.specKey}>{spec.key}</span>
              <span className={styles.specValue}>{spec.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right col — Fit Guide */}
      <div className={styles.col}>
        <p className={styles.colTitle}>FIT GUIDE</p>
        <div className={styles.fitList}>
          {fitBars.map(bar => (
            <div key={bar.label} className={styles.fitRow}>
              <span className={styles.fitLabel}>{bar.label}</span>
              <div className={styles.barTrack}>
                <div
                  className={styles.barFill}
                  style={{ width: `${bar.value}%` }}
                />
              </div>
              <span className={styles.fitDescriptor}>{bar.descriptor}</span>
            </div>
          ))}
        </div>
        {modelNote && (
          <p className={styles.modelNote}>{modelNote}</p>
        )}
      </div>
    </section>
  )
}
