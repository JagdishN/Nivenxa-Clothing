// Typed content for /privacy — same shape as returnsPolicy.ts (PolicyItem /
// PolicyBlock, from @/types/policy), rendered by the same shared
// PolicyAccordion. Two items use a block-scoped `links` override on top of
// the default the support email auto-link:
//  - "sharing" links "Shopify Privacy Policy" to Shopify's own policy.
//  - "collect" links "see Cookies" to this page's own #cookies item — note
//    the link text is "see Cookies", not the bare word "Cookies", since
//    that list item's text also starts with "Cookies and similar
//    technologies…" — matching on just "Cookies" would have linked the
//    wrong occurrence (the renderer links the first match it finds).
//
// Grievance Officer, GSTIN, address and support contact all come from
// @/lib/legalEntity (the single source of truth for business details).
import type { PolicyItem } from '@/types/policy'
import { LEGAL_ENTITY, LEGAL_ENTITY_BUSINESS_BLOCK, LEGAL_ENTITY_GRIEVANCE_LINE, LEGAL_ENTITY_GRIEVANCE_SLA } from '@/lib/legalEntity'

export const PRIVACY_POLICY: PolicyItem[] = [
  {
    id: 'collect',
    title: 'Information we collect',
    summary: 'What you share, and what your device tells us',
    blocks: [
      { type: 'subheading', text: 'Information you give us' },
      {
        type: 'list',
        items: [
          'Name, email address, phone number, and billing and shipping addresses.',
          'Order details, size preferences and purchase history.',
          'Messages, feedback, and return or exchange requests, including any photos you send.',
          'Bank account or UPI ID, only when needed to refund a Cash on Delivery order.',
          'Your email address, if you ask us to notify you when a product launches.',
        ],
      },
      {
        type: 'paragraph',
        text: 'Payment information: Payments are processed securely by our payment partners. We do not see or store your full card number, CVV or UPI PIN.',
      },
      { type: 'subheading', text: 'Information collected automatically' },
      {
        type: 'list',
        items: [
          'IP address, device and browser type, time zone and approximate location.',
          'Pages viewed, referring and exit pages, and how you interact with the Site.',
          'Cookies and similar technologies (see Cookies).',
        ],
        links: [{ text: 'see Cookies', href: '#cookies' }],
      },
    ],
  },
  {
    id: 'use',
    title: 'How we use your information',
    summary: 'Only for clear, specific purposes',
    blocks: [
      { type: 'paragraph', text: 'We use your personal data only as needed to:' },
      {
        type: 'list',
        items: [
          'Process, fulfil and deliver your orders.',
          'Send order confirmations, shipping updates and customer support replies.',
          'Handle returns, exchanges and refunds.',
          'Let you know when a product you asked about becomes available.',
          'Prevent fraud and keep the Site secure.',
          'Improve our Site, products and services.',
          'Meet legal, tax and accounting obligations, including GST invoicing.',
          'Send marketing communications, only if you have opted in.',
        ],
      },
    ],
  },
  {
    id: 'consent',
    title: 'Order updates & marketing consent',
    summary: 'Marketing only if you say yes',
    blocks: [
      { type: 'subheading', text: 'Order-related messages' },
      {
        type: 'paragraph',
        text: 'When you place an order, we send confirmations, shipping updates and support replies by email, SMS and/or WhatsApp. These messages are needed to fulfil your order.',
      },
      { type: 'subheading', text: 'Marketing messages' },
      {
        type: 'paragraph',
        text: 'We send promotions, early access to new drops and personalised content by email or WhatsApp only if you choose to opt in. Opting in is never a condition of buying.',
      },
      {
        type: 'paragraph',
        text: `You can withdraw consent at any time by clicking "unsubscribe" in our emails, replying "STOP" on WhatsApp or SMS, or writing to ${LEGAL_ENTITY.email}. Withdrawing consent does not affect order-related messages or anything we did before you withdrew it.`,
      },
    ],
  },
  {
    id: 'sharing',
    title: 'Who we share it with',
    summary: 'Trusted partners, only as needed. Never sold.',
    blocks: [
      {
        type: 'paragraph',
        text: 'We share personal data only with service providers who help us run the Site and fulfil your orders, and only what they need:',
      },
      {
        type: 'list',
        items: [
          'Shopify, our e-commerce platform (Shopify Privacy Policy).',
          'Payment partners such as Razorpay and Cashfree.',
          'Courier and logistics partners, for delivery and return pickups.',
          'Email, SMS and WhatsApp messaging providers.',
          'Analytics and advertising tools such as Google Analytics and Meta, only with your cookie consent.',
          'Government or law enforcement authorities, where required by law.',
        ],
        links: [{ text: 'Shopify Privacy Policy', href: 'https://www.shopify.com/legal/privacy' }],
      },
      { type: 'paragraph', text: 'These partners are required to protect your data and use it only for the services they provide to us.' },
      { type: 'paragraph', text: 'We do not sell or rent your personal data.' },
    ],
  },
  {
    id: 'transfers',
    title: 'Where your data is stored',
    summary: 'In India and with trusted global providers',
    blocks: [
      {
        type: 'paragraph',
        text: 'Some of our service providers, including Shopify, may store or process your data outside India, including in Canada and the United States. We work only with providers that maintain appropriate safeguards, and we transfer data only as permitted under Indian law.',
      },
    ],
  },
  {
    id: 'security',
    title: 'How we protect your data',
    summary: 'Encryption, limited access, trusted providers',
    blocks: [
      {
        type: 'paragraph',
        text: 'We use reasonable security measures to protect your personal data. These include encrypted (HTTPS) connections, limited access for our team, and reputable service providers.',
      },
      {
        type: 'paragraph',
        text: 'No method of transmission or storage is completely secure. If a personal data breach affects you, we will notify you and the relevant authorities as required by law.',
      },
    ],
  },
  {
    id: 'retention',
    title: 'How long we keep it',
    summary: 'No longer than needed',
    blocks: [
      { type: 'paragraph', text: 'We keep personal data only as long as needed for the purposes described here:' },
      {
        type: 'list',
        items: [
          'Order, invoice and payment records: for as long as tax and accounting laws require. GST law currently requires records to be kept for at least 72 months.',
          'Marketing preferences: until you withdraw consent.',
          "Launch notification requests: deleted once we've sent the notification, or after 12 months if the product hasn't launched.",
          'Customer support conversations: for as long as needed to resolve your request and any related dispute.',
        ],
      },
      { type: 'paragraph', text: 'After that, we delete or anonymise your data.' },
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
          'Access a summary of the personal data we hold about you and how we use it.',
          'Correct, complete or update your personal data.',
          'Request erasure of your personal data, subject to records we must keep by law.',
          'Withdraw consent for marketing or any other consent-based use.',
          'Raise a grievance with us about how your data is handled.',
          'Nominate another person to exercise these rights on your behalf in the event of your death or incapacity.',
        ],
      },
      { type: 'paragraph', text: `To exercise any of these rights, email ${LEGAL_ENTITY.email}. We may need to verify your identity before acting on your request.` },
      { type: 'paragraph', text: 'If you are not satisfied with our response, you may complain to the Data Protection Board of India.' },
    ],
  },
  {
    id: 'children',
    title: 'Children',
    summary: 'For adults 18 and over',
    blocks: [
      {
        type: 'paragraph',
        text: `Our Site is intended for adults aged 18 and over. Children's products are purchased by parents or guardians. We do not knowingly collect personal data from anyone under 18. If you believe a child has shared personal data with us, contact ${LEGAL_ENTITY.email} and we will delete it.`,
      },
    ],
  },
  {
    id: 'cookies',
    title: 'Cookies',
    summary: 'Essential always; analytics only with consent',
    blocks: [
      {
        type: 'list',
        items: [
          'Essential cookies keep your cart, checkout and login working. They cannot be switched off.',
          'Analytics and advertising cookies help us understand how the Site is used and show relevant ads. We use them only with your consent.',
        ],
      },
      {
        type: 'paragraph',
        text: 'You can change your cookie choices at any time through our cookie settings, or block cookies in your browser. Blocking essential cookies may stop parts of the Site from working.',
        links: [{ text: 'cookie settings', action: 'open-cookie-settings' }],
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
        text: 'We may update this policy to reflect changes in our practices or in the law. The "Last updated" date at the top shows when it last changed. For significant changes, we will notify you by email or with a notice on the Site.',
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
      { type: 'subheading', text: 'Business details' },
      { type: 'paragraph', text: LEGAL_ENTITY_BUSINESS_BLOCK },
      { type: 'paragraph', text: '(This address is our registered office and principal place of business for GST.)' },
    ],
  },
]
