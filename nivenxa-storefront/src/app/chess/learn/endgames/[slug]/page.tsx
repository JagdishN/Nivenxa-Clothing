import { notFound } from 'next/navigation'
import { ENDGAMES, getEndgame } from '@/lib/chess/endgames/data'
import EndgameDetail from './EndgameDetail'
import type { Metadata } from 'next'
import { seoMetadata } from '@/lib/seo'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const endgame = getEndgame(slug)
  if (!endgame) return {}
  return seoMetadata({
    title: `${endgame.name} — Chess Endgames | NIVENXA Chess`,
    description: endgame.description,
    path: `/chess/learn/endgames/${slug}`,
  })
}

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
