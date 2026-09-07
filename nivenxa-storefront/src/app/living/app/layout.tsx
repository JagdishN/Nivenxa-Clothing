import { redirect } from 'next/navigation'
import { requireMembership } from '@/lib/living/auth'
import { createLivingServerClient } from '@/lib/living/supabaseServer'
import AppNav from './AppNav'
import theme from '../LivingTheme.module.scss'

async function signOutAction() {
  'use server'
  const supabase = await createLivingServerClient()
  await supabase.auth.signOut()
  redirect('/living')
}

export default async function LivingAppLayout({ children }: { children: React.ReactNode }) {
  const { membership, apartment } = await requireMembership()

  return (
    <>
      <AppNav role={membership.role} apartmentName={apartment.name} onSignOut={signOutAction} />
      <div className={theme.pageShell}>{children}</div>
    </>
  )
}
