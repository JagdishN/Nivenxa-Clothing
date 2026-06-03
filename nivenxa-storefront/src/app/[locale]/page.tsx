import HeroSection from '@/components/blocks/HeroSection'
import EditsSection from '@/components/home/EditsSection/EditsSection'
import CategoryBanner from '@/components/blocks/CategoryBanner'
import StoriesSection from '@/components/home/StoriesSection/StoriesSection'
import NewsletterSection from '@/components/home/NewsletterSection/NewsletterSection'

export default function Home() {
  return (
    <>
      <HeroSection />
      <EditsSection />
      <CategoryBanner />
      <StoriesSection />
      <NewsletterSection />
    </>
  )
}
