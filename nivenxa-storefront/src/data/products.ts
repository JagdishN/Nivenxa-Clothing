// SHOPIFY TODO: this entire file is replaced by the Storefront API.
// normalizeProduct() in src/utils/normalizeProduct.ts maps the Shopify
// GraphQL response to the Product type defined in src/types/product.ts.
// No component file needs to change — only the data source import in
// src/hooks/useProduct.ts changes.

import type { Product, ProductImage, ImageType } from '@/types/product'


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
  { slug: 'raw-oat',  hex: 'CBC3B4', textHex: '333333', label: 'Raw Oat',  folder: "Men/OversizedTee's/OAT BEIGE",      ...COMMON_FILES }, // Pantone 13-0401 TCX
  // ── 2. BONE ───────────────────────────────────────────────────────────────
  { slug: 'bone',     hex: 'F0EBE0', textHex: '333333', label: 'Bone',     folder: "Men/OversizedTee's/WARM IVORY",     ...COMMON_FILES }, // Pantone 11-0507 TCX
  // ── 3. ESPRESSO ───────────────────────────────────────────────────────────
  { slug: 'espresso', hex: '363031', textHex: 'FFFFFF', label: 'Espresso', folder: "Men/OversizedTee's/CHARCOAL EARTH", ...COMMON_FILES }, // Pantone 19-1103 TCX
  // ── 4. MUSHROOM ───────────────────────────────────────────────────────────
  { slug: 'mushroom', hex: 'A89888', textHex: 'FFFFFF', label: 'Mushroom', folder: "Men/OversizedTee's/MUSHROOM TAUPE", ...COMMON_FILES }, // Pantone 17-1210 TCX
  // ── 5. EARTH ──────────────────────────────────────────────────────────────
  { slug: 'earth',    hex: '8B7355', textHex: 'FFFFFF', label: 'Earth',    folder: "Men/OversizedTee's/MINERAL BROWN",  ...COMMON_FILES }, // Pantone 18-1022 TCX
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
// All five colours have real images on disk. (terracotta hidden)
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
  slug:    string
  hex:     string
  textHex: string
  label:   string
  folder:  string | null   // null → no real images, use phImg() fallback
  files?:  CargoFiles
}

