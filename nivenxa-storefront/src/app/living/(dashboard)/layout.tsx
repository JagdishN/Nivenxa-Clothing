import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { requireMembership } from '@/lib/living/auth'
import { createLivingServerClient } from '@/lib/living/supabaseServer'
import AppNav from './AppNav'
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
  await supabase.auth.signOut()
  redirect('/living')
}

export default async function LivingAppLayout({ children }: { children: React.ReactNode }) {
  const { userId, email, membership, apartment } = await requireMembership()

  return (
    <>
      <AppNav
        role={membership.role}
        apartmentName={apartment.name}
        onSignOut={signOutAction}
        userId={userId}
        email={email}
      />
      <SessionTimeout onSignOut={signOutAction} />
      <div className={theme.pageShell}>{children}</div>
    </>
  )
}
