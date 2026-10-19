import { notFound } from 'next/navigation'
import { TACTICS, getTactic } from '@/lib/chess/tactics/data'
import TacticDetail from './TacticDetail'

export function generateStaticParams() {
  return TACTICS.map((t) => ({ slug: t.slug }))
}

export default async function ChessLearnTacticDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const tactic = getTactic(slug)
  if (!tactic) notFound()

  // `key={tactic.slug}` forces a full remount on every tactic switch.
  // Without it, navigating tactic-to-tactic (e.g. the "Learn X next →" link
  // after finishing practice) keeps the SAME TacticDetail instance mounted —
  // React sees the same component type at the same tree position and just
  // updates props, so `exampleIndex`/`mode`/`stepByExample`, and everything
  // inside StepThroughPanel/TacticPuzzleSet (`step`, `started`,
  // `introAcknowledged`, `playing`, hint tiers...) all carry over from the
  // PREVIOUS tactic. That's how a tab labelled "Capture" can end up showing
  // text that belongs to a different example/tactic's step — the leftover
  // internal state and the new tactic's data disagree about what step
  // they're both supposed to be describing.
  return <TacticDetail key={tactic.slug} tactic={tactic} />
}
