// Bumped whenever the Privacy Policy changes in a way that needs fresh
// consent (see src/data/livingPrivacyPolicy.ts's "Changes to this policy").
// Kept out of consentActions.ts because a 'use server' file may only export
// async functions, not a plain constant.
export const LIVING_CONSENT_POLICY_VERSION = '2026-10-22-terms'
