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
// Floor for the measured workspace height, which the board's width is
// capped to (see StepThroughPanel.module.scss's .boardCol) — raised from
// 380 so a tactic with the extra Example-tabs row above (today, only
// Hanging Pieces) still gets a reasonably sized board even though that row
// eats into the measured available space.
const MIN_WORKSPACE_HEIGHT = 460

export default function TacticDetail({ tactic }: { tactic: Tactic }) {
  const [exampleIndex, setExampleIndex] = useState(0)
  const [mode, setMode] = useState<'learn' | 'practice'>('learn')
  const example = tactic.examples[exampleIndex]
  // Remembers how far each example tab was stepped through — StepThroughPanel
  // remounts (key={exampleIndex}) when switching tabs, since each example
  // has its own FEN/moves, but that shouldn't also forget an already-
  // finished example and force re-stepping through it to reach "Your Turn" again.
  // Persisted to localStorage (per tactic) so a reload doesn't lose it either.
  const [stepByExample, setStepByExample] = useState<Record<number, number>>({})
  // Guards the persist effect below from firing (and clobbering the saved
  // value with the still-empty initial state) before hydration has read it.
  const [hydrated, setHydrated] = useState(false)
  const progressKey = `chess-tactic-progress-${tactic.slug}`

  // Deliberately an effect, not a lazy useState initializer — localStorage
  // doesn't exist during SSR, so hydrating after mount is what keeps the
  // first client render matching the server-rendered markup (same reasoning
  // as useLessonVoice.ts's muted/rate hydration).
  useEffect(() => {
    try {
      const stored = localStorage.getItem(progressKey)
      // eslint-disable-next-line react-hooks/set-state-in-effect -- unavoidable client-only hydration from localStorage, same established exception as useLessonVoice.ts's muted/rate hydration; restructuring this away would reintroduce an SSR hydration mismatch.
      if (stored) setStepByExample(JSON.parse(stored))
    } catch {
      // Private-mode/blocked storage, or corrupt stored JSON — start fresh.
    }
    setHydrated(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deliberately run once per tactic only; progressKey is derived from it.
  }, [tactic.slug])

  useEffect(() => {
    if (!hydrated) return
    try {
      localStorage.setItem(progressKey, JSON.stringify(stepByExample))
    } catch {
      // Private-mode/blocked storage — progress just won't persist.
    }
  }, [progressKey, stepByExample, hydrated])
  const next = getNextTacticInPath(tactic.slug)
  const nextCta = next ? { href: `/chess/learn/tactics/${next.slug}`, label: `Learn ${next.name} next →` } : undefined
  const hasPuzzles = tactic.puzzles && tactic.puzzles.length > 0 && tactic.prompt && tactic.wrongText && tactic.correctText
  // Practice unlocks once at least one example has been stepped through to
  // the end — for the common single-example tactic this is already implicit
  // (StepThroughPanel only shows its completion block, "Your Turn" button
  // included, once that one example reaches its last move); this only
  // matters for a tactic with more than one example (today, just Hanging
  // Pieces), where finishing either one counts.
  const anyExampleDone = tactic.examples.some((ex, i) => (stepByExample[i] ?? 0) === ex.moves.length)

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
          {tactic.examples.map((ex, i) => (
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
              // Never names the button's own label directly (it used to say
              // "Press Next" while the actual button reads "Show White's
              // first move →" — a real, confirmed mismatch) — this phrasing
              // stays true regardless of what StepThroughPanel's own
              // dynamically-computed label says. A tactic can override this
              // (Pins does, to teach what's already on the board — the pin
              // itself — before the first move plays).
              startDescription: example.startDescription ?? 'Watch how this works, one move at a time.',
              startHighlights: example.startHighlights,
              completionLabel: hasPuzzles ? 'You saw the idea' : `🎉 You learned ${tactic.name}`,
              completionSummary: hasPuzzles ? ['Now it\'s your turn to try it yourself.'] : tactic.completionSummary,
            }}
            onPracticeClick={hasPuzzles ? () => setMode('practice') : undefined}
            practiceCtaLabel="Your Turn →"
            nextCta={hasPuzzles ? undefined : nextCta}
            initialStep={stepByExample[exampleIndex] ?? 0}
            onStepChange={(s) => setStepByExample((prev) => ({ ...prev, [exampleIndex]: s }))}
            enableVoice
            // Shown once at least one example is done — before that it's a
            // second "practice puzzles" link sitting on screen before the
            // learner has seen anything worth practicing yet.
            footer={
              (hasPuzzles ? anyExampleDone : true) ? (
                <Link href="/chess/puzzles" className={styles.practiceLink}>
                  Practice {tactic.name} puzzles →
                </Link>
              ) : undefined
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
