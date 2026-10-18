'use client'
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import Link from 'next/link'
import StepThroughPanel from '../../_shared/StepThroughPanel'
import TacticPuzzleSet from '../../_shared/TacticPuzzleSet'
import { TACTIC_DIFFICULTY_LABEL, TACTIC_DIFFICULTY_EMOJI, getNextTacticInPath, type Tactic } from '@/lib/chess/tactics/data'
import styles from './TacticDetail.module.scss'

// Matches $bp-lg in styles/_variables.scss — below this the layout stacks
// and scrolls normally (see StepThroughPanel.module.scss's max-lg rules,
// which clear the height cap entirely there), so there's nothing to measure.
const DESKTOP_BREAKPOINT = 1024
const BOTTOM_GUTTER = 20
const MIN_WORKSPACE_HEIGHT = 380

export default function TacticDetail({ tactic }: { tactic: Tactic }) {
  const [exampleIndex, setExampleIndex] = useState(0)
  const [mode, setMode] = useState<'learn' | 'practice'>('learn')
  const example = tactic.examples[exampleIndex]
  // Remembers how far each example tab was stepped through — StepThroughPanel
  // remounts (key={exampleIndex}) when switching tabs, since each example
  // has its own FEN/moves, but that shouldn't also forget an already-
  // finished example and force re-stepping through it to reach "Your Turn" again.
  const [stepByExample, setStepByExample] = useState<Record<number, number>>({})
  const next = getNextTacticInPath(tactic.slug)
  const nextCta = next ? { href: `/chess/learn/tactics/${next.slug}`, label: `Learn ${next.name} next →` } : undefined
  const hasPuzzles = tactic.puzzles && tactic.puzzles.length > 0 && tactic.prompt && tactic.wrongText && tactic.correctText
  // Practice's first puzzle continues the exact position Example 1
  // demonstrates (see data.ts) — reaching the end of a *different* example
  // (e.g. Hanging Pieces' Example 2, the contrasting case) shouldn't unlock
  // it on its own. Always false for the common single-example tactic, where
  // exampleIndex is always 0 anyway — zero behavior change for those.
  const example0Done = (stepByExample[0] ?? 0) === tactic.examples[0].moves.length
  const practiceLocked = exampleIndex !== 0 && !!hasPuzzles && !example0Done

  // The "board shouldn't run below the viewport" fix — measured rather than
  // guessed, same pattern as BasicsDetail.tsx: read the real vertical space
  // left below .layout's own top edge and write it as --learn-workspace-h,
  // which StepThroughPanel.module.scss's boardCol/panelCol now cap
  // themselves to (falling back to their old fixed sizing when this is
  // null, which is also what happens below the desktop breakpoint).
  const layoutRef = useRef<HTMLDivElement>(null)
  const [workspaceHeight, setWorkspaceHeight] = useState<number | null>(null)

  useEffect(() => {
    function measure() {
      if (!layoutRef.current || window.innerWidth < DESKTOP_BREAKPOINT) {
        setWorkspaceHeight(null)
        return
      }
      const top = layoutRef.current.getBoundingClientRect().top
      setWorkspaceHeight(Math.max(MIN_WORKSPACE_HEIGHT, window.innerHeight - top - BOTTOM_GUTTER))
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [tactic.slug, mode])

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

      <div
        ref={layoutRef}
        className={styles.layout}
        style={workspaceHeight ? ({ '--learn-workspace-h': `${workspaceHeight}px` } as CSSProperties) : undefined}
      >
        {mode === 'learn' ? (
          <StepThroughPanel
            key={exampleIndex}
            example={{
              fen: example.fen,
              moves: example.moves,
              stepExplanations: example.stepExplanations,
              stepReveal: example.stepReveal,
              stepHighlights: example.stepHighlights,
              stepArrows: example.stepArrows,
              // Never names the button's own label directly (it used to say
              // "Press Next" while the actual button reads "Show White's
              // first move →" — a real, confirmed mismatch) — this phrasing
              // stays true regardless of what StepThroughPanel's own
              // dynamically-computed label says.
              startDescription: 'Watch how this works, one move at a time.',
              completionLabel: practiceLocked
                ? '👀 Nice — one more thing'
                : hasPuzzles
                  ? 'You saw the idea'
                  : `🎉 You learned ${tactic.name}`,
              completionSummary: practiceLocked
                ? ['See Example 1 to unlock practice.']
                : hasPuzzles
                  ? ['Now it\'s your turn to try it yourself.']
                  : tactic.completionSummary,
            }}
            onPracticeClick={practiceLocked ? () => setExampleIndex(0) : hasPuzzles ? () => setMode('practice') : undefined}
            practiceCtaLabel={practiceLocked ? 'See Example 1 →' : 'Your Turn →'}
            nextCta={practiceLocked ? undefined : hasPuzzles ? undefined : nextCta}
            initialStep={stepByExample[exampleIndex] ?? 0}
            onStepChange={(s) => setStepByExample((prev) => ({ ...prev, [exampleIndex]: s }))}
            enableVoice
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
              completionSummary: tactic.completionSummary,
            }}
            nextCta={nextCta}
          />
        )}
      </div>
    </main>
  )
}
