import { getHomeTournamentCard } from '@/lib/chess/tournaments'
import { todayInEventZone } from '@/lib/chess/tournamentFormat'
import { seoMetadata } from '@/lib/seo'
import { Suspense } from 'react'
import { safeChessRedirectPath } from '@/lib/auth/safeRedirect'
import { AuthAutoOpen, SignedOutNotice } from '../_auth/ChessAuthProvider'
import ChessLandingContent from '../ChessLandingContent'
import UpcomingTournamentCard from '../UpcomingTournamentCard'
import styles from '../Chess.module.scss'

export const dynamic = 'force-dynamic' // reflect the latest admin-set Nivenxa-organized tournament and today's date, not a build-time snapshot

// Overrides chess/layout.tsx's subtree fallback with the exact route's own
// complete metadata — adds the canonical link and `og:url` that only belong
// on this one page, not the whole /chess subtree (see layout.tsx's comment).
export const metadata = seoMetadata({
  title: 'NIVENXA Chess — Play smarter. Learn why, not just what.',
  description:
    'Chess that teaches as you play. An adaptive engine with plain-language coaching that steps back as you improve, plus curated puzzles with hints and explained solutions.',
  path: '/chess',
})

// The event strip is the only part that needs the database. It streams in on its own so the hero text and the
// Start playing / Try a puzzle actions render immediately instead of waiting for the query.
async function UpcomingTournament() {
  const card = await getHomeTournamentCard()
  return card ? <UpcomingTournamentCard data={card} today={todayInEventZone()} /> : null
}

export default async function ChessPage({ searchParams }: { searchParams: Promise<{ auth?: string; redirect?: string; signed_out?: string }> }) {
  const { auth, redirect: redirectParam, signed_out: signedOut } = await searchParams
  const authMode = auth === 'login' || auth === 'signup' ? auth : null
  return (
    <>
      {authMode && <AuthAutoOpen mode={authMode} redirectTo={safeChessRedirectPath(redirectParam)} />}
      {signedOut === '1' && <SignedOutNotice />}
      <ChessLandingContent
        tournamentSlot={
          <Suspense fallback={<div className={styles.tCardPlaceholder} aria-hidden="true" />}>
            <UpcomingTournament />
          </Suspense>
        }
      />
    </>
  )
}
