// SS2026 range. SHOPIFY TODO: this entire file is replaced by the Storefront API.
// normalizeProduct() in src/utils/normalizeProduct.ts maps the Shopify
// GraphQL response to the Product type defined in src/types/product.ts.
// No component file needs to change — only the data source import in
// src/hooks/useProduct.ts changes.

import type { Product, ProductImage, ImageType, ProductColour, ProductSize, ProductSizeChart } from '@/types/product'


// ─── Sized placeholder — hero 2000×2500, stack 1200×1500, text always F2EDE6 ──
function phImg(bg: string, w: number, h: number, label: string): string {
  return `https://placehold.co/${w}x${h}/${bg}/F2EDE6?text=${encodeURIComponent(label)}`
}

// ─── Local image helper ───────────────────────────────────────────────────────
// Builds a ProductImage from a file inside public/images/.
// Encodes spaces in folder path segments so the URL is valid; filenames on
// disk use underscores so no encoding is needed there.
function localImg(
  id: string,
  folder: string,           // e.g. "Unisex/cargos/DARKOLIVE"
  filename: string,         // e.g. "font_view.png"
  type: ImageType,
  productName: string,
  colourSlug: string,
): ProductImage {
  const encodedFolder = folder
    .split('/')
    .map(seg => seg.replace(/ /g, '%20'))
    .join('/')
  return {
    id,
    src: `/images/${encodedFolder}/${filename}`,
    alt: `${productName} — ${type} — ${colourSlug}`,
    type,
    colourSlug,
  }
}

// ─── Placeholder images (until real photography exists) ─────────────────────
// Text colour flips to dark on light backgrounds so the label stays legible.
function phLabelHex(bg: string): string {
  const n = parseInt(bg, 16)
  const lum = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255
  return lum > 0.6 ? '333333' : 'F2EDE6'
}

function placeholderImages(
  productId: string,
  productName: string,
  colourSlug: string,
  hex: string,            // without '#'
  label: string = productName,
): ProductImage[] {
  const s = colourSlug
  const fg = phLabelHex(hex)
  const img = (w: number, h: number, kind: string) =>
    `https://placehold.co/${w}x${h}/${hex}/${fg}?text=${encodeURIComponent(`${label} ${kind}`)}`
  return [
    { id: `${productId}-${s}-sf`, src: img(2000, 2500, 'studio-front'), alt: `${productName} — studio-front — ${s}`, type: 'studio-front', colourSlug: s },
    { id: `${productId}-${s}-wk`, src: img(1200, 1500, 'walking'),      alt: `${productName} — walking — ${s}`,      type: 'walking',      colourSlug: s },
    { id: `${productId}-${s}-sb`, src: img(1200, 1500, 'studio-back'),  alt: `${productName} — studio-back — ${s}`,  type: 'studio-back',  colourSlug: s },
    { id: `${productId}-${s}-d1`, src: img(1200, 1500, 'detail'),       alt: `${productName} — detail — ${s}`,       type: 'detail',       colourSlug: s },
  ]
}

interface ColourSpec { slug: string; label: string; hex: string; available?: boolean }

function colourFromSpec(productId: string, productName: string, c: ColourSpec): ProductColour {
  return {
    slug: c.slug,
    label: c.label,
    hex: `#${c.hex}`,
    available: c.available !== false,
    images: placeholderImages(productId, productName, c.slug, c.hex),
  }
}

function sizesOf(labels: string[]): ProductSize[] {
  return labels.map(label => ({ label, available: true }))
}

/** Fields no new product has real content for yet — left empty rather than invented. */
function baseProduct(
  p: Pick<Product, 'id' | 'name' | 'category' | 'handle' | 'collectionName' | 'collectionSlug' | 'colours' | 'sizes'> & Partial<Product>,
): Product {
  return {
    badge: null,
    compositionQuote: '',
    price: null, // MRP [₹] not yet supplied
    currency: '₹',
    trustLine: 'Inclusive of all taxes',
    sizeUnit: null,
    featureBullets: [],
    specs: [],
    fabricPillars: [],
    fitBars: [],
    modelNote: null,
    care: [],
    accordions: [],
    collectionItems: [],
    ...p,
  }
}

