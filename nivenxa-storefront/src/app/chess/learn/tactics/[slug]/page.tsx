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

  return <TacticDetail tactic={tactic} />
}