const cargoSlugs: CargoConfig[] = [
  // ── 1. CHARCOALGREY ─────────────────────────────────────────────────────────
  {
    slug: 'carbon', hex: '6B6560', textHex: 'FFFFFF', label: 'Carbon',         // Pantone 18-0601 TCX
    folder: 'Unisex/cargos/CHARCOALGREY',
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
  // ── 2. DARKOLIVE ────────────────────────────────────────────────────────────
  {
    slug: 'forest-floor', hex: '4A5240', textHex: 'FFFFFF', label: 'Forest Floor', // Pantone 19-0417 TCX
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
  // ── 3. SANDBEIGE ────────────────────────────────────────────────────────────
  {
    slug: 'chalk-stone', hex: 'C4B49A', textHex: '333333', label: 'Chalk Stone',  // Pantone 12-0712 TCX
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
  // { slug: 'terracotta', hex: 'B5541C', textHex: 'FFFFFF', label: 'Terracotta', folder: null }, // Pantone 18-1250 TCX — hidden
  // ── 4. MOCHA BROWN ──────────────────────────────────────────────────────────
  {
    slug: 'tobacco', hex: '7B5B3A', textHex: 'FFFFFF', label: 'Tobacco',         // Pantone 18-1048 TCX
    folder: 'Unisex/cargos/MOCHA BROWN',
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
  // ── 5. JETBLACK ─────────────────────────────────────────────────────────────
  {
    slug: 'phantom', hex: '1A1A1A', textHex: 'FFFFFF', label: 'Phantom',         // Pantone 19-4005 TCX
    folder: 'Unisex/cargos/JETBLACK',
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
    const n = 'Six-Pocket Cargo Pant'
    return [
      { id: `cargo-${c.slug}-sf`, src: phImg(c.hex, 2000, 2500, `${n} studio-front`), alt: `${n} — studio-front — ${c.slug}`, type: 'studio-front', colourSlug: c.slug },
      { id: `cargo-${c.slug}-wk`, src: phImg(c.hex, 1200, 1500, `${n} walking`),      alt: `${n} — walking — ${c.slug}`,      type: 'walking',      colourSlug: c.slug },
      { id: `cargo-${c.slug}-sb`, src: phImg(c.hex, 1200, 1500, `${n} studio-back`),  alt: `${n} — studio-back — ${c.slug}`,  type: 'studio-back',  colourSlug: c.slug },
      { id: `cargo-${c.slug}-d1`, src: phImg(c.hex, 1200, 1500, `${n} detail`),       alt: `${n} — detail — ${c.slug}`,       type: 'detail',       colourSlug: c.slug },
    ]
  }
  return [
    localImg(`cargo-${c.slug}-sf`, c.folder, c.files.front,     'studio-front', 'Unisex Cargo Pants', c.slug),  // hero
    localImg(`cargo-${c.slug}-sb`, c.folder, c.files.back,      'studio-back',  'Unisex Cargo Pants', c.slug),  // stack
    localImg(`cargo-${c.slug}-fl`, c.folder, c.files.flatlay,   'detail',       'Unisex Cargo Pants', c.slug),  // stack
    localImg(`cargo-${c.slug}-st`, c.folder, c.files.sitting,   'editorial',    'Unisex Cargo Pants', c.slug),  // stack
    localImg(`cargo-${c.slug}-sw`, c.folder, c.files.stylewith, 'editorial',    'Unisex Cargo Pants', c.slug),  // stack
    localImg(`cargo-${c.slug}-wk`, c.folder, c.files.walk,      'walking',      'Unisex Cargo Pants', c.slug),  // stack
    localImg(`cargo-${c.slug}-fc`, c.folder, c.files.fabric,    'detail',       'Unisex Cargo Pants', c.slug),  // stack
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
    <th style="text-align:left;padding:6px 4px;border-bottom:1px solid rgba(0,0,0,0.10)">Body Length (in)</th>
    <th style="text-align:left;padding:6px 4px;border-bottom:1px solid rgba(0,0,0,0.10)">Chest ½ (in)</th>
    <th style="text-align:left;padding:6px 4px;border-bottom:1px solid rgba(0,0,0,0.10)">Shoulder (in)</th>
    <th style="text-align:left;padding:6px 4px;border-bottom:1px solid rgba(0,0,0,0.10)">Sleeve (in)</th>
    <th style="text-align:left;padding:6px 4px;border-bottom:1px solid rgba(0,0,0,0.10)">Bicep ½ (in)</th>
  </tr></thead>
  <tbody>
    <tr><td style="padding:6px 4px 6px 0">S</td><td style="padding:6px 4px">28</td><td style="padding:6px 4px">22.5</td><td style="padding:6px 4px">19.5</td><td style="padding:6px 4px">9</td><td style="padding:6px 4px">9.5</td></tr>
    <tr><td style="padding:6px 4px 6px 0">M</td><td style="padding:6px 4px">29</td><td style="padding:6px 4px">24</td><td style="padding:6px 4px">21</td><td style="padding:6px 4px">9.5</td><td style="padding:6px 4px">10</td></tr>
    <tr><td style="padding:6px 4px 6px 0">L</td><td style="padding:6px 4px">30</td><td style="padding:6px 4px">25.5</td><td style="padding:6px 4px">22.5</td><td style="padding:6px 4px">10</td><td style="padding:6px 4px">10.5</td></tr>
    <tr><td style="padding:6px 4px 6px 0">XL</td><td style="padding:6px 4px">31</td><td style="padding:6px 4px">27</td><td style="padding:6px 4px">24</td><td style="padding:6px 4px">10.5</td><td style="padding:6px 4px">11</td></tr>
  </tbody>
</table>
<p style="margin:8px 0 0;font-size:11px;color:rgba(0,0,0,0.45)">All measurements are garment measurements in inches (half body where applicable).</p>`,
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
      slug: 'over-tee-shirts/earth',
      name: 'Heavyweight Pocket Tee',
      colourLabel: 'Earth',
      price: 1999,
      currency: '₹',
      images: [
        localImg('col-tee-003-sf', "Men/OversizedTee's/MINERAL BROWN", 'front_studio_view.webp', 'studio-front', 'Heavyweight Pocket Tee', 'earth'),
        localImg('col-tee-003-wk', "Men/OversizedTee's/MINERAL BROWN", 'walking_view.webp',      'walking',      'Heavyweight Pocket Tee', 'earth'),
      ],
    },
  ],

  styledWith: {
    productHandle: 'cargo-pants',
    productName: 'Cargo Pant',
    price: '₹3,499',
    pairings: {
      'raw-oat':  { colourSlug: 'forest-floor', colourName: 'Forest Floor', hex: '#4A5240' },
      'bone':     { colourSlug: 'carbon',        colourName: 'Carbon',       hex: '#6B6560' },
      'espresso': { colourSlug: 'chalk-stone',   colourName: 'Chalk Stone',  hex: '#C4B49A' },
      'mushroom': { colourSlug: 'forest-floor',  colourName: 'Forest Floor', hex: '#4A5240' },
      'earth':    { colourSlug: 'phantom',       colourName: 'Phantom',      hex: '#1A1A1A' },
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
    <th style="text-align:left;padding:6px 4px 6px 0;border-bottom:1px solid rgba(0,0,0,0.10)">Size</th>
    <th style="text-align:left;padding:6px 4px;border-bottom:1px solid rgba(0,0,0,0.10)">Outseam (in)</th>
    <th style="text-align:left;padding:6px 4px;border-bottom:1px solid rgba(0,0,0,0.10)">Waist ½ (in)</th>
    <th style="text-align:left;padding:6px 4px;border-bottom:1px solid rgba(0,0,0,0.10)">Hip ½ (in)</th>
    <th style="text-align:left;padding:6px 4px;border-bottom:1px solid rgba(0,0,0,0.10)">Inseam (in)</th>
    <th style="text-align:left;padding:6px 4px;border-bottom:1px solid rgba(0,0,0,0.10)">Leg Open ½ (in)</th>
  </tr></thead>
  <tbody>
    <tr><td style="padding:6px 4px 6px 0">S</td><td style="padding:6px 4px">39.5</td><td style="padding:6px 4px">14.5</td><td style="padding:6px 4px">21.5</td><td style="padding:6px 4px">28.5</td><td style="padding:6px 4px">13</td></tr>
    <tr><td style="padding:6px 4px 6px 0">M</td><td style="padding:6px 4px">40.5</td><td style="padding:6px 4px">15.5</td><td style="padding:6px 4px">23</td><td style="padding:6px 4px">29</td><td style="padding:6px 4px">13.5</td></tr>
    <tr><td style="padding:6px 4px 6px 0">L</td><td style="padding:6px 4px">41.5</td><td style="padding:6px 4px">16.5</td><td style="padding:6px 4px">24.5</td><td style="padding:6px 4px">29.5</td><td style="padding:6px 4px">14</td></tr>
    <tr><td style="padding:6px 4px 6px 0">XL</td><td style="padding:6px 4px">42</td><td style="padding:6px 4px">18</td><td style="padding:6px 4px">26</td><td style="padding:6px 4px">30</td><td style="padding:6px 4px">14.5</td></tr>
    <tr><td style="padding:6px 4px 6px 0">XXL</td><td style="padding:6px 4px">43</td><td style="padding:6px 4px">20</td><td style="padding:6px 4px">28</td><td style="padding:6px 4px">31</td><td style="padding:6px 4px">15</td></tr>
  </tbody>
</table>
<p style="margin:8px 0 0;font-size:11px;color:rgba(0,0,0,0.45)">All measurements are garment measurements in inches (half body where applicable).</p>`,
    },
  ],

  // Cross-sell items — all 5 colours; CollectionCarousel filters out the active page's own id
  collectionItems: [
    {
      id: 'col-cargo-001',
      slug: 'cargo-pants/forest-floor',
      name: 'Unisex Cargo Pants',
      colourLabel: 'Forest Floor',
      price: 3499,
      currency: '₹',
      images: [
        localImg('col-cargo-001-sf', 'Unisex/cargos/DARKOLIVE', 'front_studio_view.webp', 'studio-front', 'Unisex Cargo Pants', 'forest-floor'),
        localImg('col-cargo-001-wk', 'Unisex/cargos/DARKOLIVE', 'walking_view.webp',      'walking',      'Unisex Cargo Pants', 'forest-floor'),
      ],
    },
    {
      id: 'col-cargo-002',
      slug: 'cargo-pants/chalk-stone',
      name: 'Unisex Cargo Pants',
      colourLabel: 'Chalk Stone',
      price: 3499,
      currency: '₹',
      images: [
        localImg('col-cargo-002-sf', 'Unisex/cargos/SANDBEIGE', 'front_studio_view.webp', 'studio-front', 'Unisex Cargo Pants', 'chalk-stone'),
        localImg('col-cargo-002-wk', 'Unisex/cargos/SANDBEIGE', 'walking_view.webp',      'walking',      'Unisex Cargo Pants', 'chalk-stone'),
      ],
    },
    {
      id: 'col-cargo-003',
      slug: 'cargo-pants/carbon',
      name: 'Unisex Cargo Pants',
      colourLabel: 'Carbon',
      price: 3499,
      currency: '₹',
      images: [
        localImg('col-cargo-003-sf', 'Unisex/cargos/CHARCOALGREY', 'front_studio_view.webp', 'studio-front', 'Unisex Cargo Pants', 'carbon'),
        localImg('col-cargo-003-wk', 'Unisex/cargos/CHARCOALGREY', 'walking_view.webp',      'walking',      'Unisex Cargo Pants', 'carbon'),
      ],
    },
    {
      id: 'col-cargo-004',
      slug: 'cargo-pants/tobacco',
      name: 'Unisex Cargo Pants',
      colourLabel: 'Tobacco',
      price: 3499,
      currency: '₹',
      images: [
        localImg('col-cargo-004-sf', 'Unisex/cargos/MOCHA BROWN', 'front_studio_view.webp', 'studio-front', 'Unisex Cargo Pants', 'tobacco'),
        localImg('col-cargo-004-wk', 'Unisex/cargos/MOCHA BROWN', 'walking_view.webp',      'walking',      'Unisex Cargo Pants', 'tobacco'),
      ],
    },
    {
      id: 'col-cargo-005',
      slug: 'cargo-pants/phantom',
      name: 'Unisex Cargo Pants',
      colourLabel: 'Phantom',
      price: 3499,
      currency: '₹',
      images: [
        localImg('col-cargo-005-sf', 'Unisex/cargos/JETBLACK', 'front_studio_view.webp', 'studio-front', 'Unisex Cargo Pants', 'phantom'),
        localImg('col-cargo-005-wk', 'Unisex/cargos/JETBLACK', 'walking_view.webp',      'walking',      'Unisex Cargo Pants', 'phantom'),
      ],
    },
  ],

  styledWith: {
    productHandle: 'over-tee-shirts',
    productName: 'Heavyweight Pocket Tee',
    price: '₹1,999',
    pairings: {
      'forest-floor': { colourSlug: 'raw-oat',  colourName: 'Raw Oat',  hex: '#CBC3B4' },
      'carbon':       { colourSlug: 'bone',     colourName: 'Bone',     hex: '#F0EBE0' },
      'chalk-stone':  { colourSlug: 'espresso', colourName: 'Espresso', hex: '#363031' },
      'phantom':      { colourSlug: 'earth',    colourName: 'Earth',    hex: '#8B7355' },
      'tobacco':      { colourSlug: 'bone',     colourName: 'Bone',     hex: '#F0EBE0' },
      // 'terracotta' pairing removed — colour hidden
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
// All five colours have real images on disk. front_studio_view.webp is the
// hero; back/walking/sitting/fabric appear in the stack. stylewith_view.webp
// is deliberately excluded from the stack — it powers the "Style it with"
// section rendered after the Add to Bag button instead (see ProductInfo).
interface KurtaFiles {
  front:     string   // front_studio_view.webp           — hero
  back:      string   // back_studio_view.webp            — stack
  sitting:   string   // sittingorLearning_studio_view.webp — stack
  walk:      string   // walking_view.webp                — stack
  fabric:    string   // fabric_close_up.webp             — stack
  stylewith: string   // stylewith_view.webp              — NOT in stack, used post-CTA
}

interface KurtaConfig {
  slug:  string
  hex:   string
  label: string
  folder: string
  files: KurtaFiles
}

const KURTA_COMMON_FILES: KurtaFiles = {
  front:     'front_studio_view.webp',
  back:      'back_studio_view.webp',
  sitting:   'sittingorLearning_studio_view.webp',
  walk:      'walking_view.webp',
  fabric:    'fabric_close_up.webp',
  stylewith: 'stylewith_view.webp',
}

const kurta3ColourSlugs: KurtaConfig[] = [
  { slug: 'ivory', hex: 'F0EBE0', label: 'Ivory', folder: 'Wonmen/A-line Kurta/MORNING IVORY', files: KURTA_COMMON_FILES }, // Pantone 11-0608 TCX — print: minimal-floral
  { slug: 'sand',  hex: 'C8A882', label: 'Sand',  folder: 'Wonmen/A-line Kurta/DESERT SAND',    files: KURTA_COMMON_FILES }, // Pantone 14-1116 TCX — print: minimal-floral
  { slug: 'sage',  hex: '8C9E84', label: 'Sage',  folder: 'Wonmen/A-line Kurta/WILD SAGE',      files: KURTA_COMMON_FILES }, // Pantone 16-5803 TCX — print: plain
  { slug: 'rose',  hex: 'D4A8A0', label: 'Rose',  folder: 'Wonmen/A-line Kurta/DUSK ROSE',      files: KURTA_COMMON_FILES }, // Pantone 14-1911 TCX — print: plain
  { slug: 'clay',  hex: 'C47A4E', label: 'Clay',  folder: 'Wonmen/A-line Kurta/BAKED CLAY',     files: KURTA_COMMON_FILES }, // Pantone 18-1441 TCX — print: plain
]

function buildKurtaImages(c: KurtaConfig): ProductImage[] {
  return [
    localImg(`kurta-${c.slug}-sf`, c.folder, c.files.front,   'studio-front', 'A-line Kurta', c.slug), // hero
    localImg(`kurta-${c.slug}-sb`, c.folder, c.files.back,    'studio-back',  'A-line Kurta', c.slug), // stack
    localImg(`kurta-${c.slug}-wk`, c.folder, c.files.walk,    'walking',      'A-line Kurta', c.slug), // stack
    localImg(`kurta-${c.slug}-st`, c.folder, c.files.sitting, 'editorial',    'A-line Kurta', c.slug), // stack
    localImg(`kurta-${c.slug}-fc`, c.folder, c.files.fabric,  'detail',       'A-line Kurta', c.slug), // stack
  ]
}

function buildKurtaStyleImage(c: KurtaConfig): ProductImage {
  // Used only by the "Style it with" section after Add to Bag — never in the gallery stack.
  return localImg(`kurta-${c.slug}-sw`, c.folder, c.files.stylewith, 'editorial', 'A-line Kurta', c.slug)
}

const aLineKurta: Product = {
  id: 'prod-003',
  name: 'A-line Kurta',
  category: 'Kurta',
  handle: 'a-line-kurta',
  collectionName: "Women's",
  collectionSlug: 'womens',
  badge: null,
  compositionQuote: '160 GSM Cotton-Modal slub — bio-washed for softness, designed for the everyday Indian wardrobe.',
  price: 3999,
  currency: '₹',
  trustLine: 'Inclusive of all taxes · Free delivery above ₹999',
  sizeUnit: null,
  modelNote: "Model is 5'6\" wearing size S.",

  colours: kurta3ColourSlugs.map(c => ({
    slug:      c.slug,
    label:     c.label,
    hex:       `#${c.hex}`,
    available: true,
    images:    buildKurtaImages(c),
    styleImage: buildKurtaStyleImage(c),
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
      content: `<p style="margin:0 0 6px;font-size:11px;font-weight:600;letter-spacing:0.05em;text-transform:uppercase">Kurta</p>
<table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:16px">
  <thead><tr>
    <th style="text-align:left;padding:6px 4px 6px 0;border-bottom:1px solid rgba(0,0,0,0.10)">Size</th>
    <th style="text-align:left;padding:6px 4px;border-bottom:1px solid rgba(0,0,0,0.10)">Front Length (in)</th>
    <th style="text-align:left;padding:6px 4px;border-bottom:1px solid rgba(0,0,0,0.10)">Chest ½ (in)</th>
    <th style="text-align:left;padding:6px 4px;border-bottom:1px solid rgba(0,0,0,0.10)">Armhole (in)</th>
    <th style="text-align:left;padding:6px 4px;border-bottom:1px solid rgba(0,0,0,0.10)">Sleeve ¾ (in)</th>
    <th style="text-align:left;padding:6px 4px;border-bottom:1px solid rgba(0,0,0,0.10)">Neck Depth (in)</th>
  </tr></thead>
  <tbody>
    <tr><td style="padding:6px 4px 6px 0">S</td><td style="padding:6px 4px">42</td><td style="padding:6px 4px">19</td><td style="padding:6px 4px">16</td><td style="padding:6px 4px">19</td><td style="padding:6px 4px">5.5</td></tr>
    <tr><td style="padding:6px 4px 6px 0">M</td><td style="padding:6px 4px">43</td><td style="padding:6px 4px">20.5</td><td style="padding:6px 4px">17</td><td style="padding:6px 4px">19.5</td><td style="padding:6px 4px">6</td></tr>
    <tr><td style="padding:6px 4px 6px 0">L</td><td style="padding:6px 4px">44</td><td style="padding:6px 4px">22</td><td style="padding:6px 4px">18</td><td style="padding:6px 4px">20</td><td style="padding:6px 4px">6.5</td></tr>
    <tr><td style="padding:6px 4px 6px 0">XL</td><td style="padding:6px 4px">45</td><td style="padding:6px 4px">23.5</td><td style="padding:6px 4px">19</td><td style="padding:6px 4px">20.5</td><td style="padding:6px 4px">7</td></tr>
  </tbody>
</table>
<p style="margin:0 0 6px;font-size:11px;font-weight:600;letter-spacing:0.05em;text-transform:uppercase">Pant</p>
<table style="width:100%;border-collapse:collapse;font-size:13px">
  <thead><tr>
    <th style="text-align:left;padding:6px 4px 6px 0;border-bottom:1px solid rgba(0,0,0,0.10)">Size</th>
    <th style="text-align:left;padding:6px 4px;border-bottom:1px solid rgba(0,0,0,0.10)">Outseam (in)</th>
    <th style="text-align:left;padding:6px 4px;border-bottom:1px solid rgba(0,0,0,0.10)">Waist ½ (in)</th>
    <th style="text-align:left;padding:6px 4px;border-bottom:1px solid rgba(0,0,0,0.10)">Hip ½ (in)</th>
    <th style="text-align:left;padding:6px 4px;border-bottom:1px solid rgba(0,0,0,0.10)">Leg Open ½ (in)</th>
  </tr></thead>
  <tbody>
    <tr><td style="padding:6px 4px 6px 0">S</td><td style="padding:6px 4px">38</td><td style="padding:6px 4px">14.75</td><td style="padding:6px 4px">19.5</td><td style="padding:6px 4px">13</td></tr>
    <tr><td style="padding:6px 4px 6px 0">M</td><td style="padding:6px 4px">39</td><td style="padding:6px 4px">16.25</td><td style="padding:6px 4px">21</td><td style="padding:6px 4px">13.5</td></tr>
    <tr><td style="padding:6px 4px 6px 0">L</td><td style="padding:6px 4px">40</td><td style="padding:6px 4px">17.75</td><td style="padding:6px 4px">22.5</td><td style="padding:6px 4px">14</td></tr>
    <tr><td style="padding:6px 4px 6px 0">XL</td><td style="padding:6px 4px">41</td><td style="padding:6px 4px">19.25</td><td style="padding:6px 4px">24</td><td style="padding:6px 4px">14.5</td></tr>
  </tbody>
</table>
<p style="margin:8px 0 0;font-size:11px;color:rgba(0,0,0,0.45)">All measurements are garment measurements in inches (half body where applicable).</p>`,
    },
  ],

  collectionItems: [
    {
      id: 'col-kurta-001',
      slug: 'a-line-kurta/ivory',
      name: 'A-line Kurta',
      colourLabel: 'Ivory',
      price: 3999,
      currency: '₹',
      images: [
        { id: 'col-k3-001-sf', src: phImg('F0EBE0', 2000, 2500, 'A-line Kurta studio-front'), alt: 'A-line Kurta — studio-front — ivory', type: 'studio-front', colourSlug: 'ivory' },
        { id: 'col-k3-001-wk', src: phImg('F0EBE0', 1200, 1500, 'A-line Kurta walking'),      alt: 'A-line Kurta — walking — ivory',      type: 'walking',      colourSlug: 'ivory' },
      ],
    },
    {
      id: 'col-kurta-002',
      slug: 'a-line-kurta/sage',
      name: 'A-line Kurta',
      colourLabel: 'Sage',
      price: 3999,
      currency: '₹',
      images: [
        { id: 'col-k3-002-sf', src: phImg('8C9E84', 2000, 2500, 'A-line Kurta studio-front'), alt: 'A-line Kurta — studio-front — sage', type: 'studio-front', colourSlug: 'sage' },
        { id: 'col-k3-002-wk', src: phImg('8C9E84', 1200, 1500, 'A-line Kurta walking'),      alt: 'A-line Kurta — walking — sage',      type: 'walking',      colourSlug: 'sage' },
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
  { slug: 'raw-ivory',   hex: 'F0EBE0', label: 'Raw Ivory'   }, // Pantone 11-0602 TCX
  { slug: 'flax',        hex: 'C8B89A', label: 'Flax'        }, // Pantone 12-0712 TCX
  { slug: 'meadow-sage', hex: '8C9E84', label: 'Meadow Sage' }, // Pantone 16-0430 TCX
  { slug: 'rose-dust',   hex: 'D4A8A0', label: 'Rose Dust'   }, // Pantone 14-1911 TCX
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
      content: `<p style="margin:0 0 6px;font-size:11px;font-weight:600;letter-spacing:0.05em;text-transform:uppercase">Top</p>
<table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:16px">
  <thead><tr>
    <th style="text-align:left;padding:6px 4px 6px 0;border-bottom:1px solid rgba(0,0,0,0.10)">Size</th>
    <th style="text-align:left;padding:6px 4px;border-bottom:1px solid rgba(0,0,0,0.10)">Body Length (in)</th>
    <th style="text-align:left;padding:6px 4px;border-bottom:1px solid rgba(0,0,0,0.10)">Chest ½ (in)</th>
    <th style="text-align:left;padding:6px 4px;border-bottom:1px solid rgba(0,0,0,0.10)">Shoulder (in)</th>
    <th style="text-align:left;padding:6px 4px;border-bottom:1px solid rgba(0,0,0,0.10)">Sleeve (in)</th>
  </tr></thead>
  <tbody>
    <tr><td style="padding:6px 4px 6px 0">XS</td><td style="padding:6px 4px">24</td><td style="padding:6px 4px">18.5</td><td style="padding:6px 4px">15</td><td style="padding:6px 4px">8</td></tr>
    <tr><td style="padding:6px 4px 6px 0">S</td><td style="padding:6px 4px">25</td><td style="padding:6px 4px">19.5</td><td style="padding:6px 4px">15.5</td><td style="padding:6px 4px">8.5</td></tr>
    <tr><td style="padding:6px 4px 6px 0">M</td><td style="padding:6px 4px">26</td><td style="padding:6px 4px">21</td><td style="padding:6px 4px">16.5</td><td style="padding:6px 4px">9</td></tr>
    <tr><td style="padding:6px 4px 6px 0">L</td><td style="padding:6px 4px">27</td><td style="padding:6px 4px">22.5</td><td style="padding:6px 4px">17.5</td><td style="padding:6px 4px">9.5</td></tr>
    <tr><td style="padding:6px 4px 6px 0">XL</td><td style="padding:6px 4px">28</td><td style="padding:6px 4px">24</td><td style="padding:6px 4px">18.5</td><td style="padding:6px 4px">10</td></tr>
  </tbody>
</table>
<p style="margin:0 0 6px;font-size:11px;font-weight:600;letter-spacing:0.05em;text-transform:uppercase">Bottom</p>
<table style="width:100%;border-collapse:collapse;font-size:13px">
  <thead><tr>
    <th style="text-align:left;padding:6px 4px 6px 0;border-bottom:1px solid rgba(0,0,0,0.10)">Size</th>
    <th style="text-align:left;padding:6px 4px;border-bottom:1px solid rgba(0,0,0,0.10)">Outseam (in)</th>
    <th style="text-align:left;padding:6px 4px;border-bottom:1px solid rgba(0,0,0,0.10)">Waist ½ (in)</th>
    <th style="text-align:left;padding:6px 4px;border-bottom:1px solid rgba(0,0,0,0.10)">Hip ½ (in)</th>
    <th style="text-align:left;padding:6px 4px;border-bottom:1px solid rgba(0,0,0,0.10)">Leg Open ½ (in)</th>
  </tr></thead>
  <tbody>
    <tr><td style="padding:6px 4px 6px 0">XS</td><td style="padding:6px 4px">40.5</td><td style="padding:6px 4px">12.5</td><td style="padding:6px 4px">19.5</td><td style="padding:6px 4px">13</td></tr>
    <tr><td style="padding:6px 4px 6px 0">S</td><td style="padding:6px 4px">41</td><td style="padding:6px 4px">13.5</td><td style="padding:6px 4px">21</td><td style="padding:6px 4px">14</td></tr>
    <tr><td style="padding:6px 4px 6px 0">M</td><td style="padding:6px 4px">41.5</td><td style="padding:6px 4px">14.5</td><td style="padding:6px 4px">22.5</td><td style="padding:6px 4px">15</td></tr>
    <tr><td style="padding:6px 4px 6px 0">L</td><td style="padding:6px 4px">42</td><td style="padding:6px 4px">15.75</td><td style="padding:6px 4px">24</td><td style="padding:6px 4px">16</td></tr>
    <tr><td style="padding:6px 4px 6px 0">XL</td><td style="padding:6px 4px">42.5</td><td style="padding:6px 4px">17</td><td style="padding:6px 4px">25.5</td><td style="padding:6px 4px">17</td></tr>
  </tbody>
</table>
<p style="margin:8px 0 0;font-size:11px;color:rgba(0,0,0,0.45)">All measurements are garment measurements in inches (half body where applicable).</p>`,
    },
  ],

  collectionItems: [
    {
      id: 'col-coord-001',
      slug: 'women-lounge-sets/meadow-sage',
      name: 'Relaxed Co-ord Set',
      colourLabel: 'Meadow Sage',
      price: 3299,
      currency: '₹',
      images: [
        { id: 'col-p4-001-sf', src: phImg('8C9E84', 2000, 2500, 'Relaxed Co-ord Set studio-front'), alt: 'Relaxed Co-ord Set — studio-front — meadow-sage', type: 'studio-front', colourSlug: 'meadow-sage' },
        { id: 'col-p4-001-wk', src: phImg('8C9E84', 1200, 1500, 'Relaxed Co-ord Set walking'),      alt: 'Relaxed Co-ord Set — walking — meadow-sage',      type: 'walking',      colourSlug: 'meadow-sage' },
      ],
    },
    {
      id: 'col-coord-002',
      slug: 'women-lounge-sets/rose-dust',
      name: 'Relaxed Co-ord Set',
      colourLabel: 'Rose Dust',
      price: 3299,
      currency: '₹',
      images: [
        { id: 'col-p4-002-sf', src: phImg('D4A8A0', 2000, 2500, 'Relaxed Co-ord Set studio-front'), alt: 'Relaxed Co-ord Set — studio-front — rose-dust', type: 'studio-front', colourSlug: 'rose-dust' },
        { id: 'col-p4-002-wk', src: phImg('D4A8A0', 1200, 1500, 'Relaxed Co-ord Set walking'),      alt: 'Relaxed Co-ord Set — walking — rose-dust',      type: 'walking',      colourSlug: 'rose-dust' },
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
  { slug: 'morning-cream', hex: 'F5F0E8', label: 'Morning Cream' }, // Pantone 11-0602 TCX — print: micro-botanical
  { slug: 'blush-field',   hex: 'D4A8A0', label: 'Blush Field'   }, // Pantone 14-1911 TCX — print: micro-botanical
  { slug: 'sage-atelier',  hex: '8C9E84', label: 'Sage Atelier'  }, // Pantone 16-5803 TCX — print: dabu-block
  { slug: 'dusk-lavender', hex: 'B8B0C8', label: 'Dusk Lavender' }, // Pantone 14-3812 TCX — print: micro-stripe
  { slug: 'dark-earth',    hex: '7B5B3A', label: 'Dark Earth'    }, // Pantone 18-1048 TCX — print: plain
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
      content: `<p style="margin:0 0 6px;font-size:11px;font-weight:600;letter-spacing:0.05em;text-transform:uppercase">Top</p>
<table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:16px">
  <thead><tr>
    <th style="text-align:left;padding:6px 4px 6px 0;border-bottom:1px solid rgba(0,0,0,0.10)">Size</th>
    <th style="text-align:left;padding:6px 4px;border-bottom:1px solid rgba(0,0,0,0.10)">Body Length (in)</th>
    <th style="text-align:left;padding:6px 4px;border-bottom:1px solid rgba(0,0,0,0.10)">Chest ½ (in)</th>
    <th style="text-align:left;padding:6px 4px;border-bottom:1px solid rgba(0,0,0,0.10)">Shoulder (in)</th>
    <th style="text-align:left;padding:6px 4px;border-bottom:1px solid rgba(0,0,0,0.10)">Sleeve (in)</th>
  </tr></thead>
  <tbody>
    <tr><td style="padding:6px 4px 6px 0">XS</td><td style="padding:6px 4px">24</td><td style="padding:6px 4px">18.5</td><td style="padding:6px 4px">15</td><td style="padding:6px 4px">8</td></tr>
    <tr><td style="padding:6px 4px 6px 0">S</td><td style="padding:6px 4px">25</td><td style="padding:6px 4px">19.5</td><td style="padding:6px 4px">15.5</td><td style="padding:6px 4px">8.5</td></tr>
    <tr><td style="padding:6px 4px 6px 0">M</td><td style="padding:6px 4px">26</td><td style="padding:6px 4px">21</td><td style="padding:6px 4px">16.5</td><td style="padding:6px 4px">9</td></tr>
    <tr><td style="padding:6px 4px 6px 0">L</td><td style="padding:6px 4px">27</td><td style="padding:6px 4px">22.5</td><td style="padding:6px 4px">17.5</td><td style="padding:6px 4px">9.5</td></tr>
    <tr><td style="padding:6px 4px 6px 0">XL</td><td style="padding:6px 4px">28</td><td style="padding:6px 4px">24</td><td style="padding:6px 4px">18.5</td><td style="padding:6px 4px">10</td></tr>
  </tbody>
</table>
<p style="margin:0 0 6px;font-size:11px;font-weight:600;letter-spacing:0.05em;text-transform:uppercase">Pant</p>
<table style="width:100%;border-collapse:collapse;font-size:13px">
  <thead><tr>
    <th style="text-align:left;padding:6px 4px 6px 0;border-bottom:1px solid rgba(0,0,0,0.10)">Size</th>
    <th style="text-align:left;padding:6px 4px;border-bottom:1px solid rgba(0,0,0,0.10)">Outseam (in)</th>
    <th style="text-align:left;padding:6px 4px;border-bottom:1px solid rgba(0,0,0,0.10)">Waist ½ (in)</th>
    <th style="text-align:left;padding:6px 4px;border-bottom:1px solid rgba(0,0,0,0.10)">Hip ½ (in)</th>
    <th style="text-align:left;padding:6px 4px;border-bottom:1px solid rgba(0,0,0,0.10)">Inseam (in)</th>
  </tr></thead>
  <tbody>
    <tr><td style="padding:6px 4px 6px 0">XS</td><td style="padding:6px 4px">40.5</td><td style="padding:6px 4px">12.5</td><td style="padding:6px 4px">19.5</td><td style="padding:6px 4px">28</td></tr>
    <tr><td style="padding:6px 4px 6px 0">S</td><td style="padding:6px 4px">41</td><td style="padding:6px 4px">13.5</td><td style="padding:6px 4px">21</td><td style="padding:6px 4px">28.5</td></tr>
    <tr><td style="padding:6px 4px 6px 0">M</td><td style="padding:6px 4px">41.5</td><td style="padding:6px 4px">14.5</td><td style="padding:6px 4px">22.5</td><td style="padding:6px 4px">29</td></tr>
    <tr><td style="padding:6px 4px 6px 0">L</td><td style="padding:6px 4px">42</td><td style="padding:6px 4px">15.75</td><td style="padding:6px 4px">24</td><td style="padding:6px 4px">29.5</td></tr>
    <tr><td style="padding:6px 4px 6px 0">XL</td><td style="padding:6px 4px">42.5</td><td style="padding:6px 4px">17</td><td style="padding:6px 4px">25.5</td><td style="padding:6px 4px">30</td></tr>
  </tbody>
</table>
<p style="margin:8px 0 0;font-size:11px;color:rgba(0,0,0,0.45)">All measurements are garment measurements in inches (half body where applicable).</p>`,
    },
  ],

  collectionItems: [
    {
      id: 'col-sw-001',
      slug: 'women-sleepwear/morning-cream',
      name: 'Long Sleeve Lounge Set',
      colourLabel: 'Morning Cream',
      price: 2499,
      currency: '₹',
      images: [
        { id: 'col-p5-001-sf', src: phImg('F5F0E8', 2000, 2500, 'Long Sleeve Lounge Set studio-front'), alt: 'Long Sleeve Lounge Set — studio-front — morning-cream', type: 'studio-front', colourSlug: 'morning-cream' },
        { id: 'col-p5-001-wk', src: phImg('F5F0E8', 1200, 1500, 'Long Sleeve Lounge Set walking'),      alt: 'Long Sleeve Lounge Set — walking — morning-cream',      type: 'walking',      colourSlug: 'morning-cream' },
      ],
    },
    {
      id: 'col-sw-002',
      slug: 'women-sleepwear/blush-field',
      name: 'Long Sleeve Lounge Set',
      colourLabel: 'Blush Field',
      price: 2499,
      currency: '₹',
      images: [
        { id: 'col-p5-002-sf', src: phImg('D4A8A0', 2000, 2500, 'Long Sleeve Lounge Set studio-front'), alt: 'Long Sleeve Lounge Set — studio-front — blush-field', type: 'studio-front', colourSlug: 'blush-field' },
        { id: 'col-p5-002-wk', src: phImg('D4A8A0', 1200, 1500, 'Long Sleeve Lounge Set walking'),      alt: 'Long Sleeve Lounge Set — walking — blush-field',      type: 'walking',      colourSlug: 'blush-field' },
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

// ─── Kids Sleepwear image config — shared by Rest Set + Summer Set ───────────
// All views live in one folder per colour: front_studio_view (hero),
// back/side/sitting/walking (stack), fabric_close_up (detail, last in stack).
interface KidsSleepFiles {
  front:   string
  back:    string
  side:    string
  sitting: string
  walk:    string
  fabric:  string
}

interface KidsSleepConfig {
  slug:     string
  hex:      string
  label:    string
  pantone:  string
  isUnique: boolean
  finish:   'plain' | 'tonal-print'
  folder:   string
  files:    KidsSleepFiles
}

function buildKidsSleepImages(productSlug: string, productName: string, c: KidsSleepConfig): ProductImage[] {
  return [
    localImg(`${productSlug}-${c.slug}-sf`, c.folder, c.files.front,   'studio-front', productName, c.slug), // hero
    localImg(`${productSlug}-${c.slug}-sb`, c.folder, c.files.back,    'studio-back',  productName, c.slug), // stack
    localImg(`${productSlug}-${c.slug}-ss`, c.folder, c.files.side,    'studio-side',  productName, c.slug), // stack
    localImg(`${productSlug}-${c.slug}-st`, c.folder, c.files.sitting, 'editorial',    productName, c.slug), // stack
    localImg(`${productSlug}-${c.slug}-wk`, c.folder, c.files.walk,    'walking',      productName, c.slug), // stack
    localImg(`${productSlug}-${c.slug}-fc`, c.folder, c.files.fabric,  'detail',       productName, c.slug), // stack
  ]
}

// ─── Product 6: The Rest Sleep Set ────────────────────────────────────────────
const KIDS_REST_COMMON_FILES: KidsSleepFiles = {
  front:   'front_studio_view.webp',
  back:    'back_studio_view.webp',
  side:    'side_studio_view.webp',
  sitting: 'sittingorLearning_studio_view.webp',
  walk:    'walking_view.webp',
  fabric:  'fabric_close_up.webp',
}

// Editorial names below are [PROPOSED] — confirmed by spec but not yet
// formally signed off by the brand. Internal spec names (disk folder names),
// for reference: Soft Cloud White, Pale Oat, Baby Blue Grey, Dusty Sage, Faded Blush.
const kidsRestColourSlugs: KidsSleepConfig[] = [
  { slug: 'cloud',       hex: 'F5F2EC', label: 'Cloud',       pantone: '11-0601 TCX', isUnique: false, finish: 'plain', folder: 'Kids/unisex sleeper wear/Rest Set/SOFT CLOUD WHITE', files: KIDS_REST_COMMON_FILES },
  { slug: 'oat',         hex: 'EDE5D0', label: 'Oat',         pantone: '12-0104 TCX', isUnique: true,  finish: 'plain', folder: 'Kids/unisex sleeper wear/Rest Set/PALE OAT',         files: KIDS_REST_COMMON_FILES },
  { slug: 'mist-blue',   hex: 'A8B8C8', label: 'Mist Blue',   pantone: '14-4112 TCX', isUnique: false, finish: 'plain', folder: 'Kids/unisex sleeper wear/Rest Set/BABYBLUEGREY',     files: KIDS_REST_COMMON_FILES },
  { slug: 'little-sage', hex: '9EAA8C', label: 'Little Sage', pantone: '16-0213 TCX', isUnique: false, finish: 'plain', folder: 'Kids/unisex sleeper wear/Rest Set/DUSTY SAGE',       files: KIDS_REST_COMMON_FILES },
  { slug: 'petal',       hex: 'E8C4B8', label: 'Petal',       pantone: '13-2010 TCX', isUnique: false, finish: 'plain', folder: 'Kids/unisex sleeper wear/Rest Set/FADED BLUSH',      files: KIDS_REST_COMMON_FILES },
]

const kidsRestSleepSet: Product = {
  id: 'prod-006',
  name: 'The Rest Sleep Set',
  category: 'Kids Sleepwear',
  handle: 'kids-rest-sleep-set',
  collectionName: 'Youth Studio',
  collectionSlug: 'youth-studio',
  badge: null,
  compositionQuote: '220 GSM Organic Cotton-Bamboo — enzyme washed, OEKO-TEX certified. Full-sleeve top and full-length trouser for cooler weather and AC rooms.',
  price: 1499,
  currency: '₹',
  trustLine: 'Inclusive of all taxes · Free delivery above ₹999',
  sizeUnit: null,
  modelNote: 'Model is 6 years old wearing size 6Y.',

  colours: kidsRestColourSlugs.map(c => ({
    slug:      c.slug,
    label:     c.label,
    hex:       `#${c.hex}`,
    available: true,
    pantone:   c.pantone,
    isUnique:  c.isUnique,
    finish:    c.finish,
    images:    buildKidsSleepImages('rest', 'The Rest Sleep Set', c),
  })),

  sizes: [
    { label: '4Y',  available: true },
    { label: '6Y',  available: true },
    { label: '8Y',  available: true },
    { label: '10Y', available: true },
    { label: '12Y', available: true },
  ],

  featureBullets: [
    '220 GSM Organic Cotton-Bamboo',
    'Full-sleeve top + full-length trouser',
    'Unisex fit — 4Y to 12Y',
    'Enzyme washed for softness',
    'OEKO-TEX Standard 100 certified',
  ],

  specs: [
    { group: 'Material',     label: 'Fabric',        value: 'Organic Cotton-Bamboo'    },
    { group: 'Material',     label: 'Weight',        value: '220 GSM'                  },
    { group: 'Material',     label: 'Certification', value: 'OEKO-TEX Standard 100'   },
    { group: 'Construction', label: 'Set',           value: 'Full-sleeve top + trouser'},
    { group: 'Construction', label: 'Seams',         value: 'Flat construction'        },
    { group: 'Construction', label: 'Label',         value: 'Heat printed'             },
    { group: 'Construction', label: 'Sizes',         value: '4Y – 12Y unisex'          },
    { group: 'Production',   label: 'Finish',        value: 'Enzyme washed'            },
    { group: 'Production',   label: 'Origin',        value: 'Made in India'            },
  ],

  fabricPillars: [
    {
      value: '220',
      unit: 'GSM',
      subLabel: 'Cotton-Bamboo weight',
      description: 'Soft and warm without bulk. Natural temperature regulation for cooler nights and AC rooms.',
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
    { label: 'Length',    value: 70, descriptor: 'Extended' },
    { label: 'Sleeve',    value: 70, descriptor: 'Full'     },
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
      slug: 'kids-rest-sleep-set/cloud',
      name: 'The Rest Sleep Set',
      colourLabel: 'Cloud',
      price: 1499,
      currency: '₹',
      images: [
        { id: 'col-p6-001-sf', src: phImg('F5F2EC', 2000, 2500, 'The Rest Sleep Set studio-front'), alt: 'The Rest Sleep Set — studio-front — cloud', type: 'studio-front', colourSlug: 'cloud' },
        { id: 'col-p6-001-wk', src: phImg('F5F2EC', 1200, 1500, 'The Rest Sleep Set walking'),      alt: 'The Rest Sleep Set — walking — cloud',      type: 'walking',      colourSlug: 'cloud' },
      ],
    },
    {
      id: 'col-kids-002',
      slug: 'kids-rest-sleep-set/little-sage',
      name: 'The Rest Sleep Set',
      colourLabel: 'Little Sage',
      price: 1499,
      currency: '₹',
      images: [
        { id: 'col-p6-002-sf', src: phImg('9EAA8C', 2000, 2500, 'The Rest Sleep Set studio-front'), alt: 'The Rest Sleep Set — studio-front — little-sage', type: 'studio-front', colourSlug: 'little-sage' },
        { id: 'col-p6-002-wk', src: phImg('9EAA8C', 1200, 1500, 'The Rest Sleep Set walking'),      alt: 'The Rest Sleep Set — walking — little-sage',      type: 'walking',      colourSlug: 'little-sage' },
      ],
    },
  ],

  editorial: {
    quote: '220 GSM Organic Cotton-Bamboo — enzyme washed, OEKO-TEX certified. For cooler weather and considered rest.',
    specs: [
      { label: 'Fabric',        value: 'Organic Cotton-Bamboo'  },
      { label: 'Weight',        value: '220 GSM'                },
      { label: 'Certification', value: 'OEKO-TEX Standard 100'  },
      { label: 'Seams',         value: 'Flat construction'      },
      { label: 'Finish',        value: 'Enzyme washed'          },
    ],
    byImage: {
      'studio-front': {
        headline: "Full-sleeve\ncomfort.",
        body: '220 GSM Organic Cotton-Bamboo. Full-sleeve top and full-length trouser. Designed for cooler weather and AC rooms — substantial enough to feel cosy, soft enough for sleep.',
        specs: [
          { label: 'Fabric',        value: 'Organic Cotton-Bamboo' },
          { label: 'Weight',        value: '220 GSM'               },
          { label: 'Set',           value: 'Full sleeve + trouser' },
        ],
      },
      'walking': {
        headline: "Built for\neverything before.",
        body: 'Soft enough for sleep. Durable enough for everything that comes before it. Enzyme washed to feel worn-in from first wear.',
        specs: [
          { label: 'Sizes',  value: '4Y – 12Y unisex' },
          { label: 'Fit',    value: 'Relaxed comfort'  },
          { label: 'Finish', value: 'Enzyme washed'    },
        ],
      },
      'studio-back': {
        headline: "No irritation\nat the back.",
        body: 'Flat seam construction throughout. No raised seams against the skin. The label is heat-printed — not sewn — so there is nothing to irritate during sleep.',
        specs: [
          { label: 'Seams', value: 'Flat construction'   },
          { label: 'Label', value: 'Heat printed'        },
          { label: 'Finish', value: 'Skin-safe throughout'},
        ],
      },
      'studio-side': {
        headline: "The right\nproportions.",
        body: 'Sized for real children — not scaled-down adults. The proportions account for the way children move and sit. Longer in the body. Roomier in the seat.',
        specs: [
          { label: 'Sizing',      value: 'Indian child proportions' },
          { label: 'Body length', value: 'Extended for coverage'    },
          { label: 'Fit',         value: 'Relaxed through seat'     },
        ],
      },
      'detail': {
        headline: "OEKO-TEX\ncertified.",
        body: 'Every component tested — fabric, thread, label, button. Certified free of harmful substances. Safe for children from newborn.',
        specs: [
          { label: 'Certification', value: 'OEKO-TEX Standard 100' },
          { label: 'Tested',        value: 'All components'        },
          { label: 'Origin',        value: 'Made in India'         },
        ],
      },
    },
  },
}

// ─── Product 7: Kurta Straight Pant ──────────────────────────────────────────
// Colours shared with A-line Kurta — references kurta3ColourSlugs directly.
const kurtaStraightPant: Product = {
  id: 'prod-007',
  name: 'Kurta Straight Pant',
  category: 'Kurta',
  handle: 'kurta-straight-pant',
  collectionName: "Women's",
  collectionSlug: 'womens',
  badge: null,
  compositionQuote: '160 GSM Cotton-Modal slub — bio-washed for softness. Designed to pair with the A-line Kurta or wear as a standalone.',
  price: 1499,
  currency: '₹',
  trustLine: 'Inclusive of all taxes · Free delivery above ₹999',
  sizeUnit: null,
  modelNote: "Model is 5'6\" wearing size S.",

  colours: kurta3ColourSlugs.map(c => ({
    slug:      c.slug,
    label:     c.label,
    hex:       `#${c.hex}`,
    available: true,
    images:    buildPlaceholderImages('p7', 'Kurta Straight Pant', c.slug, c.hex),
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
    'Straight leg silhouette',
    'Elasticated waistband with drawcord',
    'Bio-wash and silicone softener finish',
    'Coordinates with A-line Kurta',
  ],

  specs: [
    { group: 'Material',     label: 'Fabric',     value: '60% Cotton 40% Modal' },
    { group: 'Material',     label: 'Weight',      value: '160 GSM'              },
    { group: 'Material',     label: 'Character',   value: 'Cotton-Modal slub'    },
    { group: 'Construction', label: 'Silhouette',  value: 'Straight leg'         },
    { group: 'Construction', label: 'Rise',        value: 'Mid-rise'             },
    { group: 'Construction', label: 'Waistband',   value: 'Elastic + drawcord'   },
    { group: 'Production',   label: 'Finish',      value: 'Bio-wash + silicone'  },
    { group: 'Production',   label: 'Origin',      value: 'Made in India'        },
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
    { label: 'Waist ease', value: 50, descriptor: 'Regular'  },
    { label: 'Hip ease',   value: 55, descriptor: 'Relaxed'  },
    { label: 'Thigh',      value: 50, descriptor: 'Straight' },
    { label: 'Length',     value: 80, descriptor: 'Full'     },
  ],

  care: [
    { icon: 'wash',      label: 'Machine wash 30°C gentle'     },
    { icon: 'sun-off',   label: 'Dry in shade. Not direct sun' },
    { icon: 'flame-off', label: 'Cool iron reverse side'        },
    { icon: 'ban',       label: 'Do not bleach or dry clean'    },
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
      title: 'Size guide',
      content: `<table style="width:100%;border-collapse:collapse;font-size:13px">
  <thead><tr>
    <th style="text-align:left;padding:6px 4px 6px 0;border-bottom:1px solid rgba(0,0,0,0.10)">Size</th>
    <th style="text-align:left;padding:6px 4px;border-bottom:1px solid rgba(0,0,0,0.10)">Outseam (in)</th>
    <th style="text-align:left;padding:6px 4px;border-bottom:1px solid rgba(0,0,0,0.10)">Waist ½ (in)</th>
    <th style="text-align:left;padding:6px 4px;border-bottom:1px solid rgba(0,0,0,0.10)">Hip ½ (in)</th>
    <th style="text-align:left;padding:6px 4px;border-bottom:1px solid rgba(0,0,0,0.10)">Inseam (in)</th>
    <th style="text-align:left;padding:6px 4px;border-bottom:1px solid rgba(0,0,0,0.10)">Leg Open ½ (in)</th>
  </tr></thead>
  <tbody>
    <tr><td style="padding:6px 4px 6px 0">XS</td><td style="padding:6px 4px">40.5</td><td style="padding:6px 4px">13.5</td><td style="padding:6px 4px">18.5</td><td style="padding:6px 4px">27.5</td><td style="padding:6px 4px">13.5</td></tr>
    <tr><td style="padding:6px 4px 6px 0">S</td><td style="padding:6px 4px">41</td><td style="padding:6px 4px">14.75</td><td style="padding:6px 4px">19.5</td><td style="padding:6px 4px">28</td><td style="padding:6px 4px">14</td></tr>
    <tr><td style="padding:6px 4px 6px 0">M</td><td style="padding:6px 4px">41.5</td><td style="padding:6px 4px">16.25</td><td style="padding:6px 4px">21</td><td style="padding:6px 4px">28.5</td><td style="padding:6px 4px">15</td></tr>
    <tr><td style="padding:6px 4px 6px 0">L</td><td style="padding:6px 4px">42</td><td style="padding:6px 4px">17.75</td><td style="padding:6px 4px">22.5</td><td style="padding:6px 4px">29</td><td style="padding:6px 4px">16</td></tr>
    <tr><td style="padding:6px 4px 6px 0">XL</td><td style="padding:6px 4px">43</td><td style="padding:6px 4px">19.25</td><td style="padding:6px 4px">24</td><td style="padding:6px 4px">29.5</td><td style="padding:6px 4px">17</td></tr>
  </tbody>
</table>
<p style="margin:8px 0 0;font-size:11px;color:rgba(0,0,0,0.45)">All measurements are garment measurements in inches (half body where applicable).</p>`,
    },
  ],

  collectionItems: [
    {
      id: 'col-ksp-001',
      slug: 'kurta-straight-pant/ivory',
      name: 'Kurta Straight Pant',
      colourLabel: 'Ivory',
      price: 1499,
      currency: '₹',
      images: [
        { id: 'col-p7-001-sf', src: phImg('F0EBE0', 2000, 2500, 'Kurta Straight Pant studio-front'), alt: 'Kurta Straight Pant — studio-front — ivory', type: 'studio-front', colourSlug: 'ivory' },
        { id: 'col-p7-001-wk', src: phImg('F0EBE0', 1200, 1500, 'Kurta Straight Pant walking'),      alt: 'Kurta Straight Pant — walking — ivory',      type: 'walking',      colourSlug: 'ivory' },
      ],
    },
    {
      id: 'col-ksp-002',
      slug: 'kurta-straight-pant/sage',
      name: 'Kurta Straight Pant',
      colourLabel: 'Sage',
      price: 1499,
      currency: '₹',
      images: [
        { id: 'col-p7-002-sf', src: phImg('8C9E84', 2000, 2500, 'Kurta Straight Pant studio-front'), alt: 'Kurta Straight Pant — studio-front — sage', type: 'studio-front', colourSlug: 'sage' },
        { id: 'col-p7-002-wk', src: phImg('8C9E84', 1200, 1500, 'Kurta Straight Pant walking'),      alt: 'Kurta Straight Pant — walking — sage',      type: 'walking',      colourSlug: 'sage' },
      ],
    },
  ],
}

// ─── Kids Summer Sleep Set colour slugs ──────────────────────────────────────
const KIDS_SUMMER_COMMON_FILES: KidsSleepFiles = {
  front:   'front_studio_view.webp',
  back:    'back_studio_view.webp',
  side:    'side_studio_view.webp',
  sitting: 'sittingorLearning_studio_view.webp',
  walk:    'walking_view.webp',
  fabric:  'fabric_close_up.webp',
}

// Editorial names below are [PROPOSED] — confirmed by spec but not yet
// formally signed off by the brand. Internal spec names (disk folder names),
// for reference: Soft Cloud White, Dusty Sage, Warm Butter, Faded Blush, Pale Mint.
const kidsSummerColourSlugs: KidsSleepConfig[] = [
  {
    slug: 'cloud', hex: 'F5F2EC', label: 'Cloud', pantone: '11-0601 TCX', isUnique: false, finish: 'plain',
    folder: 'Kids/unisex sleeper wear/Summer Set/SOFT CLOUD WHITE',
    files: {
      ...KIDS_SUMMER_COMMON_FILES,
      // This colour's side-profile shot was delivered under its own filename.
      side: 'Summer Cloud - Side Profile.webp',
    },
  },
  { slug: 'little-sage', hex: '9EAA8C', label: 'Little Sage', pantone: '16-0213 TCX', isUnique: false, finish: 'plain',       folder: 'Kids/unisex sleeper wear/Summer Set/DUSTY SAGE',   files: KIDS_SUMMER_COMMON_FILES },
  { slug: 'butter',      hex: 'F5E6C8', label: 'Butter',      pantone: '12-0712 TCX', isUnique: true,  finish: 'plain',       folder: 'Kids/unisex sleeper wear/Summer Set/WARM BUTTER',  files: KIDS_SUMMER_COMMON_FILES },
  { slug: 'petal',       hex: 'E8C4B8', label: 'Petal',       pantone: '13-2010 TCX', isUnique: false, finish: 'tonal-print', folder: 'Kids/unisex sleeper wear/Summer Set/FADED BLUSH',  files: KIDS_SUMMER_COMMON_FILES },
  {
    slug: 'mint', hex: 'C8E0C8', label: 'Mint', pantone: '13-0221 TCX', isUnique: false, finish: 'tonal-print',
    folder: 'Kids/unisex sleeper wear/Summer Set/Pale Mint',
    files: {
      // This colour's photos were delivered as .png except the hero shot.
      front:   'front_studio_view.webp',
      back:    'back_studio_view.png',
      side:    'side_studio_view.png',
      sitting: 'sittingorLearning_studio_view.png',
      walk:    'walking_view.png',
      fabric:  'fabric_close_up.png',
    },
  },
]

// ─── Product 8: The Summer Sleep Set ─────────────────────────────────────────
const kidsSummerSleepSet: Product = {
  id: 'prod-008',
  name: 'The Summer Sleep Set',
  category: 'Kids Sleepwear',
  handle: 'kids-summer-sleep-set',
  collectionName: 'Youth Studio',
  collectionSlug: 'youth-studio',
  badge: null,
  compositionQuote: '180–200 GSM 100% GOTS Organic Cotton — enzyme washed, OEKO-TEX certified. Half-sleeve top and relaxed mid-length shorts for warm weather.',
  price: 1499,
  currency: '₹',
  trustLine: 'Inclusive of all taxes · Free delivery above ₹999',
  sizeUnit: null,
  modelNote: 'Model is 6 years old wearing size 6Y.',

  colours: kidsSummerColourSlugs.map(c => ({
    slug:      c.slug,
    label:     c.label,
    hex:       `#${c.hex}`,
    available: true,
    pantone:   c.pantone,
    isUnique:  c.isUnique,
    finish:    c.finish,
    images:    buildKidsSleepImages('summer', 'The Summer Sleep Set', c),
  })),

  sizes: [
    { label: '4Y',  available: true },
    { label: '6Y',  available: true },
    { label: '8Y',  available: true },
    { label: '10Y', available: true },
    { label: '12Y', available: true },
  ],

  featureBullets: [
    '180–200 GSM 100% GOTS Organic Cotton',
    'Half-sleeve top + relaxed mid-length shorts',
    'Unisex fit — 4Y to 12Y',
    'Enzyme washed for softness',
    'OEKO-TEX Standard 100 certified',
  ],

  specs: [
    { group: 'Material',     label: 'Fabric',        value: '100% GOTS Organic Cotton' },
    { group: 'Material',     label: 'Weight',        value: '180–200 GSM'              },
    { group: 'Material',     label: 'Certification', value: 'OEKO-TEX Standard 100'   },
    { group: 'Construction', label: 'Set',           value: 'Half-sleeve top + shorts' },
    { group: 'Construction', label: 'Seams',         value: 'Flat construction'        },
    { group: 'Construction', label: 'Label',         value: 'Heat printed'             },
    { group: 'Construction', label: 'Sizes',         value: '4Y – 12Y unisex'          },
    { group: 'Production',   label: 'Finish',        value: 'Enzyme washed'            },
    { group: 'Production',   label: 'Origin',        value: 'Made in India'            },
  ],

  fabricPillars: [
    {
      value: '180',
      unit: 'GSM',
      subLabel: 'Summer-weight cotton',
      description: 'Lightweight and breathable. Moves easily. Designed for Indian warm weather and hot nights.',
    },
    {
      value: 'GOTS',
      unit: '',
      subLabel: 'Organic certified',
      description: 'Global Organic Textile Standard. 100% organic cotton, no synthetic blends, certified throughout the supply chain.',
    },
    {
      value: 'Flat',
      unit: '',
      subLabel: 'Seam construction',
      description: 'No raised seams against skin. Heat-printed label. Nothing to irritate during sleep.',
    },
  ],

  fitBars: [
    { label: 'Body ease', value: 60, descriptor: 'Relaxed' },
    { label: 'Length',    value: 40, descriptor: 'Shorts'  },
    { label: 'Sleeve',    value: 30, descriptor: 'Short'   },
    { label: 'Seat ease', value: 65, descriptor: 'Roomy'   },
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
    <tr><td style="padding:6px 4px 6px 0">4Y</td><td style="padding:6px 4px">21–22</td><td style="padding:6px 4px">14</td><td style="padding:6px 4px">95–105cm</td></tr>
    <tr><td style="padding:6px 4px 6px 0">6Y</td><td style="padding:6px 4px">22–24</td><td style="padding:6px 4px">15</td><td style="padding:6px 4px">105–115cm</td></tr>
    <tr><td style="padding:6px 4px 6px 0">8Y</td><td style="padding:6px 4px">24–26</td><td style="padding:6px 4px">16</td><td style="padding:6px 4px">115–125cm</td></tr>
    <tr><td style="padding:6px 4px 6px 0">10Y</td><td style="padding:6px 4px">26–28</td><td style="padding:6px 4px">17</td><td style="padding:6px 4px">125–135cm</td></tr>
    <tr><td style="padding:6px 4px 6px 0">12Y</td><td style="padding:6px 4px">28–30</td><td style="padding:6px 4px">18</td><td style="padding:6px 4px">135–145cm</td></tr>
  </tbody>
</table>`,
    },
  ],

  collectionItems: [
    {
      id: 'col-ksw-001',
      slug: 'kids-summer-sleep-set/cloud',
      name: 'The Summer Sleep Set',
      colourLabel: 'Cloud',
      price: 1499,
      currency: '₹',
      images: [
        { id: 'col-p8-001-sf', src: phImg('F5F2EC', 2000, 2500, 'The Summer Sleep Set studio-front'), alt: 'The Summer Sleep Set — studio-front — cloud', type: 'studio-front', colourSlug: 'cloud' },
        { id: 'col-p8-001-wk', src: phImg('F5F2EC', 1200, 1500, 'The Summer Sleep Set walking'),      alt: 'The Summer Sleep Set — walking — cloud',      type: 'walking',      colourSlug: 'cloud' },
      ],
    },
    {
      id: 'col-ksw-002',
      slug: 'kids-summer-sleep-set/petal',
      name: 'The Summer Sleep Set',
      colourLabel: 'Petal',
      price: 1499,
      currency: '₹',
      images: [
        { id: 'col-p8-002-sf', src: phImg('E8C4B8', 2000, 2500, 'The Summer Sleep Set studio-front'), alt: 'The Summer Sleep Set — studio-front — petal', type: 'studio-front', colourSlug: 'petal' },
        { id: 'col-p8-002-wk', src: phImg('E8C4B8', 1200, 1500, 'The Summer Sleep Set walking'),      alt: 'The Summer Sleep Set — walking — petal',      type: 'walking',      colourSlug: 'petal' },
      ],
    },
  ],
}

// ─── Exported array ────────────────────────────────────────────────────────────
export const products: Product[] = [
  oversizedTee,
  cargoPants,
  aLineKurta,
  womenCoordSet,
  womenSleepwear,
  kidsRestSleepSet,
  kurtaStraightPant,
  kidsSummerSleepSet,
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

// ─── Helper: filter by product category ───────────────────────────────────────
// category matches product.category — used by sub-category pages
// e.g. getProductsByCategory('Kids Sleepwear')
export function getProductsByCategory(category: string): Product[] {
  return products.filter(p => p.category === category)
}