// ─── Cargo image config ───────────────────────────────────────────────────────
// Both live colours have real images on disk.
// front_studio_view.webp is always the hero; all others appear as stack images.

interface CargoFiles {
  front:     string   // front_studio_view.webp           — hero
  back:      string   // back_studio_view.webp            — stack
  flatlay:   string   // flat_lay_view.webp               — stack
  sitting:   string   // sittingorLearning_studio_view.webp — stack
  stylewith: string   // stylewith_view.webp / .png       — stack
  walk:      string   // walking_view.webp                — stack
  fabric:    string   // fabric_close_up.webp             — stack
}

interface CargoConfig {
  slug:      string
  hex:       string
  textHex:   string
  label:     string
  folder:    string | null   // null → no real images, use phImg() fallback
  files?:    CargoFiles
  available?: boolean        // false = hidden from frontend; re-enable for Season 2
}

const cargoSlugs: CargoConfig[] = [
  // ── 1. DARKOLIVE — SS2026 launch ────────────────────────────────────────────
  {
    slug: 'forest-floor', hex: '4A5240', textHex: 'FFFFFF', label: 'Forest Floor', available: true, // Pantone 19-0417 TCX
    folder: 'Unisex/cargos/DARKOLIVE',
    files: {
      front:     'front_studio_view.webp',
      back:      'back_studio_view.webp',
      flatlay:   'flat_lay_view.webp',
      sitting:   'sittingorLearning_studio_view.webp',
      stylewith: 'stylewith_view.webp',
      walk:      'walking_view.webp',
      fabric:    'fabric_close_up.webp',
    },
  },
  // ── 2. SANDBEIGE — SS2026 launch ────────────────────────────────────────────
  {
    slug: 'chalk-stone', hex: 'C4B49A', textHex: '333333', label: 'Chalk Stone', available: true,  // Pantone 12-0712 TCX
    folder: 'Unisex/cargos/SANDBEIGE',
    files: {
      front:     'front_studio_view.webp',
      back:      'back_studio_view.webp',
      flatlay:   'flat_lay_view.webp',
      sitting:   'sittingorLearning_studio_view.webp',
      stylewith: 'stylewith_view.png',
      walk:      'walking_view.webp',
      fabric:    'fabric_close_up.webp',
    },
  },
]

function buildCargoImages(c: CargoConfig): ProductImage[] {
  // Fallback: no real images on disk for this colour
  if (!c.folder || !c.files) {
    const n = 'Six Pocket Cargo Pant'
    return [
      { id: `cargo-${c.slug}-sf`, src: phImg(c.hex, 2000, 2500, `${n} studio-front`), alt: `${n} — studio-front — ${c.slug}`, type: 'studio-front', colourSlug: c.slug },
      { id: `cargo-${c.slug}-wk`, src: phImg(c.hex, 1200, 1500, `${n} walking`),      alt: `${n} — walking — ${c.slug}`,      type: 'walking',      colourSlug: c.slug },
      { id: `cargo-${c.slug}-sb`, src: phImg(c.hex, 1200, 1500, `${n} studio-back`),  alt: `${n} — studio-back — ${c.slug}`,  type: 'studio-back',  colourSlug: c.slug },
      { id: `cargo-${c.slug}-d1`, src: phImg(c.hex, 1200, 1500, `${n} detail`),       alt: `${n} — detail — ${c.slug}`,       type: 'detail',       colourSlug: c.slug },
    ]
  }
  return [
    localImg(`cargo-${c.slug}-sf`, c.folder, c.files.front,     'studio-front', 'Six Pocket Cargo Pant', c.slug),  // hero
    localImg(`cargo-${c.slug}-sb`, c.folder, c.files.back,      'studio-back',  'Six Pocket Cargo Pant', c.slug),  // stack
    localImg(`cargo-${c.slug}-fl`, c.folder, c.files.flatlay,   'detail',       'Six Pocket Cargo Pant', c.slug),  // stack
    localImg(`cargo-${c.slug}-st`, c.folder, c.files.sitting,   'editorial',    'Six Pocket Cargo Pant', c.slug),  // stack
    localImg(`cargo-${c.slug}-sw`, c.folder, c.files.stylewith, 'editorial',    'Six Pocket Cargo Pant', c.slug),  // stack
    localImg(`cargo-${c.slug}-wk`, c.folder, c.files.walk,      'walking',      'Six Pocket Cargo Pant', c.slug),  // stack
    localImg(`cargo-${c.slug}-fc`, c.folder, c.files.fabric,    'detail',       'Six Pocket Cargo Pant', c.slug),  // stack
  ]
}


