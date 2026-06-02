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
// Filenames can differ between colours (capitalisation, typos) — mapped precisely.

interface TeeConfig {
  slug: string
  hex: string
  textHex: string
  label: string
  folder: string
  front: string        // studio front view  → studio-front (sticky hero)
  back: string         // studio back view   → studio-back
  side: string         // studio side view   → studio-side
  walk: string         // walking / motion   → walking
  edit?: string        // lifestyle shot     → editorial (optional — not all colours have it)
  frontView?: string   // non-studio front   → front   (optional — richer shoots only)
  backView?: string    // non-studio back    → back
  sideView?: string    // non-studio side    → side
  pocket: string       // detail close-up    → detail
  fabric: string       // fabric close-up    → detail
}

const teeSlugs: TeeConfig[] = [
  // ── 1. DEFAULT COLOUR (first = default on product page) ───────────────────
  {
    slug: 'oat-beige',    hex: 'D4C5A9', textHex: '333333', label: 'Oat Beige',
    folder: "Men/OversizedTee's/OAT BEIGE",   // all-caps on disk
    front:     'front_studio_view.webp',       // studio-front → sticky hero
    back:      'back_studio_view.webp',        // studio-back
    side:      'side_studio_view.webp',        // studio-side
    walk:      'walking_view.webp',            // walking
    frontView: 'font_view.webp',              // non-studio front pose (typo "font" on disk)
    backView:  'back_view.webp',              // non-studio back pose
    sideView:  'side_view.webp',              // non-studio side pose
    pocket:    'pocket_view.webp',            // detail
    fabric:    'fabric_close_up.webp',        // detail
  },
  // ── 2. WARM IVORY ─────────────────────────────────────────────────────────
  {
    slug: 'warm-ivory',   hex: 'F0EBE0', textHex: '333333', label: 'Warm Ivory',
    folder: "Men/OversizedTee's/WARM IVORY",
    front:     'front_studio_view.webp',
    back:      'back_studio_view.webp',
    side:      'side_studio_view.webp',
    walk:      'walking_view.webp',
    frontView: 'front_view.webp',
    backView:  'back_view.webp',
    sideView:  'side_view.webp',
    pocket:    'pocket_view.webp',
    fabric:    'fabric_deatils.webp',         // typo on disk: "deatils" not "details"
  },
  // ── 3. CHARCOAL EARTH ─────────────────────────────────────────────────────
  {
    slug: 'charcoal-earth', hex: '5C5248', textHex: 'FFFFFF', label: 'Charcoal Earth',
    folder: "Men/OversizedTee's/CHARCOAL EARTH",
    front:     'front_studio_view.webp',
    back:      'back_studio_view.webp',
    side:      'side_studio_view.webp',
    walk:      'walking_view.webp',
    frontView: 'front_view.webp',
    backView:  'back_view.webp',
    sideView:  'side_view.webp',
    pocket:    'pocket_view.webp',
    fabric:    'fabric_details.webp',
  },
  // ── 4. MUSHROOM TAUPE ─────────────────────────────────────────────────────
  // NOTE: Upload images to public/images/Men/OversizedTee's/MUSHROOM TAUPE/ to activate gallery.
  {
    slug: 'mushroom-taupe', hex: 'A89888', textHex: 'FFFFFF', label: 'Mushroom Taupe',
    folder: "Men/OversizedTee's/MUSHROOM TAUPE",
    front:     'front_studio_view.webp',
    back:      'back_studio_view.webp',
    side:      'side_studio_view.webp',
    walk:      'walking_view.webp',
    frontView: 'front_view.webp',
    backView:  'back_view.webp',
    sideView:  'side_view.webp',
    pocket:    'pocket_view.webp',
    fabric:    'fabric_details.webp',
  },
  // ── 5. MINERAL BROWN ──────────────────────────────────────────────────────
  {
    slug: 'mineral-brown', hex: '8B7355', textHex: 'FFFFFF', label: 'Mineral Brown',
    folder: "Men/OversizedTee's/MINERAL BROWN",
    front:     'front_studio_view.webp',
    back:      'back_studio_view.webp',
    side:      'side_studio_view.webp',
    walk:      'walking_view.webp',
    frontView: 'front_view.webp',
    backView:  'back_view.webp',
    sideView:  'side_view.webp',
    pocket:    'pocket_view.webp',
    fabric:    'fabric_details.webp',
  },
  // ── 5. DESERT CLAY ────────────────────────────────────────────────────────
  {
    slug: 'desert-clay',  hex: 'C47A4E', textHex: 'FFFFFF', label: 'Desert Clay',
    folder: "Men/OversizedTee's/DESERT CLAY",  // all-caps on disk (new webp images)
    front:     'front_studio_view.webp',
    back:      'back_studio_view.webp',
    side:      'side_studio_view.webp',
    walk:      'walking_view.webp',
    frontView: 'front_view.webp',
    backView:  'back_view.webp',
    sideView:  'side_view.webp',
    pocket:    'pocket_view.webp',
    fabric:    'fabric_detail.webp',          // singular "detail" on disk (no trailing s)
  },
]

