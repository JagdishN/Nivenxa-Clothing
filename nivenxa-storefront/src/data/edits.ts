// ─── Edit data ────────────────────────────────────────────────────────────────
// Defines the 4 editorial story pages (Edits) and their sub-items.
// heroImageUrl is left empty — EditPage computes the hero from
// featuredProductHandle + featuredColourSlug at render time.

export interface EditSubItem {
  name: string
  slug: string
  productHandles: string[]
  editorial: string
}

export interface Edit {
  name: string
  slug: string
  heroImageUrl: string
  headline: string
  story: string
  subItems: EditSubItem[]
  featuredProductHandle: string
  featuredColourSlug: string
}

export const edits: Edit[] = [
  {
    name: "The Indian Edit",
    slug: 'womens-edit',
    heroImageUrl: '',
    headline: 'Indo-Western for\neveryday India.',
    story:
      'Cotton-Modal silhouettes designed for the contemporary Indian woman. Not occasion wear. Not casual wear. The space between — for every day that deserves both.',
    featuredProductHandle: 'a-line-kurta',
    featuredColourSlug: 'warm-ivory',
    // A-line Kurta is index 0 — always the default tab
    subItems: [
      {
        name: 'A-line Kurta',
        slug: 'a-line-kurta',
        productHandles: ['a-line-kurta'],
        editorial: 'The everyday Indian silhouette, elevated.',
      },
      {
        name: 'Co-ord Set',
        slug: 'co-ord-set',
        productHandles: ['women-lounge-sets'],
        editorial: 'Matched fabric, unmatched ease.',
      },
      {
        name: 'Sleepwear',
        slug: 'sleepwear',
        productHandles: ['women-sleepwear'],
        editorial: 'Ultra-soft fabrications for considered rest.',
      },
    ],
  },
  {
    name: 'The Ease Edit',
    slug: 'ease-edit',
    heroImageUrl: '',
    headline: 'Ease,\nconsidered.',
    story:
      'Linen and cotton in easy, relaxed pieces. Designed to be worn together or apart.',
    featuredProductHandle: 'women-lounge-sets',
    featuredColourSlug: 'meadow-sage',
    subItems: [
      {
        name: 'Co-ord Set',
        slug: 'co-ord-set',
        productHandles: ['women-lounge-sets'],
        editorial: 'Linen-cotton sets, styled together or apart.',
      },
    ],
  },
  {
    name: 'The Everyday Edit',
    slug: 'everyday-edit',
    heroImageUrl: '',
    headline: 'Dressed for the day.\nEvery day.',
    story:
      'Bio-washed comfortwear built for the rhythm of Indian daily life. Heavyweight enough to feel considered. Light enough to forget you\'re wearing it.',
    featuredProductHandle: 'over-tee-shirts',
    featuredColourSlug: 'raw-oat',
    // Everyday Silhouettes is index 0 — always the default tab
    subItems: [
      {
        name: 'Everyday Silhouettes',
        slug: 'everyday-silhouettes',
        productHandles: ['over-tee-shirts', 'a-line-kurta'],
        editorial: 'Everyday forms and proportions',
      },
      {
        name: 'Relaxed Utility',
        slug: 'relaxed-utility',
        productHandles: ['over-tee-shirts', 'cargo-pants'],
        editorial: 'Built for movement and daily use',
      },
      {
        name: 'Bio-Washed Essentials',
        slug: 'bio-washed-essentials',
        productHandles: ['over-tee-shirts', 'cargo-pants', 'a-line-kurta'],
        editorial: 'The full everyday toolkit',
      },
    ],
  },
  {
    name: 'The Utility Edit',
    slug: 'utility-edit',
    heroImageUrl: '',
    headline: 'Utility without\ncompromise.',
    story:
      '300 GSM enzyme-washed canvas. Six pockets, all functional. The cargo pant reimagined for the premium Indian wardrobe — structured, softened, built to last.',
    featuredProductHandle: 'cargo-pants',
    featuredColourSlug: 'dark-olive',
    subItems: [
      {
        name: 'Relaxed Utility',
        slug: 'relaxed-utility',
        productHandles: ['cargo-pants'],
        editorial: 'Canvas built for the long day',
      },
      {
        name: 'Urban Movement',
        slug: 'urban-movement',
        productHandles: ['cargo-pants', 'over-tee-shirts'],
        editorial: 'Structured forms, free movement',
      },
      {
        name: 'Heavyweight Canvas',
        slug: 'heavyweight-canvas',
        productHandles: ['cargo-pants'],
        editorial: '300 GSM, six pockets, all purpose',
      },
    ],
  },
  {
    name: 'The Dream Edit',
    slug: 'dream-edit',
    heroImageUrl: '',
    headline: 'Soft rest,\nevery season.',
    story:
      'Soft organic sleepwear for every season. Made for rest, designed to last.',
    featuredProductHandle: 'kids-rest-sleep-set',
    featuredColourSlug: 'cloud',
    subItems: [
      {
        name: 'The Rest Sleep Set',
        slug: 'kids-rest-sleep-set',
        productHandles: ['kids-rest-sleep-set'],
        editorial: 'Full-sleeve comfort for cooler nights and AC rooms.',
      },
      {
        name: 'The Summer Sleep Set',
        slug: 'kids-summer-sleep-set',
        productHandles: ['kids-summer-sleep-set'],
        editorial: 'Lightweight cotton for warm-weather rest.',
      },
    ],
  },
  {
    name: 'The Rest Edit',
    slug: 'rest-edit',
    heroImageUrl: '',
    headline: 'Considered\nrest.',
    story:
      'Ultra-soft French Terry and combed cotton. Designed for the hours before and after sleep — and everything in between. For Indian nights that deserve better fabric.',
    featuredProductHandle: 'women-sleep-set',
    featuredColourSlug: 'morning-cream',
    subItems: [
      {
        name: "Women's Sleepwear",
        slug: 'womens-sleepwear',
        productHandles: ['women-sleep-set'],
        editorial: 'Soft enough to sleep in. Beautiful enough to wear at home.',
      },
      {
        name: 'Unisex Lounge Sets',
        slug: 'unisex-lounge-sets',
        productHandles: ['women-lounge-sets', 'women-sleep-set'],
        editorial: 'The between hours — neither sleep nor waking.',
      },
      {
        name: 'The Rest Set',
        slug: 'the-rest-set',
        productHandles: ['women-sleep-set'],
        editorial: 'Long sleeve, wide-leg ease — built for cooler nights.',
      },
    ],
  },
]

export function getEditBySlug(slug: string): Edit {
  const edit = edits.find(e => e.slug === slug)
  if (!edit) throw new Error(`Edit not found: ${slug}`)
  return edit
}

export function getSubItemBySlug(editSlug: string, subSlug: string): EditSubItem {
  const edit = getEditBySlug(editSlug)
  const sub = edit.subItems.find(s => s.slug === subSlug)
  if (!sub) throw new Error(`Sub-item not found: ${subSlug}`)
  return sub
}