// Converted from the inch size guide this product used to carry (garment
// measurements; "half" = half-circumference) — 1 in = 2.54 cm, one decimal.
const inToCm = (n: number) => Math.round(n * 2.54 * 10) / 10
const CARGO_SIZE_CHART: ProductSizeChart = {
  unit: 'cm',
  columns: ['Outseam', 'Waist (half)', 'Hip (half)', 'Inseam', 'Leg opening (half)'],
  rows: ([
    ['S',   39.5, 14.5, 21.5, 28.5, 13],
    ['M',   40.5, 15.5, 23,   29,   13.5],
    ['L',   41.5, 16.5, 24.5, 29.5, 14],
    ['XL',  42,   18,   26,   30,   14.5],
    ['XXL', 43,   20,   28,   31,   15],
  ] as const).map(([size, outseam, waist, hip, inseam, leg]) => ({
    size,
    measurements: {
      'outseam': inToCm(outseam),
      'waist (half)': inToCm(waist),
      'hip (half)': inToCm(hip),
      'inseam': inToCm(inseam),
      'leg opening (half)': inToCm(leg),
    },
  })),
}

// ─── Six Pocket Cargo Pant ────────────────────────────────────────────
const cargoPants: Product = {
  id: 'six-pocket-cargo-pant',
  name: 'Six Pocket Cargo Pant',
  category: 'Cargo Pant',
  handle: 'cargo-pants',
  collectionName: 'Unisex',
  collectionSlug: 'unisex',
  badge: null,
  compositionQuote: '',
  description: 'A six-pocket cargo pant in a sturdy fabric, with a split drawcord and roomy bellows pockets.',
  descriptionIsDraft: true,
  fitLabel: 'Unisex fit',
  price: null, // MRP [₹] not yet supplied
  currency: '₹',
  trustLine: 'Inclusive of all taxes',
  sizeUnit: null,
  sizeChart: CARGO_SIZE_CHART,
  modelNote: "Priya is 5'6\" wearing size M. Model weight 58kg.",

  colours: cargoSlugs.map(c => ({
    slug:      c.slug,
    label:     c.label,
    hex:       `#${c.hex}`,
    available: c.available !== false,
    images:    buildCargoImages(c),
  })),

  sizes: [
    { label: 'S',   available: true  },
    { label: 'M',   available: true  },
    { label: 'L',   available: true  },
    { label: 'XL',  available: true  },
    { label: 'XXL', available: false },
  ],

  featureBullets: [
    '300 GSM Cotton Canvas Twill',
    'Six fully functional pockets',
    'Relaxed straight-leg silhouette',
    'Soft elastic waistband with drawcord',
    'Unisex sizing',
  ],

  specs: [
    { label: 'Fabric',       value: '100% Cotton Canvas'    },
    { label: 'Weight',       value: '300 GSM'               },
    { label: 'Construction', value: 'Twill Weave'           },
    { label: 'Finish',       value: 'Garment washed'        },
    { label: 'Fit',          value: 'Relaxed straight leg'  },
    { label: 'Pockets',      value: '6 fully functional'    },
    { label: 'Waistband',    value: 'Elastic with drawcord' },
    { label: 'Country',      value: 'Made in India'         },
  ],

  fabricPillars: [
    {
      value: '300',
      unit: 'GSM',
      subLabel: 'Canvas weight',
      description:
        'Structured without stiffness. Holds shape through long wear and repeated washing.',
    },
    {
      value: '6',
      unit: '',
      subLabel: 'Functional pockets',
      description:
        'All six pockets fully usable. No decorative stitching. Every pocket tested.',
    },
    {
      value: '100%',
      unit: 'Cotton',
      subLabel: 'Cotton canvas',
      description:
        'Pure cotton twill. Breathable. Softens naturally with each wash.',
    },
  ],

  fitBars: [
    { label: 'Waist ease',   value: 70, descriptor: 'Relaxed'  },
    { label: 'Hip ease',     value: 75, descriptor: 'Generous' },
    { label: 'Thigh',        value: 65, descriptor: 'Straight' },
    { label: 'Rise',         value: 72, descriptor: 'Mid-high' },
    { label: 'Leg opening',  value: 60, descriptor: 'Tapered'  },
    { label: 'Length',       value: 80, descriptor: 'Full'     },
  ],

  care: [
    { icon: 'wash',      label: 'Machine wash cold 30°C'     },
    { icon: 'sun-off',   label: 'Dry in shade'               },
    { icon: 'flame-off', label: 'Cool iron only'             },
    { icon: 'ban',       label: 'Do not bleach or dry clean' },
  ],

  accordions: [],

  collectionItems: [],

  editorial: {
    quote:
      '300 GSM enzyme-washed canvas. Six-pocket utility silhouette. Built for movement, worn for life.',
    specs: [
      { label: 'Fabric',  value: '300 GSM Canvas'  },
      { label: 'Pockets', value: 'Six utility'      },
      { label: 'Fit',     value: 'Relaxed straight' },
      { label: 'Wash',    value: 'Enzyme softened'  },
      { label: 'Origin',  value: 'Made in India'    },
    ],
    byImage: {
      'studio-front': {
        headline: "Six pockets.\nAll functional.",
        body: 'Two front slash, two side cargo with flap, two back patch. Each pocket sized to be used — phone, keys, wallet. Nothing forced.',
        specs: [
          { label: 'Pockets',      value: 'Six utility'      },
          { label: 'Cargo pocket', value: 'Flap + snap'      },
          { label: 'Fit',          value: 'Relaxed straight' },
        ],
      },
      'walking': {
        headline: "Built for\nmovement.",
        body: '300 GSM enzyme-washed canvas. Heavy enough to hold its shape, soft enough to move. Crotch gusset allows full stride without restriction.',
        specs: [
          { label: 'Weight',       value: '300 GSM'         },
          { label: 'Construction', value: 'Crotch gusset'   },
          { label: 'Finish',       value: 'Enzyme softened' },
        ],
      },
      'studio-back': {
        headline: "Waistband\nyou will wear.",
        body: 'Partial elastic at back, flat front. Mid-rise. Internal drawcord. Sits correctly whether tucked or left out.',
        specs: [
          { label: 'Waistband', value: 'Partial elastic back' },
          { label: 'Closure',   value: 'Internal drawcord'    },
          { label: 'Rise',      value: 'Mid-rise'             },
        ],
      },
      'studio-side': {
        headline: "The straight\nleg proportion.",
        body: 'Relaxed through the thigh, straight to the ankle. Not tapered. Not wide leg. The proportion that works with everything in the wardrobe.',
        specs: [
          { label: 'Leg',     value: 'Relaxed straight' },
          { label: 'Opening', value: '18cm at hem'      },
          { label: 'Length',  value: 'Full length'      },
        ],
      },
      'detail': {
        headline: "300 GSM\nenzyme canvas.",
        body: 'Enzyme washing softens the canvas structure while preserving weight and durability. Colour settles after first wash — improves with age.',
        specs: [
          { label: 'Fabric',  value: '300 GSM Canvas' },
          { label: 'Process', value: 'Enzyme washed'  },
          { label: 'Origin',  value: 'Made in India'  },
        ],
      },
    },
  },
}

