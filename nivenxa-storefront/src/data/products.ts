// SHOPIFY TODO: this entire file is replaced by the Storefront API.
// normalizeProduct() in src/utils/normalizeProduct.ts maps the Shopify
// GraphQL response to the Product type defined in src/types/product.ts.
// No component file needs to change — only the data source import in
// src/hooks/useProduct.ts changes.

import type { Product, ProductImage, ImageType } from '@/types/product'

// ─── Fallback: placehold.co (used when no real image exists for a colour) ────
function ph(bg: string, text: string, label: string): string {
  return `https://placehold.co/800x1000/${bg}/${text}?text=${encodeURIComponent(label)}`
}

// ─── Sized placeholder — hero 2000×2500, stack 1200×1500, text always F2EDE6 ──
function phImg(bg: string, w: number, h: number, label: string): string {
  return `https://placehold.co/${w}x${h}/${bg}/F2EDE6?text=${encodeURIComponent(label)}`
}

// ─── Generic placeholder image builder ───────────────────────────────────────
function buildPlaceholderImages(
  productId: string,
  productName: string,
  colourSlug: string,
  hex: string,            // without '#'
): ProductImage[] {
  const n = productName
  const s = colourSlug
  return [
    { id: `${productId}-${s}-sf`, src: phImg(hex, 2000, 2500, `${n} studio-front`), alt: `${n} — studio-front — ${s}`, type: 'studio-front', colourSlug: s },
    { id: `${productId}-${s}-wk`, src: phImg(hex, 1200, 1500, `${n} walking`),      alt: `${n} — walking — ${s}`,      type: 'walking',      colourSlug: s },
    { id: `${productId}-${s}-sb`, src: phImg(hex, 1200, 1500, `${n} studio-back`),  alt: `${n} — studio-back — ${s}`,  type: 'studio-back',  colourSlug: s },
    { id: `${productId}-${s}-ss`, src: phImg(hex, 1200, 1500, `${n} studio-side`),  alt: `${n} — studio-side — ${s}`,  type: 'studio-side',  colourSlug: s },
    { id: `${productId}-${s}-d1`, src: phImg(hex, 1200, 1500, `${n} detail`),       alt: `${n} — detail — ${s}`,       type: 'detail',       colourSlug: s },
  ]
}

