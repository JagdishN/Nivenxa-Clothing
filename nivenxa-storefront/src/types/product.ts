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
  // Example: "Sunday Tee — studio-front — bone"
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

/** One size's real measurements, in cm — e.g. { size: 'M', measurements: { chest: 58, length: 71 } }. Field names are per-garment (chest/length/shoulder/sleeve for a top, waist/inseam for a bottom, etc.) — intentionally a free-form map rather than a fixed shape, since this codebase's products span tops, bottoms and co-ords with different dimensions to measure. */
export interface ProductSizeChartRow {
  size: string
  measurements: Record<string, number>
}

export interface ProductSizeChart {
  unit: 'cm'
  /** Column labels in display order, e.g. ['Chest', 'Length', 'Shoulder'] — keys into each row's `measurements`, lowercased (chest/length/shoulder). */
  columns: string[]
  rows: ProductSizeChartRow[]
}

/**
 * A third-party certification the product genuinely holds. Rendered only
 * when `verified` is true AND `certificateUrl` is present — see
 * ProductDetails.tsx. Leave `certifications` empty/undefined until a real,
 * checkable certificate exists.
 */
export interface ProductCertification {
  name: string
  scope: string
  certificateUrl?: string
  verified: boolean
}

/** One buyable combination of a Tee + Pant set. */
export interface SetCombo {
  /** Same as the matching ProductColour.slug on the set product. */
  colourSlug: string
  tee: { productId: string; handle: string; colourSlug: string }
  pant: { productId: string; handle: string; colourSlug: string }
}

/**
 * Set products reference their standalone pieces by id so the Returns
 * policy can price partial-set refunds from the standalone MRPs of the
 * retained items. Those standalone products must always exist with a price.
 */
export interface ProductSet {
  teeProductId: string
  pantProductId: string
  combos: SetCombo[]
}

export interface Product {
  id: string
  name: string
  category: string
  handle: string       // URL slug e.g. 'sunday-tee'
  badge: string | null
  compositionQuote: string
  /** MRP in rupees, inclusive of all taxes. `null` = not yet confirmed — the UI shows "[MRP]" and add-to-bag stays disabled. */
  price: number | null
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
  collectionName?: string   // e.g. "Unisex" — shown in breadcrumb
  collectionSlug?: string   // e.g. "unisex" — used in breadcrumb href
  cardDescriptor?: string   // short line shown on collection-grid cards, overrides the fabricPillars-derived line when set
  styledWith?: StyledWith         // optional cross-sell pairing, colour-aware
  editorial?: ProductEditorial    // optional editorial data for zoom overlay panel
  /** One short descriptive sentence shown under the product name. */
  description?: string
  /** True while `description` is draft copy awaiting owner review (shown in the summary only; never rendered). */
  descriptionIsDraft?: boolean
  /** Not purchasable: listed with a "Coming soon" label, PDP shows a notify-me form instead of price/sizes/cart. */
  comingSoon?: boolean
  /** Shown instead of price/sizes on a coming-soon product page. */
  comingSoonLine?: string
  /** e.g. "Unisex fit" — shown next to the size picker with a link to the size chart. */
  fitLabel?: string
  /** Set (Tee + Pant) products only. */
  set?: ProductSet
  /** Leave empty for every product until a real certificate exists. */
  certifications?: ProductCertification[]
  archived?: boolean              // true = suppressed from menus/category/discovery, page still reachable directly
  /** Defaults to "India" when absent — see ProductDetails.tsx. Only set this per-product if it's ever actually different. */
  countryOfOrigin?: string
  /**
   * Real cm measurements for the "Product details" block — optional
   * because, as of this writing, NO product has this populated: the
   * existing `accordions` "Size guide" entries (dangerouslySetInnerHTML
   * tables, see ProductInfo.tsx's sizeGuideAccordion) hold real
   * measurements for several products already, but in INCHES, in a
   * differently-shaped HTML table per product — not this field, and not
   * cm. Converting those is a real, deliberate editorial pass (verifying
   * units and column meaning per product), not a mechanical one, so it
   * wasn't done as part of adding this field. See the task summary for
   * exactly which products already have inch data to migrate.
   */
  sizeChart?: ProductSizeChart
}

/*
  SHOPIFY INTEGRATION NOTE (for future reference):
  When Shopify is connected, replace dummy data with a
  normalizeProduct(shopifyProduct) function in
  src/utils/normalizeProduct.ts that maps the Storefront
  API GraphQL response to these exact types.
  No component file needs to change — only the data source.

  Shopify metafield mapping (namespace: "nivenxa"):
    composition_quote  → compositionQuote
    trust_line         → trustLine
    feature_bullets    → featureBullets  (JSON array)
    fabric_pillars     → fabricPillars   (JSON array of 3)
    fit_bars           → fitBars         (JSON array)
    model_note         → modelNote
    care_instructions  → care            (JSON array)
    accordions         → accordions      (JSON array)
    styled_with        → styledWith      (JSON object)
    country_of_origin  → countryOfOrigin (plain text, e.g. "India")
    size_chart         → sizeChart       (JSON object: { unit: "cm", columns: [...], rows: [...] })
*/