// ─── Kids Unisex Tee ──────────────────────────────────────────────
// No real photography yet — placeholder images via placeholderImages().
// Launch colours: Cloud, Mist Blue. Other tones pending photography.
const kidsUnisexTeeColours: Array<{ slug: string; hex: string; label: string; pantone?: string; isUnique: boolean; available: boolean }> = [
  { slug: 'cloud',     hex: 'F5F2EC', label: 'Cloud',     pantone: '11-0601 TCX', isUnique: false, available: true },
  { slug: 'dust-sage', hex: '9EAA8C', label: 'Dust Sage',                          isUnique: false, available: true },
]

const kidsUnisexTee: Product = {
  id: 'kids-unisex-tee',
  name: 'Kids Unisex Tee',
  category: 'Kids Tee',
  handle: 'kids-unisex-tee',
  collectionName: 'Kids',
  collectionSlug: 'kids',
  badge: null,
  compositionQuote: '',
  description: '[DESCRIPTION]',
  price: null, // MRP [₹] not yet supplied
  currency: '₹',
  trustLine: 'Inclusive of all taxes',
  sizeUnit: null,
  modelNote: null,

  colours: kidsUnisexTeeColours.map(c => ({
    slug:      c.slug,
    label:     c.label,
    hex:       `#${c.hex}`,
    available: c.available,
    ...(c.pantone ? { pantone: c.pantone } : {}),
    isUnique:  c.isUnique,
    finish:    'plain',
    images:    placeholderImages('kids-tee-' + c.slug, 'Kids Unisex Tee', c.slug, c.hex),
  })),

  sizes: [
    { label: '4Y',  available: true },
    { label: '6Y',  available: true },
    { label: '8Y',  available: true },
    { label: '10Y', available: true },
    { label: '12Y', available: true },
  ],

  featureBullets: [
    '160–180 GSM combed cotton jersey',
    'Relaxed unisex tee',
    'Crew neck, short sleeve',
    'Sizes 4Y to 12Y',
  ],

  specs: [
    { group: 'Material',     label: 'Fabric',        value: 'Combed Cotton Jersey'          },
    { group: 'Material',     label: 'Weight',        value: '160–180 GSM'                   },
    { group: 'Construction', label: 'Neck',          value: 'Crew neck'                      },
    { group: 'Construction', label: 'Sleeve',        value: 'Short sleeve'                   },
    { group: 'Construction', label: 'Sizes',         value: '4Y – 12Y unisex'                },
    { group: 'Production',   label: 'Origin',        value: 'Made in India'                  },
  ],

  fabricPillars: [
    {
      value: '160–180',
      unit: 'GSM',
      subLabel: 'Combed cotton jersey',
      description: 'Light, breathable jersey built for everyday play. Soft against skin, easy to move in.',
    },
  ],

  fitBars: [
    { label: 'Body ease', value: 55, descriptor: 'Relaxed' },
    { label: 'Length',    value: 50, descriptor: 'Regular' },
    { label: 'Sleeve',    value: 30, descriptor: 'Short'   },
    { label: 'Neck ease', value: 45, descriptor: 'Regular' },
  ],

  care: [
    { icon: 'wash',      label: 'Machine wash 30°C gentle' },
    { icon: 'sun-off',   label: 'Dry in shade'             },
    { icon: 'flame-off', label: 'Warm iron only'           },
    { icon: 'ban',       label: 'Do not bleach'            },
  ],

  accordions: [],

  collectionItems: [],
}


