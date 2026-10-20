import { seoMetadata } from '@/lib/seo'
import ChessNav from './ChessNav'
import ChessSessionTimeout from './ChessSessionTimeout'
import theme from './ChessTheme.module.scss'

// THE BUG this fixed: nothing under /chess defined its own metadata before
// this, so every chess route — not just the /chess landing page — silently
// inherited the root layout's clothing-brand title/description. This is the
// fallback for the whole subtree (/chess/learn/*, /chess/play, /chess/
// puzzles, …), all of which are real, publicly indexable pages that
// deserve better than the old comfortwear copy even without their own
// dedicated metadata yet. No `path` here on purpose — see seo.ts: a
// canonical/og:url is wrong when shared across many different real URLs.
// chess/page.tsx (the exact /chess route) sets its own complete metadata,
// including `path`, which fully overrides this at that one route.
export const metadata = seoMetadata({
  title: 'NIVENXA Chess — Play smarter. Every move explained.',
  description:
    'Chess that explains the reasoning behind every move. Adaptive engine, curated puzzles and plain-language coaching, from first game onward.',
})

export default function ChessLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={theme.theme}>
      <ChessNav />
      <ChessSessionTimeout />
      {children}
    </div>
  )
}
