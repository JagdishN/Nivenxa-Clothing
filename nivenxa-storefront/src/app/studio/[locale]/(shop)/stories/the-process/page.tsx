import AnimatedSection from '@/components/ui/AnimatedSection'
import styles from './TheProcess.module.scss'

export const metadata = {
  title: 'The Process — NIVENXA',
  description:
    'From fabric selection to finished garment — shaped through repetition, refinement, and restraint.',
}

const SECTIONS = [
  {
    index: '01',
    title: 'Material Selection',
    body: [
      'Each collection begins with fabric.',
      'Heavyweight cottons, softened utility fabrics, linen blends, and washed textures are selected for their ability to age naturally through repeated wear.',
      'We prioritize materials that balance structure with softness, durability with breathability, and comfort with visual restraint.',
      'Texture, weight, and movement are considered long before silhouettes are finalized.',
    ],
  },
  {
    index: '02',
    title: 'Developing Silhouettes',
    body: [
      'Silhouettes are shaped through repeated adjustments to proportion, drape, layering, and ease of movement.',
      'Rather than following rigid seasonal fits, garments are developed to feel relaxed, adaptable, and naturally wearable across different environments and routines.',
      'The intention is to create forms that feel composed without appearing overly constructed.',
    ],
  },
  {
    index: '03',
    title: 'Washing & Softening',
    body: [
      'Bio-washing and softening treatments are used to reduce stiffness while preserving the structure and integrity of the fabric.',
      'These processes allow garments to feel more lived-in from the beginning while supporting gradual evolution through continued wear.',
      'Texture is approached subtly —',
    ],
    list: [
      'revealed through fading,',
      'movement,',
      'and repetition rather than surface decoration.',
    ],
  },
  {
    index: '04',
    title: 'Refinement Through Repetition',
    body: [
      'Every collection passes through multiple rounds of sampling, adjustment, and wear testing before reaching final production.',
      'Small refinements in seam placement, garment balance, pocket positioning, and fabric behavior often shape the final result more than dramatic design changes.',
      'The process values consistency, comfort, and longevity over constant novelty.',
    ],
  },
  {
    index: '05',
    title: 'Built for Everyday Wear',
    body: [
      'NIVENXA garments are designed with everyday repetition in mind.',
      'Movement, climate, layering, softness, and durability are considered together to create clothing that adapts naturally to daily life.',
      'Over time, fabrics soften further, silhouettes relax subtly, and garments become more personal through continued use.',
    ],
  },
]

export default function TheProcessPage() {
  return (
    <div className={styles.page}>

      {/* Hero */}
      <div className={styles.hero}>
        <span className={styles.heroGhost} aria-hidden>PROCESS</span>
        <div className={styles.heroNote}>
          <span className={styles.heroNoteLabel}>Process Notes</span>
          <ul className={styles.heroNoteList}>
            <li><a className={styles.heroNoteLink} href="#section-01">Material Selection</a></li>
            <li><a className={styles.heroNoteLink} href="#section-02">Developing Silhouettes</a></li>
            <li><a className={styles.heroNoteLink} href="#section-03">Washing & Softening</a></li>
            <li><a className={styles.heroNoteLink} href="#section-04">Refinement Through Repetition</a></li>
            <li><a className={styles.heroNoteLink} href="#section-05">Built for Everyday Wear</a></li>
          </ul>
        </div>
        <AnimatedSection>
          <p className={styles.eyebrow}>Stories — The Process</p>
          <h1 className={styles.title}>The Process</h1>
          <p className={styles.subtitle}>
            From fabric selection to finished garment — shaped through repetition, refinement, and restraint.
          </p>
        </AnimatedSection>
        <AnimatedSection delay={0.12} className={styles.introWrap}>
          <p className={styles.intro}>
            Every NIVENXA garment begins as a process of observation rather than trend forecasting.
          </p>
          <p className={styles.intro}>
            We study fabric behavior, proportion, movement, comfort, and how garments settle naturally
            into everyday routines over time.
          </p>
          <p className={styles.intro}>
            Rather than designing around excess, our approach focuses on reduction — removing
            unnecessary details while refining texture, structure, and wearability.
          </p>
          <p className={styles.introItalic}>
            The process is gradual, iterative, and intentionally paced.
          </p>
        </AnimatedSection>
        <AnimatedSection delay={0.2}>
          <div className={styles.heroDivider} />
        </AnimatedSection>
      </div>

      {/* Numbered sections */}
      <div className={styles.sections}>
        {SECTIONS.map((section, i) => (
          <div key={section.index} id={`section-${section.index}`} className={styles.section}>
            <AnimatedSection delay={i * 0.08} className={styles.sectionInner}>
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
          </div>
        ))}
      </div>

      {/* Closing note */}
      <AnimatedSection delay={0.1} className={styles.closing}>
        <div className={styles.closingRule} />
        <p className={styles.closingLabel}>Closing Note</p>
        <p className={styles.closingBody}>
          The process behind each garment is intentionally quiet — focused less on spectacle
          and more on how clothing feels, wears, and endures over time.
        </p>
        <p className={styles.closingBodyItalic}>Refined slowly. Worn naturally.</p>
      </AnimatedSection>

    </div>
  )
}
