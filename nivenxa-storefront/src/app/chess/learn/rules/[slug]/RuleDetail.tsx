'use client'
import { useState } from 'react'
import Link from 'next/link'
import StepThroughPanel from '../../_shared/StepThroughPanel'
import type { Rule } from '@/lib/chess/rules/data'
import styles from './RuleDetail.module.scss'

export default function RuleDetail({ rule }: { rule: Rule }) {
  const [exampleIndex, setExampleIndex] = useState(0)
  const examples = rule.examples ?? []
  const example = examples[exampleIndex]

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <Link href="/chess/learn/rules" className={styles.breadcrumb}>
          ← Rules
        </Link>
        <h1 className={styles.heading}>{rule.name}</h1>
        <p className={styles.subtext}>{rule.description}</p>
      </section>

      {rule.type === 'text' ? (
        <div className={styles.textLayout}>
          {rule.body?.map((paragraph, i) => (
            <p key={i} className={styles.paragraph}>
              {paragraph}
            </p>
          ))}
        </div>
      ) : (
        <>
          {examples.length > 1 && (
            <div className={styles.exampleTabs}>
              {examples.map((ex, i) => (
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
            {example && (
              <StepThroughPanel
                key={exampleIndex}
                example={{
                  fen: example.fen,
                  moves: example.moves,
                  stepExplanations: example.stepExplanations,
                  startDescription: example.startDescription,
                }}
              />
            )}
          </div>
        </>
      )}
    </main>
  )
}
