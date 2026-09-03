'use client'
import { useState } from 'react'
import Link from 'next/link'
import StepThroughPanel from '../../_shared/StepThroughPanel'
import PracticePanel from '../../_shared/PracticePanel'
import { DIFFICULTY_LABEL, DIFFICULTY_EMOJI, getNextOpeningInPath, withArticle, type Opening } from '@/lib/chess/openings/data'
import styles from './OpeningDetail.module.scss'

export default function OpeningDetail({ opening }: { opening: Opening }) {
  const [mode, setMode] = useState<'learn' | 'practice'>('learn')
  const openingWithArticle = withArticle(opening.name)
  const completionSummary = opening.completionSummary ?? [
    'You played through every move.',
    `Now you know how ${openingWithArticle} works.`,
  ]
  const next = getNextOpeningInPath(opening.slug)

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <Link href="/chess/learn/openings" className={styles.breadcrumb}>
          ← Openings
        </Link>
        <h1 className={styles.heading}>{opening.name}</h1>
        <p className={styles.subtext}>{opening.description}</p>
      </section>

      <section className={styles.overview}>
        <div className={styles.bigIdea}>
          <p className={styles.overviewLabel}>Big Idea</p>
          {opening.bigIdea.map((line, i) => (
            <p key={i} className={styles.bigIdeaText}>
              {line}
            </p>
          ))}
        </div>

        <div className={styles.tags}>
          <span className={styles.tag}>Played by {opening.playedBy === 'white' ? 'White' : 'Black'}</span>
          <span className={`${styles.tag} ${styles[`tag_${opening.difficulty}`]}`}>
            {DIFFICULTY_EMOJI[opening.difficulty]} {DIFFICULTY_LABEL[opening.difficulty]}
          </span>
        </div>

        <div className={styles.prosConsGrid}>
          <div>
            <p className={styles.overviewLabel}>Good to Know</p>
            <ul className={`${styles.list} ${styles.listPros}`}>
              {opening.pros.map((pro, i) => (
                <li key={i}>{pro}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className={styles.overviewLabel}>Be Careful</p>
            <ul className={`${styles.list} ${styles.listCons}`}>
              {opening.cons.map((con, i) => (
                <li key={i}>{con}</li>
              ))}
            </ul>
          </div>
        </div>

        <div>
          <p className={styles.overviewLabel}>When to Play It</p>
          {opening.whenToPlay.map((line, i) => (
            <p key={i} className={styles.whenText}>
              {line}
            </p>
          ))}
        </div>
      </section>

      <div className={styles.layout}>
        {mode === 'learn' ? (
          <StepThroughPanel
            example={{
              moves: opening.moves,
              stepExplanations: opening.stepExplanations,
              startDescription: "Press Next to see White's first move.",
              stepHighlights: opening.stepHighlights,
              stepArrows: opening.stepArrows,
              stepReveal: opening.stepReveal,
              completionLabel: `You learned ${openingWithArticle}`,
              completionSummary,
            }}
            onPracticeClick={() => setMode('practice')}
          />
        ) : (
          <PracticePanel
            example={{
              openingName: opening.name,
              openingWithArticle,
              moves: opening.moves,
              learnerColor: opening.playedBy === 'white' ? 'w' : 'b',
              stepReveal: opening.stepReveal,
              completionSummary,
              nextOpening: next ? { slug: next.slug, name: next.name } : undefined,
            }}
            onBackToLearn={() => setMode('learn')}
          />
        )}
      </div>
    </main>
  )
}
