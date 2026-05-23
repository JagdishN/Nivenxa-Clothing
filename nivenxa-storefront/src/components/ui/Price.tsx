'use client'
import { useCurrency } from '@/context/CurrencyContext'

export default function Price({ amount }: { amount: number }) {
  const { formatPrice } = useCurrency()
  return <>{formatPrice(amount)}</>
}
