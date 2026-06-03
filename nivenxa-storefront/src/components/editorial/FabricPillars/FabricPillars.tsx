import type { FabricPillar } from '@/types/product'
import styles from './FabricPillars.module.css'

interface Props {
  pillars: FabricPillar[]
}

export default function FabricPillars({ pillars }: Props) {
  return (
    <section className={styles.section}>
      {pillars.map((pillar, i) => (
        <div
          key={pillar.unit}
          className={`${styles.col} ${i === pillars.length - 1 ? styles.last : ''}`}
        >
          <p className={styles.value}>{pillar.value}</p>
          <p className={styles.unit}>{pillar.unit}</p>
          <p className={styles.description}>{pillar.description}</p>
        </div>
      ))}
    </section>
  )
}
