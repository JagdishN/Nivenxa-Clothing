import { LEGAL_ENTITY } from '@/lib/legalEntity'
// Shared content shape for every policy-style page (Returns & Exchanges,
// Privacy Policy, and any future one — Terms of Service, Shipping, etc.).
// Each item's body is an ordered list of generic blocks rather than bespoke
// per-item props, since real policy copy mixes paragraphs, lists and
// sub-headings freely and in varying order; a generic renderer
// (PolicyAccordion.tsx) handles any arrangement without a code change.

export interface PolicyTextLink {
  /** Exact substring to turn into a link, wherever it appears in a paragraph or list item's text. */
  text: string
  /** Required unless `action` is set. */
  href?: string
  /**
   * When set, renders as a <button data-open-cookie-settings> instead of a
   * real <a href> — PolicyAccordion.tsx stays a plain, non-interactive
   * component; CookieConsentBanner.tsx (mounted once, client-side, in
   * Studio's shop layout) listens for clicks on that attribute globally.
   * The only value today is 'open-cookie-settings' (Studio's Privacy
   * Policy cookies section); Chess/Living never set this.
   */
  action?: 'open-cookie-settings'
}

export type PolicyBlock =
  | { type: 'paragraph'; text: string; links?: PolicyTextLink[] }
  | { type: 'list'; items: string[]; links?: PolicyTextLink[] }
  | { type: 'subheading'; text: string }

export interface PolicyItem {
  id: string
  title: string
  summary: string
  blocks: PolicyBlock[]
}

// Applied to every paragraph/list automatically, on top of any block-specific
// `links` — the support address shows up across several policy pages and
// should always be a mailto link without every data file re-declaring it.
export const DEFAULT_POLICY_LINKS: PolicyTextLink[] = [{ text: LEGAL_ENTITY.email, href: `mailto:${LEGAL_ENTITY.email}` }]
