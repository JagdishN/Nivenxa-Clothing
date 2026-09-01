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

  return <EndgameDetail endgame={endgame} />
}
