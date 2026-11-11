import { notFound } from 'next/navigation'
import { PUZZLE_THEMES } from '@/lib/chess/puzzleThemes'

// Validates the topic slug BEFORE the page's loading boundary starts streaming. Once a loading.tsx
// fallback has been sent, the response status is already 200, so an unknown slug checked inside
// page.tsx could no longer return a real 404. This check is pure (no database), so it costs nothing.
export default async function PuzzleThemeLayout({ children, params }: { children: React.ReactNode; params: Promise<{ theme: string }> }) {
  const { theme } = await params
  if (!(PUZZLE_THEMES as readonly string[]).includes(theme)) notFound()
  return children
}
