// Typed content for /studio/shipping — same PolicyItem/PolicyBlock shape as
// returnsPolicy.ts (from @/types/policy), rendered by the same shared
// PolicyAccordion.
//
// PLACEHOLDERS — fill in before publishing: [DISPATCH DAYS], [METRO DAYS],
// [REST DAYS], [SHIPPING FEE], [FREE SHIPPING THRESHOLD], [COD LIMIT],
// [COD FEE]. These are operational/business facts (carrier SLAs, pricing)
// I can't derive from the codebase — left as visible bracketed placeholders
// per the brief's own instruction, not guessed.
import type { PolicyItem } from '@/types/policy'
import { LEGAL_ENTITY } from '@/lib/legalEntity'

export const SHIPPING_POLICY: PolicyItem[] = [
  {
    id: 'dispatch',
    title: 'Dispatch',
    summary: 'When your order leaves us',
    blocks: [
      {
        type: 'paragraph',
        text: 'Orders are usually dispatched within [DISPATCH DAYS] business days of being placed. Orders placed on Sundays or public holidays are processed on the next business day.',
      },
      {
        type: 'paragraph',
        text: "You'll receive an email and/or WhatsApp message with your tracking details once your order is dispatched.",
      },
    ],
  },
  {
    id: 'timelines',
    title: 'Delivery timelines',
    summary: 'How long delivery takes',
    blocks: [
      {
        type: 'list',
        items: [
          'Metro cities: usually [METRO DAYS] business days after dispatch.',
          'Rest of India: usually [REST DAYS] business days after dispatch.',
        ],
      },
      { type: 'paragraph', text: 'These are estimates. Remote locations may take longer.' },
    ],
  },
  {
    id: 'charges',
    title: 'Shipping charges',
    summary: 'Free above ₹[FREE SHIPPING THRESHOLD]',
    blocks: [
      {
        type: 'list',
        items: [
          'Orders above ₹[FREE SHIPPING THRESHOLD]: free shipping.',
          'Orders below that: a shipping fee of ₹[SHIPPING FEE].',
        ],
      },
      { type: 'paragraph', text: 'All charges are shown clearly at checkout before you pay.' },
    ],
  },
  {
    id: 'cod',
    title: 'Cash on Delivery',
    summary: 'Available on eligible orders',
    blocks: [
      {
        type: 'paragraph',
        text: 'Cash on Delivery is available on orders up to ₹[COD LIMIT] at serviceable pin codes. A COD fee of ₹[COD FEE] applies and is shown at checkout.',
      },
      {
        type: 'paragraph',
        text: 'If a COD order is refused at delivery without a valid reason, we may ask for prepaid payment on future orders.',
      },
    ],
  },
  {
    id: 'serviceability',
    title: 'Serviceability',
    summary: 'Where we deliver',
    blocks: [
      {
        type: 'paragraph',
        text: 'We deliver across India through our courier partners. You can check whether your pin code is serviceable at checkout. We do not currently ship outside India.',
      },
    ],
  },
  {
    id: 'tracking',
    title: 'Tracking and delays',
    summary: 'Following your order',
    blocks: [
      { type: 'paragraph', text: 'You can track your order using the link in your dispatch message.' },
      {
        type: 'paragraph',
        text: `Occasionally, deliveries are delayed by weather, local restrictions, courier disruptions or festive-season volumes. If your order hasn't arrived within the expected time, write to ${LEGAL_ENTITY.email} and we'll follow up with the courier.`,
      },
    ],
  },
  {
    id: 'undelivered',
    title: 'Failed or undelivered deliveries',
    summary: "If delivery can't be completed",
    blocks: [
      {
        type: 'paragraph',
        text: "If delivery fails or your order is returned to us, we'll contact you to confirm your details. See Undelivered orders in our Returns & Exchanges policy for re-shipment terms.",
        links: [{ text: 'Undelivered orders in our Returns & Exchanges policy', href: '/studio/returns#pickup' }],
      },
    ],
  },
  {
    id: 'damaged-package',
    title: 'Damaged or tampered packages',
    summary: 'Check before you accept',
    blocks: [
      {
        type: 'paragraph',
        text: 'If the outer package looks tampered with or badly damaged, you may refuse delivery.',
      },
      {
        type: 'paragraph',
        text: `If you notice damage after opening, email ${LEGAL_ENTITY.email} as soon as possible, preferably within 48 hours, with your order number and photos. See Damaged, defective or incorrect items for what happens next.`,
        links: [{ text: 'Damaged, defective or incorrect items', href: '/studio/returns#damaged' }],
      },
    ],
  },
]
