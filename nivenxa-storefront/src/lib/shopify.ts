// Shopify Storefront API — core client and product/collection queries

import type {
  ShopifyProduct,
  ShopifyCollection,
  ShopifyConnection,
  ShopifyEdge,
} from '@/types/shopify'
import { normalizeEdges } from '@/types/shopify'

const DOMAIN  = process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN!
const TOKEN   = process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN!
const VERSION = '2025-01'

// ─── Core fetcher (shared with shopify-auth and shopify-cart) ─────────────────

export async function shopifyFetch<T>(
  query: string,
  variables?: Record<string, unknown>,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(
    `https://${DOMAIN}/api/${VERSION}/graphql.json`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': TOKEN,
      },
      body: JSON.stringify({ query, variables }),
      ...options,
    },
  )

  if (!res.ok) throw new Error(`Shopify API error: ${res.status}`)

  const json = await res.json()
  if (json.errors?.length) throw new Error(json.errors[0].message)

  return json.data as T
}

// ─── Fragments ────────────────────────────────────────────────────────────────

const PRODUCT_FRAGMENT = `
  fragment ProductFields on Product {
    id
    title
    handle
    description
    descriptionHtml
    productType
    vendor
    tags
    priceRange {
      minVariantPrice { amount currencyCode }
      maxVariantPrice { amount currencyCode }
    }
    images(first: 10) {
      edges {
        node { url altText width height }
      }
    }
    variants(first: 20) {
      edges {
        node {
          id
          title
          availableForSale
          price { amount currencyCode }
          compareAtPrice { amount currencyCode }
          selectedOptions { name value }
        }
      }
    }
  }
`

// ─── Normaliser ───────────────────────────────────────────────────────────────

type RawProduct = Omit<ShopifyProduct, 'images' | 'variants'> & {
  images:   ShopifyConnection<ShopifyProduct['images'][number]>
  variants: ShopifyConnection<ShopifyProduct['variants'][number]>
}

function normalizeProduct(raw: RawProduct): ShopifyProduct {
  return {
    ...raw,
    images:   normalizeEdges(raw.images),
    variants: normalizeEdges(raw.variants),
  }
}

// ─── Products ─────────────────────────────────────────────────────────────────

const GET_PRODUCTS = `
  ${PRODUCT_FRAGMENT}
  query getProducts($first: Int!, $after: String) {
    products(first: $first, after: $after) {
      pageInfo { hasNextPage endCursor }
      edges { node { ...ProductFields } }
    }
  }
`

export async function getProducts(first = 48): Promise<ShopifyProduct[]> {
  const data = await shopifyFetch<{
    products: ShopifyConnection<RawProduct> & {
      pageInfo: { hasNextPage: boolean; endCursor: string }
    }
  }>(GET_PRODUCTS, { first }, { next: { revalidate: 60 } })

  return normalizeEdges(data.products).map(normalizeProduct)
}

// ─── Product by handle ────────────────────────────────────────────────────────

const GET_PRODUCT_BY_HANDLE = `
  ${PRODUCT_FRAGMENT}
  query getProductByHandle($handle: String!) {
    productByHandle(handle: $handle) {
      ...ProductFields
    }
  }
`

export async function getProductByHandle(
  handle: string,
): Promise<ShopifyProduct | null> {
  const data = await shopifyFetch<{ productByHandle: RawProduct | null }>(
    GET_PRODUCT_BY_HANDLE,
    { handle },
    { next: { revalidate: 60 } },
  )

  return data.productByHandle ? normalizeProduct(data.productByHandle) : null
}

// ─── Products by collection handle ───────────────────────────────────────────

const GET_COLLECTION = `
  ${PRODUCT_FRAGMENT}
  query getCollection($handle: String!, $first: Int!) {
    collectionByHandle(handle: $handle) {
      id
      title
      handle
      description
      image { url altText width height }
      products(first: $first) {
        edges { node { ...ProductFields } }
      }
    }
  }
`

type RawCollection = Omit<ShopifyCollection, 'products'> & {
  products: ShopifyConnection<RawProduct>
}

export async function getCollection(
  handle: string,
  first = 48,
): Promise<ShopifyCollection | null> {
  const data = await shopifyFetch<{ collectionByHandle: RawCollection | null }>(
    GET_COLLECTION,
    { handle, first },
    { next: { revalidate: 60 } },
  )

  if (!data.collectionByHandle) return null

  return {
    ...data.collectionByHandle,
    products: normalizeEdges(data.collectionByHandle.products).map(normalizeProduct),
  }
}

// ─── All collections ──────────────────────────────────────────────────────────

const GET_COLLECTIONS = `
  query getCollections($first: Int!) {
    collections(first: $first) {
      edges {
        node {
          id
          title
          handle
          description
          image { url altText width height }
        }
      }
    }
  }
`

export async function getCollections(first = 20): Promise<Omit<ShopifyCollection, 'products'>[]> {
  const data = await shopifyFetch<{
    collections: ShopifyConnection<Omit<ShopifyCollection, 'products'>>
  }>(GET_COLLECTIONS, { first }, { next: { revalidate: 300 } })

  return normalizeEdges(data.collections)
}

// ─── Search ───────────────────────────────────────────────────────────────────

const SEARCH_PRODUCTS = `
  ${PRODUCT_FRAGMENT}
  query searchProducts($query: String!, $first: Int!) {
    products(first: $first, query: $query) {
      edges { node { ...ProductFields } }
    }
  }
`

export async function searchProducts(
  query: string,
  first = 24,
): Promise<ShopifyProduct[]> {
  const data = await shopifyFetch<{
    products: ShopifyConnection<RawProduct>
  }>(SEARCH_PRODUCTS, { query, first })

  return normalizeEdges(data.products).map(normalizeProduct)
}
