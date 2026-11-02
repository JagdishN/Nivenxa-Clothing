import type { Icon as TablerIcon } from '@tabler/icons-react'
import styles from './PolicyStats.module.scss'

export interface PolicyStat {
  icon: TablerIcon
  value: string
  label: string
}

// Always 3 columns, even on the narrowest phones — only the type scales
// down (see the module's own 420px rule), so nothing ever forces a
// horizontal scrollbar.
export default function PolicyStats({ stats }: { stats: PolicyStat[] }) {
  return (
    <div className={styles.statRow}>
      {stats.map(({ icon: Icon, value, label }) => (
        <div key={value} className={styles.stat}>
          <Icon className={styles.statIcon} aria-hidden="true" size={26} stroke={1.5} />
          <p className={styles.statValue}>{value}</p>
          <p className={styles.statLabel}>{label}</p>
        </div>
      ))}
    </div>
  )
}
