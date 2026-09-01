'use client'
import { useState } from 'react'
import Link from 'next/link'
import StepThroughPanel from '../../_shared/StepThroughPanel'
import type { Tactic } from '@/lib/chess/tactics/data'
import styles from './TacticDetail.module.scss'

export default function TacticDetail({ tactic }: { tactic: Tactic }) {
  const [exampleIndex, setExampleIndex] = useState(0)
  const example = tactic.examples[exampleIndex]

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <Link href="/chess/learn/tactics" className={styles.breadcrumb}>
          ← Tactics
        </Link>
        <h1 className={styles.heading}>{tactic.name}</h1>
        <p className={styles.subtext}>{tactic.description}</p>
      </section>

      {tactic.examples.length > 1 && (
        <div className={styles.exampleTabs}>
          {tactic.examples.map((_, i) => (
            <button
              key={i}
              type="button"
              className={`${styles.exampleTab} ${i === exampleIndex ? styles.exampleTabSelected : ''}`}
              onClick={() => setExampleIndex(i)}
            >
              Example {i + 1}
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
            startDescription: `The starting position for this ${tactic.name.toLowerCase()} example. Step forward to see the tactic in action.`,
          }}
          footer={
            <Link href="/chess/puzzles" className={styles.practiceLink}>
              Practice {tactic.name} puzzles →
            </Link>
          }
        />
      </div>
    </main>
  )
}
