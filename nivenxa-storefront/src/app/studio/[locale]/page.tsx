import dynamic from 'next/dynamic'
import HeroSection from '@/components/blocks/HeroSection'

// ── Below-fold sections — code-split into separate JS chunks ─────────────────
// HeroSection stays as a static import (above-the-fold, LCP critical path).
// Everything else is deferred: the browser fetches these chunks only after the
// hero has painted, reducing initial JS parse cost on first load.

const CategoryBanner = dynamic(
  () => import('@/components/blocks/CategoryBanner'),
)

const EditsSection = dynamic(
  () => import('@/components/home/EditsSection/EditsSection'),
)

const PhilosophySection = dynamic(
  () => import('@/components/home/PhilosophySection/PhilosophySection'),
)

const StoriesSection = dynamic(
  () => import('@/components/home/StoriesSection/StoriesSection'),
)

const NewsletterSection = dynamic(
  () => import('@/components/home/NewsletterSection/NewsletterSection'),
)

export default function Home() {
  return (
    <>
      <HeroSection />
      <CategoryBanner />
      <EditsSection />
      <PhilosophySection />
      <StoriesSection />
      <NewsletterSection />
    </>
  )
}
