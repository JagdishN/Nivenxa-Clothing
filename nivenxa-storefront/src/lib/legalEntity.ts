// Single source of truth for NIVENXA's business/legal details — the brief
// asked for `packages/config/legalEntity.ts`, but this repo is a single
// Next.js app, not a Turborepo (no turbo.json, no root package.json; see
// netlify.toml/vercel.json, both pointed at nivenxa-storefront/ directly),
// so this lives alongside every other shared `src/lib` module instead.
//
// Every policy page, contact page, footer and product detail block that
// used to hardcode these values (address, GSTIN, Grievance Officer, support
// contact) should import from here instead, so a future change only
// happens in one place.
export const LEGAL_ENTITY = {
  name: 'NIVENXA',
  entityType: 'Partnership Firm',
  addressLines: ['Flat No. 504, Aniela Prime Apartments', 'Pragathi Nagar, Hyderabad', 'Telangana – 500090, India'],
  email: 'care@nivenxa.com',
  phone: '+91 7416 996 665',
  phoneTel: 'tel:+917416996665',
  /** Digits only, for https://wa.me/<number> — the same number as `phone`. */
  whatsapp: '917416996665',
  grievanceOfficer: 'N.Jagdish',
  gstin: '36AAXFN9353Q1ZW',
  grievanceAck: '48 hours',
  grievanceResolve: 'one month',
} as const

/** "NIVENXA (Partnership Firm)\n<address line 1>\n<address line 2>\n<address line 3>" */
export const LEGAL_ENTITY_NAME_AND_ADDRESS = `${LEGAL_ENTITY.name} (${LEGAL_ENTITY.entityType})\n${LEGAL_ENTITY.addressLines.join('\n')}`

/** Same, with lines joined by ", " instead of "\n" — for inline prose rather than a <br>-separated block. */
export const LEGAL_ENTITY_ADDRESS_INLINE = LEGAL_ENTITY.addressLines.join(', ')

/** "Grievance Officer: …\nEmail: …\nPhone: …" — the line Studio/Chess/Living's Privacy "Contact" item and the Contact page's Grievance Officer card both render. */
export const LEGAL_ENTITY_GRIEVANCE_LINE = `Grievance Officer: ${LEGAL_ENTITY.grievanceOfficer}\nEmail: ${LEGAL_ENTITY.email}\nPhone: ${LEGAL_ENTITY.phone}`

/** "We acknowledge every grievance within 48 hours and aim to resolve it within one month." */
export const LEGAL_ENTITY_GRIEVANCE_SLA = `We acknowledge every grievance within ${LEGAL_ENTITY.grievanceAck} and aim to resolve it within ${LEGAL_ENTITY.grievanceResolve}.`

/** "NIVENXA (Partnership Firm)\n<address>\nGSTIN: …" — the full business-details block used at the end of every Privacy Policy's "Contact & Grievance Officer" item. */
export const LEGAL_ENTITY_BUSINESS_BLOCK = `${LEGAL_ENTITY_NAME_AND_ADDRESS}\nGSTIN: ${LEGAL_ENTITY.gstin}`

/** https://wa.me/<number> link (the same number as `phone`), optionally with a prefilled message. */
export const legalEntityWhatsAppLink = (message?: string) =>
  `https://wa.me/${LEGAL_ENTITY.whatsapp}${message ? `?text=${encodeURIComponent(message)}` : ''}`
