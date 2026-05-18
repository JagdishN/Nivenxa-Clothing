import { NextIntlClientProvider } from 'next-intl'
import Navbar from '@/components/global/Navbar'
import Footer from '@/components/global/Footer'
import { AuthProvider } from '@/context/AuthContext'
import { CartProvider } from '@/context/CartContext'
import { ToastProvider } from '@/context/ToastContext'
import enMessages from '@/app/dictionaries/en.json'

export default function VenturesLayout({ children }: { children: React.ReactNode }) {
  return (
    <NextIntlClientProvider locale="en" messages={enMessages}>
      <ToastProvider>
        <AuthProvider>
          <CartProvider>
            <Navbar />
            <main>{children}</main>
            <Footer />
          </CartProvider>
        </AuthProvider>
      </ToastProvider>
    </NextIntlClientProvider>
  )
}
