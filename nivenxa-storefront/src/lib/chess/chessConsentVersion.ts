// Split out of chessConsentActions.ts — a 'use server' file may only export
// async functions, not a plain constant.
//
// Bumped whenever the Privacy Policy changes in a way that needs fresh
// consent (see src/data/chessPrivacyPolicy.ts's "Changes to this policy").
export const CHESS_CONSENT_POLICY_VERSION = '2026-10-22-terms'
