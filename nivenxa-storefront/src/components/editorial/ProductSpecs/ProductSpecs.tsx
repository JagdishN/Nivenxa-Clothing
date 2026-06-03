import type { ProductSpec, FitBar } from '@/types/product'
import styles from './ProductSpecs.module.css'

interface Props {
  specs: ProductSpec[]
  fitBars: FitBar[]
  modelNote: string | null
}

// Extract ordered unique groups from specs — order matches first appearance
function getGroups(specs: ProductSpec[]): string[] {
  const seen = new Set<string>()
  const groups: string[] = []
  for (const s of specs) {
    if (s.group && !seen.has(s.group)) {
      seen.add(s.group)
      groups.push(s.group)
    }
  }
  return groups
}

export default function ProductSpecs({ specs, fitBars, modelNote }: Props) {
  const isGrouped = specs.some(s => s.group)
  const groups = isGrouped ? getGroups(specs) : []

  return (
    <section className={styles.section}>
      {/* Left col — Garment Specifications */}
      <div className={styles.col}>
        <p className={styles.colTitle}>GARMENT SPECIFICATIONS</p>
        <div className={styles.specList}>
          {isGrouped ? (
            // Grouped rendering — 3 sections with headings
            groups.map((group, gi) => (
              <div key={group} className={styles.specGroup}>
                <p className={`${styles.groupHeading} ${gi === 0 ? styles.groupHeadingFirst : ''}`}>
                  {group}
                </p>
                {specs
                  .filter(s => s.group === group)
                  .map((spec, i, arr) => (
                    <div
                      key={spec.label}
                      className={`${styles.specRow} ${i === arr.length - 1 && gi === groups.length - 1 ? styles.lastRow : ''}`}
                    >
                      <span className={styles.specKey}>{spec.label}</span>
                      <span className={styles.specValue}>{spec.value}</span>
                    </div>
                  ))}
              </div>
            ))
          ) : (
            // Flat rendering — backward-compatible for cargo and other products
            specs.map((spec, i) => (
              <div
                key={spec.label}
                className={`${styles.specRow} ${i === specs.length - 1 ? styles.lastRow : ''}`}
              >
                <span className={styles.specKey}>{spec.label}</span>
                <span className={styles.specValue}>{spec.value}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right col — Fit Guide */}
      <div className={styles.col}>
        <p className={styles.colTitle}>FIT GUIDE</p>
        <div className={styles.fitList}>
          {/* Axis labels */}
          <div className={styles.fitAxisRow}>
            <span className={styles.fitAxisLabel}>Relaxed</span>
            <span className={styles.fitAxisLabel}>Fitted</span>
          </div>
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
