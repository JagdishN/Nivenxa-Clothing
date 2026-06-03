import { Link } from '@/i18n/routing'
import styles from './StoriesSection.module.css'

// ── Featured story ────────────────────────────────────────────────────────────

const FEATURED_IMAGE = "/images/Men/OversizedTee's/OAT%20BEIGE/fabric_close_up.webp"

// ── Smaller story cards ───────────────────────────────────────────────────────

interface StoryCard {
  num: string
  title: string
  href: string
  readTime: string
  preview: string
}

const CARDS: StoryCard[] = [
  {
    num: '02',
    title: 'Craftsmanship',
    href: '/stories/craftsmanship',
    readTime: '2 min read',
    preview: 'The quiet discipline behind every garment — finishing details that define how clothing lasts.',
  },
  {
    num: '03',
    title: 'Made in India',
    href: '/stories/made-in-india',
    readTime: '3 min read',
    preview: 'Shaped by long summers, dense cities, and slower mornings — garments for Indian life.',
  },
  {
    num: '04',
    title: 'Campaigns',
    href: '/stories/campaigns',
    readTime: '2 min read',
    preview: 'Quiet visual narratives — documenting clothing through light, texture, and movement.',
  },
  {
    num: '05',
    title: 'The Process',
    href: '/stories/the-process',
    readTime: '2 min read',
    preview: 'From fabric selection to finished garment — the iterative process behind each piece.',
  },
]

// ── Component ─────────────────────────────────────────────────────────────────

export default function StoriesSection() {
  return (
    <section className={styles.section}>

      {/* Section header */}
      <div className={styles.sectionHeader}>
        <div>
          <p className={styles.eyebrow}>From The Atelier</p>
          <h2 className={styles.sectionTitle}>The Stories</h2>
        </div>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <Link href={'/stories' as any} className={styles.allStoriesLink}>
          All Stories →
        </Link>
      </div>

      {/* Featured story */}
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <Link href={'/stories/fabric-journal' as any} className={styles.featured}>

        <div className={styles.featuredImage}>
          <img
            src={FEATURED_IMAGE}
            alt="Fabric Journal — fabric close-up"
            className={styles.featuredImg}
          />
        </div>

        <div className={styles.featuredContent}>
          <span className={styles.featuredEyebrow}>Featured Story</span>
          <h2 className={styles.featuredTitle}>Fabric Journal</h2>
          <p className={styles.featuredPreview}>
            Why we selected 240 GSM combed cotton over every other option — and what we
            rejected before arriving here.
          </p>
          <span className={styles.featuredMeta}>3 min read</span>
          <span className={styles.featuredCta}>Read Story →</span>
        </div>

      </Link>

      {/* Smaller story cards */}
      <div className={styles.cardGrid}>
        {CARDS.map((card) => (
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          <Link key={card.num} href={card.href as any} className={styles.card}>
            <span className={styles.cardNumber}>{card.num}</span>
            <span className={styles.cardTitle}>{card.title}</span>
            <span className={styles.cardPreview}>{card.preview}</span>
            <span className={styles.cardMeta}>{card.readTime}</span>
          </Link>
        ))}
      </div>

    </section>
  )
}
