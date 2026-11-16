import { notFound } from 'next/navigation'
import { OPENINGS, getOpening } from '@/lib/chess/openings/data'
import OpeningDetail from './OpeningDetail'
import type { Metadata } from 'next'
import { seoMetadata } from '@/lib/seo'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const opening = getOpening(slug)
  if (!opening) return {}
  return seoMetadata({
    title: `${opening.name} — Chess Openings | NIVENXA Chess`,
    description: `${opening.name}: ${opening.description}`,
    path: `/chess/learn/openings/${slug}`,
  })
}

export function generateStaticParams() {
  return OPENINGS.map((o) => ({ slug: o.slug }))
}

export default async function ChessLearnOpeningDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const opening = getOpening(slug)
  if (!opening) notFound()

  return <OpeningDetail opening={opening} />
}
