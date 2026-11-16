import { notFound } from 'next/navigation'
import { RULES, getRule } from '@/lib/chess/rules/data'
import RuleDetail from './RuleDetail'
import type { Metadata } from 'next'
import { seoMetadata } from '@/lib/seo'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const rule = getRule(slug)
  if (!rule) return {}
  return seoMetadata({
    title: `${rule.name} — Chess Rules | NIVENXA Chess`,
    description: rule.description,
    path: `/chess/learn/rules/${slug}`,
  })
}

export function generateStaticParams() {
  return RULES.map((r) => ({ slug: r.slug }))
}

export default async function ChessLearnRuleDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const rule = getRule(slug)
  if (!rule) notFound()

  return <RuleDetail rule={rule} />
}
