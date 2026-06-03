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
]

function buildCargoImages(c: CargoConfig): ProductImage[] {
  // Fallback: no real images on disk for this colour
  if (!c.folder || !c.files) {
    return [
      { id: `cargo-${c.slug}-sf`, src: ph(c.hex, c.textHex, 'studio-front'),  alt: `Unisex Cargo Pants — studio-front — ${c.slug}`,  type: 'studio-front', colourSlug: c.slug },
      { id: `cargo-${c.slug}-sb`, src: ph(c.hex, c.textHex, 'studio-back'),   alt: `Unisex Cargo Pants — studio-back — ${c.slug}`,   type: 'studio-back',  colourSlug: c.slug },
      { id: `cargo-${c.slug}-ss`, src: ph(c.hex, c.textHex, 'studio-side'),   alt: `Unisex Cargo Pants — studio-side — ${c.slug}`,   type: 'studio-side',  colourSlug: c.slug },
      { id: `cargo-${c.slug}-wk`, src: ph(c.hex, c.textHex, 'walking'),       alt: `Unisex Cargo Pants — walking — ${c.slug}`,       type: 'walking',      colourSlug: c.slug },
      { id: `cargo-${c.slug}-d1`, src: ph(c.hex, c.textHex, 'detail-pocket'), alt: `Unisex Cargo Pants — detail-pocket — ${c.slug}`, type: 'detail',       colourSlug: c.slug },
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
  collectionName: "Men's Essentials",
  collectionSlug: 'mens-essentials',
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
    },
  },
}

// ─── Exported array ────────────────────────────────────────────────────────────
export const products: Product[] = [oversizedTee, cargoPants]
