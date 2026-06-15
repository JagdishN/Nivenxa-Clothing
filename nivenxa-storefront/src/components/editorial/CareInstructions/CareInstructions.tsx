import { IconWash, IconSunOff, IconFlameOff, IconBan } from '@tabler/icons-react'
import type { CareInstruction } from '@/types/product'
import styles from './CareInstructions.module.css'

const CARE_ICONS: Record<string, React.ReactNode> = {
  'wash':      <IconWash      size={20} aria-hidden="true" />,
  'sun-off':   <IconSunOff   size={20} aria-hidden="true" />,
  'flame-off': <IconFlameOff size={20} aria-hidden="true" />,
  'ban':       <IconBan      size={20} aria-hidden="true" />,
}

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
              {CARE_ICONS[item.icon]}
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
