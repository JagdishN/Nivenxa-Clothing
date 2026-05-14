// Shopify Storefront API — customer authentication
// Uses the shared fetcher from shopify.ts

import { shopifyFetch } from '@/lib/shopify'

// ─── Shared types ─────────────────────────────────────────────────────────────

export interface CustomerUserError {
  code:    string
  field:   string[]
  message: string
}

export interface Customer {
  id:        string
  email:     string
  firstName: string
  lastName:  string
  phone:     string | null
}

export interface CustomerAccessToken {
  accessToken: string
  expiresAt:   string
}

// ─── Register ─────────────────────────────────────────────────────────────────

const CUSTOMER_CREATE = `
  mutation customerCreate($input: CustomerCreateInput!) {
    customerCreate(input: $input) {
      customer {
        id
        email
        firstName
        lastName
      }
      customerUserErrors {
        code
        field
        message
      }
    }
  }
`

export interface RegisterInput {
  email:     string
  password:  string
  firstName: string
  lastName:  string
}

export async function registerCustomer(input: RegisterInput): Promise<{
  customer: Customer | null
  errors:   CustomerUserError[]
}> {
  const data = await shopifyFetch<{
    customerCreate: {
      customer:           Customer | null
      customerUserErrors: CustomerUserError[]
    }
  }>(CUSTOMER_CREATE, { input })

  return {
    customer: data.customerCreate.customer,
    errors:   data.customerCreate.customerUserErrors,
  }
}

// ─── Login ────────────────────────────────────────────────────────────────────

const CUSTOMER_TOKEN_CREATE = `
  mutation customerAccessTokenCreate($input: CustomerAccessTokenCreateInput!) {
    customerAccessTokenCreate(input: $input) {
      customerAccessToken {
        accessToken
        expiresAt
      }
      customerUserErrors {
        code
        field
        message
      }
    }
  }
`

export async function loginCustomer(
  email:    string,
  password: string,
): Promise<{
  accessToken: CustomerAccessToken | null
  errors:      CustomerUserError[]
}> {
  const data = await shopifyFetch<{
    customerAccessTokenCreate: {
      customerAccessToken: CustomerAccessToken | null
      customerUserErrors:  CustomerUserError[]
    }
  }>(CUSTOMER_TOKEN_CREATE, { input: { email, password } })

  return {
    accessToken: data.customerAccessTokenCreate.customerAccessToken,
    errors:      data.customerAccessTokenCreate.customerUserErrors,
  }
}

// ─── Logout ───────────────────────────────────────────────────────────────────

const CUSTOMER_TOKEN_DELETE = `
  mutation customerAccessTokenDelete($customerAccessToken: String!) {
    customerAccessTokenDelete(customerAccessToken: $customerAccessToken) {
      deletedAccessToken
      userErrors { field message }
    }
  }
`

export async function logoutCustomer(accessToken: string): Promise<void> {
  await shopifyFetch(CUSTOMER_TOKEN_DELETE, { customerAccessToken: accessToken })
}

// ─── Get customer ─────────────────────────────────────────────────────────────

const GET_CUSTOMER = `
  query getCustomer($customerAccessToken: String!) {
    customer(customerAccessToken: $customerAccessToken) {
      id
      firstName
      lastName
      email
      phone
    }
  }
`

export async function getCustomer(accessToken: string): Promise<Customer | null> {
  try {
    const data = await shopifyFetch<{ customer: Customer | null }>(
      GET_CUSTOMER,
      { customerAccessToken: accessToken },
    )
    return data.customer
  } catch {
    return null
  }
}
