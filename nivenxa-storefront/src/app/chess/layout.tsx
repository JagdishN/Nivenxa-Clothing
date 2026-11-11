import { seoMetadata } from '@/lib/seo'
import AppFooter from '@/components/global/AppFooter/AppFooter'
import PageShell from '@/components/global/PageShell'
import ChessNav from './ChessNav'
import ChessAuthProvider from './_auth/ChessAuthProvider'
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
  title: 'NIVENXA Chess — Play smarter. Learn why, not just what.',
  description:
    'Chess that teaches as you play. An adaptive engine with plain-language coaching that steps back as you improve, plus curated puzzles with hints and explained solutions.',
})

export default function ChessLayout({ children }: { children: React.ReactNode }) {
  return (
    // PageShell keeps the footer at the viewport bottom on a short page and
    // directly after the content on a long one. It stays a sibling AFTER the
    // page content, never inside it: Play's own wrapper (Play.module.scss
    // .page) is a fixed full-viewport board layout marked `data-full-viewport`,
    // and keeping the footer outside means it can never be clipped by it or
    // squeeze the board — it sits below the fold past the board, like any
    // other page's footer.
    <ChessAuthProvider>
    <PageShell
      className={theme.theme}
      contentClassName={theme.shellContent}
      header={
        <>
          <ChessNav />
          <ChessSessionTimeout />
        </>
      }
      footer={<AppFooter app="chess" />}
    >
      {children}
    </PageShell>
    </ChessAuthProvider>
  )
}
