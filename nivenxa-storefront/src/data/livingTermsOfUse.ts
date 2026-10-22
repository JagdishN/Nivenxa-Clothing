// Typed content for /living/terms — same PolicyItem/PolicyBlock shape as
// livingPrivacyPolicy.ts (from @/types/policy), rendered by the same shared
// PolicyAccordion.
import type { PolicyItem } from '@/types/policy'
import { LEGAL_ENTITY_BUSINESS_BLOCK, LEGAL_ENTITY_GRIEVANCE_LINE, LEGAL_ENTITY_GRIEVANCE_SLA } from '@/lib/legalEntity'

export const LIVING_TERMS_OF_USE: PolicyItem[] = [
  {
    id: 'eligibility',
    title: 'Who can use the App',
    summary: 'Adults in standalone apartments',
    blocks: [
      {
        type: 'paragraph',
        text: 'The App is designed for standalone apartments of up to 30 flats. Accounts are for adults aged 18 and over.',
      },
    ],
  },
  {
    id: 'admins',
    title: 'Apartment admins',
    summary: 'Authorised, accurate, responsible',
    blocks: [
      {
        type: 'paragraph',
        text: 'By creating an apartment or acting as an admin, you confirm that you are authorised by your apartment or its association to manage its records in the App. Admins are responsible for:',
      },
      {
        type: 'list',
        items: [
          'Adding residents, tenants and service providers only with their knowledge, and only for running the apartment.',
          'The accuracy of flat details, rates, expense items and splits they set up.',
          'Reviewing AI-extracted meter readings before they are saved.',
          'Checking bills before they are shared with residents.',
          'Removing people who no longer live in or work with the apartment.',
        ],
      },
    ],
  },
  {
    id: 'billing',
    title: 'Bills and calculations',
    summary: 'A tool your apartment controls',
    blocks: [
      {
        type: 'paragraph',
        text: "The App calculates maintenance shares and water bills using the rates, slabs, splits and readings your apartment sets. Your apartment decides these amounts and remains responsible for them. NIVENXA is not a party to any agreement or dispute between residents, tenants and the apartment or its association. The App records payment status. It does not collect or process payments.",
      },
    ],
  },
  {
    id: 'whatsapp',
    title: 'WhatsApp sharing',
    summary: 'Sent from your own account',
    blocks: [
      {
        type: 'paragraph',
        text: "Sharing to WhatsApp opens the admin's own WhatsApp. Messages are sent by the admin, who is responsible for them and for following WhatsApp's own terms.",
      },
    ],
  },
  {
    id: 'use',
    title: 'Fair and respectful use',
    summary: 'Use the App for your apartment',
    blocks: [
      {
        type: 'paragraph',
        text: "Please don't misuse the App, for example by entering information without the person's knowledge, uploading unlawful or offensive content, attempting unauthorised access, or disrupting its operation.",
      },
    ],
  },
  {
    id: 'service',
    title: 'The service',
    summary: 'Provided as it is, and improving',
    blocks: [
      {
        type: 'paragraph',
        text: "Nivenxa Living is currently offered free of charge. We may change, pause or retire features, and we can't guarantee the App will always be uninterrupted or error-free. We'll give reasonable notice before introducing any charges.",
      },
    ],
  },
  {
    id: 'closing',
    title: 'Export and closing an apartment',
    summary: 'Your records, your choice',
    blocks: [
      {
        type: 'paragraph',
        text: "Admins can close their apartment's account at any time. Export any records you need first: we delete the apartment's data within 30 days of closure, except anything we must keep by law. We may suspend accounts that break these Terms, and will tell you why where appropriate.",
      },
    ],
  },
  {
    id: 'liability',
    title: 'Liability',
    summary: 'Our responsibility, and its limits',
    blocks: [
      {
        type: 'paragraph',
        text: 'To the extent permitted by law, NIVENXA is not liable for losses arising from information entered by users, from bills or decisions based on it, or from disputes between residents and their apartment. Nothing in these Terms limits your rights under applicable consumer protection law.',
      },
    ],
  },
  {
    id: 'ip',
    title: 'Our content',
    summary: "Your records are your apartment's",
    blocks: [
      {
        type: 'paragraph',
        text: "Your apartment's records belong to your apartment. The App's design, code and content belong to NIVENXA.",
      },
    ],
  },
  {
    id: 'law',
    title: 'Governing law',
    summary: 'Indian law; Hyderabad courts',
    blocks: [
      {
        type: 'paragraph',
        text: 'These Terms are governed by the laws of India. Subject to your statutory rights, courts in Hyderabad, Telangana have jurisdiction. Please contact our Grievance Officer first. Most issues can be resolved quickly.',
      },
    ],
  },
  {
    id: 'changes',
    title: 'Changes',
    summary: "We'll tell you about significant changes",
    blocks: [
      {
        type: 'paragraph',
        text: 'We may update these Terms. For significant changes, we will notify users in the App before they take effect.',
      },
    ],
  },
  {
    id: 'contact',
    title: 'Contact',
    summary: 'Who to write to, and how fast we respond',
    blocks: [
      { type: 'paragraph', text: LEGAL_ENTITY_GRIEVANCE_LINE },
      { type: 'paragraph', text: LEGAL_ENTITY_GRIEVANCE_SLA },
      { type: 'paragraph', text: LEGAL_ENTITY_BUSINESS_BLOCK },
    ],
  },
]
