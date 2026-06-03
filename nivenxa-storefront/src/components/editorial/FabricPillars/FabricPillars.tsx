import type { FabricPillar } from '@/types/product'
import styles from './FabricPillars.module.css'

interface Props {
  pillars: FabricPillar[]
}

export default function FabricPillars({ pillars }: Props) {
  return (
    <section className={styles.pillarsGrid}>
      {pillars.map((pillar, i) => (
        <div key={i} className={styles.pillar}>
          <div className={styles.valueRow}>
            <span className={styles.value}>{pillar.value}</span>
            {pillar.unit && <span className={styles.unit}>{pillar.unit}</span>}
          </div>
          <span className={styles.subLabel}>{pillar.subLabel}</span>
          <p className={styles.description}>{pillar.description}</p>
        </div>
      ))}
    </section>
  )
}
