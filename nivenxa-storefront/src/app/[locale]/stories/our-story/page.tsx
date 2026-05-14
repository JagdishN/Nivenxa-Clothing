import AnimatedSection from '@/components/ui/AnimatedSection'
import styles from './OurStory.module.scss'

export const metadata = {
  title: 'Our Story — NIVENXA',
  description:
    'Elevated comfortwear rooted in softness, movement, and quiet utility. Designed to soften naturally through everyday Indian living.',
}

const SECTIONS = [
  {
    index: '01',
    title: 'Comfort should feel intentional.',
    body: [
      'We created NIVENXA around the realities of modern Indian life — long summers, movement throughout the day, slower mornings, and the need for clothing that feels effortless without losing structure.',
      'Our garments are designed to move naturally between comfort, utility, and everyday refinement.',
    ],
  },
  {
    index: '02',
    title: 'Fabric shapes the experience.',
    body: [
      'Heavyweight cottons, washed canvases, softened utility fabrics, and bio-washed textures are chosen not only for durability, but for how they evolve over time.',
      'We believe garments should become softer, more personal, and more lived-in through repeated wear.',
    ],
  },
  {
    index: '03',
    title: 'Designed for contemporary Indian living.',
    body: [
      'Our silhouettes are intentionally relaxed — allowing breathability, movement, and comfort across changing climates, dense cities, and everyday routines.',
      'The goal is not excess, but balance: clothing that feels elevated while remaining deeply wearable.',
    ],
  },
  {
    index: '04',
    title: 'Made with restraint.',
    body: [
      'We work with experienced makers and limited production runs to maintain consistency, fabric integrity, and thoughtful finishing.',
      'Craftsmanship lives in details often unnoticed:',
    ],
    list: [
      'the fall of a sleeve,',
      'the softness of a seam,',
      'the weight of washed fabric over time.',
    ],
  },
]

export default function OurStoryPage() {
  return (
    <div className={styles.page}>

      {/* Hero */}
      <div className={styles.hero}>
        <AnimatedSection>
          <p className={styles.eyebrow}>NIVENXA — Our Story</p>
          <h1 className={styles.title}>Designed for everyday<br />Indian living.</h1>
          <p className={styles.subtitle}>
            Elevated comfortwear rooted in softness, movement, and quiet utility.
          </p>
        </AnimatedSection>
        <AnimatedSection delay={0.12} className={styles.introWrap}>
          <p className={styles.intro}>
            NIVENXA creates elevated comfortwear rooted in softness, movement, and quiet utility.
          </p>
          <p className={styles.intro}>
            Designed to soften naturally through everyday life.
          </p>
        </AnimatedSection>
        <AnimatedSection delay={0.2}>
          <div className={styles.heroDivider} />
        </AnimatedSection>
      </div>

      {/* Sections */}
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
        <p className={styles.closingBody}>Made with intent.</p>
        <p className={styles.closingBodyItalic}>Worn over time.</p>
      </AnimatedSection>

    </div>
  )
}
