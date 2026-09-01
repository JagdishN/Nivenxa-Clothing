'use client'
import { useState } from 'react'
import Link from 'next/link'
import StepThroughPanel from '../../_shared/StepThroughPanel'
import type { Endgame } from '@/lib/chess/endgames/data'
import styles from './EndgameDetail.module.scss'

export default function EndgameDetail({ endgame }: { endgame: Endgame }) {
  const [exampleIndex, setExampleIndex] = useState(0)
  const example = endgame.examples[exampleIndex]

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <Link href="/chess/learn/endgames" className={styles.breadcrumb}>
          ← Endgames
        </Link>
        <h1 className={styles.heading}>{endgame.name}</h1>
        <p className={styles.subtext}>{endgame.description}</p>
      </section>

      {endgame.examples.length > 1 && (
        <div className={styles.exampleTabs}>
          {endgame.examples.map((ex, i) => (
            <button
              key={i}
              type="button"
              className={`${styles.exampleTab} ${i === exampleIndex ? styles.exampleTabSelected : ''}`}
              onClick={() => setExampleIndex(i)}
            >
              {ex.label ?? `Example ${i + 1}`}
            </button>
          ))}
        </div>
      )}

      <div className={styles.layout}>
        <StepThroughPanel
          key={exampleIndex}
          example={{
            fen: example.fen,
            moves: example.moves,
            stepExplanations: example.stepExplanations,
            startDescription: example.startDescription,
          }}
        />
      </div>
    </main>
  )
}
