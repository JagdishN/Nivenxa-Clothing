import Navbar from '@/components/global/Navbar'
import Footer from '@/components/global/Footer'
import CartDrawerMount from '@/components/global/CartDrawer/CartDrawerMount'

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main>{children}</main>
      <Footer />
      <CartDrawerMount />
    </>
  )
}
