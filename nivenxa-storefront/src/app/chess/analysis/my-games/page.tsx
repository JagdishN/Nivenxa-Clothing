import { redirect } from 'next/navigation'

// Old bookmark. "My Games" here was the list of SAVED ANALYSES, which now lives under My Activity → My Analyses
// (My Activity → My Games is the games you played). The old filter values carry over.
export default async function OldMyGames({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const { filter } = await searchParams
  const map: Record<string, string> = { analyzed: 'analysed', 'not-analyzed': 'not-analysed' }
  const f = filter ? map[filter] : undefined
  redirect(`/chess/activity/analyses${f ? `?filter=${f}` : ''}`)
}
