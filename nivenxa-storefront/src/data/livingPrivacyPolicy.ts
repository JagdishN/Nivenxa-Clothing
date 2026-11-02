// Typed content for /living/privacy — same PolicyItem/PolicyBlock shape as
// returnsPolicy.ts/privacyPolicy.ts/chessPrivacyPolicy.ts (from
// @/types/policy), rendered by the same shared PolicyAccordion.
//
// Adjusted from the original brief against what src/lib/living/types.ts and
// supabase/living_schema.sql actually implement (Step 0 findings — see the
// task summary for the full list):
//  - LivingRole is 'admin' | 'treasurer' | 'owner' only — no 'tenant' role,
//    no "custom role". living_flats has owner_name/owner_contact only, no
//    tenant_name/tenant_contact columns. Every "tenant"/"custom role"
//    mention in the original copy is removed or reworded to the real
//    three-role model.
//  - Only ONE AI feature exists: reading-sheet photo extraction
//    (src/app/api/living/extract-readings/route.ts, Anthropic). The route
//    receives the image only; nothing from the database reaches the model,
//    and the photo is not stored by the App (it is previewed in the browser
//    and sent for extraction) — the "ai" item below says exactly that.
//
// Grievance Officer, GSTIN, address and support contact all come from
// @/lib/legalEntity (the single source of truth for business details) —
// same values as Studio's and Chess's privacy content
// (src/data/privacyPolicy.ts, chessPrivacyPolicy.ts).
//
import type { PolicyItem } from '@/types/policy'
import { LEGAL_ENTITY, LEGAL_ENTITY_BUSINESS_BLOCK, LEGAL_ENTITY_GRIEVANCE_LINE, LEGAL_ENTITY_GRIEVANCE_SLA } from '@/lib/legalEntity'

