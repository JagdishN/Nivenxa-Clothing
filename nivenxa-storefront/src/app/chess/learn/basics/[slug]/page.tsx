import { notFound } from 'next/navigation'
import { BASICS, getBasicsLesson } from '@/lib/chess/basics/data'
import BasicsDetail from './BasicsDetail'
import type { Metadata } from 'next'
import { seoMetadata } from '@/lib/seo'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const lesson = getBasicsLesson(slug)
  if (!lesson) return {}
  return seoMetadata({
    title: `${lesson.name} — Chess Basics | NIVENXA Chess`,
    description: lesson.description,
    path: `/chess/learn/basics/${slug}`,
  })
}

export function generateStaticParams() {
  return BASICS.map((b) => ({ slug: b.slug }))
}

export default async function ChessLearnBasicsDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const lesson = getBasicsLesson(slug)
  if (!lesson) notFound()

  return <BasicsDetail lesson={lesson} />
}