// ─── Local image helper ───────────────────────────────────────────────────────
// Builds a ProductImage from a file inside public/images/.
// Encodes spaces in folder path segments so the URL is valid; filenames on
// disk use underscores so no encoding is needed there.
function localImg(
  id: string,
  folder: string,           // e.g. "Men/OversizedTee's/desert clay"
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

// ─── Tee image config ─────────────────────────────────────────────────────────
// Each entry maps a colour slug to the exact filenames on disk.
// Folder paths reference physical directory names — unchanged by slug renames.

interface TeeConfig {
  slug: string
  hex: string
  textHex: string
  label: string
  folder: string
  front: string     // front_studio_view.webp  → studio-front (sticky hero)
  back: string      // back_studio_view.webp   → studio-back
  side: string      // side_studio_view.webp   → studio-side
  walk: string      // walking_view.webp       → walking
  fabric: string    // fabric_close_up.webp    → detail (last in stack)
}

// All 6 colours share identical filenames — confirmed on disk 2025-06-03.
const COMMON_FILES = {
  front:  'front_studio_view.webp',
  back:   'back_studio_view.webp',
  side:   'side_studio_view.webp',
  walk:   'walking_view.webp',
  fabric: 'fabric_close_up.webp',
}

const teeSlugs: TeeConfig[] = [
  // ── 1. DEFAULT COLOUR (first = default on product page) ───────────────────
  { slug: 'raw-oat',   hex: 'D4C5A9', textHex: '333333', label: 'Raw Oat',   folder: "Men/OversizedTee's/OAT BEIGE",      ...COMMON_FILES },
  // ── 2. BONE ───────────────────────────────────────────────────────────────
  { slug: 'bone',      hex: 'F0EBE0', textHex: '333333', label: 'Bone',      folder: "Men/OversizedTee's/WARM IVORY",     ...COMMON_FILES },
  // ── 3. ESPRESSO ───────────────────────────────────────────────────────────
  { slug: 'espresso',  hex: '5C5248', textHex: 'FFFFFF', label: 'Espresso',  folder: "Men/OversizedTee's/CHARCOAL EARTH", ...COMMON_FILES },
  // ── 4. MUSHROOM ───────────────────────────────────────────────────────────
  { slug: 'mushroom',  hex: 'A89888', textHex: 'FFFFFF', label: 'Mushroom',  folder: "Men/OversizedTee's/MUSHROOM TAUPE", ...COMMON_FILES },
  // ── 5. EARTH ──────────────────────────────────────────────────────────────
  { slug: 'earth',     hex: '8B7355', textHex: 'FFFFFF', label: 'Earth',     folder: "Men/OversizedTee's/MINERAL BROWN",  ...COMMON_FILES },
  // ── 6. RED EARTH ──────────────────────────────────────────────────────────
  { slug: 'red-earth', hex: 'C47A4E', textHex: 'FFFFFF', label: 'Red Earth', folder: "Men/OversizedTee's/DESERT CLAY",    ...COMMON_FILES },
]

function buildTeeImages(c: TeeConfig): ProductImage[] {
  // Gallery layout:
  //   Col 2 (sticky hero) → studio-front
  //   Col 3 stack         → walking · studio-back · studio-side · fabric close-up
  return [
    localImg(`tee-${c.slug}-sf`, c.folder, c.front,  'studio-front', 'Heavyweight Pocket Tee', c.slug),
    localImg(`tee-${c.slug}-wk`, c.folder, c.walk,   'walking',      'Heavyweight Pocket Tee', c.slug),
    localImg(`tee-${c.slug}-sb`, c.folder, c.back,   'studio-back',  'Heavyweight Pocket Tee', c.slug),
    localImg(`tee-${c.slug}-ss`, c.folder, c.side,   'studio-side',  'Heavyweight Pocket Tee', c.slug),
    localImg(`tee-${c.slug}-fc`, c.folder, c.fabric, 'detail',       'Heavyweight Pocket Tee', c.slug),
  ]
}

// ─── Cargo image config ───────────────────────────────────────────────────────
// charcoal-grey and dark-olive have real images.
// stone-beige has no matching folder — falls back to placehold.co (unchanged).

interface CargoFiles {
  front: string
  back: string
  side: string
  walk: string
  edit: string
  detail: string
}

interface CargoConfig {
  slug: string
  hex: string
  textHex: string
  label: string
  folder: string | null   // null → no real images, use ph() fallback
  files?: CargoFiles
}

const cargoSlugs: CargoConfig[] = [
  {
    slug: 'charcoal-grey', hex: '4A4A4A', textHex: 'FFFFFF', label: 'Charcoal Grey',
    folder: 'Unisex/cargos/charcoalgrey',
    files: {
      front:  'front_view.png',
      back:   'back_view.png',
      side:   'side_view.png',
      walk:   'walking_view.png',
      edit:   'lifestyle_view.png',
      detail: 'pocket_details_view.png',
    },
  },
  {
    slug: 'dark-olive',    hex: '4A5240', textHex: 'FFFFFF', label: 'Dark Olive',
    folder: 'Unisex/cargos/darkolive',
    files: {
      front:  'front_view.png',
      back:   'back_view.png',
      side:   'side_view.png',
      walk:   'walking_view.png',
      edit:   'cargo_lifestyle_view.png',  // differs from charcoal-grey
      detail: 'pocket_details_view.png',
    },
  },
  {
    slug: 'stone-beige',   hex: 'C4B49A', textHex: '333333', label: 'Stone Beige',
    folder: null,   // no matching folder on disk — placehold.co fallback used below
  },
  { slug: 'jet-black',   hex: '1A1A1A', textHex: 'FFFFFF', label: 'Jet Black',   folder: null },
  { slug: 'mocha-brown', hex: '7B5C47', textHex: 'FFFFFF', label: 'Mocha Brown', folder: null },
  { slug: 'rust-clay',   hex: 'B5572A', textHex: 'FFFFFF', label: 'Rust Clay',   folder: null },
]

function buildCargoImages(c: CargoConfig): ProductImage[] {
  // Fallback: no real images on disk for this colour
  if (!c.folder || !c.files) {
    const n = 'Six-Pocket Cargo Pant'
    return [
      { id: `cargo-${c.slug}-sf`, src: phImg(c.hex, 2000, 2500, `${n} studio-front`), alt: `${n} — studio-front — ${c.slug}`, type: 'studio-front', colourSlug: c.slug },
      { id: `cargo-${c.slug}-wk`, src: phImg(c.hex, 1200, 1500, `${n} walking`),      alt: `${n} — walking — ${c.slug}`,      type: 'walking',      colourSlug: c.slug },
      { id: `cargo-${c.slug}-sb`, src: phImg(c.hex, 1200, 1500, `${n} studio-back`),  alt: `${n} — studio-back — ${c.slug}`,  type: 'studio-back',  colourSlug: c.slug },
      { id: `cargo-${c.slug}-ss`, src: phImg(c.hex, 1200, 1500, `${n} studio-side`),  alt: `${n} — studio-side — ${c.slug}`,  type: 'studio-side',  colourSlug: c.slug },
      { id: `cargo-${c.slug}-d1`, src: phImg(c.hex, 1200, 1500, `${n} detail`),       alt: `${n} — detail — ${c.slug}`,       type: 'detail',       colourSlug: c.slug },
    ]
  }
  return [
    localImg(`cargo-${c.slug}-sf`, c.folder, c.files.front,  'studio-front', 'Unisex Cargo Pants', c.slug),
    localImg(`cargo-${c.slug}-sb`, c.folder, c.files.back,   'studio-back',  'Unisex Cargo Pants', c.slug),
    localImg(`cargo-${c.slug}-ss`, c.folder, c.files.side,   'studio-side',  'Unisex Cargo Pants', c.slug),
    localImg(`cargo-${c.slug}-wk`, c.folder, c.files.walk,   'walking',      'Unisex Cargo Pants', c.slug),
    localImg(`cargo-${c.slug}-ed`, c.folder, c.files.edit,   'editorial',    'Unisex Cargo Pants', c.slug),
    localImg(`cargo-${c.slug}-d1`, c.folder, c.files.detail, 'detail',       'Unisex Cargo Pants', c.slug),
  ]
}

// ─── Product 1: Heavyweight Pocket Tee ────────────────────────────────────────
const oversizedTee: Product = {
  id: 'prod-001',
  name: 'Heavyweight Pocket Tee',
  category: 'Oversized Tee',
  handle: 'over-tee-shirts',
  collectionName: "Men's",
  collectionSlug: 'mens',
  badge: 'New Season',
  compositionQuote:
    'Dense 240 GSM combed cotton jersey — midweight, structured, and soft to touch. Bio-enzyme washed for a lived-in softness from first wear — improves with every wash. A quiet neutral built for a minimal wardrobe.',
  price: 1999,
  currency: '₹',
  trustLine: 'Inclusive of all taxes · Free delivery above ₹999',
  sizeUnit: null,
  modelNote: "Mritunjay is 5'11\" wearing size L. Model weight 72kg.",

  colours: teeSlugs.map(c => ({
    slug:      c.slug,
    label:     c.label,
    hex:       `#${c.hex}`,
    available: true,
    images:    buildTeeImages(c),
  })),

  sizes: [
    { label: 'S',  available: true  },
    { label: 'M',  available: true  },
    { label: 'L',  available: true  },
    { label: 'XL', available: false },
  ],

  featureBullets: [
    '240 GSM Combed Cotton Jersey',
    'Relaxed drop-shoulder fit',
    'Soft bio-enzyme washed finish',
    'Designed for repeat wear',
  ],

  specs: [
    { group: 'Material',     label: 'Fabric',     value: '100% Combed Cotton' },
    { group: 'Material',     label: 'Weight',      value: '240 GSM'            },
    { group: 'Material',     label: 'Knit',        value: 'Single Jersey'      },
    { group: 'Construction', label: 'Fit',         value: 'Drop-shoulder'      },
    { group: 'Construction', label: 'Silhouette',  value: 'Boxy oversized'     },
    { group: 'Construction', label: 'Pocket',      value: 'Chest patch'        },
    { group: 'Production',   label: 'Finish',      value: 'Garment dyed'       },
    { group: 'Production',   label: 'Wash',        value: 'Bio-enzyme'         },
    { group: 'Production',   label: 'Origin',      value: 'Made in India'      },
  ],

  fabricPillars: [
    {
      value: '240',
      unit: 'GSM',
      subLabel: 'Fabric weight',
      description:
        'Mid-weight. Substantial without heaviness. Not transparent in sunlight.',
    },
    {
      value: '100%',
      unit: 'Cotton',
      subLabel: 'Combed cotton',
      description:
        'Single jersey knit. Yarn-dyed. No synthetic blends.',
    },
    {
      value: 'Garment',
      unit: '',
      subLabel: 'Dyed finish',
      description:
        'Dyed after construction. Colour evolves subtly with every wash.',
    },
  ],

  fitBars: [
    { label: 'Chest ease', value: 75, descriptor: 'Relaxed' },
    { label: 'Length',     value: 65, descriptor: 'Hip'     },
    { label: 'Shoulder',   value: 80, descriptor: 'Dropped' },
    { label: 'Sleeve',     value: 55, descriptor: 'Short'   },
    { label: 'Neck',       value: 45, descriptor: 'Crew'    },
  ],

  care: [
    { icon: 'wash',      label: 'Machine wash 30°C gentle'         },
    { icon: 'sun-off',   label: 'Dry in shade, not direct sun'      },
    { icon: 'flame-off', label: 'Cool iron reverse side only'       },
    { icon: 'ban',       label: 'Do not bleach or dry clean'        },
  ],

  accordions: [
    {
      title: 'Shipping & delivery',
      content:
        'Free delivery on orders above ₹999. Standard delivery 3–5 business days. Express delivery available at checkout. Tracking link shared via WhatsApp once dispatched.',
    },
    {
      title: 'Exchange & returns',
      content:
        'Free returns within 30 days of delivery. Items must be unworn, unwashed, tags intact. Initiate via the Returns Portal. Refund processed within 5–7 business days.',
    },
    {
      title: 'Size guide',
      content: `<table style="width:100%;border-collapse:collapse;font-size:13px">
  <thead><tr>
    <th style="text-align:left;padding:6px 4px 6px 0;border-bottom:1px solid rgba(0,0,0,0.10)">Size</th>
    <th style="text-align:left;padding:6px 4px;border-bottom:1px solid rgba(0,0,0,0.10)">Chest (in)</th>
    <th style="text-align:left;padding:6px 4px;border-bottom:1px solid rgba(0,0,0,0.10)">Shoulder (in)</th>
    <th style="text-align:left;padding:6px 4px;border-bottom:1px solid rgba(0,0,0,0.10)">Sleeve (in)</th>
    <th style="text-align:left;padding:6px 4px;border-bottom:1px solid rgba(0,0,0,0.10)">Length (in)</th>
  </tr></thead>
  <tbody>
    <tr><td style="padding:6px 4px 6px 0">S</td><td style="padding:6px 4px">38–40</td><td style="padding:6px 4px">17.5</td><td style="padding:6px 4px">8.5</td><td style="padding:6px 4px">28</td></tr>
    <tr><td style="padding:6px 4px 6px 0">M</td><td style="padding:6px 4px">40–42</td><td style="padding:6px 4px">18.5</td><td style="padding:6px 4px">9</td><td style="padding:6px 4px">29</td></tr>
    <tr><td style="padding:6px 4px 6px 0">L</td><td style="padding:6px 4px">42–44</td><td style="padding:6px 4px">19.5</td><td style="padding:6px 4px">9.5</td><td style="padding:6px 4px">30</td></tr>
    <tr><td style="padding:6px 4px 6px 0">XL</td><td style="padding:6px 4px">44–46</td><td style="padding:6px 4px">20.5</td><td style="padding:6px 4px">10</td><td style="padding:6px 4px">31</td></tr>
  </tbody>
</table>`,
    },
  ],

  // Cross-sell items — 3 of the other 5 tee colours (raw-oat is the default/current page)
  collectionItems: [
    {
      id: 'col-tee-001',
      slug: 'over-tee-shirts/bone',
      name: 'Heavyweight Pocket Tee',
      colourLabel: 'Bone',
      price: 1999,
      currency: '₹',
      images: [
        localImg('col-tee-001-sf', "Men/OversizedTee's/WARM IVORY", 'front_studio_view.webp', 'studio-front', 'Heavyweight Pocket Tee', 'bone'),
        localImg('col-tee-001-wk', "Men/OversizedTee's/WARM IVORY", 'walking_view.webp',      'walking',      'Heavyweight Pocket Tee', 'bone'),
      ],
    },
    {
      id: 'col-tee-002',
      slug: 'over-tee-shirts/espresso',
      name: 'Heavyweight Pocket Tee',
      colourLabel: 'Espresso',
      price: 1999,
      currency: '₹',
      images: [
        localImg('col-tee-002-sf', "Men/OversizedTee's/CHARCOAL EARTH", 'front_studio_view.webp', 'studio-front', 'Heavyweight Pocket Tee', 'espresso'),
        localImg('col-tee-002-wk', "Men/OversizedTee's/CHARCOAL EARTH", 'walking_view.webp',      'walking',      'Heavyweight Pocket Tee', 'espresso'),
      ],
    },
    {
      id: 'col-tee-003',
      slug: 'over-tee-shirts/red-earth',
      name: 'Heavyweight Pocket Tee',
      colourLabel: 'Red Earth',
      price: 1999,
      currency: '₹',
      images: [
        localImg('col-tee-003-sf', "Men/OversizedTee's/DESERT CLAY", 'front_studio_view.webp', 'studio-front', 'Heavyweight Pocket Tee', 'red-earth'),
        localImg('col-tee-003-wk', "Men/OversizedTee's/DESERT CLAY", 'walking_view.webp',      'walking',      'Heavyweight Pocket Tee', 'red-earth'),
      ],
    },
  ],

  styledWith: {
    productHandle: 'cargo-pants',
    productName: 'Cargo Pant',
    price: '₹3,499',
    pairings: {
      'raw-oat':   { colourSlug: 'dark-olive',    colourName: 'Dark Olive',    hex: '#4A5240' },
      'bone':      { colourSlug: 'charcoal-grey',  colourName: 'Charcoal Grey', hex: '#6B7280' },
      'espresso':  { colourSlug: 'stone-beige',    colourName: 'Stone Beige',   hex: '#C8B89A' },
      'mushroom':  { colourSlug: 'dark-olive',     colourName: 'Dark Olive',    hex: '#4A5240' },
      'earth':     { colourSlug: 'jet-black',      colourName: 'Jet Black',     hex: '#1A1A1A' },
      'red-earth': { colourSlug: 'stone-beige',    colourName: 'Stone Beige',   hex: '#C8B89A' },
    },
  },

  editorial: {
    quote:
      '240 GSM combed cotton jersey — bio-enzyme washed for a lived-in softness from first wear.',
    specs: [
      { label: 'Fabric',  value: '100% Combed Cotton' },
      { label: 'Weight',  value: '240 GSM'            },
      { label: 'Fit',     value: 'Drop-shoulder'      },
      { label: 'Wash',    value: 'Bio-enzyme'         },
      { label: 'Origin',  value: 'Made in India'      },
    ],
    byImage: {
      'studio-front': {
        headline: "Drop-shoulder\nsilhouette.",
        body:
          'Shoulder seam sits 2–3 inches past the natural shoulder. ' +
          'Boxy through the chest and even through the waist — ' +
          'proportioned for a relaxed, unconstrained drape.',
        specs: [
          { label: 'Fit',        value: 'Drop-shoulder' },
          { label: 'Silhouette', value: 'Boxy oversized' },
          { label: 'Chest ease', value: 'Relaxed'        },
        ],
      },
      'walking': {
        headline: "Natural\nmovement.",
        body:
          'Single jersey knit with natural stretch and recovery. ' +
          'Holds shape after repeated washing — no twisting, no sagging. ' +
          'The garment moves with the body without clinging.',
        specs: [
          { label: 'Knit',     value: 'Single jersey' },
          { label: 'Stretch',  value: 'Natural 2-way' },
          { label: 'Recovery', value: 'Retains shape' },
        ],
      },
      'studio-back': {
        headline: "Built\nsimply.",
        body:
          'Back panel cut from a single piece of fabric — no centre seam. ' +
          'Shoulder seams reinforced internally. ' +
          'Hem finished single needle for a flat, minimal look from every angle.',
        specs: [
          { label: 'Back panel', value: 'Single cut'    },
          { label: 'Shoulder',   value: 'Taped seams'   },
          { label: 'Hem',        value: 'Single needle' },
        ],
      },
      'studio-side': {
        headline: "Proportioned\nfor ease.",
        body:
          'Front length 42cm from HPS. Sits at the hip — long enough to tuck ' +
          'or leave out. The side profile shows the true drop-shoulder proportion. ' +
          'Designed specifically for the Indian body proportion.',
        specs: [
          { label: 'Length (HPS)', value: '42cm'                    },
          { label: 'Profile',      value: 'Drop-shoulder side view' },
          { label: 'Hem',          value: 'Single needle'           },
        ],
      },
      'detail': {
        headline: "240 GSM\ncombed cotton.",
        body:
          'Single jersey knit. Yarn-dyed before construction for depth and ' +
          'consistency. Bio-enzyme washed after for softness from first wear. ' +
          'Improves with every wash.',
        specs: [
          { label: 'Fabric', value: '100% Combed Cotton' },
          { label: 'Knit',   value: 'Single jersey'      },
          { label: 'Finish', value: 'Garment dyed'       },
          { label: 'Wash',   value: 'Bio-enzyme'         },
        ],
      },
    },
  },
}

// ─── Product 2: Unisex Cargo Pants ────────────────────────────────────────────
const cargoPants: Product = {
  id: 'prod-002',
  name: 'Unisex Cargo Pants',
  category: 'Cargo Pants',
  handle: 'cargo-pants',
  collectionName: 'Unisex',
  collectionSlug: 'unisex',
  badge: null,
  compositionQuote:
    '300 GSM cotton canvas cut for utility and ease — six functional pockets, a relaxed straight leg, and a weight that moves with you rather than against you. Built for the city, made for the day.',
  price: 3499,
  currency: '₹',
  trustLine: 'Inclusive of all taxes · Free delivery above ₹999',
  sizeUnit: null,
  modelNote: "Priya is 5'6\" wearing size M. Model weight 58kg.",

  colours: cargoSlugs.map(c => ({
    slug:      c.slug,
    label:     c.label,
    hex:       `#${c.hex}`,
    available: true,
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
    'Unisex sizing — fits men and women',
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

  accordions: [
    {
      title: 'Shipping & delivery',
      content:
        'Free delivery on orders above ₹999. Standard delivery 3–5 business days. Express delivery available at checkout. Tracking link shared via WhatsApp once dispatched.',
    },
    {
      title: 'Exchange & returns',
      content:
        'Free returns within 30 days of delivery. Items must be unworn, unwashed, tags intact. Initiate via the Returns Portal. Refund processed within 5–7 business days.',
    },
    {
      title: 'Size guide',
      content: `<table style="width:100%;border-collapse:collapse;font-size:13px">
  <thead><tr>
    <th style="text-align:left;padding:6px 0;border-bottom:1px solid rgba(0,0,0,0.10)">Size</th>
    <th style="text-align:left;padding:6px 0;border-bottom:1px solid rgba(0,0,0,0.10)">Waist (in)</th>
    <th style="text-align:left;padding:6px 0;border-bottom:1px solid rgba(0,0,0,0.10)">Inseam (in)</th>
  </tr></thead>
  <tbody>
    <tr><td style="padding:6px 0">S</td><td>28–30</td><td>29</td></tr>
    <tr><td style="padding:6px 0">M</td><td>30–32</td><td>30</td></tr>
    <tr><td style="padding:6px 0">L</td><td>32–34</td><td>30.5</td></tr>
    <tr><td style="padding:6px 0">XL</td><td>34–36</td><td>31</td></tr>
    <tr><td style="padding:6px 0">XXL</td><td>36–38</td><td>31.5</td></tr>
  </tbody>
</table>`,
    },
  ],

  // Cross-sell items — dark-olive uses real images; stone-beige falls back to placehold.co
  collectionItems: [
    {
      id: 'col-cargo-001',
      slug: 'cargo-pants/dark-olive',
      name: 'Unisex Cargo Pants',
      colourLabel: 'Dark Olive',
      price: 3499,
      currency: '₹',
      images: [
        localImg('col-cargo-001-sf', 'Unisex/cargos/darkolive', 'front_view.png',   'studio-front', 'Unisex Cargo Pants', 'dark-olive'),
        localImg('col-cargo-001-wk', 'Unisex/cargos/darkolive', 'walking_view.png', 'walking',      'Unisex Cargo Pants', 'dark-olive'),
      ],
    },
    {
      id: 'col-cargo-002',
      slug: 'cargo-pants/stone-beige',
      name: 'Unisex Cargo Pants',
      colourLabel: 'Stone Beige',
      price: 3499,
      currency: '₹',
      // No matching image folder on disk for stone-beige — placehold.co fallback
      images: [
        { id: 'col-cargo-002-sf', src: ph('C4B49A', '333333', 'studio-front'), alt: 'Unisex Cargo Pants — studio-front — stone-beige', type: 'studio-front', colourSlug: 'stone-beige' },
        { id: 'col-cargo-002-wk', src: ph('C4B49A', '333333', 'walking'),      alt: 'Unisex Cargo Pants — walking — stone-beige',      type: 'walking',      colourSlug: 'stone-beige' },
      ],
    },
  ],

  styledWith: {
    productHandle: 'over-tee-shirts',
    productName: 'Heavyweight Pocket Tee',
    price: '₹1,999',
    pairings: {
      'dark-olive':    { colourSlug: 'raw-oat',  colourName: 'Raw Oat',  hex: '#D8C9B0' },
      'charcoal-grey': { colourSlug: 'bone',     colourName: 'Bone',     hex: '#F0EBE0' },
      'stone-beige':   { colourSlug: 'espresso', colourName: 'Espresso', hex: '#5C5248' },
      'jet-black':     { colourSlug: 'earth',    colourName: 'Earth',    hex: '#8B7355' },
      'mocha-brown':   { colourSlug: 'bone',     colourName: 'Bone',     hex: '#F0EBE0' },
      'rust-clay':     { colourSlug: 'espresso', colourName: 'Espresso', hex: '#5C5248' },
    },
  },

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

// ─── Product 3: A-line Kurta ──────────────────────────────────────────────────
const kurta3ColourSlugs: Array<{ slug: string; hex: string; label: string }> = [
  { slug: 'warm-ivory',     hex: 'F0EBE0', label: 'Warm Ivory'     },
  { slug: 'soft-ecru',      hex: 'EDE5D0', label: 'Soft Ecru'      },
  { slug: 'oat-beige',      hex: 'D8C9B0', label: 'Oat Beige'      },
  { slug: 'sandstone',      hex: 'C8A882', label: 'Sandstone'       },
  { slug: 'mushroom-taupe', hex: 'A89888', label: 'Mushroom Taupe'  },
  { slug: 'dust-sage',      hex: '8C9E84', label: 'Dust Sage'       },
  { slug: 'dust-olive',     hex: '7A8060', label: 'Dust Olive'      },
  { slug: 'mineral-brown',  hex: '8B7355', label: 'Mineral Brown'   },
  { slug: 'dusty-rose',     hex: 'D4A8A0', label: 'Dusty Rose'      },
  { slug: 'desert-clay',    hex: 'C47A4E', label: 'Desert Clay'     },
  { slug: 'soft-black',     hex: '1E1C1A', label: 'Soft Black'      },
]

const aLineKurta: Product = {
  id: 'prod-003',
  name: 'A-line Kurta',
  category: 'Kurta',
  handle: 'a-line-kurta',
  collectionName: "Women's",
  collectionSlug: 'womens',
  badge: null,
  compositionQuote: '160 GSM Cotton-Modal slub — bio-washed for softness, designed for the everyday Indian wardrobe.',
  price: 2499,
  currency: '₹',
  trustLine: 'Inclusive of all taxes · Free delivery above ₹999',
  sizeUnit: null,
  modelNote: "Model is 5'6\" wearing size S.",

  colours: kurta3ColourSlugs.map(c => ({
    slug:      c.slug,
    label:     c.label,
    hex:       `#${c.hex}`,
    available: true,
    images:    buildPlaceholderImages('k3', 'A-line Kurta', c.slug, c.hex),
  })),

  sizes: [
    { label: 'XS', available: true },
    { label: 'S',  available: true },
    { label: 'M',  available: true },
    { label: 'L',  available: true },
    { label: 'XL', available: true },
  ],

  featureBullets: [
    '160 GSM Cotton-Modal slub',
    'Mandarin collar with front placket',
    'A-line silhouette, knee length',
    'Bio-wash and silicone softener finish',
    'Designed for everyday Indian wear',
  ],

  specs: [
    { group: 'Material',     label: 'Fabric',        value: '60% Cotton 40% Modal'  },
    { group: 'Material',     label: 'Weight',         value: '160 GSM'               },
    { group: 'Material',     label: 'Character',      value: 'Cotton-Modal slub'     },
    { group: 'Construction', label: 'Neckline',       value: 'Mandarin collar'       },
    { group: 'Construction', label: 'Placket',        value: 'Five-button front'     },
    { group: 'Construction', label: 'Silhouette',     value: 'A-line'                },
    { group: 'Construction', label: 'Length',         value: 'Knee length'           },
    { group: 'Production',   label: 'Finish',         value: 'Bio-wash + silicone'   },
    { group: 'Production',   label: 'Certification',  value: 'OEKO-TEX Standard 100' },
    { group: 'Production',   label: 'Origin',         value: 'Made in India'         },
  ],

  fabricPillars: [
    {
      value: '160',
      unit: 'GSM',
      subLabel: 'Fabric weight',
      description: 'Lightweight. Breathable in Indian heat. Falls cleanly without being sheer.',
    },
    {
      value: '60/40',
      unit: '',
      subLabel: 'Cotton-Modal blend',
      description: 'Combed cotton base with Modal for drape and softness. Natural slub character from the yarn.',
    },
    {
      value: 'Bio',
      unit: '-wash',
      subLabel: 'Finishing process',
      description: 'Bio-washed and silicone softened. Feels worn-in from first use. Stays soft after washing.',
    },
  ],

  fitBars: [
    { label: 'Chest ease', value: 40, descriptor: 'Fitted'  },
    { label: 'Length',     value: 60, descriptor: 'Knee'    },
    { label: 'Shoulder',   value: 50, descriptor: 'Regular' },
    { label: 'Flare',      value: 60, descriptor: 'A-line'  },
  ],

  care: [
    { icon: 'wash',   label: 'Machine wash 30°C gentle'               },
    { icon: 'sun-off', label: 'Dry in shade. Not direct sun'          },
    { icon: 'flame-off', label: 'Cool iron reverse side'              },
    { icon: 'ban',    label: 'Do not bleach or dry clean'             },
  ],

  accordions: [
    {
      title: 'Shipping & delivery',
      content: 'Free delivery on orders above ₹999. Standard delivery 3–5 business days. Express delivery available at checkout. Tracking link shared via WhatsApp once dispatched.',
    },
    {
      title: 'Exchange & returns',
      content: 'Free returns within 30 days of delivery. Items must be unworn, unwashed, tags intact. Initiate via the Returns Portal. Refund processed within 5–7 business days.',
    },
    {
      title: 'Care note',
      content: 'Wash dark and light colourways separately for the first three washes. Garment softens further with each wash.',
    },
    {
      title: 'Size guide',
      content: `<table style="width:100%;border-collapse:collapse;font-size:13px">
  <thead><tr>
    <th style="text-align:left;padding:6px 4px 6px 0;border-bottom:1px solid rgba(0,0,0,0.10)">Size</th>
    <th style="text-align:left;padding:6px 4px;border-bottom:1px solid rgba(0,0,0,0.10)">Chest (in)</th>
    <th style="text-align:left;padding:6px 4px;border-bottom:1px solid rgba(0,0,0,0.10)">Length (in)</th>
  </tr></thead>
  <tbody>
    <tr><td style="padding:6px 4px 6px 0">XS</td><td style="padding:6px 4px">32–34</td><td style="padding:6px 4px">40</td></tr>
    <tr><td style="padding:6px 4px 6px 0">S</td><td style="padding:6px 4px">34–36</td><td style="padding:6px 4px">41</td></tr>
    <tr><td style="padding:6px 4px 6px 0">M</td><td style="padding:6px 4px">36–38</td><td style="padding:6px 4px">42</td></tr>
    <tr><td style="padding:6px 4px 6px 0">L</td><td style="padding:6px 4px">38–40</td><td style="padding:6px 4px">43</td></tr>
    <tr><td style="padding:6px 4px 6px 0">XL</td><td style="padding:6px 4px">40–42</td><td style="padding:6px 4px">44</td></tr>
  </tbody>
</table>`,
    },
  ],

  collectionItems: [
    {
      id: 'col-kurta-001',
      slug: 'a-line-kurta/soft-ecru',
      name: 'A-line Kurta',
      colourLabel: 'Soft Ecru',
      price: 2499,
      currency: '₹',
      images: [
        { id: 'col-k3-001-sf', src: phImg('EDE5D0', 2000, 2500, 'A-line Kurta studio-front'), alt: 'A-line Kurta — studio-front — soft-ecru', type: 'studio-front', colourSlug: 'soft-ecru' },
        { id: 'col-k3-001-wk', src: phImg('EDE5D0', 1200, 1500, 'A-line Kurta walking'),      alt: 'A-line Kurta — walking — soft-ecru',      type: 'walking',      colourSlug: 'soft-ecru' },
      ],
    },
    {
      id: 'col-kurta-002',
      slug: 'a-line-kurta/dust-sage',
      name: 'A-line Kurta',
      colourLabel: 'Dust Sage',
      price: 2499,
      currency: '₹',
      images: [
        { id: 'col-k3-002-sf', src: phImg('8C9E84', 2000, 2500, 'A-line Kurta studio-front'), alt: 'A-line Kurta — studio-front — dust-sage', type: 'studio-front', colourSlug: 'dust-sage' },
        { id: 'col-k3-002-wk', src: phImg('8C9E84', 1200, 1500, 'A-line Kurta walking'),      alt: 'A-line Kurta — walking — dust-sage',      type: 'walking',      colourSlug: 'dust-sage' },
      ],
    },
  ],

  editorial: {
    quote: '160 GSM Cotton-Modal slub — bio-washed for softness, designed for the everyday Indian wardrobe.',
    specs: [
      { label: 'Fabric',        value: '60% Cotton 40% Modal'  },
      { label: 'Weight',        value: '160 GSM'               },
      { label: 'Silhouette',    value: 'A-line'                },
      { label: 'Finish',        value: 'Bio-wash'              },
      { label: 'Certification', value: 'OEKO-TEX Standard 100' },
    ],
    byImage: {
      'studio-front': {
        headline: "Mandarin collar.\nFront placket.",
        body: 'The collar sits 3.5cm high. Five-button front placket in matching fabric. Clean, considered, no excess.',
        specs: [
          { label: 'Collar',     value: 'Mandarin 3.5cm'    },
          { label: 'Placket',    value: 'Five-button front' },
          { label: 'Silhouette', value: 'A-line'            },
        ],
      },
      'walking': {
        headline: "The A-line\nflare.",
        body: 'The silhouette only reveals itself in motion. Knee-length hem. Enough flare to move freely — not so much that it overwhelms. Designed for the Indian climate and stride.',
        specs: [
          { label: 'Length',     value: 'Knee length'      },
          { label: 'Silhouette', value: 'A-line flare'     },
          { label: 'Movement',   value: 'Unrestricted'     },
        ],
      },
      'studio-back': {
        headline: "Clean\nat the back.",
        body: 'No back seam. Single piece cut at the back for a cleaner drape. The A-line shape carries through from front to back without interruption.',
        specs: [
          { label: 'Back construction', value: 'Single piece'    },
          { label: 'Seam',              value: 'Side only'       },
          { label: 'Drape',             value: 'Uninterrupted'   },
        ],
      },
      'studio-side': {
        headline: "160 GSM\nCotton-Modal.",
        body: '60% combed cotton, 40% Modal. The slub character comes from the yarn — natural variation, not a print. Breathable enough for Indian summers. Soft enough for daily wear.',
        specs: [
          { label: 'Fabric',    value: '60% Cotton 40% Modal' },
          { label: 'Weight',    value: '160 GSM'              },
          { label: 'Character', value: 'Natural slub'         },
        ],
      },
      'detail': {
        headline: "Bio-wash\nfinish.",
        body: 'Bio-wash enzymes soften the fabric at a cellular level. Combined with silicone softener the result is a fabric that feels worn-in from first use. Maintains softness after repeated washing.',
        specs: [
          { label: 'Finish',        value: 'Bio-wash'              },
          { label: 'Softener',      value: 'Silicone treatment'    },
          { label: 'Certification', value: 'OEKO-TEX 100'          },
        ],
      },
    },
  },
}

// ─── Product 4: Women's Co-ord Set ────────────────────────────────────────────
const coordColourSlugs: Array<{ slug: string; hex: string; label: string }> = [
  { slug: 'warm-ivory', hex: 'F0EBE0', label: 'Warm Ivory' },
  { slug: 'dust-sage',  hex: '8C9E84', label: 'Dust Sage'  },
  { slug: 'dusty-rose', hex: 'D4A8A0', label: 'Dusty Rose' },
]

const womenCoordSet: Product = {
  id: 'prod-004',
  name: 'Relaxed Co-ord Set',
  category: 'Co-ord Set',
  handle: 'women-lounge-sets',
  collectionName: "Women's",
  collectionSlug: 'womens',
  badge: null,
  compositionQuote: 'Linen-cotton blend — garment washed for softness. Designed to wear as a set or as separates.',
  price: 3299,
  currency: '₹',
  trustLine: 'Inclusive of all taxes · Free delivery above ₹999',
  sizeUnit: null,
  modelNote: "Model is 5'6\" wearing size S.",

  colours: coordColourSlugs.map(c => ({
    slug:      c.slug,
    label:     c.label,
    hex:       `#${c.hex}`,
    available: true,
    images:    buildPlaceholderImages('p4', 'Relaxed Co-ord Set', c.slug, c.hex),
  })),

  sizes: [
    { label: 'XS', available: true },
    { label: 'S',  available: true },
    { label: 'M',  available: true },
    { label: 'L',  available: true },
    { label: 'XL', available: true },
  ],

  featureBullets: [
    'Linen-cotton blend top and trouser',
    'Relaxed shirt collar',
    'Straight leg trouser',
    'Garment washed for softness',
    'Sold as a complete set',
  ],

  specs: [
    { group: 'Material',     label: 'Fabric',    value: 'Linen-cotton blend'         },
    { group: 'Material',     label: 'Finish',    value: 'Garment washed'             },
    { group: 'Construction', label: 'Top',       value: 'Relaxed shirt collar'       },
    { group: 'Construction', label: 'Trouser',   value: 'Straight leg'               },
    { group: 'Construction', label: 'Rise',      value: 'Mid-rise'                   },
    { group: 'Construction', label: 'Waistband', value: 'Flat front elastic back'    },
    { group: 'Production',   label: 'Set',       value: 'Top + trouser'              },
    { group: 'Production',   label: 'Origin',    value: 'Made in India'              },
  ],

  fabricPillars: [
    {
      value: 'Linen',
      unit: '-cotton',
      subLabel: 'Fabric blend',
      description: 'Natural linen character with cotton softness. Breathable and lightweight for Indian weather.',
    },
    {
      value: 'Garment',
      unit: '',
      subLabel: 'Washed finish',
      description: 'Both pieces garment washed after construction. Permanent texture and softness from first wear.',
    },
    {
      value: '2',
      unit: 'pieces',
      subLabel: 'Complete set',
      description: 'Top and trouser designed to coordinate. Both pieces styled to work as separates too.',
    },
  ],

  fitBars: [
    { label: 'Top fit',     value: 50, descriptor: 'Regular'  },
    { label: 'Trouser fit', value: 40, descriptor: 'Straight' },
    { label: 'Length',      value: 60, descriptor: 'Relaxed'  },
    { label: 'Waist ease',  value: 50, descriptor: 'Regular'  },
  ],

  care: [
    { icon: 'wash',      label: 'Machine wash 30°C gentle' },
    { icon: 'sun-off',   label: 'Dry in shade'             },
    { icon: 'flame-off', label: 'Cool iron only'           },
    { icon: 'ban',       label: 'Do not bleach'            },
  ],

  accordions: [
    {
      title: 'Shipping & delivery',
      content: 'Free delivery on orders above ₹999. Standard delivery 3–5 business days. Express delivery available at checkout. Tracking link shared via WhatsApp once dispatched.',
    },
    {
      title: 'Exchange & returns',
      content: 'Free returns within 30 days of delivery. Items must be unworn, unwashed, tags intact. Initiate via the Returns Portal. Refund processed within 5–7 business days.',
    },
    {
      title: 'Care note',
      content: 'Natural linen wrinkle is part of the character — embrace it.',
    },
    {
      title: 'Size guide',
      content: `<table style="width:100%;border-collapse:collapse;font-size:13px">
  <thead><tr>
    <th style="text-align:left;padding:6px 4px 6px 0;border-bottom:1px solid rgba(0,0,0,0.10)">Size</th>
    <th style="text-align:left;padding:6px 4px;border-bottom:1px solid rgba(0,0,0,0.10)">Chest (in)</th>
    <th style="text-align:left;padding:6px 4px;border-bottom:1px solid rgba(0,0,0,0.10)">Top Length (in)</th>
  </tr></thead>
  <tbody>
    <tr><td style="padding:6px 4px 6px 0">XS</td><td style="padding:6px 4px">32–34</td><td style="padding:6px 4px">26</td></tr>
    <tr><td style="padding:6px 4px 6px 0">S</td><td style="padding:6px 4px">34–36</td><td style="padding:6px 4px">27</td></tr>
    <tr><td style="padding:6px 4px 6px 0">M</td><td style="padding:6px 4px">36–38</td><td style="padding:6px 4px">28</td></tr>
    <tr><td style="padding:6px 4px 6px 0">L</td><td style="padding:6px 4px">38–40</td><td style="padding:6px 4px">29</td></tr>
    <tr><td style="padding:6px 4px 6px 0">XL</td><td style="padding:6px 4px">40–42</td><td style="padding:6px 4px">30</td></tr>
  </tbody>
</table>`,
    },
  ],

  collectionItems: [
    {
      id: 'col-coord-001',
      slug: 'women-lounge-sets/dust-sage',
      name: 'Relaxed Co-ord Set',
      colourLabel: 'Dust Sage',
      price: 3299,
      currency: '₹',
      images: [
        { id: 'col-p4-001-sf', src: phImg('8C9E84', 2000, 2500, 'Relaxed Co-ord Set studio-front'), alt: 'Relaxed Co-ord Set — studio-front — dust-sage', type: 'studio-front', colourSlug: 'dust-sage' },
        { id: 'col-p4-001-wk', src: phImg('8C9E84', 1200, 1500, 'Relaxed Co-ord Set walking'),      alt: 'Relaxed Co-ord Set — walking — dust-sage',      type: 'walking',      colourSlug: 'dust-sage' },
      ],
    },
    {
      id: 'col-coord-002',
      slug: 'women-lounge-sets/dusty-rose',
      name: 'Relaxed Co-ord Set',
      colourLabel: 'Dusty Rose',
      price: 3299,
      currency: '₹',
      images: [
        { id: 'col-p4-002-sf', src: phImg('D4A8A0', 2000, 2500, 'Relaxed Co-ord Set studio-front'), alt: 'Relaxed Co-ord Set — studio-front — dusty-rose', type: 'studio-front', colourSlug: 'dusty-rose' },
        { id: 'col-p4-002-wk', src: phImg('D4A8A0', 1200, 1500, 'Relaxed Co-ord Set walking'),      alt: 'Relaxed Co-ord Set — walking — dusty-rose',      type: 'walking',      colourSlug: 'dusty-rose' },
      ],
    },
  ],

  editorial: {
    quote: 'Linen-cotton blend — garment washed for softness. Designed to wear as a set or as separates.',
    specs: [
      { label: 'Fabric',    value: 'Linen-cotton blend'      },
      { label: 'Top',       value: 'Relaxed shirt collar'    },
      { label: 'Trouser',   value: 'Straight leg'            },
      { label: 'Finish',    value: 'Garment washed'          },
      { label: 'Origin',    value: 'Made in India'           },
    ],
    byImage: {
      'studio-front': {
        headline: "Worn as a\nset or separate.",
        body: 'The shirt top and straight trouser are designed to coordinate but function independently. Both pieces work with the rest of the wardrobe.',
        specs: [
          { label: 'Set includes', value: 'Top + trouser'     },
          { label: 'Top collar',   value: 'Relaxed shirt'     },
          { label: 'Trouser',      value: 'Straight leg'      },
        ],
      },
      'walking': {
        headline: "Linen-cotton\ndrape.",
        body: 'Linen looks its best in motion — natural wrinkle and drape are part of the character. Not a flaw. The fabric breathes in Indian heat and softens with every wash.',
        specs: [
          { label: 'Fabric',        value: 'Linen-cotton blend' },
          { label: 'Character',     value: 'Natural wrinkle'    },
          { label: 'Breathability', value: 'High'               },
        ],
      },
      'studio-back': {
        headline: "Back of\nthe shirt.",
        body: 'Single back panel. No yoke seam. Clean back construction that drapes without interruption. The shirt tucks cleanly or wears fully out.',
        specs: [
          { label: 'Back panel', value: 'Single piece'    },
          { label: 'Tuck',       value: 'Tucks cleanly'  },
        ],
      },
      'studio-side': {
        headline: "The trouser\nproportion.",
        body: 'Straight through the thigh and leg. Mid-rise. Sits at the natural waist with an elasticated back panel and flat front.',
        specs: [
          { label: 'Leg',       value: 'Straight'                    },
          { label: 'Rise',      value: 'Mid-rise'                    },
          { label: 'Waistband', value: 'Flat front elastic back'     },
        ],
      },
      'detail': {
        headline: "Garment\nwashed.",
        body: 'Both pieces are garment washed after construction. The texture you feel in the fabric is permanent — it will not wash out.',
        specs: [
          { label: 'Finish',  value: 'Garment washed'      },
          { label: 'Texture', value: 'Permanent softness'  },
          { label: 'Origin',  value: 'Made in India'       },
        ],
      },
    },
  },
}

// ─── Product 5: Women's Sleepwear ─────────────────────────────────────────────
const sleepwearColourSlugs: Array<{ slug: string; hex: string; label: string }> = [
  { slug: 'soft-cream',    hex: 'F5F0E8', label: 'Soft Cream'    },
  { slug: 'oat-beige',     hex: 'D8C9B0', label: 'Oat Beige'     },
  { slug: 'dusty-rose',    hex: 'D4A8A0', label: 'Dusty Rose'    },
  { slug: 'lavender-grey', hex: 'C4C0D8', label: 'Lavender Grey' },
  { slug: 'olive-grey',    hex: '8A8E7A', label: 'Olive Grey'    },
]

const womenSleepwear: Product = {
  id: 'prod-005',
  name: 'Long Sleeve Lounge Set',
  category: 'Sleepwear',
  handle: 'women-sleepwear',
  collectionName: "Women's",
  collectionSlug: 'womens',
  badge: null,
  compositionQuote: '280 GSM French Terry — bio-polished for softness from first wear. Considered rest for Indian nights.',
  price: 2499,
  currency: '₹',
  trustLine: 'Inclusive of all taxes · Free delivery above ₹999',
  sizeUnit: null,
  modelNote: "Model is 5'6\" wearing size S.",

  colours: sleepwearColourSlugs.map(c => ({
    slug:      c.slug,
    label:     c.label,
    hex:       `#${c.hex}`,
    available: true,
    images:    buildPlaceholderImages('p5', 'Long Sleeve Lounge Set', c.slug, c.hex),
  })),

  sizes: [
    { label: 'XS', available: true },
    { label: 'S',  available: true },
    { label: 'M',  available: true },
    { label: 'L',  available: true },
    { label: 'XL', available: true },
  ],

  featureBullets: [
    '280 GSM French Terry',
    '95% Combed Cotton / 5% Elastane',
    'Ribbed cuffs on sleeve and ankle',
    'Bio-polished for softness',
    'OEKO-TEX Standard 100 certified',
  ],

  specs: [
    { group: 'Material',     label: 'Fabric',        value: '280 GSM French Terry'          },
    { group: 'Material',     label: 'Composition',   value: '95% Cotton 5% Elastane'        },
    { group: 'Material',     label: 'Certification', value: 'OEKO-TEX Standard 100'         },
    { group: 'Construction', label: 'Set',           value: 'Long sleeve top + jogger'      },
    { group: 'Construction', label: 'Cuffs',         value: '4×4 ribbed at sleeve + ankle'  },
    { group: 'Construction', label: 'Waistband',     value: 'Elastic + internal drawcord'   },
    { group: 'Production',   label: 'Finish',        value: 'Bio-polished'                  },
    { group: 'Production',   label: 'Origin',        value: 'Made in India'                 },
  ],

  fabricPillars: [
    {
      value: '280',
      unit: 'GSM',
      subLabel: 'French Terry weight',
      description: 'Substantial enough to feel premium. Soft enough to sleep in. Holds warmth without overheating.',
    },
    {
      value: '95/5',
      unit: '',
      subLabel: 'Cotton-Elastane',
      description: '95% combed cotton, 5% elastane. Moves with the body. Returns to shape after each wear.',
    },
    {
      value: 'Bio',
      unit: '-polish',
      subLabel: 'Surface finish',
      description: 'Bio-polishing removes surface fibres. Prevents pilling. Stays smooth after repeated washing.',
    },
  ],

  fitBars: [
    { label: 'Top fit',   value: 50, descriptor: 'Relaxed' },
    { label: 'Leg taper', value: 40, descriptor: 'Tapered' },
    { label: 'Length',    value: 70, descriptor: 'Full'    },
    { label: 'Cuff ease', value: 30, descriptor: 'Fitted'  },
  ],

  care: [
    { icon: 'wash',      label: 'Machine wash 30°C gentle'   },
    { icon: 'sun-off',   label: 'Dry in shade. Not direct sun'},
    { icon: 'flame-off', label: 'Do not iron cuffs directly'  },
    { icon: 'ban',       label: 'Do not bleach or dry clean'  },
  ],

  accordions: [
    {
      title: 'Shipping & delivery',
      content: 'Free delivery on orders above ₹999. Standard delivery 3–5 business days. Express delivery available at checkout. Tracking link shared via WhatsApp once dispatched.',
    },
    {
      title: 'Exchange & returns',
      content: 'Free returns within 30 days of delivery. Items must be unworn, unwashed, tags intact. Initiate via the Returns Portal. Refund processed within 5–7 business days.',
    },
    {
      title: 'Care note',
      content: 'Turn inside out before washing. Tumble dry low if needed — remove promptly to preserve softness.',
    },
    {
      title: 'Size guide',
      content: `<table style="width:100%;border-collapse:collapse;font-size:13px">
  <thead><tr>
    <th style="text-align:left;padding:6px 4px 6px 0;border-bottom:1px solid rgba(0,0,0,0.10)">Size</th>
    <th style="text-align:left;padding:6px 4px;border-bottom:1px solid rgba(0,0,0,0.10)">Chest (in)</th>
    <th style="text-align:left;padding:6px 4px;border-bottom:1px solid rgba(0,0,0,0.10)">Top Length (in)</th>
  </tr></thead>
  <tbody>
    <tr><td style="padding:6px 4px 6px 0">XS</td><td style="padding:6px 4px">32–34</td><td style="padding:6px 4px">24</td></tr>
    <tr><td style="padding:6px 4px 6px 0">S</td><td style="padding:6px 4px">34–36</td><td style="padding:6px 4px">25</td></tr>
    <tr><td style="padding:6px 4px 6px 0">M</td><td style="padding:6px 4px">36–38</td><td style="padding:6px 4px">26</td></tr>
    <tr><td style="padding:6px 4px 6px 0">L</td><td style="padding:6px 4px">38–40</td><td style="padding:6px 4px">27</td></tr>
    <tr><td style="padding:6px 4px 6px 0">XL</td><td style="padding:6px 4px">40–42</td><td style="padding:6px 4px">28</td></tr>
  </tbody>
</table>`,
    },
  ],

  collectionItems: [
    {
      id: 'col-sw-001',
      slug: 'women-sleepwear/oat-beige',
      name: 'Long Sleeve Lounge Set',
      colourLabel: 'Oat Beige',
      price: 2499,
      currency: '₹',
      images: [
        { id: 'col-p5-001-sf', src: phImg('D8C9B0', 2000, 2500, 'Long Sleeve Lounge Set studio-front'), alt: 'Long Sleeve Lounge Set — studio-front — oat-beige', type: 'studio-front', colourSlug: 'oat-beige' },
        { id: 'col-p5-001-wk', src: phImg('D8C9B0', 1200, 1500, 'Long Sleeve Lounge Set walking'),      alt: 'Long Sleeve Lounge Set — walking — oat-beige',      type: 'walking',      colourSlug: 'oat-beige' },
      ],
    },
    {
      id: 'col-sw-002',
      slug: 'women-sleepwear/dusty-rose',
      name: 'Long Sleeve Lounge Set',
      colourLabel: 'Dusty Rose',
      price: 2499,
      currency: '₹',
      images: [
        { id: 'col-p5-002-sf', src: phImg('D4A8A0', 2000, 2500, 'Long Sleeve Lounge Set studio-front'), alt: 'Long Sleeve Lounge Set — studio-front — dusty-rose', type: 'studio-front', colourSlug: 'dusty-rose' },
        { id: 'col-p5-002-wk', src: phImg('D4A8A0', 1200, 1500, 'Long Sleeve Lounge Set walking'),      alt: 'Long Sleeve Lounge Set — walking — dusty-rose',      type: 'walking',      colourSlug: 'dusty-rose' },
      ],
    },
  ],

  editorial: {
    quote: '280 GSM French Terry — bio-polished for softness from first wear. Considered rest for Indian nights.',
    specs: [
      { label: 'Fabric',        value: '280 GSM French Terry'   },
      { label: 'Composition',   value: '95% Cotton 5% Elastane' },
      { label: 'Cuffs',         value: 'Ribbed sleeve + ankle'  },
      { label: 'Finish',        value: 'Bio-polished'           },
      { label: 'Certification', value: 'OEKO-TEX Standard 100'  },
    ],
    byImage: {
      'studio-front': {
        headline: "Ribbed cuffs.\nSoft French Terry.",
        body: 'The ribbed cuffs at sleeve and ankle are the detail that defines this set. 280 GSM French Terry — substantial enough to feel premium, soft enough to sleep in.',
        specs: [
          { label: 'Fabric',      value: '280 GSM French Terry'        },
          { label: 'Composition', value: '95% Cotton 5% Elastane'      },
          { label: 'Cuffs',       value: 'Ribbed at sleeve + ankle'    },
        ],
      },
      'walking': {
        headline: "Considered\nrest.",
        body: 'Designed for the hours before and after sleep — not just sleep itself. Moves without restriction. Looks deliberate enough for the morning after.',
        specs: [
          { label: 'Set',       value: 'Top + jogger'   },
          { label: 'Occasion',  value: 'Lounge + sleep' },
          { label: 'Movement',  value: 'Unrestricted'   },
        ],
      },
      'studio-back': {
        headline: "The jogger\nproportion.",
        body: 'Elasticated waistband with internal drawcord. Tapered through the leg to the ribbed ankle cuff. The proportion is intentional — not sloppy.',
        specs: [
          { label: 'Waistband', value: 'Elastic + drawcord'    },
          { label: 'Leg',       value: 'Tapered to ankle cuff' },
          { label: 'Cuff',      value: '4×4 wide rib'          },
        ],
      },
      'studio-side': {
        headline: "Sleeve\ndetail.",
        body: 'Long sleeve with 4×4 ribbed cuff. The sleeve length is sized for full coverage without bunching. The cuff sits cleanly at the wrist.',
        specs: [
          { label: 'Sleeve', value: 'Full length'               },
          { label: 'Cuff',   value: '4×4 rib'                   },
          { label: 'Fit',    value: 'Relaxed through shoulder'  },
        ],
      },
      'detail': {
        headline: "Bio-polished\nsoftness.",
        body: 'Bio-polishing removes surface fibres that cause pilling and roughness. The result is a fabric that feels smoother and softer — and stays that way after repeated washing.',
        specs: [
          { label: 'Finish',        value: 'Bio-polished'          },
          { label: 'Certification', value: 'OEKO-TEX Standard 100' },
          { label: 'Wash',          value: 'Open-loop wrinkle control' },
        ],
      },
    },
  },
}

// ─── Product 6: Kids Sleepwear Set ────────────────────────────────────────────
const kidsColourSlugs: Array<{ slug: string; hex: string; label: string }> = [
  { slug: 'soft-cream', hex: 'F5F0E8', label: 'Soft Cream' },
  { slug: 'oat-beige',  hex: 'D8C9B0', label: 'Oat Beige'  },
  { slug: 'sage-green', hex: '8E9E82', label: 'Sage Green'  },
  { slug: 'mushroom',   hex: 'A89888', label: 'Mushroom'    },
]

const kidsSleepwear: Product = {
  id: 'prod-006',
  name: 'Kids Sleepwear Set',
  category: 'Kids Sleepwear',
  handle: 'kids-sleepwear',
  collectionName: 'Youth Studio',
  collectionSlug: 'youth-studio',
  badge: null,
  compositionQuote: 'Super combed cotton — enzyme washed, OEKO-TEX certified. Soft enough for sleep. Built for everything that comes before it.',
  price: 1499,
  currency: '₹',
  trustLine: 'Inclusive of all taxes · Free delivery above ₹999',
  sizeUnit: null,
  modelNote: 'Model is 6 years old wearing size 6Y.',

  colours: kidsColourSlugs.map(c => ({
    slug:      c.slug,
    label:     c.label,
    hex:       `#${c.hex}`,
    available: true,
    images:    buildPlaceholderImages('p6', 'Kids Sleepwear Set', c.slug, c.hex),
  })),

  sizes: [
    { label: '2Y',  available: true },
    { label: '4Y',  available: true },
    { label: '6Y',  available: true },
    { label: '8Y',  available: true },
    { label: '10Y', available: true },
    { label: '12Y', available: true },
  ],

  featureBullets: [
    'Super combed cotton',
    'Unisex fit — 2Y to 12Y',
    'Enzyme washed for softness',
    'No synthetic blends',
    'OEKO-TEX Standard 100 certified',
  ],

  specs: [
    { group: 'Material',     label: 'Fabric',        value: 'Super combed cotton'      },
    { group: 'Material',     label: 'Blends',        value: 'None'                     },
    { group: 'Material',     label: 'Certification', value: 'OEKO-TEX Standard 100'   },
    { group: 'Construction', label: 'Set',           value: 'Top + trouser/shorts'     },
    { group: 'Construction', label: 'Seams',         value: 'Flat construction'        },
    { group: 'Construction', label: 'Label',         value: 'Heat printed'             },
    { group: 'Construction', label: 'Sizes',         value: '2Y – 12Y unisex'          },
    { group: 'Production',   label: 'Finish',        value: 'Enzyme washed'            },
    { group: 'Production',   label: 'Origin',        value: 'Made in India'            },
  ],

  fabricPillars: [
    {
      value: 'Super',
      unit: '',
      subLabel: 'Combed cotton',
      description: 'Highest yarn quality. Fine, consistent fibre. Soft against sensitive skin. No synthetic blends.',
    },
    {
      value: 'OEKO',
      unit: '-TEX',
      subLabel: 'Certified safe',
      description: 'All components tested and certified free of harmful substances. Safe from newborn.',
    },
    {
      value: 'Flat',
      unit: '',
      subLabel: 'Seam construction',
      description: 'No raised seams against skin. Heat-printed label. Nothing to irritate during sleep.',
    },
  ],

  fitBars: [
    { label: 'Body ease', value: 60, descriptor: 'Relaxed'  },
    { label: 'Length',    value: 60, descriptor: 'Extended' },
    { label: 'Sleeve',    value: 50, descriptor: 'Regular'  },
    { label: 'Seat ease', value: 70, descriptor: 'Roomy'    },
  ],

  care: [
    { icon: 'wash',      label: 'Machine wash 30°C gentle' },
    { icon: 'sun-off',   label: 'Dry in shade'             },
    { icon: 'flame-off', label: 'Warm iron only'           },
    { icon: 'ban',       label: 'Do not bleach'            },
  ],

  accordions: [
    {
      title: 'Shipping & delivery',
      content: 'Free delivery on orders above ₹999. Standard delivery 3–5 business days. Express delivery available at checkout. Tracking link shared via WhatsApp once dispatched.',
    },
    {
      title: 'Exchange & returns',
      content: 'Free returns within 30 days of delivery. Items must be unworn, unwashed, tags intact. Initiate via the Returns Portal. Refund processed within 5–7 business days.',
    },
    {
      title: 'Care note',
      content: 'Wash before first use. Wash separately for first wash. All components are skin-safe and certified OEKO-TEX Standard 100.',
    },
    {
      title: 'Size guide',
      content: `<table style="width:100%;border-collapse:collapse;font-size:13px">
  <thead><tr>
    <th style="text-align:left;padding:6px 4px 6px 0;border-bottom:1px solid rgba(0,0,0,0.10)">Size</th>
    <th style="text-align:left;padding:6px 4px;border-bottom:1px solid rgba(0,0,0,0.10)">Chest (in)</th>
    <th style="text-align:left;padding:6px 4px;border-bottom:1px solid rgba(0,0,0,0.10)">Length (in)</th>
    <th style="text-align:left;padding:6px 4px;border-bottom:1px solid rgba(0,0,0,0.10)">Height</th>
  </tr></thead>
  <tbody>
    <tr><td style="padding:6px 4px 6px 0">2Y</td><td style="padding:6px 4px">20–21</td><td style="padding:6px 4px">15</td><td style="padding:6px 4px">85–95cm</td></tr>
    <tr><td style="padding:6px 4px 6px 0">4Y</td><td style="padding:6px 4px">21–22</td><td style="padding:6px 4px">16</td><td style="padding:6px 4px">95–105cm</td></tr>
    <tr><td style="padding:6px 4px 6px 0">6Y</td><td style="padding:6px 4px">22–24</td><td style="padding:6px 4px">17</td><td style="padding:6px 4px">105–115cm</td></tr>
    <tr><td style="padding:6px 4px 6px 0">8Y</td><td style="padding:6px 4px">24–26</td><td style="padding:6px 4px">18</td><td style="padding:6px 4px">115–125cm</td></tr>
    <tr><td style="padding:6px 4px 6px 0">10Y</td><td style="padding:6px 4px">26–28</td><td style="padding:6px 4px">19</td><td style="padding:6px 4px">125–135cm</td></tr>
    <tr><td style="padding:6px 4px 6px 0">12Y</td><td style="padding:6px 4px">28–30</td><td style="padding:6px 4px">20</td><td style="padding:6px 4px">135–145cm</td></tr>
  </tbody>
</table>`,
    },
  ],

  collectionItems: [
    {
      id: 'col-kids-001',
      slug: 'kids-sleepwear/oat-beige',
      name: 'Kids Sleepwear Set',
      colourLabel: 'Oat Beige',
      price: 1499,
      currency: '₹',
      images: [
        { id: 'col-p6-001-sf', src: phImg('D8C9B0', 2000, 2500, 'Kids Sleepwear Set studio-front'), alt: 'Kids Sleepwear Set — studio-front — oat-beige', type: 'studio-front', colourSlug: 'oat-beige' },
        { id: 'col-p6-001-wk', src: phImg('D8C9B0', 1200, 1500, 'Kids Sleepwear Set walking'),      alt: 'Kids Sleepwear Set — walking — oat-beige',      type: 'walking',      colourSlug: 'oat-beige' },
      ],
    },
    {
      id: 'col-kids-002',
      slug: 'kids-sleepwear/sage-green',
      name: 'Kids Sleepwear Set',
      colourLabel: 'Sage Green',
      price: 1499,
      currency: '₹',
      images: [
        { id: 'col-p6-002-sf', src: phImg('8E9E82', 2000, 2500, 'Kids Sleepwear Set studio-front'), alt: 'Kids Sleepwear Set — studio-front — sage-green', type: 'studio-front', colourSlug: 'sage-green' },
        { id: 'col-p6-002-wk', src: phImg('8E9E82', 1200, 1500, 'Kids Sleepwear Set walking'),      alt: 'Kids Sleepwear Set — walking — sage-green',      type: 'walking',      colourSlug: 'sage-green' },
      ],
    },
  ],

  editorial: {
    quote: 'Super combed cotton — enzyme washed, OEKO-TEX certified. Soft enough for sleep. Built for everything that comes before it.',
    specs: [
      { label: 'Fabric',        value: 'Super combed cotton'    },
      { label: 'Certification', value: 'OEKO-TEX Standard 100'  },
      { label: 'Seams',         value: 'Flat construction'       },
      { label: 'Finish',        value: 'Enzyme washed'           },
      { label: 'Origin',        value: 'Made in India'           },
    ],
    byImage: {
      'studio-front': {
        headline: "Soft enough\nfor sleep.",
        body: 'Super combed cotton — the same fibre standard used in NIVENXA adult products. No synthetic blends. Safe against skin. Certified.',
        specs: [
          { label: 'Fabric',        value: 'Super combed cotton'   },
          { label: 'Certification', value: 'OEKO-TEX Standard 100' },
          { label: 'Blends',        value: 'None'                  },
        ],
      },
      'walking': {
        headline: "Built for\neverything before.",
        body: 'Soft enough for sleep. Durable enough for everything that comes before it. Enzyme washed to feel worn-in from first wear.',
        specs: [
          { label: 'Sizes',  value: '2Y – 12Y unisex'  },
          { label: 'Fit',    value: 'Relaxed comfort'   },
          { label: 'Finish', value: 'Enzyme washed'     },
        ],
      },
      'studio-back': {
        headline: "No irritation\nat the back.",
        body: 'Flat seam construction throughout. No raised seams against the skin. The label is heat-printed — not sewn — so there is nothing to irritate during sleep.',
        specs: [
          { label: 'Seams',  value: 'Flat construction'  },
          { label: 'Label',  value: 'Heat printed'       },
          { label: 'Finish', value: 'Skin-safe throughout'},
        ],
      },
      'studio-side': {
        headline: "The right\nproportions.",
        body: 'Sized for real children — not scaled-down adults. The proportions account for the way children move and sit. Longer in the body. Roomier in the seat.',
        specs: [
          { label: 'Sizing',       value: 'Indian child proportions' },
          { label: 'Body length',  value: 'Extended for coverage'    },
          { label: 'Fit',          value: 'Relaxed through seat'     },
        ],
      },
      'detail': {
        headline: "OEKO-TEX\ncertified.",
        body: 'Every component tested — fabric, thread, label, button. Certified free of harmful substances. Safe for children from newborn.',
        specs: [
          { label: 'Certification', value: 'OEKO-TEX Standard 100' },
          { label: 'Tested',        value: 'All components'         },
          { label: 'Origin',        value: 'Made in India'          },
        ],
      },
    },
  },
}

// ─── Exported array ────────────────────────────────────────────────────────────
export const products: Product[] = [
  oversizedTee,
  cargoPants,
  aLineKurta,
  womenCoordSet,
  womenSleepwear,
  kidsSleepwear,
]

// ─── Helper: look up by URL handle ────────────────────────────────────────────
export function getProductByHandle(handle: string): Product {
  const product = products.find(p => p.handle === handle)
  if (!product) throw new Error(`Product not found: ${handle}`)
  return product
}

// ─── Helper: filter by collection slug ────────────────────────────────────────
// collection matches product.collectionSlug:
//   'mens' | 'womens' | 'unisex' | 'youth-studio'
export function getProductsByCollection(collection: string): Product[] {
  return products.filter(p => p.collectionSlug === collection)
}
