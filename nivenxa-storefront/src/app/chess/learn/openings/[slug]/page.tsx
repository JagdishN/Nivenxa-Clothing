import { notFound } from 'next/navigation'
import { OPENINGS, getOpening } from '@/lib/chess/openings/data'
import OpeningDetail from './OpeningDetail'

export function generateStaticParams() {
  return OPENINGS.map((o) => ({ slug: o.slug }))
}

export default async function ChessLearnOpeningDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const opening = getOpening(slug)
  if (!opening) notFound()

  return <OpeningDetail opening={opening} />
}
