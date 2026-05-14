import AnimatedSection from '@/components/ui/AnimatedSection'
import styles from './FabricJournal.module.scss'

export const metadata = {
  title: 'Fabric Journal — NIVENXA',
  description:
    'A study of texture, structure, softness, and everyday wear. NIVENXA fabrics chosen for comfort, breathability, and longevity.',
}

const SECTIONS = [
  {
    index: '01',
    title: 'Structured Cottons',
    body: [
      'For utility silhouettes and oversized essentials, we use denser cotton constructions between 240–340 GSM that provide structure, durability, and a substantial hand feel.',
      'Bio-washing softens the fabric while preserving weight and integrity, creating garments that feel grounded yet comfortable through repeated wear.',
      'These materials are designed to hold shape naturally while adapting gradually to the body over time.',
    ],
  },
  {
    index: '02',
    title: 'Linen & Everyday Blends',
    body: [
      'For relaxed tailoring, co-ords, and Indo-Western comfortwear, lighter linen-cotton blends between 160–200 GSM allow for airflow, softness, and ease of movement.',
      'Slub textures and washed finishes introduce a more natural surface character while maintaining comfort against the skin.',
      'The result is fabric that feels breathable, relaxed, and effortless across long days and changing environments.',
    ],
  },
  {
    index: '03',
    title: 'Soft Sateens',
    body: [
      'Select collections incorporate lightweight cotton sateens chosen for their smooth texture and quiet refinement.',
      'These fabrics introduce softness and fluidity while maintaining the restrained visual language central to NIVENXA.',
      'Subtle sheen, clean drape, and a softer hand feel create garments designed for elevated everyday wear.',
    ],
  },
  {
    index: '04',
    title: 'Utility & Texture',
    body: [
      'Certain collections incorporate washed canvases and utility-inspired fabrics developed for durability and tactile depth.',
      'Rather than feeling rigid or industrial, these materials are softened intentionally to balance structure with comfort.',
      'Texture is treated as something subtle — revealed through washing, movement, and repeated wear rather than surface decoration.',
    ],
  },
  {
    index: '05',
    title: 'Designed to Soften',
    body: [
      'We believe garments should evolve naturally through use.',
      'Bio-washed fabrics soften gradually, creases develop, surfaces fade gently, and structure relaxes over time.',
      'These changes are not imperfections — they become part of the garment\'s identity.',
    ],
  },
  {
    index: '06',
    title: 'Designed for Repetition',
    body: [
      'Our materials are chosen for wardrobes built around everyday rotation rather than occasional wear.',
      'Breathability, durability, softness, and ease of maintenance are considered alongside texture and visual balance.',
      'The intention is simple: to create garments that feel better the more often they are worn.',
    ],
  },
]

export default function FabricJournalPage() {
  return (
    <div className={styles.page}>

      {/* Hero */}
      <div className={styles.hero}>
        <span className={styles.heroGhost} aria-hidden>FABRIC</span>
        <div className={styles.heroNote}>
          <span className={styles.heroNoteLabel}>Material Notes</span>
          <ul className={styles.heroNoteList}>
            <li>
              <a className={styles.heroNoteLink} href="#section-01">
                240–340 GSM Structured Cottons
              </a>
            </li>
            <li>
              <a className={styles.heroNoteLink} href="#section-02">
                160–200 GSM Linen Blends
              </a>
            </li>
            <li>
              <a className={styles.heroNoteLink} href="#section-03">
                180 GSM Cotton Sateens
              </a>
            </li>
            <li>
              <a className={styles.heroNoteLink} href="#section-04">
                Bio-Washed Finishes
              </a>
            </li>
            <li>
              <a className={styles.heroNoteLink} href="#section-06">
                Built for Repetition
              </a>
            </li>
          </ul>
        </div>
        <AnimatedSection>
          <p className={styles.eyebrow}>Stories — Fabric Journal</p>
          <h1 className={styles.title}>Fabric Journal</h1>
        </AnimatedSection>
        <AnimatedSection delay={0.12} className={styles.introWrap}>
          <p className={styles.intro}>
            A study of texture, structure, softness, and everyday wear.
          </p>
          <p className={styles.intro}>
            Fabric shapes how a garment is experienced — how it falls, moves, softens, and settles into everyday life.
            At NIVENXA, materials are selected with attention to comfort, breathability, structure, and longevity rather than seasonal trends alone.
          </p>
          <p className={styles.intro}>
            Our collections move across a range of fabric expressions: heavyweight bio-washed cottons, washed utility canvases, textured linen blends, and softened sateens designed for different rhythms of wear.
          </p>
          <p className={styles.intro}>
            Over time, each fabric develops character through movement, repetition, and lived experience.
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
          Fabric is the foundation of how clothing is remembered — through touch, movement, comfort, and time.
        </p>
        <p className={styles.closingBodyItalic}>
          Designed to soften naturally through everyday life.
        </p>
      </AnimatedSection>
    </div>
  )
}