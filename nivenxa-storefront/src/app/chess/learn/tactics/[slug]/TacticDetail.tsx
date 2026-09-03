'use client'
import { useState } from 'react'
import Link from 'next/link'
import StepThroughPanel from '../../_shared/StepThroughPanel'
import TacticPuzzleSet from '../../_shared/TacticPuzzleSet'
import { TACTIC_DIFFICULTY_LABEL, TACTIC_DIFFICULTY_EMOJI, getNextTacticInPath, type Tactic } from '@/lib/chess/tactics/data'
import styles from './TacticDetail.module.scss'

export default function TacticDetail({ tactic }: { tactic: Tactic }) {
  const [exampleIndex, setExampleIndex] = useState(0)
  const [mode, setMode] = useState<'learn' | 'practice'>('learn')
  const example = tactic.examples[exampleIndex]
  const next = getNextTacticInPath(tactic.slug)
  const nextCta = next ? { href: `/chess/learn/tactics/${next.slug}`, label: `Learn ${next.name} next →` } : undefined
  const startingSide = example.fen.split(' ')[1] === 'b' ? 'Black' : 'White'
  const hasPuzzles = tactic.puzzles && tactic.puzzles.length > 0 && tactic.prompt && tactic.wrongText && tactic.correctText

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <Link href="/chess/learn/tactics" className={styles.breadcrumb}>
          ← Tactics
        </Link>
        <h1 className={styles.heading}>{tactic.name}</h1>
        <p className={styles.subtext}>{tactic.description}</p>
      </section>

      <div className={styles.tags}>
        <span className={`${styles.tag} ${styles[`tag_${tactic.difficulty}`]}`}>
          {TACTIC_DIFFICULTY_EMOJI[tactic.difficulty]} {TACTIC_DIFFICULTY_LABEL[tactic.difficulty]}
        </span>
      </div>

      {mode === 'learn' && tactic.examples.length > 1 && (
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
        {mode === 'learn' ? (
          <StepThroughPanel
            key={exampleIndex}
            example={{
              fen: example.fen,
              moves: example.moves,
              stepExplanations: example.stepExplanations,
              stepReveal: example.stepReveal,
              startDescription: `Press Next to see ${startingSide}'s first move.`,
              completionLabel: hasPuzzles ? 'You saw the idea' : `🎉 You learned ${tactic.name}`,
              completionSummary: hasPuzzles ? ['Now it\'s your turn to try it yourself.'] : tactic.completionSummary,
            }}
            onPracticeClick={hasPuzzles ? () => setMode('practice') : undefined}
            practiceCtaLabel="Your Turn →"
            nextCta={hasPuzzles ? undefined : nextCta}
            footer={
              <Link href="/chess/puzzles" className={styles.practiceLink}>
                Practice {tactic.name} puzzles →
              </Link>
            }
          />
        ) : (
          <TacticPuzzleSet
            example={{
              puzzles: tactic.puzzles!,
              prompt: tactic.prompt!,
              wrongText: tactic.wrongText!,
              correctText: tactic.correctText!,
              tacticName: tactic.name,
              completionSummary: tactic.completionSummary,
            }}
            nextCta={nextCta}
          />
        )}
      </div>
    </main>
  )
}
