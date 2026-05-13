import AnimatedSection from '@/components/ui/AnimatedSection'
import styles from './Craftsmanship.module.scss'

export const metadata = {
  title: 'Craftsmanship — NIVENXA',
  description:
    'Hands that shape every detail with intention. How NIVENXA approaches fabric, construction, and the quiet discipline behind every garment.',
}

const SECTIONS = [
  {
    index: '01',
    title: 'Fabric First',
    body: [
      'We begin with material.',
      'Heavyweight cottons, washed canvases, and softened utility fabrics are selected not only for durability, but for character — how they drape, age, and evolve through repeated wear.',
      'Bio-washing and softening treatments help preserve density while creating a lived-in hand feel that becomes more personal over time.',
      'Every fabric is chosen to support movement, breathability, and long-term comfort.',
    ],
  },
  {
    index: '02',
    title: 'Constructed with Restraint',
    body: [
      'NIVENXA silhouettes are intentionally uncomplicated.',
      'Rather than over-designing garments with unnecessary details, we focus on proportion, structure, and subtle utility.',
      'Seams are reinforced for durability, pockets are placed with purpose, and finishes are kept clean to maintain a sense of quiet balance.',
      'The result is clothing designed to feel effortless in motion while remaining visually composed.',
    ],
  },
  {
    index: '03',
    title: 'Made by Skilled Hands',
    body: [
      'Behind every garment is a network of skilled pattern cutters, stitchers, finishers, washers, and production teams who bring each collection to life.',
      'We value consistency over scale — working closely with small production units and experienced makers who understand the importance of precision and repetition.',
      'Craftsmanship lives in the details often unnoticed:',
    ],
    list: [
      'the fall of a sleeve,',
      'the softness of a seam,',
      'the weight of a fabric after washing.',
    ],
  },
  {
    index: '04',
    title: 'Designed to Endure',
    body: [
      'We believe clothing should improve through wear rather than lose value with time.',
      'NIVENXA garments are designed to soften naturally, adapt to everyday movement, and become part of a lived-in wardrobe.',
      'Our approach favors permanence over trend cycles — creating fewer pieces meant to be worn often, repaired when needed, and kept longer.',
    ],
  },
]

export default function CraftsmanshipPage() {
  return (
    <div className={styles.page}>

      {/* Hero */}
      <div className={styles.hero}>
        <span className={styles.heroGhost} aria-hidden>CRAFT</span>
        <AnimatedSection>
          <p className={styles.eyebrow}>Stories — Craftsmanship</p>
          <h1 className={styles.title}>Craftsmanship</h1>
          <p className={styles.subtitle}>Hands that shape every detail with intention.</p>
        </AnimatedSection>
        <AnimatedSection delay={0.12} className={styles.introWrap}>
          <p className={styles.intro}>
            NIVENXA garments are created through a process that values restraint, precision,
            and longevity over excess.
          </p>
          <p className={styles.intro}>
            We believe craftsmanship is not decoration — it is the quiet discipline behind how
            a garment feels, moves, softens, and lasts over time.
          </p>
          <p className={styles.intro}>
            Every silhouette is developed with attention to proportion, comfort, and tactile balance,
            allowing pieces to feel relaxed yet refined in everyday wear.
          </p>
          <p className={styles.intro}>
            Our collections are produced in limited runs with an emphasis on consistency, fabric
            integrity, and careful finishing.
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
              {'list' in section && section.list && (
                <ul className={styles.detailList}>
                  {section.list.map((item, j) => (
                    <li key={j} className={styles.detailItem}>{item}</li>
                  ))}
                </ul>
              )}
            </div>
          </AnimatedSection>
        ))}
      </div>

      {/* Closing note */}
      <AnimatedSection delay={0.1} className={styles.closing}>
        <div className={styles.closingRule} />
        <p className={styles.closingLabel}>Closing Note</p>
        <p className={styles.closingBody}>
          Craftsmanship, for us, is not about perfection.
        </p>
        <p className={styles.closingBody}>
          It is about creating garments with honesty, balance, and care — designed to be
          lived in every day.
        </p>
        <p className={styles.closingBodyItalic}>Made slowly. Worn naturally.</p>
      </AnimatedSection>

    </div>
  )
}