// ─── Sunday Tee ───────────────────────────────────────────────────────────────
const sundayTee = baseProduct({
  id: 'sunday-tee',
  name: 'Sunday Tee',
  category: 'Tee',
  handle: 'sunday-tee',
  collectionName: 'Unisex',
  collectionSlug: 'unisex',
  description: 'An everyday tee with a gently flared hem for an easy, relaxed drape.',
  descriptionIsDraft: true,
  fitLabel: 'Unisex fit',
  colours: [
    colourFromSpec('sunday-tee', 'Sunday Tee', { slug: 'bone',     label: 'Bone',     hex: 'F0EBE0' }),
    colourFromSpec('sunday-tee', 'Sunday Tee', { slug: 'espresso', label: 'Espresso', hex: '363031' }),
  ],
  sizes: sizesOf(['S', 'M', 'L', 'XL', 'XXL']),
})

// ─── The Mandarin Collar Tee ──────────────────────────────────────────────────
const mandarinCollarTee = baseProduct({
  id: 'mandarin-collar-tee',
  name: 'The Mandarin Collar Tee',
  category: 'Tee',
  handle: 'mandarin-collar-tee',
  collectionName: 'Unisex',
  collectionSlug: 'unisex',
  description: 'A relaxed, oversized tee with a clean mandarin collar and flat, comfortable shoulder seams.',
  descriptionIsDraft: true,
  fitLabel: 'Unisex fit',
  colours: [
    colourFromSpec('mandarin-collar-tee', 'The Mandarin Collar Tee', { slug: 'bone',     label: 'Bone',     hex: 'F0EBE0' }),
    colourFromSpec('mandarin-collar-tee', 'The Mandarin Collar Tee', { slug: 'espresso', label: 'Espresso', hex: '363031' }),
  ],
  sizes: sizesOf(['S', 'M', 'L', 'XL', 'XXL']),
})

