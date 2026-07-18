import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'NIVENXA Technologies — Digital products built with precision and purpose',
  description: 'Mobile applications, web platforms, business automation, and API integrations. NIVENXA Technologies builds digital products for businesses ready to grow.',
}

const WHAT_WE_BUILD = [
  {
    title: 'Mobile Applications',
    description: 'iOS and Android apps built in React Native.',
  },
  {
    title: 'Web Platforms',
    description: 'Next.js and React — performance-first web products.',
  },
  {
    title: 'Business Automation',
    description: 'Workflow tools and internal dashboards.',
  },
  {
    title: 'API Integrations',
    description: 'Payment systems, third-party services, and custom APIs.',
  },
]

export default function TechnologiesPage() {
  return (
    <div style={{
      background: 'var(--nivenxa-bg-primary, #F2EDE6)',
      color: 'var(--nivenxa-text-primary, #1A1A1A)',
      minHeight: '100vh',
      fontFamily: 'var(--font-inter, system-ui, sans-serif)',
    }}>

      {/* Header */}
      <header style={{
        borderBottom: '1px solid rgba(26,26,26,0.10)',
        padding: '20px 40px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <Link href="/" style={{
          textDecoration: 'none',
          color: 'var(--nivenxa-text-primary, #1A1A1A)',
          fontSize: '11px',
          fontWeight: 600,
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
        }}>
          NIVENXA
        </Link>
        <span style={{
          fontSize: '11px',
          fontWeight: 500,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'rgba(26,26,26,0.50)',
        }}>
          Technologies
        </span>
      </header>

      {/* Hero */}
      <section style={{
        padding: 'clamp(64px, 10vw, 120px) 40px clamp(48px, 8vw, 96px)',
        maxWidth: '820px',
        margin: '0 auto',
      }}>
        <p style={{
          fontSize: '11px',
          fontWeight: 600,
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          color: 'rgba(26,26,26,0.45)',
          margin: '0 0 20px',
        }}>
          NIVENXA Technologies
        </p>
        <h1 style={{
          fontFamily: 'var(--font-playfair, Georgia, serif)',
          fontSize: 'clamp(32px, 5vw, 56px)',
          fontWeight: 400,
          lineHeight: 1.15,
          letterSpacing: '-0.01em',
          margin: '0 0 24px',
        }}>
          Digital products built with precision and purpose.
        </h1>
      </section>

      {/* What we build */}
      <section style={{
        padding: '0 40px clamp(64px, 10vw, 96px)',
        maxWidth: '900px',
        margin: '0 auto',
      }}>
        <p style={{
          fontSize: '11px',
          fontWeight: 600,
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          color: 'rgba(26,26,26,0.45)',
          margin: '0 0 32px',
        }}>
          What we build
        </p>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1px',
          background: 'rgba(26,26,26,0.10)',
          border: '1px solid rgba(26,26,26,0.10)',
        }}>
          {WHAT_WE_BUILD.map((item) => (
            <div key={item.title} style={{
              background: 'var(--nivenxa-bg-primary, #F2EDE6)',
              padding: '32px',
            }}>
              <h3 style={{
                fontSize: '14px',
                fontWeight: 600,
                letterSpacing: '0.02em',
                margin: '0 0 10px',
              }}>
                {item.title}
              </h3>
              <p style={{
                fontSize: '14px',
                lineHeight: 1.65,
                color: 'rgba(26,26,26,0.65)',
                margin: 0,
              }}>
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* How we work */}
      <section style={{
        padding: '0 40px clamp(64px, 10vw, 96px)',
        maxWidth: '820px',
        margin: '0 auto',
        borderTop: '1px solid rgba(26,26,26,0.10)',
        paddingTop: 'clamp(48px, 7vw, 80px)',
      }}>
        <p style={{
          fontSize: '11px',
          fontWeight: 600,
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          color: 'rgba(26,26,26,0.45)',
          margin: '0 0 20px',
        }}>
          How we work
        </p>
        <p style={{
          fontSize: '16px',
          lineHeight: 1.75,
          color: 'rgba(26,26,26,0.75)',
          margin: 0,
          maxWidth: '620px',
        }}>
          We take on a small number of technology projects each year.
          Every product we build carries our name — so we build things
          we are proud of.
        </p>
      </section>

      {/* Projects in development */}
      <section style={{
        padding: '0 40px clamp(64px, 10vw, 96px)',
        maxWidth: '900px',
        margin: '0 auto',
        borderTop: '1px solid rgba(26,26,26,0.10)',
        paddingTop: 'clamp(48px, 7vw, 80px)',
      }}>
        <p style={{
          fontSize: '11px',
          fontWeight: 600,
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          color: 'rgba(26,26,26,0.45)',
          margin: '0 0 32px',
        }}>
          Projects in development
        </p>
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #E5DDD5',
          padding: '32px',
          maxWidth: '480px',
        }}>
          <div style={{
            display: 'inline-block',
            fontSize: '10px',
            fontWeight: 600,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--nivenxa-cta-forest, #1C2E1E)',
            background: 'rgba(28,46,30,0.07)',
            padding: '4px 10px',
            marginBottom: '16px',
          }}>
            In Development
          </div>
          <h3 style={{
            fontSize: '16px',
            fontWeight: 600,
            letterSpacing: '0.01em',
            margin: '0 0 10px',
          }}>
            Home Services Platform
          </h3>
          <p style={{
            fontSize: '14px',
            lineHeight: 1.65,
            color: 'rgba(26,26,26,0.65)',
            margin: '0 0 24px',
          }}>
            On-demand laundry and ironing app for apartment communities. iOS and Android. Built in React Native.
          </p>
          <p style={{
            fontSize: '11px',
            fontWeight: 500,
            letterSpacing: '0.08em',
            color: 'rgba(26,26,26,0.40)',
            margin: 0,
            borderTop: '1px solid rgba(26,26,26,0.08)',
            paddingTop: '16px',
          }}>
            Powered by NIVENXA Technologies
          </p>
        </div>
      </section>

      {/* Contact */}
      <section style={{
        padding: 'clamp(48px, 7vw, 80px) 40px clamp(64px, 10vw, 96px)',
        maxWidth: '820px',
        margin: '0 auto',
        borderTop: '1px solid rgba(26,26,26,0.10)',
      }}>
        <p style={{
          fontSize: '11px',
          fontWeight: 600,
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          color: 'rgba(26,26,26,0.45)',
          margin: '0 0 16px',
        }}>
          Work with us
        </p>
        <p style={{
          fontSize: '16px',
          lineHeight: 1.65,
          color: 'rgba(26,26,26,0.65)',
          margin: '0 0 16px',
        }}>
          For technology partnerships and project enquiries.
        </p>
        <a
          href="mailto:info@nivenxa.com"
          style={{
            color: 'var(--nivenxa-cta-forest, #1C2E1E)',
            fontSize: '15px',
            fontWeight: 500,
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