function buildTeeImages(c: TeeConfig): ProductImage[] {
  const imgs: ProductImage[] = [
    localImg(`tee-${c.slug}-sf`, c.folder, c.front, 'studio-front', 'Oversized Tee', c.slug),
    localImg(`tee-${c.slug}-sb`, c.folder, c.back,  'studio-back',  'Oversized Tee', c.slug),
    localImg(`tee-${c.slug}-ss`, c.folder, c.side,  'studio-side',  'Oversized Tee', c.slug),
    localImg(`tee-${c.slug}-wk`, c.folder, c.walk,  'walking',      'Oversized Tee', c.slug),
  ]
  // Optional editorial / lifestyle shot
  if (c.edit)      imgs.push(localImg(`tee-${c.slug}-ed`, c.folder, c.edit,      'editorial', 'Oversized Tee', c.slug))
  // Optional non-studio on-location poses (front / back / side)
  if (c.frontView) imgs.push(localImg(`tee-${c.slug}-fv`, c.folder, c.frontView, 'front',     'Oversized Tee', c.slug))
  if (c.backView)  imgs.push(localImg(`tee-${c.slug}-bv`, c.folder, c.backView,  'back',      'Oversized Tee', c.slug))
  if (c.sideView)  imgs.push(localImg(`tee-${c.slug}-sv`, c.folder, c.sideView,  'side',      'Oversized Tee', c.slug))
  // Detail close-ups (always present)
  imgs.push(localImg(`tee-${c.slug}-d1`, c.folder, c.pocket, 'detail', 'Oversized Tee', c.slug))
  imgs.push(localImg(`tee-${c.slug}-d2`, c.folder, c.fabric, 'detail', 'Oversized Tee', c.slug))
  return imgs
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

// ─── Product 1: Oversized Tee ─────────────────────────────────────────────────
const oversizedTee: Product = {
  id: 'prod-001',
  name: 'Oversized Tee',
  category: 'Oversized Tee',
  handle: 'over-tee-shirts',
  collectionName: "Men's Essentials",
  collectionSlug: 'mens-essentials',
  badge: 'New Season',
  compositionQuote:
    'Dense 240 GSM combed cotton jersey in a warm desert clay tone — neither sand nor ochre, but a precise in-between. A quiet neutral built for a minimal wardrobe.',
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
    { key: 'Fabric',       value: '100% Combed Cotton'    },
    { key: 'Weight',       value: '240 GSM'               },
    { key: 'Construction', value: 'Single Jersey Knit'    },
    { key: 'Finish',       value: 'Bio-enzyme washed'     },
    { key: 'Dye Method',   value: 'Garment dyed'          },
    { key: 'Fit',          value: 'Relaxed drop-shoulder' },
    { key: 'Silhouette',   value: 'Boxy oversized'        },
    { key: 'Pocket',       value: 'Single chest patch'    },
    { key: 'Country',      value: 'Made in India'         },
  ],

  fabricPillars: [
    {
      value: '240',
      unit: 'GSM fabric weight',
      description:
        'Mid-weight opacity. Substantial without heaviness. Not transparent in sunlight.',
    },
    {
      value: '100%',
      unit: 'Combed cotton',
      description:
        'Single jersey knit. Yarn-dyed. Soft washed finish. No synthetic blends.',
    },
    {
      value: 'Bio-enzyme',
      unit: 'Washed finish',
      description:
        'Soft lived-in texture from first wear. Improves with washing, not against it.',
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
    <th style="text-align:left;padding:6px 0;border-bottom:1px solid rgba(0,0,0,0.10)">Size</th>
    <th style="text-align:left;padding:6px 0;border-bottom:1px solid rgba(0,0,0,0.10)">Chest (in)</th>
    <th style="text-align:left;padding:6px 0;border-bottom:1px solid rgba(0,0,0,0.10)">Length (in)</th>
  </tr></thead>
  <tbody>
    <tr><td style="padding:6px 0">S</td><td>38–40</td><td>28</td></tr>
    <tr><td style="padding:6px 0">M</td><td>40–42</td><td>29</td></tr>
    <tr><td style="padding:6px 0">L</td><td>42–44</td><td>30</td></tr>
    <tr><td style="padding:6px 0">XL</td><td>44–46</td><td>31</td></tr>
  </tbody>
</table>`,
    },
  ],

  // Cross-sell items — 3 of the other 4 tee colours (oat-beige is the default/current page)
  collectionItems: [
    {
      id: 'col-tee-001',
      slug: 'over-tee-shirts/warm-ivory',
      name: 'Oversized Tee',
      colourLabel: 'Warm Ivory',
      price: 1999,
      currency: '₹',
      images: [
        localImg('col-tee-001-sf', "Men/OversizedTee's/WARM IVORY", 'front_studio_view.webp', 'studio-front', 'Oversized Tee', 'warm-ivory'),
        localImg('col-tee-001-wk', "Men/OversizedTee's/WARM IVORY", 'walking_view.webp',      'walking',      'Oversized Tee', 'warm-ivory'),
      ],
    },
    {
      id: 'col-tee-002',
      slug: 'over-tee-shirts/charcoal-earth',
      name: 'Oversized Tee',
      colourLabel: 'Charcoal Earth',
      price: 1999,
      currency: '₹',
      images: [
        localImg('col-tee-002-sf', "Men/OversizedTee's/CHARCOAL EARTH", 'front_studio_view.webp', 'studio-front', 'Oversized Tee', 'charcoal-earth'),
        localImg('col-tee-002-wk', "Men/OversizedTee's/CHARCOAL EARTH", 'walking_view.webp',      'walking',      'Oversized Tee', 'charcoal-earth'),
      ],
    },
    {
      id: 'col-tee-003',
      slug: 'over-tee-shirts/desert-clay',
      name: 'Oversized Tee',
      colourLabel: 'Desert Clay',
      price: 1999,
      currency: '₹',
      images: [
        localImg('col-tee-003-sf', "Men/OversizedTee's/DESERT CLAY", 'front_studio_view.webp', 'studio-front', 'Oversized Tee', 'desert-clay'),
        localImg('col-tee-003-wk', "Men/OversizedTee's/DESERT CLAY", 'walking_view.webp',      'walking',      'Oversized Tee', 'desert-clay'),
      ],
    },
  ],
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
    { key: 'Fabric',       value: '100% Cotton Canvas'   },
    { key: 'Weight',       value: '300 GSM'              },
    { key: 'Construction', value: 'Twill Weave'          },
    { key: 'Finish',       value: 'Garment washed'       },
    { key: 'Fit',          value: 'Relaxed straight leg' },
    { key: 'Pockets',      value: '6 fully functional'   },
    { key: 'Waistband',    value: 'Elastic with drawcord'},
    { key: 'Country',      value: 'Made in India'        },
  ],

  fabricPillars: [
    {
      value: '300',
      unit: 'GSM canvas weight',
      description:
        'Structured without stiffness. Holds its shape through long wear and repeated washing.',
    },
    {
      value: '6',
      unit: 'Functional pockets',
      description:
        'All six pockets fully usable. No decorative stitching. Every pocket tested for daily carry.',
    },
    {
      value: '100%',
      unit: 'Cotton canvas',
      description:
        'Pure cotton twill. Breathable for Indian climate. Softens naturally with each wash.',
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
}

// ─── Exported array ────────────────────────────────────────────────────────────
export const products: Product[] = [oversizedTee, cargoPants]