// ─── Women's Co-ord Set ───────────────────────────────────────────────────────
// Sold as a set: one colourway, Espresso shirt with Stone pant.
const womensCoordSet = baseProduct({
  id: 'womens-coord-set',
  name: "Women's Co-ord Set",
  category: 'Co-ord Set',
  handle: 'womens-co-ord-set',
  collectionName: 'Women',
  collectionSlug: 'womens',
  description: '[DESCRIPTION]',
  colours: [
    {
      ...colourFromSpec('womens-coord-set', "Women's Co-ord Set", { slug: 'espresso-stone', label: 'Espresso / Stone', hex: '363031' }),
      hex: 'linear-gradient(135deg, #363031 50%, #CBC3B4 50%)',
    },
  ],
  sizes: sizesOf(['S', 'M', 'L', 'XL', '2XL']),
})

// ─── Kids Unisex Relaxed Curved Utility Pant ──────────────────────────────────
const KIDS_SIZES = ['4Y', '6Y', '8Y', '10Y', '12Y']

const kidsUtilityPant = baseProduct({
  id: 'kids-utility-pant',
  name: 'Kids Unisex Relaxed Curved Utility Pant',
  category: 'Kids Pant',
  handle: 'kids-utility-pant',
  collectionName: 'Kids',
  collectionSlug: 'kids',
  description: 'A relaxed pant with a gently curved leg, a signature curved side pocket and a handy thigh patch pocket.',
  descriptionIsDraft: true,
  colours: [
    colourFromSpec('kids-utility-pant', 'Kids Utility Pant', { slug: 'dust-sage',     label: 'Dust Sage',     hex: '9EAA8C' }),
    colourFromSpec('kids-utility-pant', 'Kids Utility Pant', { slug: 'biscuit-beige', label: 'Biscuit Beige', hex: 'D9C3A0' }),
  ],
  sizes: sizesOf(KIDS_SIZES),
})

// ─── Kids Tee + Pant Set ──────────────────────────────────────────────────────
// Two fixed combos. The Set references the two standalone products (see
// Product.set) — the Returns policy prices partial-set refunds from those
// products' MRPs, so both must always exist and carry a price.
const KIDS_SET_COMBOS = [
  { slug: 'cloud-tee-dust-sage-pant',         label: 'Cloud Tee + Dust Sage Pant',         teeHex: 'F5F2EC', pantHex: '9EAA8C', teeSlug: 'cloud',     pantSlug: 'dust-sage' },
  { slug: 'dust-sage-tee-biscuit-beige-pant', label: 'Dust Sage Tee + Biscuit Beige Pant', teeHex: '9EAA8C', pantHex: 'D9C3A0', teeSlug: 'dust-sage', pantSlug: 'biscuit-beige' },
] as const

