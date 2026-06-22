import { Link } from '@/i18n/routing'
import Image from 'next/image'
import styles from './EditsSection.module.css'

// ── Real product image paths ──────────────────────────────────────────────────
const TEE_OAT_WALKING     = "/images/Men/OversizedTee's/OAT%20BEIGE/walking_view.webp"
const CARGO_OLIVE_SITTING = '/images/Unisex/cargos/DARKOLIVE/sittingorLearning_studio_view.webp'
const KURTA_IVORY_WALKING = '/images/Wonmen/A-line%20Kurta/MORNING%20IVORY/walking_view.webp'
const KIDS_CLOUD_WALKING  = '/images/Kids/unisex%20sleeper%20wear/Rest%20Set/SOFT%20CLOUD%20WHITE/walking_view.webp'
const COORD_SAGE_WALKING  = '/images/Wonmen/Co-ord%20Sets/MEADOW%20SAGE/walking_view.webp'

// ── Data ──────────────────────────────────────────────────────────────────────

interface EditCard {
  num: string
  editName: string      // shown as small uppercase label below image
  productName: string   // Georgia serif, main product name
  fabricLine: string    // italic spec note below product name
  href: string
  imageSrc?: string     // real product photo — if absent, placeholder shown
  imageAlt?: string
  placeholderBg?: string
  ghostColor: string    // semi-transparent ghost number
}

const CARDS: EditCard[] = [
  {
    num: '01',
    editName: "The Indian Edit",
    productName: 'A-line Kurta',
    fabricLine: '160 GSM Cotton-Modal slub',
    href: '/edits/womens-edit',
    imageSrc: KURTA_IVORY_WALKING,
    imageAlt: 'A-line Kurta — Morning Ivory — walking view',
    ghostColor: 'rgba(0,0,0,0.08)',
  },
  {
    num: '02',
    editName: 'The Ease Edit',
    productName: 'Co-ord Set',
    fabricLine: 'Linen-cotton blend',
    href: '/edits/ease-edit',
    imageSrc: COORD_SAGE_WALKING,
    imageAlt: 'Co-ord Set — Meadow Sage — walking view',
    ghostColor: 'rgba(0,0,0,0.08)',
  },
  {
    num: '03',
    editName: 'The Everyday Edit',
    productName: 'Oversized Tee',
    fabricLine: '240 GSM combed cotton',
    href: '/edits/everyday-edit',
    imageSrc: TEE_OAT_WALKING,
    imageAlt: 'Oversized Tee — Oat Beige — walking view',
    ghostColor: 'rgba(0,0,0,0.08)',
  },
  {
    num: '04',
    editName: 'The Utility Edit',
    productName: 'Cargo Pant',
    fabricLine: '300 GSM enzyme canvas',
    href: '/edits/utility-edit',
    imageSrc: CARGO_OLIVE_SITTING,
    imageAlt: 'Cargo Pant — Dark Olive — sitting view',
    ghostColor: 'rgba(255,255,255,0.10)',
  },
  {
    num: '05',
    editName: 'The Dream Edit',
    productName: 'Kids Sleepwear Set',
    fabricLine: 'Soft organic sleepwear',
    href: '/edits/dream-edit',
    imageSrc: KIDS_CLOUD_WALKING,
    imageAlt: 'Kids Sleepwear Set — Cloud — walking view',
    ghostColor: 'rgba(0,0,0,0.08)',
  },
  {
    num: '06',
    editName: 'The Rest Edit',
    productName: 'Long Sleeve Sleep Set',
    fabricLine: '200–220 GSM Cotton-Modal',
    href: '/edits/rest-edit',
    placeholderBg: '#F5F0E8',
    ghostColor: 'rgba(0,0,0,0.08)',
  },
]

// ── Component ─────────────────────────────────────────────────────────────────

export default function EditsSection() {
  return (
    <section className={styles.section} data-section="the-edits">

      {/* Section header */}
      <div className={styles.sectionIntro}>
        <div>
          <p className={styles.eyebrow}>CURATED COLLECTIONS</p>
          <h2 className={styles.sectionTitle}>
            The <em>Edits</em>
          </h2>
        </div>
        <div className={styles.sectionMeta}>
          <span className={styles.editCount}>06 edits · 15 pieces</span>
        </div>
      </div>

      {/* 4-column grid — 6 product cards + explore panel */}
      <div className={styles.cardGrid}>

        {CARDS.map((card) => (
          // Entire card is the link — no nested EXPLORE button
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          <Link key={card.num} href={card.href as any} className={styles.card}>

            {/* Image panel */}
            <div className={styles.imagePanel}>
              {card.imageSrc ? (
                <Image
                  src={card.imageSrc}
                  alt={card.imageAlt ?? card.productName}
                  fill
                  className={styles.heroImg}
                  sizes="(max-width: 768px) 50vw, 25vw"
                />
              ) : (
                <div
                  className={styles.fabricPlaceholder}
                  style={{ background: card.placeholderBg }}
                />
              )}

              {/* Ghost number — bottom-right */}
              <span
                className={styles.ghostNum}
                style={{ color: card.ghostColor }}
                aria-hidden="true"
              >
                {card.num}
              </span>
            </div>

            {/* Minimal text below image */}
            <div className={styles.cardText}>
              <span className={styles.editLabel}>{card.editName}</span>
              <span className={styles.productName}>{card.productName}</span>
              <span className={styles.fabricLine}>{card.fabricLine}</span>
            </div>

          </Link>
        ))}

        {/* Explore All panel — always last */}
        {/*
          FUTURE: when Edits count reaches 8+
          update explorePanel grid-column
          from span 3 to span 4 in CSS
        */}
        <div className={styles.explorePanel}>
          <div
            className={styles.exploreBg}
            style={{ backgroundImage: `url(${TEE_OAT_WALKING})` }}
          />
          <div className={styles.exploreContent}>
            <p className={styles.exploreQuote}>
              Curated Edits
            </p>
            <div className={styles.exploreLines}>
              <span>Everyday essentials.</span>
              <span>Utility pieces.</span>
              <span>Indian comfortwear.</span>
              <span>The Dream Edit.</span>
            </div>
            <p className={styles.exploreTagline}>
              Designed to work together.
            </p>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <Link href={'/edits' as any} className={styles.exploreBtn}>
              Explore All Edits →
            </Link>
          </div>
        </div>

      </div>
    </section>
  )
}
