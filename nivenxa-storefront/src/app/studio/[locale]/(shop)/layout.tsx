import Navbar from '@/components/global/Navbar'
import SiteFooter from '@/components/global/SiteFooter'
import CookieConsentBanner from '@/components/global/CookieConsentBanner'
import CartDrawerMount from '@/components/global/CartDrawer/CartDrawerMount'

export default async function ShopLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  // SiteFooter uses plain next/link, not the locale-aware Link from
  // @/i18n/routing (that one is scoped to this app's own next-intl config
  // and SiteFooter is shared with Chess/Living, which have no locale
  // concept at all) — so every href here needs the /studio/{locale} prefix
  // built in directly, unlike Chess/Living's absolute, unprefixed paths.
  const studioFooterColumns = [
    {
      title: 'Customer care',
      links: [
        { label: 'Shipping & Delivery', href: `/studio/${locale}/shipping` },
        { label: 'Returns & Exchanges', href: `/studio/${locale}/returns` },
        { label: 'Contact Us', href: `/studio/${locale}/contact` },
      ],
    },
    {
      title: 'Legal',
      links: [
        { label: 'Privacy Policy', href: `/studio/${locale}/privacy` },
        { label: 'Terms of Service', href: `/studio/${locale}/terms` },
        // href is unused for this one — SiteFooter renders it as a
        // <button data-open-cookie-settings> instead, matched by label
        // against cookieSettingsLabel below. CookieConsentBanner.tsx
        // listens for clicks on that attribute globally.
        { label: 'Cookie settings', href: `/studio/${locale}` },
      ],
    },
  ]

  const studioSocialLinks = [
    { label: 'Instagram' as const, href: 'https://instagram.com/nivenxa' },
    { label: 'YouTube' as const, href: 'https://youtube.com/@nivenxa' },
  ]

  return (
    <>
      <Navbar />
      <main>{children}</main>
      <SiteFooter columns={studioFooterColumns} socialLinks={studioSocialLinks} cookieSettingsLabel="Cookie settings" />
      <CartDrawerMount />
      <CookieConsentBanner />
    </>
  )
}
