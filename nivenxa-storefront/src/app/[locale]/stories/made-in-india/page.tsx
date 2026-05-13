import AnimatedSection from '@/components/ui/AnimatedSection'
import styles from './MadeInIndia.module.scss'

export const metadata = {
  title: 'Made in India — NIVENXA',
  description:
    'Designed for contemporary Indian living. NIVENXA garments shaped by long summers, dense cities, and slower mornings.',
}

const SECTIONS = [
  {
    index: '01',
    title: 'Climate & Comfort',
    body: [
      'Indian climates demand clothing that can adapt across long days and changing conditions. Our fabrics are selected for softness, airflow, durability, and tactile comfort without unnecessary heaviness.',
      'Relaxed cuts, washed textures, and breathable construction allow garments to move naturally through everyday urban life.',
      'NIVENXA silhouettes are intentionally unstructured — designed for comfort that feels elevated rather than oversized.',
    ],
  },
  {
    index: '02',
    title: 'Material & Process',
    body: [
      'We work primarily with heavyweight cottons, washed canvases, and softened utility fabrics chosen for their texture, longevity, and evolving character.',
      'Bio-washing softens the surface of the fabric while preserving density and structure, creating garments that feel substantial yet easy to wear.',
      'Every seam, finish, and construction detail is approached with restraint — reducing excess while emphasizing comfort, durability, and balance.',
    ],
  },
  {
    index: '03',
    title: 'Slow Everyday Wear',
    body: [
      'We believe clothing becomes more personal through repetition.',
      'The natural fading of washed cotton, the softening of fabric over time, and the quiet imperfections created through daily wear are all part of the garment\'s life.',
      'NIVENXA is designed for wardrobes built slowly — fewer pieces, worn more often, and kept longer.',
    ],
  },
]

export default function MadeInIndiaPage() {
  return (
    <div className={styles.page}>

      {/* Hero */}
      <div className={styles.hero}>
        <span className={styles.heroGhost} aria-hidden>INDIA</span>
        <AnimatedSection>
          <p className={styles.eyebrow}>Stories — Made in India</p>
          <h1 className={styles.title}>Designed for Contemporary<br />Indian Living</h1>
        </AnimatedSection>
        <AnimatedSection delay={0.12} className={styles.introWrap}>
          <p className={styles.intro}>
            NIVENXA garments are shaped by the realities of everyday life in India — long summers,
            shifting temperatures, dense cities, slower mornings, and movement throughout the day.
          </p>
          <p className={styles.intro}>
            Our silhouettes are relaxed by intention. Fabrics are chosen for breathability, softness,
            and repeat wear. Every collection is designed to feel effortless in motion while retaining
            a sense of structure and quiet refinement.
          </p>
          <p className={styles.intro}>
            Produced in limited runs using heavyweight bio-washed cottons and utility-driven fabrics,
            each piece is made to soften naturally over time and become part of a lived-in wardrobe.
          </p>
          <p className={styles.intro}>
            Rather than following fast seasonal cycles, NIVENXA focuses on permanence — clothing
            designed to be worn often, layered easily, and lived in comfortably.
          </p>
        </AnimatedSection>
        <AnimatedSection delay={0.2}>
          <div className={styles.heroDivider} />
        </AnimatedSection>
      </div>

      {/* Numbered sections */}
      <div className={styles.sections}>
        {SECTIONS.map((section, i) => (
          <AnimatedSection key={section.index} delay={i * 0.08} className={styles.section}>
            <div className={styles.sectionMeta}>
              <span className={styles.sectionIndex}>{section.index}</span>
              <div className={styles.sectionRule} />
            </div>
            <div className={styles.sectionContent}>
              <h2 className={styles.sectionTitle}>{section.title}</h2>
              {section.body.map((para, j) => (
                <p key={j} className={styles.body}>{para}</p>
              ))}
            </div>
          </AnimatedSection>
        ))}
      </div>

      {/* Closing note */}
      <AnimatedSection delay={0.1} className={styles.closing}>
        <div className={styles.closingRule} />
        <p className={styles.closingLabel}>Closing Note</p>
        <p className={styles.closingBody}>
          Crafted in India with an emphasis on comfort, longevity, and understated utility.
        </p>
        <p className={styles.closingBodyItalic}>
          Designed to move quietly through everyday life.
        </p>
      </AnimatedSection>

    </div>
  )
}
