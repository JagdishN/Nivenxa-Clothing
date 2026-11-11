/**
 * How a practice step was completed. Help is never penalised, but the lesson must describe truthfully what the
 * learner showed: a revealed answer is not independent mastery.
 *   independent — answered without hints or a demonstration (wrong attempts before that are fine)
 *   hint        — completed after a hint revealed where to look
 *   demo        — completed after Show Me demonstrated the answer
 *   retry       — first done with help, then done again independently on a fresh equivalent attempt
 */
export type Assist = 'independent' | 'hint' | 'demo' | 'retry'

export type StepResults = Record<number, Assist>

/** Which level of help a step used, given the hint tier it ended on (see feedbackCopy.hintTierFor): 0-1 none, 2 a revealed cue, 3 a demonstration. */
export function assistFromTier(tier: number): Assist {
  return tier >= 3 ? 'demo' : tier >= 2 ? 'hint' : 'independent'
}

/** True when this result shows the learner did the step themselves. */
export function isIndependent(a: Assist | undefined): boolean {
  return a === 'independent' || a === 'retry'
}

/** Keep the more informative result when a step is done again: an independent retry upgrades an assisted result, never the other way round. */
export function mergeResult(previous: Assist | undefined, next: Assist): Assist {
  if (!previous) return next
  if (isIndependent(previous)) return previous
  return next === 'independent' ? 'retry' : previous
}

export const ASSIST_LABEL: Record<Assist, string> = {
  independent: 'Done on your own',
  hint: 'Completed with a hint',
  demo: 'Completed with help',
  retry: 'Done on your own on a fresh try',
}

export interface AssistSummary {
  total: number
  independent: number
  withHelp: number
}

export function summarize(results: StepResults, practiceSteps: number[]): AssistSummary {
  let independent = 0
  let withHelp = 0
  for (const i of practiceSteps) {
    const r = results[i]
    if (!r) continue
    if (isIndependent(r)) independent += 1
    else withHelp += 1
  }
  return { total: practiceSteps.length, independent, withHelp }
}

/** Plain, supportive description of what the learner demonstrated. Never claims more than the recorded results show. */
export function describeSummary(s: AssistSummary): string {
  if (s.total === 0) return ''
  if (s.independent === s.total) return `You completed all ${s.total} practice steps on your own.`
  if (s.independent === 0 && s.withHelp === 0) return ''
  if (s.independent === 0) return `You finished all the practice steps with some help. That is a good way to learn. Use Practice again to try them on your own.`
  const unseen = s.total - s.independent - s.withHelp
  const base = `You did ${s.independent} of ${s.total} practice steps on your own and ${s.withHelp} with help.`
  return unseen > 0 ? `${base} Practice again to see the rest.` : `${base} Use Practice again to try the others on your own.`
}
