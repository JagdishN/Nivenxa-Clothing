'use server'
import { createLivingServerClient } from './supabaseServer'
import { LIVING_CONSENT_POLICY_VERSION } from './consentVersion'

/**
 * Records consent for the CURRENT session's own user — living_record_consent()
 * is SECURITY DEFINER and scoped to auth.uid() internally (see
 * supabase/migrations/20261022090100_living_consent.sql), which is what lets this run through
 * the normal RLS-governed client even for an Owner/Treasurer who can't
 * otherwise UPDATE their own living_memberships row directly.
 */
export async function recordLivingConsent(): Promise<void> {
  const supabase = await createLivingServerClient()
  const { error } = await supabase.rpc('living_record_consent', { p_policy_version: LIVING_CONSENT_POLICY_VERSION })
  if (error) throw new Error(`recordLivingConsent: rpc failed — ${error.message}`)
}
