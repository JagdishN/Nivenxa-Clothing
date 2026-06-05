// ─── Edit data ────────────────────────────────────────────────────────────────
// Defines the 4 editorial story pages (Edits) and their sub-items.
// heroImageUrl is left empty — EditPage computes the hero from
// featuredProductHandle + featuredColourSlug at render time.

export interface EditSubItem {
  name: string
  slug: string
  productHandles: string[]
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
    name: 'The Everyday Edit',
    slug: 'everyday-edit',
    heroImageUrl: '',
    headline: 'Dressed for the day.\nEvery day.',
    story:
      'Bio-washed comfortwear built for the rhythm of Indian daily life. Heavyweight enough to feel considered. Light enough to forget you\'re wearing it.',
    featuredProductHandle: 'over-tee-shirts',
    featuredColourSlug: 'raw-oat',
    subItems: [
      {
        name: 'Relaxed Utility',
        slug: 'relaxed-utility',
        productHandles: ['over-tee-shirts', 'cargo-pants'],
      },
      {
        name: 'Everyday Silhouettes',
        slug: 'everyday-silhouettes',
        productHandles: ['over-tee-shirts', 'a-line-kurta'],
      },
      {
        name: 'Bio-Washed Essentials',
        slug: 'bio-washed-essentials',
        productHandles: ['over-tee-shirts', 'cargo-pants', 'a-line-kurta', 'kids-sleepwear'],
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
      },
      {
        name: 'Urban Movement',
        slug: 'urban-movement',
        productHandles: ['cargo-pants', 'over-tee-shirts'],
      },
      {
        name: 'Heavyweight Canvas',
        slug: 'heavyweight-canvas',
        productHandles: ['cargo-pants'],
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
    featuredProductHandle: 'women-sleepwear',
    featuredColourSlug: 'soft-cream',
    subItems: [
      {
        name: "Women's Sleepwear",
        slug: 'womens-sleepwear',
        productHandles: ['women-sleepwear'],
      },
      {
        name: 'Kids Sleepwear',
        slug: 'kids-sleepwear',
        productHandles: ['kids-sleepwear'],
      },
      {
        name: 'Unisex Lounge Sets',
        slug: 'unisex-lounge-sets',
        productHandles: ['women-lounge-sets', 'women-sleepwear'],
      },
    ],
  },
  {
    name: "The Women's Edit",
    slug: 'womens-edit',
    heroImageUrl: '',
    headline: 'Indo-Western for\neveryday India.',
    story:
      'Cotton-Modal silhouettes designed for the contemporary Indian woman. Not occasion wear. Not casual wear. The space between — for every day that deserves both.',
    featuredProductHandle: 'a-line-kurta',
    featuredColourSlug: 'warm-ivory',
    subItems: [
      {
        name: 'A-line Kurta',
        slug: 'a-line-kurta',
        productHandles: ['a-line-kurta'],
      },
      {
        name: 'Co-ord Set',
        slug: 'co-ord-set',
        productHandles: ['women-lounge-sets'],
      },
      {
        name: 'Indo-Western Silhouettes',
        slug: 'indo-western-silhouettes',
        productHandles: ['a-line-kurta', 'women-lounge-sets'],
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
