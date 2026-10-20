'use client'
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import Link from 'next/link'
import StepThroughPanel from '../../_shared/StepThroughPanel'
import EndgamePuzzleSet from '../../_shared/EndgamePuzzleSet'
import { getNextEndgameInPath, type Endgame } from '@/lib/chess/endgames/data'
import styles from './EndgameDetail.module.scss'

// Mirrors TacticDetail.tsx's own constants/measuring logic — see that
// file's comments for why these specific numbers.
const DESKTOP_BREAKPOINT = 1024
const BOTTOM_GUTTER = 20
const MIN_WORKSPACE_HEIGHT = 460

export default function EndgameDetail({ endgame }: { endgame: Endgame }) {
  const [exampleIndex, setExampleIndex] = useState(0)
  const [mode, setMode] = useState<'learn' | 'practice'>('learn')
  const example = endgame.examples[exampleIndex]
  const [stepByExample, setStepByExample] = useState<Record<number, number>>({})
  const [hydrated, setHydrated] = useState(false)
  const progressKey = `chess-endgame-progress-${endgame.slug}`

  useEffect(() => {
    try {
      const stored = localStorage.getItem(progressKey)
      // eslint-disable-next-line react-hooks/set-state-in-effect -- unavoidable client-only hydration from localStorage, same established exception as TacticDetail.tsx's identical effect.
      if (stored) setStepByExample(JSON.parse(stored))
    } catch {
      // Private-mode/blocked storage, or corrupt stored JSON — start fresh.
    }
    setHydrated(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deliberately run once per endgame only; progressKey is derived from it.
  }, [endgame.slug])

  useEffect(() => {
    if (!hydrated) return
    try {
      localStorage.setItem(progressKey, JSON.stringify(stepByExample))
    } catch {
      // Private-mode/blocked storage — progress just won't persist.
    }
  }, [progressKey, stepByExample, hydrated])

  const next = getNextEndgameInPath(endgame.slug)
  const nextCta = next ? { href: `/chess/learn/endgames/${next.slug}`, label: `Learn ${next.name} next →` } : undefined
  const hasPuzzles = endgame.puzzles && endgame.puzzles.length > 0 && endgame.prompt && endgame.wrongText && endgame.correctText
  const anyExampleDone = endgame.examples.some((ex, i) => (stepByExample[i] ?? 0) === ex.moves.length)

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
  }, [endgame.slug, mode])

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <Link href="/chess/learn/endgames" className={styles.breadcrumb}>
          ← Back to Endgames
        </Link>
        <h1 className={styles.heading}>{endgame.name}</h1>
        <p className={styles.subtext}>{endgame.description}</p>
      </section>

      {mode === 'learn' && endgame.examples.length > 1 && (
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
              startDescription: example.startDescription ?? 'Watch how this works, one move at a time.',
              startHighlights: example.startHighlights,
              completionLabel: hasPuzzles ? 'You saw the idea' : `🎉 You learned ${endgame.name}`,
              completionSummary: hasPuzzles ? ["Now it's your turn to try it yourself."] : endgame.completionSummary,
            }}
            onPracticeClick={hasPuzzles ? () => setMode('practice') : undefined}
            practiceCtaLabel="Your Turn →"
            nextCta={hasPuzzles ? undefined : nextCta}
            initialStep={stepByExample[exampleIndex] ?? 0}
            onStepChange={(s) => setStepByExample((prev) => ({ ...prev, [exampleIndex]: s }))}
            enableVoice
            footer={
              (hasPuzzles ? anyExampleDone : true) ? (
                <Link href="/chess/learn/endgames" className={styles.practiceLink}>
                  Back to Endgames →
                </Link>
              ) : undefined
            }
          />
        ) : (
          <EndgamePuzzleSet
            example={{
              puzzles: endgame.puzzles!,
              prompt: endgame.prompt!,
              wrongText: endgame.wrongText!,
              correctText: endgame.correctText!,
              completionSummary: endgame.completionSummary,
            }}
            nextCta={nextCta}
          />
        )}
      </div>
    </main>
  )
}
