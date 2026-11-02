import Link from 'next/link'
import { seoMetadata } from '@/lib/seo'
import SiteFooter from '@/components/global/SiteFooter'
import styles from './page.module.scss'

const PARENT_FOOTER_COLUMNS = [
  {
    title: 'Ventures',
    links: [
      { label: 'Studio', href: '/studio/en' },
      { label: 'Chess', href: '/chess' },
      { label: 'Living', href: '/living' },
      { label: 'Technologies', href: '/technologies' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy Notice', href: '/privacy' },
      { label: 'Website Terms', href: '/terms' },
      { label: 'Contact', href: '/contact' },
    ],
  },
]

export const metadata = seoMetadata({
  title: 'NIVENXA — Independent ventures. Built with intention.',
  description:
    'NIVENXA Studio and NIVENXA Technologies — premium Indian comfortwear and software built with intention, from Hyderabad, India.',
  path: '/',
})

export default function RootPage() {
  return (
    <>
    <div style={{
      background: 'var(--nivenxa-bg-primary, #F2EDE6)',
      color: 'var(--nivenxa-text-primary, #1A1A1A)',
      minHeight: '100vh',
      fontFamily: 'var(--font-inter, system-ui, sans-serif)',
    }}>

      {/* Hero — wordmark only, no navigation */}
      <section style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '50vh',
        padding: 'clamp(50px, 9.5vw, 112px) 40px clamp(38px, 6.5vw, 77px)',
        textAlign: 'center',
        borderBottom: '1px solid rgba(26,26,26,0.08)',
      }}>
        <h1 style={{
          fontFamily: 'var(--font-playfair, Georgia, serif)',
          fontSize: 'clamp(36px, 7vw, 80px)',
          fontWeight: 400,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          margin: '0 0 28px',
          lineHeight: 1,
        }}>
          NIVENXA
        </h1>
        <p style={{
          fontSize: 'clamp(14px, 1.8vw, 17px)',
          fontWeight: 400,
          color: 'rgba(26,26,26,0.55)',
          letterSpacing: '0.01em',
          lineHeight: 1.5,
          margin: 0,
        }}>
          Independent ventures. Built with intention.
        </p>
      </section>

      {/* About */}
      <section style={{
        padding: 'clamp(38px, 5.5vw, 64px) 40px',
        maxWidth: '680px',
        margin: '0 auto',
        borderBottom: '1px solid rgba(26,26,26,0.08)',
      }}>
        <p style={{
          fontSize: '16px',
          lineHeight: 1.80,
          color: 'rgba(26,26,26,0.70)',
          margin: 0,
        }}>
          NIVENXA is built around a simple idea — that the things we make,
          wear, use and build should be considered carefully.
          We bring this thinking to clothing, technology and every venture
          we choose to pursue.
        </p>
      </section>

      {/* Entity cards */}
      <section style={{
        padding: 'clamp(38px, 5.5vw, 64px) 40px',
        maxWidth: '900px',
        margin: '0 auto',
        borderBottom: '1px solid rgba(26,26,26,0.08)',
      }}>
        <p style={{
          fontSize: '11px',
          fontWeight: 600,
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          color: 'rgba(26,26,26,0.40)',
          margin: '0 0 24px',
          textAlign: 'center',
        }}>
          Our ventures
        </p>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '24px',
        }}>

          {/* NIVENXA Studio */}
          <div className={styles.card} style={{
            background: '#FFFFFF',
            border: '1px solid #E5DDD5',
            padding: '36px',
            display: 'flex',
            flexDirection: 'column',
          }}>
            <p style={{
              fontSize: '10px',
              fontWeight: 700,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'rgba(26,26,26,0.40)',
              margin: '0 0 16px',
            }}>
              Nivenxa Studio
            </p>
            <p style={{
              fontSize: '15px',
              lineHeight: 1.70,
              color: 'rgba(26,26,26,0.70)',
              margin: '0 0 32px',
              flex: 1,
            }}>
              Premium Indian comfortwear. Natural fabrics, considered
              construction and relaxed silhouettes designed for Indian life.
            </p>
            <Link
              href="/studio/en"
              style={{
                display: 'inline-block',
                fontSize: '13px',
                fontWeight: 500,
                color: 'var(--nivenxa-cta-forest, #1C2E1E)',
                textDecoration: 'none',
                letterSpacing: '0.02em',
              }}
            >
              Explore Studio <span className={styles.cardCtaArrow}>→</span>
            </Link>
          </div>

          {/* NIVENXA Technologies */}
          <div className={styles.card} style={{
            background: '#FFFFFF',
            border: '1px solid #E5DDD5',
            padding: '36px',
            display: 'flex',
            flexDirection: 'column',
          }}>
            <p style={{
              fontSize: '10px',
              fontWeight: 700,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'rgba(26,26,26,0.40)',
              margin: '0 0 16px',
            }}>
              Nivenxa Technologies
            </p>
            <p style={{
              fontSize: '15px',
              lineHeight: 1.70,
              color: 'rgba(26,26,26,0.70)',
              margin: '0 0 32px',
              flex: 1,
            }}>
              Digital products and technology solutions built with precision
              for businesses ready to grow.
            </p>
            <Link
              href="/technologies"
              style={{
                display: 'inline-block',
                fontSize: '13px',
                fontWeight: 500,
                color: 'var(--nivenxa-cta-forest, #1C2E1E)',
                textDecoration: 'none',
                letterSpacing: '0.02em',
              }}
            >
              Explore Technologies <span className={styles.cardCtaArrow}>→</span>
            </Link>
          </div>

        </div>
      </section>

    </div>
    <SiteFooter columns={PARENT_FOOTER_COLUMNS} />
    </>
  )
}
