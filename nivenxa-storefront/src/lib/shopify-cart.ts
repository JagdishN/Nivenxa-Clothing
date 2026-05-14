// Shopify Storefront API — cart operations

import { shopifyFetch } from '@/lib/shopify'
import type { ShopifyCart, ShopifyConnection, ShopifyCartLine } from '@/types/shopify'
import { normalizeEdges } from '@/types/shopify'

// ─── Fragment ─────────────────────────────────────────────────────────────────

const CART_FRAGMENT = `
  fragment CartFields on Cart {
    id
    checkoutUrl
    totalQuantity
    lines(first: 100) {
      edges {
        node {
          id
          quantity
          merchandise {
            ... on ProductVariant {
              id
              title
              price { amount currencyCode }
              image { url altText width height }
              selectedOptions { name value }
              product { id title handle }
            }
          }
          cost {
            totalAmount { amount currencyCode }
          }
        }
      }
    }
    cost {
      subtotalAmount { amount currencyCode }
      totalAmount    { amount currencyCode }
    }
  }
`

// ─── Normaliser ───────────────────────────────────────────────────────────────

type RawCart = Omit<ShopifyCart, 'lines'> & {
  lines: ShopifyConnection<ShopifyCartLine>
}

function normalizeCart(raw: RawCart): ShopifyCart {
  return {
    ...raw,
    lines: normalizeEdges(raw.lines),
  }
}

// ─── Create cart ──────────────────────────────────────────────────────────────

const CART_CREATE = `
  ${CART_FRAGMENT}
  mutation cartCreate($input: CartInput!) {
    cartCreate(input: $input) {
      cart { ...CartFields }
      userErrors { field message }
    }
  }
`

export interface CartLineInput {
  merchandiseId: string
  quantity:      number
}

export async function createCart(lines: CartLineInput[] = []): Promise<ShopifyCart> {
  const data = await shopifyFetch<{
    cartCreate: { cart: RawCart; userErrors: { message: string }[] }
  }>(CART_CREATE, { input: { lines } })

  if (data.cartCreate.userErrors.length) {
    throw new Error(data.cartCreate.userErrors[0].message)
  }

  return normalizeCart(data.cartCreate.cart)
}

// ─── Get cart ─────────────────────────────────────────────────────────────────

const GET_CART = `
  ${CART_FRAGMENT}
  query getCart($cartId: ID!) {
    cart(id: $cartId) { ...CartFields }
  }
`

export async function getCart(cartId: string): Promise<ShopifyCart | null> {
  const data = await shopifyFetch<{ cart: RawCart | null }>(GET_CART, { cartId })
  return data.cart ? normalizeCart(data.cart) : null
}

// ─── Add lines ────────────────────────────────────────────────────────────────

const CART_LINES_ADD = `
  ${CART_FRAGMENT}
  mutation cartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
    cartLinesAdd(cartId: $cartId, lines: $lines) {
      cart { ...CartFields }
      userErrors { field message }
    }
  }
`

export async function addCartLines(
  cartId: string,
  lines:  CartLineInput[],
): Promise<ShopifyCart> {
  const data = await shopifyFetch<{
    cartLinesAdd: { cart: RawCart; userErrors: { message: string }[] }
  }>(CART_LINES_ADD, { cartId, lines })

  if (data.cartLinesAdd.userErrors.length) {
    throw new Error(data.cartLinesAdd.userErrors[0].message)
  }

  return normalizeCart(data.cartLinesAdd.cart)
}

// ─── Update lines ─────────────────────────────────────────────────────────────

const CART_LINES_UPDATE = `
  ${CART_FRAGMENT}
  mutation cartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
    cartLinesUpdate(cartId: $cartId, lines: $lines) {
      cart { ...CartFields }
      userErrors { field message }
    }
  }
`

export interface CartLineUpdateInput {
  id:       string
  quantity: number
}

export async function updateCartLines(
  cartId: string,
  lines:  CartLineUpdateInput[],
): Promise<ShopifyCart> {
  const data = await shopifyFetch<{
    cartLinesUpdate: { cart: RawCart; userErrors: { message: string }[] }
  }>(CART_LINES_UPDATE, { cartId, lines })

  if (data.cartLinesUpdate.userErrors.length) {
    throw new Error(data.cartLinesUpdate.userErrors[0].message)
  }

  return normalizeCart(data.cartLinesUpdate.cart)
}

// ─── Remove lines ─────────────────────────────────────────────────────────────

const CART_LINES_REMOVE = `
  ${CART_FRAGMENT}
  mutation cartLinesRemove($cartId: ID!, $lineIds: [ID!]!) {
    cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
      cart { ...CartFields }
      userErrors { field message }
    }
  }
`

export async function removeCartLines(
  cartId:  string,
  lineIds: string[],
): Promise<ShopifyCart> {
  const data = await shopifyFetch<{
    cartLinesRemove: { cart: RawCart; userErrors: { message: string }[] }
  }>(CART_LINES_REMOVE, { cartId, lineIds })

  if (data.cartLinesRemove.userErrors.length) {
    throw new Error(data.cartLinesRemove.userErrors[0].message)
  }

  return normalizeCart(data.cartLinesRemove.cart)
}
