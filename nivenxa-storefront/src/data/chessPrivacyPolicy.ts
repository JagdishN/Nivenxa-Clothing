// Typed content for /chess/privacy — same PolicyItem/PolicyBlock shape as
// returnsPolicy.ts/privacyPolicy.ts (from @/types/policy), rendered by the
// same shared PolicyAccordion.
//
// Grievance Officer, GSTIN, address and support contact all come from
// @/lib/legalEntity (the single source of truth for business details) —
// same values as Studio's and Living's privacy content
// (src/data/privacyPolicy.ts, livingPrivacyPolicy.ts).
import type { PolicyItem } from '@/types/policy'
import { LEGAL_ENTITY, LEGAL_ENTITY_BUSINESS_BLOCK, LEGAL_ENTITY_GRIEVANCE_LINE, LEGAL_ENTITY_GRIEVANCE_SLA } from '@/lib/legalEntity'

export const CHESS_PRIVACY_POLICY: PolicyItem[] = [
  {
    id: 'collect',
    title: 'Information we collect',
    summary: 'Your email and your chess',
    blocks: [
      {
        type: 'list',
        items: [
          "Account: your email address, used to sign you in. If the account is for a child, this is the parent's or guardian's email.",
          'Account type and consent: whether the account is for an adult or a child, and when consent was given.',
          'Chess data: games you play, and your puzzle progress — your skill tier, time control choice and other app settings stay on your own device and are never sent to us.',
          'Technical data: IP address, device and browser type, and error logs, to keep the App secure and working.',
        ],
      },
      { type: 'paragraph', text: 'We do not ask for your name, phone number, photo or location.' },
    ],
  },
  {
    id: 'use',
    title: 'How we use it',
    summary: 'To run the App, nothing more',
    blocks: [
      {
        type: 'list',
        items: [
          'Sign you in and keep your account secure.',
          'Save your games, puzzle progress and settings across devices.',
          'Send essential account emails, such as sign-in links and important notices.',
          'Fix bugs and improve the App.',
          'Meet our legal obligations.',
        ],
      },
      {
        type: 'paragraph',
        text: 'Engine analysis runs on your own device. Move explanations are written by AI (see AI move explanations).',
        links: [{ text: 'AI move explanations', href: '#ai' }],
      },
      { type: 'paragraph', text: 'We do not send promotional emails from Nivenxa Chess.' },
    ],
  },
  {
    id: 'ai',
    title: 'AI move explanations',
    summary: 'Chess positions only. Never your email or identity.',
    blocks: [
      {
        type: 'list',
        items: [
          'Move explanations for beginner and next-level players are written by Claude, an AI model made by Anthropic.',
          'To create an explanation, we send Anthropic only the board position, recent moves and the explanation level. We never send your email, account details, or whether the account belongs to a child.',
          'Anthropic does not use this data to train its models. It deletes the data automatically within 30 days, except where longer retention is needed to enforce its usage policies or to comply with law.',
          'Players cannot chat with the AI. It only explains chess moves.',
          'Explanations are labelled as AI-generated and can occasionally be wrong.',
        ],
      },
    ],
  },
  {
    id: 'children',
    title: 'Children and parents',
    summary: 'Built with young players in mind',
    blocks: [
      {
        type: 'paragraph',
        text: "Nivenxa Chess is for players of all ages. A player under 18 must have their account created by a parent or legal guardian, using the parent's or guardian's email and with their consent.",
      },
      { type: 'paragraph', text: 'For all players, and especially children:' },
      {
        type: 'list',
        items: [
          'We do not show advertising.',
          'We do not track, profile or monitor behaviour for advertising or any similar purpose.',
          'We collect only what is needed to save games and progress.',
          'AI explanations are limited to chess, written in language suitable for young players, and always labelled as AI.',
        ],
      },
      {
        type: 'paragraph',
        text: `Parents and guardians can ask to see, correct or delete their child's data at any time by writing to ${LEGAL_ENTITY.email} from the account email.`,
      },
    ],
  },
  {
    id: 'sharing',
    title: 'Who we share it with',
    summary: 'Only providers that run the App. Never sold.',
    blocks: [
      {
        type: 'paragraph',
        text: 'We share personal data only with service providers who help us run the App, and only what they need:',
      },
      {
        type: 'list',
        items: [
          'Hosting and database providers.',
          'Our email delivery provider, to send sign-in emails.',
          'Anthropic, to generate move explanations from board positions only.',
          'Government or law enforcement authorities, where required by law.',
        ],
      },
      { type: 'paragraph', text: 'We do not sell or rent your personal data, and we do not share it with advertisers.' },
    ],
  },
  {
    id: 'transfers',
    title: 'Where your data is stored',
    summary: 'With trusted providers, in India or abroad',
    blocks: [
      {
        type: 'paragraph',
        text: 'Some of our service providers may store or process data outside India. We work only with providers that maintain appropriate safeguards, and we transfer data only as permitted under Indian law.',
      },
    ],
  },
  {
    id: 'security',
    title: 'How we protect it',
    summary: 'Encryption and limited access',
    blocks: [
      {
        type: 'paragraph',
        text: 'We use encrypted (HTTPS) connections, limit who on our team can access data, and use reputable service providers. If a personal data breach affects you, we will notify you and the relevant authorities as required by law.',
      },
    ],
  },
  {
    id: 'retention',
    title: 'How long we keep it',
    summary: 'While your account is active',
    blocks: [
      {
        type: 'paragraph',
        text: 'We keep your account and chess data while your account is active. When you ask us to delete your account, we delete your data within 30 days, except anything we must keep by law.',
      },
    ],
  },
  {
    id: 'rights',
    title: 'Your rights',
    summary: 'Access, correct, erase, withdraw',
    blocks: [
      { type: 'paragraph', text: 'You, or a parent or guardian for a child’s account, have the right to:' },
      {
        type: 'list',
        items: [
          'Access a summary of the personal data we hold and how we use it.',
          'Correct or update it.',
          'Request erasure of the account and its data.',
          'Withdraw consent. This means closing the account, since the App needs this data to work.',
          'Raise a grievance with us.',
          'Nominate another person to exercise these rights on your behalf in the event of your death or incapacity.',
        ],
      },
      {
        type: 'paragraph',
        text: `Email ${LEGAL_ENTITY.email} from the account email. We may need to verify your identity. If you are not satisfied with our response, you may complain to the Data Protection Board of India.`,
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
        text: 'Nivenxa Chess uses only essential cookies that keep you signed in. We do not use analytics or advertising cookies in the App.',
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
        text: 'We may update this policy when our practices or the law change. The "Last updated" date shows the latest version. For significant changes, we will notify you by email or in the App, and ask for fresh consent where required.',
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
