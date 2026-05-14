// Local UI product shape (used by mock data and ProductCard)
export interface Product {
  id:          string
  name:        string
  price:       number
  category:    'women-lounge-sets' | 'women-indo-western' | 'boys-premium' | 'girls-premium' | 'kids-nightwear' | 'cargo-pants' | 'over-tee-shirts'
  gender:      'women' | 'kids' | 'unisex'
  description: string
  fabric:      string
  colorway:    string
  gradient:    string
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
