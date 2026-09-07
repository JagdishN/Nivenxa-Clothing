import { redirect } from 'next/navigation'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createLivingServerClient } from './supabaseServer'
import type { Apartment, LivingRole, Membership } from './types'

export interface LivingSession {
  userId: string
  email: string | null
  phone: string | null
}

/** Read-only session check — does NOT redirect. Used by the public pages (landing/login/signup). */
export async function getLivingSession(): Promise<LivingSession | null> {
  const supabase = await createLivingServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  return { userId: user.id, email: user.email ?? null, phone: user.phone ?? null }
}

export interface LivingContext {
  supabase: SupabaseClient
  userId: string
  membership: Membership
  apartment: Apartment
}

/**
 * Guard for every page under (app): no session -> /living/login; a session
 * with no membership yet (mid-signup, or a rejected/pending claim) ->
 * /living/signup; a membership whose role isn't in `allowedRoles` -> back to
 * the app's own home rather than a dead end. This is the single place that
 * enforces "you need to be signed in AND belong to an apartment" — every
 * (app) page calls it instead of re-deriving the check.
 */
export async function requireMembership(allowedRoles?: LivingRole[]): Promise<LivingContext> {
  const supabase = await createLivingServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/living/login')

  const { data: membership } = await supabase.from('living_memberships').select('*').eq('user_id', user.id).maybeSingle<Membership>()
  if (!membership) redirect('/living/signup')

  if (allowedRoles && !allowedRoles.includes(membership.role)) redirect('/living/app')

  const { data: apartment } = await supabase
    .from('living_apartments')
    .select('*')
    .eq('id', membership.apartment_id)
    .single<Apartment>()
  if (!apartment) redirect('/living/login')

  return { supabase, userId: user.id, membership, apartment }
}

/**
 * Same membership check as requireMembership(), but returns null instead of
 * redirecting — redirect() only makes sense from a page/Server Action, not
 * a Route Handler, which needs to answer with a Response either way. Used
 * by API routes (e.g. the reading-sheet vision extraction endpoint) that
 * aren't rendering a page.
 */
export async function getLivingMembership(allowedRoles?: LivingRole[]): Promise<LivingContext | null> {
  const supabase = await createLivingServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: membership } = await supabase.from('living_memberships').select('*').eq('user_id', user.id).maybeSingle<Membership>()
  if (!membership) return null
  if (allowedRoles && !allowedRoles.includes(membership.role)) return null

  const { data: apartment } = await supabase.from('living_apartments').select('*').eq('id', membership.apartment_id).single<Apartment>()
  if (!apartment) return null

  return { supabase, userId: user.id, membership, apartment }
}
