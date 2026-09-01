'use client'
import Link from 'next/link'
import StepThroughPanel from '../../_shared/StepThroughPanel'
import type { Opening } from '@/lib/chess/openings/data'
import styles from './OpeningDetail.module.scss'

export default function OpeningDetail({ opening }: { opening: Opening }) {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <Link href="/chess/learn/openings" className={styles.breadcrumb}>
          ← Openings
        </Link>
        <h1 className={styles.heading}>{opening.name}</h1>
        <p className={styles.subtext}>{opening.description}</p>
      </section>

      <div className={styles.layout}>
        <StepThroughPanel
          example={{
            moves: opening.moves,
            stepExplanations: opening.stepExplanations,
            startDescription: `The starting position, before ${opening.name} begins. Step forward to see the first move.`,
          }}
        />
      </div>
    </main>
  )
}
