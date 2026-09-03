import { notFound } from 'next/navigation'
import { BASICS, getBasicsLesson } from '@/lib/chess/basics/data'
import BasicsDetail from './BasicsDetail'

export function generateStaticParams() {
  return BASICS.map((b) => ({ slug: b.slug }))
}

export default async function ChessLearnBasicsDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const lesson = getBasicsLesson(slug)
  if (!lesson) notFound()

  return <BasicsDetail lesson={lesson} />
}
