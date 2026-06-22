// SHOPIFY TODO: these types reflect Shopify's eventual data shape, normalised
// for our front-end. When Shopify is connected, normalizeProduct() in
// src/utils/normalizeProduct.ts maps the Storefront API GraphQL response to
// these exact types — no component file needs to change.

export type ImageType =
  | 'studio-front'   // clean front shot against studio/plain background
  | 'studio-back'    // clean back shot
  | 'studio-side'    // clean side shot
  | 'walking'        // model in motion / lifestyle walk
  | 'front'          // non-studio front pose (on-location / editorial)
  | 'back'           // non-studio back pose
  | 'side'           // non-studio side pose
  | 'editorial'      // lifestyle / branded editorial
  | 'detail'         // close-up detail (pocket, fabric, label…)

export interface ProductImage {
  id: string
  src: string
  alt: string
  type: ImageType
  colourSlug: string
  // SHOPIFY TODO: type is derived from altText convention:
  // Format: "{Product Name} — {imageType} — {colourSlug}"
  // Example: "Heavyweight Pocket Tee — studio-front — raw-oat"
  // Set this in Shopify admin for every product image before going live.
}

export interface ProductColour {
  slug: string
  label: string
  hex: string
  images: ProductImage[]
  available: boolean
  styleImage?: ProductImage   // "Style it with" editorial shot — shown after Add to Bag, not in the image stack
  pantone?: string            // confirmed brand reference code, e.g. '11-0601 TCX'
  isUnique?: boolean          // true if this colourway is exclusive to this product, not shared across the line
  finish?: 'plain' | 'tonal-print' | 'tonal-botanical-print' | 'tonal-micro-stripe' | 'dabu-atelier-print'  // print treatment, when relevant
}

export interface ProductSize {
  label: string
  available: boolean
}

export interface FitBar {
  label: string
  value: number        // 0–100 drives bar fill width %
  descriptor: string
}

export interface ProductSpec {
  label: string        // was 'key' — renamed for clarity
  value: string
  group?: string       // optional — when present, specs are rendered in grouped layout
}

export interface CareInstruction {
  icon: string         // Tabler icon name e.g. 'wash' | 'sun-off'
  label: string
}

export interface FabricPillar {
  value: string        // e.g. '240' | '100%' | 'Garment'
  unit: string         // inline with value, e.g. 'GSM' — empty string if none
  subLabel: string     // descriptive label on its own line below value row
  description: string
}

export interface AccordionItem {
  title: string
  content: string      // plain text, may contain simple HTML
}

export interface CollectionItem {
  id: string
  slug: string
  name: string
  colourLabel: string
  price: number
  currency: string
  images: ProductImage[]
}

export interface ColourPairing {
  colourSlug: string
  colourName: string
  hex: string
}

export interface StyledWith {
  productHandle: string
  productName: string
  price: string
  pairings: Record<string, ColourPairing>
}

export interface EditorialSpec {
  label: string
  value: string
}

export interface EditorialByImageEntry {
  headline: string          // \n marks a line break
  body: string
  specs: EditorialSpec[]
}

export interface ProductEditorial {
  quote?: string
  specs?: EditorialSpec[]
  byImage?: Partial<Record<ImageType, EditorialByImageEntry>>
}

export interface Product {
  id: string
  name: string
  category: string
  handle: string       // URL slug e.g. 'over-tee-shirts'
  badge: string | null
  compositionQuote: string
  price: number
  currency: string
  trustLine: string
  colours: ProductColour[]
  sizes: ProductSize[]
  sizeUnit: string | null
  featureBullets: string[]
  specs: ProductSpec[]
  fabricPillars: FabricPillar[]
  fitBars: FitBar[]
  modelNote: string | null
  care: CareInstruction[]
  accordions: AccordionItem[]
  collectionItems: CollectionItem[]
  collectionName?: string   // e.g. "Men's Essentials" — shown in breadcrumb
  collectionSlug?: string   // e.g. "mens-essentials" — used in breadcrumb href
  styledWith?: StyledWith         // optional cross-sell pairing, colour-aware
  editorial?: ProductEditorial    // optional editorial data for zoom overlay panel
}

/*
  SHOPIFY INTEGRATION NOTE (for future reference):
  When Shopify is connected, replace dummy data with a
  normalizeProduct(shopifyProduct) function in
  src/utils/normalizeProduct.ts that maps the Storefront
  API GraphQL response to these exact types.
  No component file needs to change — only the data source.

  Shopify metafield mapping (namespace: "nivenxa"):
    composition_quote → compositionQuote
    trust_line        → trustLine
    feature_bullets   → featureBullets  (JSON array)
    fabric_pillars    → fabricPillars   (JSON array of 3)
    fit_bars          → fitBars         (JSON array)
    model_note        → modelNote
    care_instructions → care            (JSON array)
    accordions        → accordions      (JSON array)
    styled_with       → styledWith      (JSON object)
*/
