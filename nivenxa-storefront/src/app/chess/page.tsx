import { getNivenxaHighlightTournament } from '@/lib/chess/tournaments'
import ChessLandingContent from './ChessLandingContent'

export const dynamic = 'force-dynamic' // reflect the latest admin-set Nivenxa-organized tournament, not a build-time snapshot

export default async function ChessPage() {
  const highlightTournament = await getNivenxaHighlightTournament()
  return <ChessLandingContent highlightTournament={highlightTournament} />
}
