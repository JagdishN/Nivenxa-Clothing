import HeroSection from '@/components/blocks/HeroSection'
import EditsSection from '@/components/home/EditsSection/EditsSection'
import CategoryBanner from '@/components/blocks/CategoryBanner'
import StoriesSection from '@/components/home/StoriesSection/StoriesSection'
import NewsletterSection from '@/components/home/NewsletterSection/NewsletterSection'
import PhilosophySection from '@/components/home/PhilosophySection/PhilosophySection'

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
