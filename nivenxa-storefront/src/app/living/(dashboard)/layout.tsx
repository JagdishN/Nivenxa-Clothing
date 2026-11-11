import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { requireMembership } from '@/lib/living/auth'
import { createLivingServerClient } from '@/lib/living/supabaseServer'
import { setLivingFlash, setLivingNotice } from '@/lib/living/flash'
import AppNav from './AppNav'
import PageShell from '@/components/global/PageShell'
import AppFooter from '@/components/global/AppFooter/AppFooter'
import SessionTimeout from './SessionTimeout'
import theme from '../LivingTheme.module.scss'

// One noindex for the whole member-only dashboard subtree (24 routes) rather
// than one per page — every one of them requires `requireMembership()`
// above and is private, per-apartment data. follow: false too: there's
// nothing on these pages worth a crawler following onward into (internal
// nav only). This layout wraps only the (dashboard) route group — NOT
// living/page.tsx or living/layout.tsx, which stay indexable.
export const metadata: Metadata = { robots: { index: false, follow: false } }

async function signOutAction() {
  'use server'
  const supabase = await createLivingServerClient()
  const { error } = await supabase.auth.signOut()
  if (error) {
    // Still signed in: say so (a confirmation here would be false) and stay inside the app.
    await setLivingFlash('error', "We couldn't sign you out. Check your connection and try again.")
    redirect('/living/home')
  }
  await setLivingNotice("You've been signed out.")
  redirect('/living')
}

export default async function LivingAppLayout({ children }: { children: React.ReactNode }) {
  const { userId, email, membership, apartment } = await requireMembership()

  return (
    // The slim footer sits after the page content in normal flow (and is hidden when printing).
    <PageShell
      header={
        <>
          <AppNav
            role={membership.role}
            apartmentName={apartment.name}
            onSignOut={signOutAction}
            userId={userId}
            email={email}
          />
          <SessionTimeout onSignOut={signOutAction} />
        </>
      }
      footer={<AppFooter app="living" wide />}
    >
      <div className={theme.pageShell}>{children}</div>
    </PageShell>
  )
}
