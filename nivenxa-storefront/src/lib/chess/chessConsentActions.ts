'use server'
import { getSupabaseAdmin } from './supabase'
import { getChessSession } from './chessAuth'
import { CHESS_CONSENT_POLICY_VERSION } from './chessConsentVersion'

export type ChessAccountType = 'adult' | 'child'

/**
 * True once the signed-in user has a consent row on file for the CURRENT
 * policy version — false for a guest (no session), an account that
 * predates this feature, or one whose consent_policy_version is stale
 * (e.g. every account that consented before Terms of Use existed), so a
 * Terms/Privacy change that bumps CHESS_CONSENT_POLICY_VERSION makes
 * existing users see the consent step once more on their next login.
 */
export async function hasChessConsent(): Promise<boolean> {
  const session = await getChessSession()
  if (!session) return false
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('chess_profiles')
    .select('consent_policy_version')
    .eq('user_id', session.userId)
    .maybeSingle()
  if (error) {
    console.error('hasChessConsent: select failed —', error.message)
    return false
  }
  return data?.consent_policy_version === CHESS_CONSENT_POLICY_VERSION
}

/** Call only once a session exists (after a successful OTP verify) — records the account type and this exact moment as consentAt/consentPolicyVersion. */
export async function recordChessConsent(accountType: ChessAccountType): Promise<void> {
  const session = await getChessSession()
  if (!session) throw new Error('Not signed in')
  const supabase = getSupabaseAdmin()
  const { error } = await supabase.from('chess_profiles').upsert({
    user_id: session.userId,
    account_type: accountType,
    consent_at: new Date().toISOString(),
    consent_policy_version: CHESS_CONSENT_POLICY_VERSION,
  })
  if (error) throw new Error(`recordChessConsent: upsert failed — ${error.message}`)
}
