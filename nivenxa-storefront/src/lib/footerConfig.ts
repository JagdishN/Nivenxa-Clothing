import { LEGAL_ENTITY } from './legalEntity'

// Single source for the NIVENXA app footers (Chess, Living, Technologies). Studio is deliberately NOT here: it keeps
// the original shared SiteFooter. Every route below already exists; contact is the one address in legalEntity.ts.

export type FooterApp = 'chess' | 'living' | 'technologies'

export interface FooterLink {
  label: string
  href: string
}

export interface AppFooterConfig {
  name: string
  /** Name without the NIVENXA prefix, and what kind of thing it is within NIVENXA — for the footer's context line. */
  short: string
  kind: 'app' | 'brand'
  /** One short line, taken from the app's own existing page description. */
  description: string
  /** Legal links specific to this app. Technologies uses the parent-site notices (that is where its privacy notice lives). */
  contact: FooterLink
  privacy: FooterLink
  terms: FooterLink
}

const EMAIL_CONTACT: FooterLink = { label: 'Contact', href: `mailto:${LEGAL_ENTITY.email}` }

export const APP_FOOTERS: Record<FooterApp, AppFooterConfig> = {
  chess: {
    name: 'NIVENXA Chess',
    short: 'Chess',
    kind: 'app',
    description: 'Play, learn and practise chess with plain-language coaching.',
    contact: EMAIL_CONTACT,
    privacy: { label: 'Privacy Policy', href: '/chess/privacy' },
    terms: { label: 'Terms of Use', href: '/chess/terms' },
  },
  living: {
    name: 'NIVENXA Living',
    short: 'Living',
    kind: 'app',
    description: 'Maintenance, water billing and collections for standalone apartments.',
    contact: EMAIL_CONTACT,
    privacy: { label: 'Privacy Policy', href: '/living/privacy' },
    terms: { label: 'Terms of Use', href: '/living/terms' },
  },
  technologies: {
    name: 'NIVENXA Technologies',
    short: 'Technologies',
    kind: 'brand',
    description: 'Senior engineers building business software and AI-enabled systems.',
    contact: { label: 'Contact', href: '/contact' },
    privacy: { label: 'Privacy Policy', href: '/privacy' },
    terms: { label: 'Terms of Use', href: '/terms' },
  },
}

/** The two NIVENXA brands (Studio is a destination only — its pages are untouched) and the two apps, kept as separate groups. */
export const BRAND_LINKS: FooterLink[] = [
  { label: 'NIVENXA Studio', href: '/studio/en' },
  { label: 'NIVENXA Technologies', href: '/technologies' },
]

export const APP_LINKS: FooterLink[] = [
  { label: 'NIVENXA Chess', href: '/chess' },
  { label: 'NIVENXA Living', href: '/living' },
]

/** Parent identity, worded from the site's existing root description (premium Indian comfortwear + software, Hyderabad). */
export const PARENT_DESCRIPTION =
  'Independent ventures built with intention: premium Indian comfortwear and software.'

export function footerCopyright(now: Date = new Date()): string {
  return `© ${now.getFullYear()} NIVENXA · Hyderabad, India`
}
