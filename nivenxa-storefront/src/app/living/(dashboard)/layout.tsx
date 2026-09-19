import { redirect } from 'next/navigation'
import { requireMembership } from '@/lib/living/auth'
import { createLivingServerClient } from '@/lib/living/supabaseServer'
import AppNav from './AppNav'
import SessionTimeout from './SessionTimeout'
import theme from '../LivingTheme.module.scss'

async function signOutAction() {
  'use server'
  const supabase = await createLivingServerClient()
  await supabase.auth.signOut()
  redirect('/living')
}

export default async function LivingAppLayout({ children }: { children: React.ReactNode }) {
  const { supabase, userId, membership, apartment } = await requireMembership()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <>
      <AppNav
        role={membership.role}
        apartmentName={apartment.name}
        onSignOut={signOutAction}
        userId={userId}
        email={user?.email ?? null}
      />
      <SessionTimeout onSignOut={signOutAction} />
      <div className={theme.pageShell}>{children}</div>
    </>
  )
}
