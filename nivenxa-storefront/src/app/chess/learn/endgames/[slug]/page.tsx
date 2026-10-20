import { notFound } from 'next/navigation'
import { ENDGAMES, getEndgame } from '@/lib/chess/endgames/data'
import EndgameDetail from './EndgameDetail'

export function generateStaticParams() {
  return ENDGAMES.map((e) => ({ slug: e.slug }))
}

export default async function ChessLearnEndgameDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const endgame = getEndgame(slug)
  if (!endgame) notFound()

  // key={endgame.slug} forces a full remount on every endgame switch — same
  // fix applied to the Tactics detail route this session, pre-empted here
  // before EndgameDetail grows the same per-instance state (mode,
  // stepByExample) that made the bug observable there.
  return <EndgameDetail key={endgame.slug} endgame={endgame} />
}
