import type { CareInstruction } from '@/types/product'
import styles from './CareInstructions.module.css'

interface Props {
  care: CareInstruction[]
}

export default function CareInstructions({ care }: Props) {
  return (
    <section className={styles.section}>
      <p className={styles.eyebrow}>CARE INSTRUCTIONS</p>
      <div className={styles.grid}>
        {care.map(item => (
          <div key={item.label} className={styles.item}>
            <span className={styles.iconCircle}>
              <i className={`ti ti-${item.icon}`} aria-hidden="true" />
            </span>
            <span className={styles.label}>{item.label}</span>
          </div>
        ))}
      </div>
      <p className={styles.note}>
        Garment softens and improves with each wash. Wash dark and light colourways separately
        for the first three washes.
      </p>
    </section>
  )
}