export const LIVING_PRIVACY_POLICY: PolicyItem[] = [
  {
    id: 'roles',
    title: 'Who is responsible',
    summary: "Your apartment decides; we run the platform",
    blocks: [
      {
        type: 'paragraph',
        text: "Each apartment's admins decide what information is added to the App and how it is used to run the apartment. NIVENXA provides the platform and processes that information on the apartment's behalf.",
      },
      { type: 'paragraph', text: 'NIVENXA is directly responsible for account sign-up and sign-in data, and for keeping the App secure.' },
      {
        type: 'paragraph',
        text: 'For questions about information your apartment has added, such as your bills, readings or meeting notes, start with your apartment admin. You can also write to us at any time.',
      },
    ],
  },
  {
    id: 'collect',
    title: 'Information in the App',
    summary: 'Account, flat, billing and communication data',
    blocks: [
      {
        type: 'list',
        items: [
          'Account: name, email and/or phone number used to sign in, and your role (admin, treasurer or owner).',
          'Flat details: flat number, owner name and contact details, and flat area where the apartment uses area-based splits.',
          'Water billing: meter readings, photos of reading sheets, consumption history, meter flags and billed amounts.',
          'Maintenance and finance: expense items, maintenance shares, bills, payment status, flat-wise ledgers, and bills or payment documents uploaded by admins or treasurers.',
          'Communication: meeting notes, owner notes, reading flags and disputes.',
          'Apartment directory: service provider names, phone numbers, service types and charges, and shared inventory items.',
          'Technical data: IP address, device and browser type, and error logs.',
        ],
      },
      {
        type: 'paragraph',
        text: 'Payments: The App records whether a bill has been paid. It does not process payments or store card, bank or UPI details.',
      },
    ],
  },
  {
    id: 'use',
    title: 'How it is used',
    summary: "To run your apartment's billing and records",
    blocks: [
      {
        type: 'list',
        items: [
          'Calculate maintenance shares and water bills, and keep ledgers and payment status.',
          'Show each resident the bills and history for their own flat.',
          'Read meter values from uploaded reading-sheet photos using AI (see AI processing).',
          'Handle flags, notes and disputes between residents and admins.',
          'Send essential account messages, such as sign-in codes or links.',
          'Keep the App secure, fix problems and improve it.',
          'Meet our legal obligations.',
        ],
        links: [{ text: 'AI processing', href: '#ai' }],
      },
      { type: 'paragraph', text: 'We do not use apartment data for advertising, and we do not send promotional messages.' },
    ],
  },
  {
    id: 'ai',
    title: 'AI processing',
    summary: 'Reads meter photos. A person always reviews.',
    blocks: [
      {
        type: 'paragraph',
        text: 'We use Claude, an AI model from Anthropic, for one task only: reading meter values from reading-sheet photos.',
      },
      {
        type: 'paragraph',
        text: 'Only the photo is sent. We do not send resident names, contact details or account information.',
      },
      {
        type: 'paragraph',
        text: 'Extracted readings are suggestions. An admin reviews and corrects them before anything is saved or billed.',
      },
      {
        type: 'paragraph',
        text: 'The photo is used only to read the values. NIVENXA does not keep a copy of it in the App.',
      },
      {
        type: 'paragraph',
        text: 'Anthropic does not use this data to train its models. It deletes the data automatically within 30 days, except where longer retention is needed to enforce its usage policies or to comply with law.',
      },
    ],
  },
  {
    id: 'access',
    title: 'Who can see what',
    summary: 'Each apartment is separate',
    blocks: [
      {
        type: 'list',
        items: [
          'Data belongs to one apartment and is never visible to other apartments.',
          'Owners see bills, readings and history for their own flat.',
          'Admins and treasurers see what their role allows, for all flats in the apartment.',
          'Meeting notes, the service provider directory and the inventory list are visible to residents of that apartment.',
        ],
      },
    ],
  },
  {
    id: 'whatsapp',
    title: 'WhatsApp sharing',
    summary: 'Sent by your admin, from their own WhatsApp',
    blocks: [
      {
        type: 'paragraph',
        text: "When an admin shares a bill or meeting update to WhatsApp, the App opens the admin's own WhatsApp with the message ready. The admin chooses whether to send it. NIVENXA does not send WhatsApp messages and has no access to your WhatsApp account, chats or groups.",
      },
    ],
  },
  {
    id: 'sharing',
    title: 'Who we share it with',
    summary: 'Only providers that run the App. Never sold.',
    blocks: [
      {
        type: 'list',
        items: [
          'Netlify or Vercel, for application hosting.',
          'Supabase, for our database, file storage and sign-in.',
          'Anthropic, to read meter values from reading-sheet photos.',
          'Our email/SMS provider, for sign-in messages.',
          'Government or law enforcement authorities, where required by law.',
        ],
      },
      { type: 'paragraph', text: 'We do not sell or rent personal data, and we do not share it with advertisers.' },
    ],
  },
  {
    id: 'admins',
    title: 'Responsibilities of apartment admins',
    summary: 'Add people with their knowledge',
    blocks: [
      { type: 'paragraph', text: 'Admins and anyone else who adds information agree to:' },
      {
        type: 'list',
        items: [
          'Add residents and service providers only with their knowledge, and only for running the apartment.',
          'Keep flat, contact and billing details accurate.',
          'Remove people who no longer live in or work with the apartment.',
        ],
      },
    ],
  },
  {
    id: 'security',
    title: 'Where data is stored and how we protect it',
    summary: 'Encryption, separation, limited access',
    blocks: [
      {
        type: 'paragraph',
        text: 'Some of our service providers may store or process data outside India, as permitted under Indian law. We use encrypted (HTTPS) connections, keep each apartment’s data separate, and limit who on our team can access data. If a personal data breach affects you, we will notify you and the relevant authorities as required by law.',
      },
    ],
  },
  {
    id: 'retention',
    title: 'How long we keep it',
    summary: 'As long as your apartment uses the App',
    blocks: [
      {
        type: 'list',
        items: [
          "Apartment records (bills, ledgers, readings, reading-sheet photos and documents) are kept while the apartment's account is active, so residents can see their history.",
          "When a resident is removed, their sign-in access ends right away. Their name may remain in that flat's past billing records.",
          "When an apartment's account is closed, we delete its data within 30 days, except anything we must keep by law. Admins should export any records they need before closing.",
        ],
      },
    ],
  },
  {
    id: 'rights',
    title: 'Your rights',
    summary: 'Access, correct, erase, withdraw',
    blocks: [
      { type: 'paragraph', text: 'You have the right to:' },
      {
        type: 'list',
        items: [
          'Access a summary of the personal data held about you and how it is used.',
          'Correct or update it.',
          'Request erasure, subject to records your apartment or we must keep.',
          'Withdraw consent. This means ending your access, since the App needs this data to work.',
          'Raise a grievance.',
          'Nominate another person to exercise these rights on your behalf in the event of your death or incapacity.',
        ],
      },
      {
        type: 'paragraph',
        text: `Contact your apartment admin, or email ${LEGAL_ENTITY.email}. We may need to verify your identity, and we may involve your apartment admin for apartment records. If you are not satisfied with our response, you may complain to the Data Protection Board of India.`,
      },
    ],
  },
  {
    id: 'children',
    title: 'Children',
    summary: 'Accounts for adults only',
    blocks: [
      {
        type: 'paragraph',
        text: 'Nivenxa Living accounts are for adults aged 18 and over. Admins should not create accounts for residents under 18.',
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
        text: 'Nivenxa Living uses only essential cookies that keep you signed in. We do not use analytics or advertising cookies in the App.',
      },
    ],
  },
  {
    id: 'changes',
    title: 'Changes to this policy',
    summary: "We'll tell you about significant changes",
    blocks: [
      {
        type: 'paragraph',
        text: 'We may update this policy when our practices or the law change. The "Last updated" date shows the latest version. For significant changes, we will notify users in the App and ask for fresh consent where required.',
      },
    ],
  },
  {
    id: 'contact',
    title: 'Contact & Grievance Officer',
    summary: 'Who to write to, and how fast we respond',
    blocks: [
      { type: 'paragraph', text: LEGAL_ENTITY_GRIEVANCE_LINE },
      { type: 'paragraph', text: LEGAL_ENTITY_GRIEVANCE_SLA },
      { type: 'paragraph', text: LEGAL_ENTITY_BUSINESS_BLOCK },
    ],
  },
]