const kidsTeePantSet = baseProduct({
  id: 'kids-tee-pant-set',
  name: 'Kids Tee + Pant Set',
  category: 'Kids Set',
  handle: 'kids-tee-pant-set',
  collectionName: 'Kids',
  collectionSlug: 'kids',
  description: '[DESCRIPTION]',
  colours: KIDS_SET_COMBOS.map(c => ({
    slug: c.slug,
    label: c.label,
    hex: `linear-gradient(135deg, #${c.teeHex} 50%, #${c.pantHex} 50%)`,
    available: true,
    // Placeholder hero images named by combo until real photography exists.
    images: placeholderImages('kids-set-' + c.slug, 'Kids Tee + Pant Set', c.slug, c.teeHex, `Kids Set — ${c.label}`),
  })),
  sizes: sizesOf(KIDS_SIZES),
  set: {
    teeProductId: 'kids-unisex-tee',
    pantProductId: 'kids-utility-pant',
    combos: KIDS_SET_COMBOS.map(c => ({
      colourSlug: c.slug,
      tee:  { productId: 'kids-unisex-tee',   handle: 'kids-unisex-tee',   colourSlug: c.teeSlug },
      pant: { productId: 'kids-utility-pant', handle: 'kids-utility-pant', colourSlug: c.pantSlug },
    })),
  },
})

// ─── A-line Kurta Set — COMING SOON ───────────────────────────────────────────
// Not purchasable: no price, no sizes. Images are placeholders for now.
const aLineKurtaSet = baseProduct({
  id: 'a-line-kurta-set',
  name: 'A-line Kurta Set',
  category: 'Kurta Set',
  handle: 'a-line-kurta-set',
  collectionName: 'Women',
  collectionSlug: 'womens',
  comingSoon: true,
  comingSoonLine: "Arriving soon. Leave your email and we'll let you know when it's here.",
  colours: [colourFromSpec('a-line-kurta-set', 'A-line Kurta Set', { slug: 'ivory', label: 'Ivory', hex: 'F1EEE6', available: false })],
  sizes: [],
})


// ─── Exported array ────────────────────────────────────────────────────────────
// Order = "Shop all" order: live products first, coming-soon last.
export const products: Product[] = [
  sundayTee,
  mandarinCollarTee,
  cargoPants,
  womensCoordSet,
  kidsUnisexTee,
  kidsUtilityPant,
  kidsTeePantSet,
  aLineKurtaSet,
]

// ─── Helper: look up by URL handle ────────────────────────────────────────────
export function getProductByHandle(handle: string): Product {
  const product = products.find(p => p.handle === handle)
  if (!product) throw new Error(`Product not found: ${handle}`)
  return product
}

export function getProductById(id: string): Product | undefined {
  return products.find(p => p.id === id)
}

// ─── Helper: filter by collection slug ────────────────────────────────────────
// collection matches product.collectionSlug: 'unisex' | 'womens' | 'kids'
export function getProductsByCollection(collection: string): Product[] {
  return products.filter(p => p.collectionSlug === collection && !p.archived)
}

// ─── Helper: filter by product category ───────────────────────────────────────
export function getProductsByCategory(category: string): Product[] {
  return products.filter(p => p.category === category && !p.archived)
}

/** The standalone Tee + Pant a Set combo is made of, with their standalone MRPs. */
export function getSetPieces(setProduct: Product, comboSlug: string) {
  const combo = setProduct.set?.combos.find(c => c.colourSlug === comboSlug)
  if (!combo) return null
  const tee = getProductById(combo.tee.productId)
  const pant = getProductById(combo.pant.productId)
  if (!tee || !pant) return null
  return { combo, tee, pant }
}
