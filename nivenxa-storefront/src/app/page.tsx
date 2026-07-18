import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'NIVENXA — A group of businesses built with intention',
  description: 'NIVENXA Studio and NIVENXA Technologies. Premium Indian comfortwear and digital products built with precision.',
}

export default function RootPage() {
  return (
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
        minHeight: '60vh',
        padding: 'clamp(64px, 12vw, 140px) 40px clamp(48px, 8vw, 96px)',
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
          A group of businesses built with intention.
        </p>
      </section>

      {/* About */}
      <section style={{
        padding: 'clamp(48px, 7vw, 80px) 40px',
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
          NIVENXA is built around a single idea — that the things we make,
          wear, use, and build should be considered carefully.
          We apply this thinking to clothing, technology, and everything
          we choose to work on.
        </p>
      </section>

      {/* Entity cards */}
      <section style={{
        padding: 'clamp(48px, 7vw, 80px) 40px',
        maxWidth: '900px',
        margin: '0 auto',
        borderBottom: '1px solid rgba(26,26,26,0.08)',
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '24px',
        }}>

          {/* NIVENXA Studio */}
          <div style={{
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
              Studio
            </p>
            <p style={{
              fontSize: '15px',
              lineHeight: 1.70,
              color: 'rgba(26,26,26,0.70)',
              margin: '0 0 32px',
              flex: 1,
            }}>
              Premium Indian comfortwear. Natural fabrics. Relaxed silhouettes.
              Designed for Indian life.
            </p>
            <Link
              href="/en"
              style={{
                display: 'inline-block',
                fontSize: '13px',
                fontWeight: 500,
                color: 'var(--nivenxa-cta-forest, #1C2E1E)',
                textDecoration: 'none',
                letterSpacing: '0.02em',
              }}
            >
              Visit Studio →
            </Link>
          </div>

          {/* NIVENXA Technologies */}
          <div style={{
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
              Technologies
            </p>
            <p style={{
              fontSize: '15px',
              lineHeight: 1.70,
              color: 'rgba(26,26,26,0.70)',
              margin: '0 0 32px',
              flex: 1,
            }}>
              Digital products built with precision. Mobile apps and platforms
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
              Visit Technologies →
            </Link>
          </div>

        </div>
      </section>

      {/* Contact */}
      <section style={{
        padding: 'clamp(48px, 7vw, 80px) 40px',
        maxWidth: '680px',
        margin: '0 auto',
      }}>
        <p style={{
          fontSize: '11px',
          fontWeight: 600,
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          color: 'rgba(26,26,26,0.40)',
          margin: '0 0 12px',
        }}>
          Get in touch
        </p>
        <a
          href="mailto:info@nivenxa.com"
          style={{
            color: 'var(--nivenxa-cta-forest, #1C2E1E)',
            fontSize: '15px',
            fontWeight: 400,
            textDecoration: 'none',
            letterSpacing: '0.01em',
          }}
        >
          info@nivenxa.com
        </a>
      </section>

    </div>
  )
}
