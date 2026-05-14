'use client'
import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { loginCustomer, logoutCustomer, getCustomer } from '@/lib/shopify-auth'
import type { Customer, CustomerUserError } from '@/lib/shopify-auth'

const TOKEN_KEY = 'nivenxa_customer_token'

interface AuthContextValue {
  customer:    Customer | null
  accessToken: string | null
  loading:     boolean
  login:       (email: string, password: string) => Promise<{ errors: CustomerUserError[] }>
  logout:      () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [customer,    setCustomer]    = useState<Customer | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [loading,     setLoading]     = useState(true)

  // Restore session from localStorage on mount
  useEffect(() => {
    const stored = typeof window !== 'undefined'
      ? localStorage.getItem(TOKEN_KEY)
      : null

    if (!stored) { setLoading(false); return }

    getCustomer(stored).then((c) => {
      if (c) {
        setCustomer(c)
        setAccessToken(stored)
      } else {
        localStorage.removeItem(TOKEN_KEY)
      }
      setLoading(false)
    })
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const { accessToken: token, errors } = await loginCustomer(email, password)

    if (token) {
      localStorage.setItem(TOKEN_KEY, token.accessToken)
      setAccessToken(token.accessToken)
      const c = await getCustomer(token.accessToken)
      setCustomer(c)
    }

    return { errors }
  }, [])

  const logout = useCallback(async () => {
    if (accessToken) {
      await logoutCustomer(accessToken).catch(() => {})
    }
    localStorage.removeItem(TOKEN_KEY)
    setAccessToken(null)
    setCustomer(null)
  }, [accessToken])

  return (
    <AuthContext.Provider value={{ customer, accessToken, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
