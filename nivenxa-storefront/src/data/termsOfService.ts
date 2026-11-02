// Typed content for /studio/terms — same PolicyItem/PolicyBlock shape as
// returnsPolicy.ts (from @/types/policy), rendered by the same shared
// PolicyAccordion.
//
// Step 0 findings this content reflects:
//  - Studio HAS customer accounts (/studio/{locale}/account/login,
//    /register — confirmed real routes), so "Accounts" is included.
//  - Studio has NO discount codes/coupons anywhere in the codebase
//    (checked src/lib, src/context, src/components) — "Offers and discount
//    codes" is therefore DROPPED entirely, not just hidden; see the task
//    summary.
//  - No product reviews feature exists either (not that the brief asked for
//    a Terms section on it, just noting it as part of the same check).
import type { PolicyItem } from '@/types/policy'

export const TERMS_OF_SERVICE: PolicyItem[] = [
  {
    id: 'eligibility',
    title: 'Eligibility',
    summary: 'Orders by adults',
    blocks: [
      {
        type: 'paragraph',
        text: 'You must be 18 or older to place an order. Products for children must be purchased by a parent, guardian or other adult.',
      },
    ],
  },
  {
    id: 'products',
    title: 'Products and descriptions',
    summary: 'What you see, as accurately as we can',
    blocks: [
      {
        type: 'paragraph',
        text: 'We describe and photograph our products as accurately as we can. Colours may look slightly different depending on your screen, and small variations in fabric, dye or finish are natural in our garments. Please check the size chart on each product page before ordering.',
      },
      {
        type: 'paragraph',
        text: "Every product page shows the marketer's details, country of origin, consumer care contacts and MRP inclusive of all taxes.",
      },
    ],
  },
  {
    id: 'pricing',
    title: 'Prices and payment',
    summary: 'Clear prices in Indian rupees',
    blocks: [
      {
        type: 'list',
        items: [
          'All prices are in Indian rupees (₹) and include all applicable taxes.',
          'Shipping and COD fees, where applicable, are shown at checkout before you pay.',
          'Payments are processed securely by our payment partners.',
          'If a product is listed at an incorrect price because of an error, we may cancel the order and refund any amount paid in full. We will tell you if this happens.',
        ],
      },
    ],
  },
  {
    id: 'orders',
    title: 'Orders',
    summary: 'From checkout to confirmation',
    blocks: [
      { type: 'paragraph', text: "After you place an order, you'll receive an order confirmation." },
      {
        type: 'paragraph',
        text: "We may cancel an order in the situations described in our Order cancellation policy. If we do, we refund any amount paid in full.",
        links: [{ text: 'Order cancellation policy', href: '/studio/returns#cancellation' }],
      },
    ],
  },
  {
    id: 'policies',
    title: 'Shipping, returns and cancellation',
    summary: 'Covered by our customer care policies',
    blocks: [
      {
        type: 'paragraph',
        text: 'Delivery, returns, exchanges, refunds and cancellations are governed by our Shipping & Delivery and Returns & Exchanges policies, which form part of these Terms.',
        links: [
          { text: 'Shipping & Delivery', href: '/studio/shipping' },
          { text: 'Returns & Exchanges', href: '/studio/returns' },
        ],
      },
    ],
  },
  {
    id: 'accounts',
    title: 'Accounts',
    summary: 'Keeping your account secure',
    blocks: [
      {
        type: 'paragraph',
        text: 'If you create an account, keep your sign-in details secure and let us know if you suspect unauthorised use. You are responsible for activity under your account.',
      },
    ],
  },
  {
    id: 'ip',
    title: 'Intellectual property',
    summary: 'Our designs and content',
    blocks: [
      {
        type: 'paragraph',
        text: 'The NIVENXA name, logo, designs, photographs and content on this Site belong to NIVENXA. They may not be copied, reproduced or used commercially without our written permission.',
      },
    ],
  },
  {
    id: 'use',
    title: 'Acceptable use',
    summary: 'Use the Site fairly',
    blocks: [
      {
        type: 'paragraph',
        text: "Please don't misuse the Site, for example by attempting unauthorised access, disrupting its operation, scraping content, or placing fraudulent orders.",
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
        text: 'We are responsible for the products we sell, as set out in these Terms and our policies. To the extent permitted by law, our total liability for any order is limited to the amount you paid for it, and we are not liable for indirect or consequential losses.',
      },
      {
        type: 'paragraph',
        text: 'Nothing in these Terms limits your rights under the Consumer Protection Act, 2019 or any other applicable law.',
      },
    ],
  },
  {
    id: 'law',
    title: 'Governing law and disputes',
    summary: 'Indian law; Hyderabad courts',
    blocks: [
      {
        type: 'paragraph',
        text: 'These Terms are governed by the laws of India. Subject to your rights to approach consumer commissions under applicable law, courts in Hyderabad, Telangana have jurisdiction.',
      },
      {
        type: 'paragraph',
        text: 'If you have a concern, please contact our Grievance Officer first. Most issues can be resolved quickly.',
        links: [{ text: 'contact our Grievance Officer', href: '/studio/contact' }],
      },
    ],
  },
  {
    id: 'changes',
    title: 'Changes to these Terms',
    summary: 'Updated when needed',
    blocks: [
      {
        type: 'paragraph',
        text: 'We may update these Terms from time to time. The version in force when you place an order applies to that order.',
      },
    ],
  },
]
