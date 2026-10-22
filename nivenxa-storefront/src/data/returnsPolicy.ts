// Typed content for /returns — kept as data, not JSX, so copy edits never
// touch PolicyAccordion.tsx. Each item's body is an ordered list of generic
// blocks (paragraph / list / subheading) rather than bespoke per-item props,
// since the real copy mixes those freely (e.g. "eligibility" has a paragraph,
// a list, a paragraph, a subheading, a paragraph, another list, then a
// closing paragraph) and a generic renderer handles any future reordering
// without a code change. Shape is shared with privacyPolicy.ts via
// @/types/policy — see that file for PolicyBlock/PolicyItem.
import type { PolicyItem } from '@/types/policy'
import { LEGAL_ENTITY } from '@/lib/legalEntity'

export const RETURNS_POLICY: PolicyItem[] = [
  {
    id: 'eligibility',
    title: 'Return eligibility',
    summary: 'Unused · Unwashed · Tags attached',
    blocks: [
      {
        type: 'paragraph',
        text: 'You can request a return or exchange within 7 calendar days of delivery. To be eligible, your item must be:',
      },
      {
        type: 'list',
        items: [
          'Unused, unwashed and in its original condition.',
          'Tried on only for fit, without signs of wear.',
          'Returned with all original product tags attached.',
          'Free from stains, odours, alterations or damage caused after delivery.',
        ],
      },
      { type: 'paragraph', text: 'Please include the original packaging wherever possible.' },
      { type: 'subheading', text: 'Not eligible for change-of-mind returns' },
      { type: 'paragraph', text: 'We cannot accept change-of-mind returns for items that:' },
      {
        type: 'list',
        items: [
          'Have been washed, altered or worn beyond a reasonable fit trial.',
          'Have been damaged after delivery through use or improper handling.',
          'Are missing original tags where their condition or authenticity cannot be verified.',
          'Are requested for return after the 7-day window.',
          'Were clearly marked as final sale or non-returnable before purchase, where legally permissible.',
        ],
      },
      {
        type: 'paragraph',
        text: 'These exclusions do not affect applicable consumer rights for defective, damaged, incorrect or misdescribed products.',
      },
    ],
  },
  {
    id: 'exchanges',
    title: 'Size exchanges',
    summary: 'Your first size exchange is on us',
    blocks: [
      {
        type: 'paragraph',
        text: 'We offer one free size exchange per eligible order, subject to stock availability and courier serviceability. This includes complimentary return pickup and delivery of the replacement size.',
      },
      {
        type: 'paragraph',
        text: "The free exchange applies to the same product and colour. Additional exchanges or requests for a different style or colour may involve charges or price adjustments, which we'll communicate beforehand.",
      },
    ],
  },
  {
    id: 'refunds',
    title: 'Returns & refunds',
    summary: '₹99 for change-of-mind returns · refunds in 5–7 business days',
    blocks: [
      { type: 'paragraph', text: 'Changed your mind? You can return an eligible item within 7 calendar days of delivery.' },
      {
        type: 'paragraph',
        text: 'A ₹99 return shipping fee applies to preference-based returns, including changes of mind, fit or colour preferences. This fee is deducted from your eligible refund.',
      },
      {
        type: 'paragraph',
        text: 'Once your return is received and passes our quality inspection, we aim to initiate your refund within 5–7 business days.',
      },
      {
        type: 'list',
        items: [
          'Prepaid orders: Refunds are ordinarily processed to your original payment method.',
          'Cash on Delivery (COD): Refunds are processed to your verified bank account or UPI ID.',
        ],
      },
      { type: 'paragraph', text: 'Your bank or payment provider may take additional time to credit the amount.' },
    ],
  },
  {
    id: 'cancellation',
    title: 'Order cancellation',
    summary: 'Free before dispatch',
    blocks: [
      {
        type: 'paragraph',
        text: `You can cancel your order free of charge any time before it is dispatched. Email ${LEGAL_ENTITY.email} with your order number.`,
      },
      {
        type: 'list',
        items: [
          'Prepaid orders: we refund the full amount to your original payment method. We aim to initiate the refund within 5–7 business days.',
          'COD orders: the order is simply cancelled.',
        ],
      },
      {
        type: 'paragraph',
        text: 'Once an order has been dispatched, it can no longer be cancelled. You can still return it after delivery under this policy.',
      },
      { type: 'paragraph', text: 'We do not charge cancellation fees.' },
      {
        type: 'paragraph',
        text: "We may occasionally need to cancel an order, for example if an item is out of stock, a pricing error is found, the address isn't serviceable, or the order appears fraudulent. If we do, we'll let you know and refund any amount paid in full.",
      },
    ],
  },
  {
    id: 'damaged',
    title: 'Damaged, defective or incorrect items',
    summary: 'Made right at no additional cost',
    blocks: [
      { type: 'paragraph', text: "If we've sent you a damaged, defective or incorrect item, we'll help make it right." },
      {
        type: 'paragraph',
        text: 'Please email us as soon as possible, preferably within 48 hours of delivery, with your order number and photographs where available.',
      },
      {
        type: 'paragraph',
        text: "We'll review the issue and arrange an appropriate replacement, exchange or refund at no additional cost.",
      },
      {
        type: 'paragraph',
        text: 'The 48-hour reporting request does not limit your rights under applicable consumer protection laws.',
      },
    ],
  },
  {
    id: 'sets',
    title: 'Sets & bundles',
    summary: 'How partial returns are calculated',
    blocks: [
      { type: 'paragraph', text: "Love the set but want to return just one piece? That's possible for eligible items." },
      {
        type: 'paragraph',
        text: "If you purchased a discounted set and return only part of it, we'll recalculate the set discount based on the items you keep.",
      },
      {
        type: 'paragraph',
        text: 'Your refund will be the amount paid for the set, minus the standalone purchase price of the retained items and any applicable return shipping fee, with a minimum refund of zero.',
      },
      {
        type: 'paragraph',
        text: "If you return the complete eligible set, we'll refund the amount paid, less the ₹99 preference-based return shipping fee where applicable.",
      },
      {
        type: 'paragraph',
        text: 'The standard ₹99 fee applies once per approved return request, not separately to every item in the same pickup.',
      },
    ],
  },
  {
    id: 'pickup',
    title: 'Pickup & delivery issues',
    summary: 'Reverse pickups and undelivered orders',
    blocks: [
      { type: 'subheading', text: 'Return pickup' },
      {
        type: 'paragraph',
        text: "Once your return is approved, we'll arrange pickup through our courier partner wherever available.",
      },
      {
        type: 'paragraph',
        text: 'If two pickup attempts fail due to customer unavailability or incorrect address details, we may ask you to send the item to our return address at your own cost.',
      },
      { type: 'paragraph', text: "If the courier is responsible for the failed pickup, we'll help arrange an alternative." },
      { type: 'subheading', text: 'Undelivered orders' },
      {
        type: 'paragraph',
        text: "If your prepaid order is returned to us because delivery could not be completed, we'll offer one complimentary re-shipment attempt after confirming your delivery details.",
      },
      { type: 'paragraph', text: 'Additional attempts may involve shipping charges, communicated in advance.' },
      {
        type: 'paragraph',
        text: 'For COD orders returned to origin, we may require prepaid payment before arranging another shipment.',
      },
      {
        type: 'paragraph',
        text: 'See our Shipping & Delivery policy for dispatch and delivery timelines.',
        links: [{ text: 'See our Shipping & Delivery policy', href: '/studio/shipping' }],
      },
    ],
  },
  {
    id: 'how-to',
    title: 'How to request a return or exchange',
    summary: 'Email us within 7 days of delivery',
    blocks: [
      // "the support email" is auto-linkified by PolicyAccordion's shared
      // renderer (DEFAULT_POLICY_LINKS in @/types/policy) rather than
      // special-casing this one block, so the same behaviour applies
      // anywhere the address appears in any policy page's copy.
      { type: 'paragraph', text: `Email ${LEGAL_ENTITY.email} within 7 calendar days of delivery.` },
      { type: 'paragraph', text: 'Include:' },
      {
        type: 'list',
        items: [
          'Your order number',
          "The product you'd like to return or exchange",
          'The reason for your request',
          'Your preferred size, for exchanges',
        ],
      },
      { type: 'paragraph', text: 'Our Customer Care team will guide you through the next steps.' },
    ],
  },
]
