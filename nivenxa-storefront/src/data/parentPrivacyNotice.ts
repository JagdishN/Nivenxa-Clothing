// Typed content for /privacy — the parent nivenxa.com site and the
// Nivenxa Technologies pages. Same PolicyItem/PolicyBlock shape as every
// other privacy policy in this repo (from @/types/policy).
//
// Step 0 findings this content reflects:
//  - Neither the parent site (src/app/page.tsx) nor /technologies has a
//    contact form. Both use a plain `mailto:` link (opens the visitor's own
//    email client) and, on /technologies, a wa.me WhatsApp deep link. There
//    is no server-side form handler, database insert or third-party form
//    tool involved — nothing is submitted TO nivenxa.com at all, the
//    browser just opens the visitor's own email/WhatsApp app.
//  - No analytics or advertising scripts exist anywhere on these pages
//    (confirmed by a repo-wide search) — so the Cookies section below
//    states "essential only" as a fact, not an aspiration, and no cookie
//    banner is added here (Studio's cookie consent banner is scoped to
//    Studio only, per that task's own brief).
import type { PolicyItem } from '@/types/policy'
import { LEGAL_ENTITY, LEGAL_ENTITY_BUSINESS_BLOCK, LEGAL_ENTITY_GRIEVANCE_LINE } from '@/lib/legalEntity'

export const PARENT_PRIVACY_NOTICE: PolicyItem[] = [
  {
    id: 'collect',
    title: 'What we collect',
    summary: 'Only what you send us',
    blocks: [
      {
        type: 'list',
        items: [
          'If you email us: your name, email address and message.',
          'If you message us on WhatsApp: your name, phone number and message. WhatsApp is operated by Meta, and its own privacy policy applies to messages sent through it.',
          'Technical data: IP address, device and browser type, and server logs, to keep the site secure.',
        ],
      },
    ],
  },
  {
    id: 'use',
    title: 'How we use it',
    summary: 'To reply and to work with you',
    blocks: [
      {
        type: 'paragraph',
        text: "To respond to your enquiry, discuss and prepare proposals, and keep the site secure. We don't send marketing emails unless you ask us to.",
      },
    ],
  },
  {
    id: 'clients',
    title: 'Client projects',
    summary: 'Covered by our client agreements',
    blocks: [
      {
        type: 'paragraph',
        text: "When Nivenxa Technologies builds or runs software for clients, we handle any personal data in those projects under our agreements with each client and their instructions. This notice does not cover that data.",
      },
    ],
  },
  {
    id: 'sharing',
    title: 'Who we share it with',
    summary: 'Only providers that run the site. Never sold.',
    blocks: [
      {
        type: 'paragraph',
        text: "We use hosting providers to run this site. An email or WhatsApp enquiry you send us goes directly through your own email client or WhatsApp account — we don't route it through a separate form tool or email-sending service. We share personal data only with authorities where required by law.",
      },
      { type: 'paragraph', text: 'We do not sell or rent personal data.' },
    ],
  },
  {
    id: 'retention',
    title: 'How long we keep it',
    summary: 'No longer than needed',
    blocks: [
      {
        type: 'paragraph',
        text: 'We keep enquiries for up to 24 months, unless they lead to a client relationship, in which case our agreement applies.',
      },
    ],
  },
  {
    id: 'rights',
    title: 'Your rights',
    summary: 'Access, correct, erase',
    blocks: [
      {
        type: 'paragraph',
        text: `You can ask to access, correct or erase your personal data, withdraw consent, raise a grievance, or nominate someone to exercise these rights for you. Email ${LEGAL_ENTITY.email}. If you're not satisfied with our response, you may complain to the Data Protection Board of India.`,
      },
    ],
  },
  {
    id: 'cookies',
    title: 'Cookies',
    summary: 'Essential only',
    blocks: [
      {
        type: 'paragraph',
        text: 'These pages use only essential cookies. We do not use analytics or advertising cookies here.',
      },
    ],
  },
  {
    id: 'changes',
    title: 'Changes',
    summary: 'Updated when needed',
    blocks: [
      { type: 'paragraph', text: "We'll update the date above when this notice changes." },
    ],
  },
  {
    id: 'contact',
    title: 'Contact & Grievance Officer',
    summary: 'Who to write to',
    blocks: [
      { type: 'paragraph', text: LEGAL_ENTITY_GRIEVANCE_LINE },
      { type: 'paragraph', text: LEGAL_ENTITY_BUSINESS_BLOCK },
    ],
  },
]
