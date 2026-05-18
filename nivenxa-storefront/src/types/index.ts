// Local UI product shape (used by mock data and ProductCard)
export interface ProductImage {
  src:  string   // path relative to /public
  view: 'front' | 'back' | 'side' | 'details'
}

export type ProductStatus =
  | 'NIVENXA ESSENTIAL'
  | 'NEW SEASON'
  | 'LIMITED RUN'
  | 'ARCHIVE WASH'

export interface ProductDNA {
  fabric:    string
  structure: string
  finish:    string
  movement:  string
  climate?:  string
}

export interface ProductFabricSpec {
  gsm?:        string
  weave?:      string
  washMethod?: string
  finish?:     string
  softness?:   string
}

export interface Product {
  id:              string
  name:            string
  price:           number
  category:        'women-lounge-sets' | 'women-indo-western' | 'boys-premium' | 'girls-premium' | 'kids-nightwear' | 'cargo-pants' | 'over-tee-shirts'
  gender:          'women' | 'kids' | 'unisex'
  description:     string
  fabric:          string
  colorway:        string
  gradient:        string
  // ── Premium intelligence layer ──────────────────────────────────────────────
  images?:         ProductImage[]
  defaultColor?:   string
  featured?:       boolean
  status?:         ProductStatus
  fabricStory?:    { label: string; body: string; spec?: ProductFabricSpec; lines?: string[] }
  badges?:         string[]
  dna?:            ProductDNA
  atmosphereColor?: string
  // ── Product story page fields ───────────────────────────────────────────────
  details?:        string[]          // garment construction details
  fitPhilosophy?:  string            // fit philosophy paragraph
  colorStory?:     { shade: string; description: string }
  stylingWith?:    string[]          // styling recommendations
  care?:           string            // care & longevity
  designedFor?:    string[]          // "Designed for X" statements
  whyItExists?:    string            // brand purpose statement
}

export interface CartItem {
  product:  Product
  quantity: number
  size?:    string
}

// Re-export Shopify API types
export type {
  ShopifyProduct,
  ShopifyVariant,
  ShopifyImage,
  ShopifyMoney,
  ShopifySelectedOption,
  ShopifyCollection,
  ShopifyCart,
  ShopifyCartLine,
  ShopifyCartLineMerchandise,
} from '@/types/shopify'
