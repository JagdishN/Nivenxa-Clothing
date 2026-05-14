import AnimatedSection from '@/components/ui/AnimatedSection'
import styles from './Campaigns.module.scss'

export const metadata = {
  title: 'Campaigns — NIVENXA',
  description:
    'Visual studies of movement, texture, light, and everyday wear. NIVENXA campaigns as quiet visual narratives.',
}

const SECTIONS = [
  {
    index: '01',
    title: 'Everyday Silhouettes',
    body: [
      'Our silhouettes are designed to move naturally through daily environments — from slower mornings to dense city routines and quieter transitional moments.',
      'Campaign imagery focuses on proportion, posture, layering, and movement rather than overt styling.',
      'The garments are intended to feel lived-in, relaxed, and emotionally familiar over time.',
    ],
  },
  {
    index: '02',
    title: 'Light & Texture',
    body: [
      'Natural light, softened shadows, textured surfaces, and washed color palettes shape the visual language of every campaign.',
      'Rather than polished perfection, we are drawn to subtle imperfections:',
    ],
    list: [
      'fabric folds,',
      'faded walls,',
      'quiet architecture,',
      'creased cotton,',
      'and the movement of garments in real space.',
    ],
    bodyAfter: [
      'These elements create imagery that feels tactile, calm, and grounded.',
    ],
  },
  {
    index: '03',
    title: 'Movement Through Space',
    body: [
      'Our campaigns are photographed with movement in mind.',
      'Garments are observed while walking, sitting, folding, layering, and adapting naturally to the body rather than remaining static.',
      'This approach allows the texture, weight, and structure of each fabric to reveal itself more honestly through wear and motion.',
    ],
  },
  {
    index: '04',
    title: 'Indian Modernism',
    body: [
      'The visual atmosphere of NIVENXA is shaped by contemporary Indian environments —',
    ],
    list: [
      'sun-faded textures,',
      'warm concrete,',
      'muted interiors,',
      'dense streets,',
      'quiet homes,',
      'and slower urban rhythms.',
    ],
    bodyAfter: [
      'Rather than relying on overt cultural symbolism, our campaigns reflect a quieter and more modern interpretation of Indian living.',
    ],
  },
  {
    index: '05',
    title: 'Designed to Feel Natural',
    body: [
      'We believe clothing is most expressive when it feels effortless.',
      'Our campaigns avoid excess styling, exaggerated poses, and over-produced imagery in favor of natural posture, relaxed movement, and quiet confidence.',
      'The focus remains on the garment —',
    ],
    list: [
      'how it drapes,',
      'softens,',
      'layers,',
      'and settles into everyday life.',
    ],
  },
]

export default function CampaignsPage() {
  return (
    <div className={styles.page}>

      {/* Hero */}
      <div className={styles.hero}>
        <span className={styles.heroGhost} aria-hidden>VISUAL</span>
        <div className={styles.heroNote}>
          <span className={styles.heroNoteLabel}>Campaign Notes</span>
          <ul className={styles.heroNoteList}>
            <li><a className={styles.heroNoteLink} href="#section-01">Everyday Silhouettes</a></li>
            <li><a className={styles.heroNoteLink} href="#section-02">Light & Texture</a></li>
            <li><a className={styles.heroNoteLink} href="#section-03">Movement Through Space</a></li>
            <li><a className={styles.heroNoteLink} href="#section-04">Indian Modernism</a></li>
            <li><a className={styles.heroNoteLink} href="#section-05">Designed to Feel Natural</a></li>
          </ul>
        </div>
        <AnimatedSection>
          <p className={styles.eyebrow}>Stories — Campaigns</p>
          <h1 className={styles.title}>Campaigns</h1>
          <p className={styles.subtitle}>Visual studies of movement, texture, light, and everyday wear.</p>
        </AnimatedSection>
        <AnimatedSection delay={0.12} className={styles.introWrap}>
          <p className={styles.intro}>
            NIVENXA campaigns are created as quiet visual narratives rather than seasonal statements.
          </p>
          <p className={styles.intro}>
            Each collection is photographed with attention to atmosphere, movement, material texture,
            and the natural relationship between clothing and environment.
          </p>
          <p className={styles.intro}>
            Rather than following fast-moving trends or heavily styled fashion imagery, our campaigns
            focus on softness, repetition, restraint, and the subtle rhythm of everyday life.
          </p>
          <p className={styles.introItalic}>
            The intention is not performance — but presence.
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
                {'bodyAfter' in section && section.bodyAfter && section.bodyAfter.map((para, j) => (
                  <p key={`after-${j}`} className={styles.body}>{para}</p>
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
          Campaigns are not created to manufacture aspiration.
        </p>
        <p className={styles.closingBody}>
          They are intended to document how clothing exists naturally through light, texture,
          movement, and repetition.
        </p>
        <p className={styles.closingBodyItalic}>Observed quietly. Worn naturally.</p>
      </AnimatedSection>

    </div>
  )
}
