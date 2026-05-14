// Shopify Storefront API response types

export interface ShopifyMoney {
  amount:       string
  currencyCode: string
}

export interface ShopifyImage {
  url:     string
  altText: string | null
  width:   number
  height:  number
}

export interface ShopifySelectedOption {
  name:  string
  value: string
}

export interface ShopifyVariant {
  id:               string
  title:            string
  availableForSale: boolean
  price:            ShopifyMoney
  compareAtPrice:   ShopifyMoney | null
  selectedOptions:  ShopifySelectedOption[]
}

export interface ShopifyProduct {
  id:              string
  title:           string
  handle:          string
  description:     string
  descriptionHtml: string
  productType:     string
  vendor:          string
  tags:            string[]
  priceRange: {
    minVariantPrice: ShopifyMoney
    maxVariantPrice: ShopifyMoney
  }
  images:   ShopifyImage[]
  variants: ShopifyVariant[]
}

export interface ShopifyCollection {
  id:          string
  title:       string
  handle:      string
  description: string
  image:       ShopifyImage | null
  products:    ShopifyProduct[]
}

// ─── Cart ─────────────────────────────────────────────────────────────────────

export interface ShopifyCartLineMerchandise {
  id:              string
  title:           string
  price:           ShopifyMoney
  image:           ShopifyImage | null
  selectedOptions: ShopifySelectedOption[]
  product: {
    id:     string
    title:  string
    handle: string
  }
}

export interface ShopifyCartLine {
  id:          string
  quantity:    number
  merchandise: ShopifyCartLineMerchandise
  cost: {
    totalAmount: ShopifyMoney
  }
}

export interface ShopifyCart {
  id:             string
  checkoutUrl:    string
  totalQuantity:  number
  lines:          ShopifyCartLine[]
  cost: {
    subtotalAmount: ShopifyMoney
    totalAmount:    ShopifyMoney
  }
}

// ─── API connection helpers ───────────────────────────────────────────────────

export interface ShopifyEdge<T> {
  node: T
}

export interface ShopifyConnection<T> {
  edges: ShopifyEdge<T>[]
}

export function normalizeEdges<T>(connection: ShopifyConnection<T>): T[] {
  return connection.edges.map((e) => e.node)
}
