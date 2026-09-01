import { notFound } from 'next/navigation'
import { RULES, getRule } from '@/lib/chess/rules/data'
import RuleDetail from './RuleDetail'

export function generateStaticParams() {
  return RULES.map((r) => ({ slug: r.slug }))
}

export default async function ChessLearnRuleDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const rule = getRule(slug)
  if (!rule) notFound()

  return <RuleDetail rule={rule} />
}
