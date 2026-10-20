import { getNivenxaHighlightTournament } from '@/lib/chess/tournaments'
import { seoMetadata } from '@/lib/seo'
import ChessLandingContent from './ChessLandingContent'

export const dynamic = 'force-dynamic' // reflect the latest admin-set Nivenxa-organized tournament, not a build-time snapshot

// Overrides chess/layout.tsx's subtree fallback with the exact route's own
// complete metadata — adds the canonical link and `og:url` that only belong
// on this one page, not the whole /chess subtree (see layout.tsx's comment).
export const metadata = seoMetadata({
  title: 'NIVENXA Chess — Play smarter. Every move explained.',
  description:
    'Chess that explains the reasoning behind every move. Adaptive engine, curated puzzles and plain-language coaching, from first game onward.',
  path: '/chess',
})

export default async function ChessPage() {
  const highlightTournament = await getNivenxaHighlightTournament()
  return <ChessLandingContent highlightTournament={highlightTournament} />
}
