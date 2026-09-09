import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'NIVENXA Technologies — Senior engineers, small teams, systems built to last',
  description: 'We design and build business software, AI-enabled systems and digital products — without layers of account management or junior-heavy delivery teams.',
}

const WHAT_WE_BUILD = [
  {
    num: '01',
    title: 'AI Solutions & Agents',
    description: 'AI-powered workflows, intelligent agents, and OpenAI integrations that create measurable value.',
  },
  {
    num: '02',
    title: 'Enterprise Platforms',
    description: 'Scalable web platforms built for real business complexity — not demos.',
  },
  {
    num: '03',
    title: 'Mobile Applications',
    description: 'Cross-platform iOS and Android applications built for reliable, maintainable product experiences.',
    stack: 'React Native · iOS · Android',
  },
  {
    num: '04',
    title: 'Business Automation',
    description: 'Internal tools, workflow automation, and dashboards that save hours every week.',
  },
  {
    num: '05',
    title: 'API & System Integration',
    description: 'Connect your systems. Payment gateways, third-party APIs, and custom integrations.',
  },
  {
    num: '06',
    title: 'Cloud & DevOps',
    description: 'Azure-hosted infrastructure, CI/CD pipelines, and production-ready deployments.',
  },
]

const TECHNOLOGY_GROUPS = [
  { label: 'Application', items: ['.NET', 'React', 'Next.js', 'React Native', 'TypeScript', 'Node.js'] },
  { label: 'AI & Data', items: ['Python', 'OpenAI', 'PostgreSQL', 'SQL Server', 'Azure AI Search'] },
  { label: 'Cloud & DevOps', items: ['Azure', 'Docker', 'GitHub Actions'] },
]

const HOW_WE_WORK = [
  {
    title: 'Senior-Led',
    description: 'Every project is led directly by experienced engineers. Not outsourced. Not handed to juniors.',
  },
  {
    title: 'Built to Last',
    description: 'We favour maintainability and sound architecture over shortcuts. Code we are proud to put our name on.',
  },
  {
    title: 'AI With Purpose',
    description: 'We use AI where it creates measurable value — not because it is fashionable.',
  },
]

const PROCESS_STEPS = [
  {
    step: '01',
    title: 'Discover',
    description: 'Understand the problem, the users, and the constraints.',
  },
  {
    step: '02',
    title: 'Design',
    description: 'Architecture, UX, and system design before a line of code.',
  },
  {
    step: '03',
    title: 'Build',
    description: 'Iterative development with regular client checkpoints.',
  },
  {
    step: '04',
    title: 'Launch & Evolve',
    description: 'Deployment, monitoring, and ongoing product evolution.',
  },
]

const PRODUCTS = [
  {
    title: 'NIVENXA Chess',
    description:
      'An interactive chess learning and playing platform designed to help players learn, practise and improve through guided play, move explanations and intelligent assistance.',
    tags: ['EdTech', 'Chess', 'AI-Assisted'],
    href: '/chess',
    linkLabel: 'Explore NIVENXA Chess',
  },
  {
    title: 'Nivenxa Living',
    description:
      'A lightweight platform designed specifically for standalone apartment communities to manage maintenance billing, expenses, payments, residents and day-to-day association operations.',
    tags: ['PropTech', 'SaaS', 'In Development'],
    href: '/living',
    linkLabel: 'Explore Nivenxa Living',
  },
]

const PROJECTS = [
  {
    title: 'Home Services Platform',
    description:
      'Mobile and web platform managing pickup, billing, payments and delivery operations for on-demand laundry services.',
    tags: ['Mobile', 'Operations'],
    stack: 'React Native · Web',
    status: 'In Development',
  },
  {
    title: 'AI Compliance Platform',
    description:
      'Enterprise compliance analysis using AI-assisted regulatory rule evaluation — designed to reduce manual document review and surface compliance gaps faster.',
    tags: ['AI', 'Enterprise SaaS'],
    stack: 'Azure · OpenAI',
    status: 'In Development',
  },
  {
    title: 'Manufacturing ERP',
    description:
      'Production, inventory and operational workflow platform connecting manufacturing activities from planning through fulfilment.',
    tags: ['Manufacturing', 'Enterprise'],
    stack: '.NET · SQL Server',
    status: 'Private Project',
  },
  {
    title: 'Healthcare Workflow Platform',
    description:
      'Clinical workflow automation for healthcare providers, streamlining care coordination and reducing administrative overhead.',
    tags: ['Healthcare', 'Workflow'],
    stack: undefined as string | undefined,
    status: 'Private Project',
  },
]

const CLIENTS = ['Peach and Blue', 'Asendus']

const INDUSTRIES = ['Fashion & Retail', 'Healthcare', 'Manufacturing', 'Financial Services', 'Real Estate', 'Hospitality']

const eyebrow = {
  fontSize: '11px',
  fontWeight: 600,
  letterSpacing: '0.15em',
  textTransform: 'uppercase' as const,
  color: 'rgba(26,26,26,0.50)',
}

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
          textTransform: 'uppercase' as const,
        }}>
          NIVENXA
        </Link>
        <span style={{ ...eyebrow, margin: 0 }}>
          Technologies
        </span>
      </header>

      {/* Section 1 — Hero */}
      <section style={{
        padding: 'clamp(64px, 10vw, 120px) 40px clamp(48px, 8vw, 96px)',
        maxWidth: '820px',
        margin: '0 auto',
        borderBottom: '1px solid rgba(26,26,26,0.10)',
      }}>
        <p style={{ ...eyebrow, margin: '0 0 20px' }}>
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
          Senior engineers. Small teams. Systems built to last.
        </h1>
        <p style={{
          fontSize: '16px',
          lineHeight: 1.80,
          color: 'rgba(26,26,26,0.65)',
          margin: '0 0 32px',
          maxWidth: '620px',
        }}>
          We design and build business software, AI-enabled systems, and digital products for startups and
          growing businesses — without layers of account management or junior-heavy delivery teams.
        </p>
        <a
          href="mailto:info@nivenxa.com"
          style={{
            display: 'inline-block',
            fontSize: '12px',
            fontWeight: 600,
            letterSpacing: '0.10em',
            textTransform: 'uppercase' as const,
            color: 'var(--nivenxa-text-primary, #1A1A1A)',
            background: 'transparent',
            border: '1px solid rgba(26,26,26,0.30)',
            padding: '13px 26px',
            textDecoration: 'none',
          }}
        >
          Start a Conversation
        </a>
      </section>

      {/* Section 2 — What We Build */}
      <section style={{
        padding: 'clamp(48px, 7vw, 80px) 40px',
        maxWidth: '1040px',
        margin: '0 auto',
        borderBottom: '1px solid rgba(26,26,26,0.10)',
      }}>
        <p style={{ ...eyebrow, margin: '0 0 32px' }}>
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
              <p style={{
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.1em',
                color: 'rgba(26,26,26,0.32)',
                margin: '0 0 12px',
              }}>
                {item.num}
              </p>
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
              {item.stack && (
                <p style={{
                  fontSize: '11px',
                  fontWeight: 500,
                  letterSpacing: '0.04em',
                  color: 'rgba(26,26,26,0.42)',
                  margin: '10px 0 0',
                }}>
                  {item.stack}
                </p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Section 3 — Why NIVENXA */}
      <section style={{
        padding: 'clamp(56px, 8vw, 96px) 40px',
        maxWidth: '1040px',
        margin: '0 auto',
        borderBottom: '1px solid rgba(26,26,26,0.10)',
      }}>
        <p style={{ ...eyebrow, margin: '0 0 16px' }}>
          Why NIVENXA
        </p>
        <h2 style={{
          fontFamily: 'var(--font-playfair, Georgia, serif)',
          fontSize: 'clamp(24px, 3.4vw, 36px)',
          fontWeight: 400,
          lineHeight: 1.2,
          letterSpacing: '-0.01em',
          margin: '0 0 36px',
        }}>
          How we work differently.
        </h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '24px',
        }}>
          {HOW_WE_WORK.map((card) => (
            <div key={card.title} style={{
              background: '#FFFFFF',
              border: '1px solid #E5DDD5',
              borderTop: '2px solid var(--nivenxa-cta-forest, #1C2E1E)',
              padding: '32px',
            }}>
              <h3 style={{
                fontSize: '13px',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase' as const,
                margin: '0 0 14px',
                color: 'var(--nivenxa-cta-forest, #1C2E1E)',
              }}>
                {card.title}
              </h3>
              <p style={{
                fontSize: '14px',
                lineHeight: 1.70,
                color: 'rgba(26,26,26,0.70)',
                margin: 0,
              }}>
                {card.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Section 4 — NIVENXA Products */}
      <section style={{
        padding: 'clamp(48px, 7vw, 80px) 40px',
        maxWidth: '1040px',
        margin: '0 auto',
        borderBottom: '1px solid rgba(26,26,26,0.10)',
      }}>
        <p style={{ ...eyebrow, margin: '0 0 10px' }}>
          NIVENXA Products
        </p>
        <p style={{
          fontSize: '14px',
          lineHeight: 1.65,
          color: 'rgba(26,26,26,0.60)',
          margin: '0 0 32px',
          maxWidth: '560px',
        }}>
          Software we design, build, and own end to end — not just client delivery.
        </p>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '20px',
        }}>
          {PRODUCTS.map((product) => (
            <div key={product.title} style={{
              background: '#FFFFFF',
              border: '1px solid #E5DDD5',
              padding: '28px',
              display: 'flex',
              flexDirection: 'column' as const,
            }}>
              <h3 style={{
                fontSize: '16px',
                fontWeight: 600,
                margin: '0 0 8px',
                letterSpacing: '0.01em',
              }}>
                {product.title}
              </h3>
              <div style={{
                display: 'flex',
                flexWrap: 'wrap' as const,
                gap: '4px 10px',
                margin: '0 0 14px',
              }}>
                {product.tags.map((tag, i) => (
                  <span key={tag} style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase' as const,
                    color: 'rgba(26,26,26,0.55)',
                  }}>
                    {tag}{i < product.tags.length - 1 ? ' ·' : ''}
                  </span>
                ))}
              </div>
              <p style={{
                fontSize: '13px',
                lineHeight: 1.65,
                color: 'rgba(26,26,26,0.65)',
                margin: '0 0 20px',
                flex: 1,
              }}>
                {product.description}
              </p>
              <Link href={product.href} style={{
                fontSize: '12px',
                fontWeight: 600,
                letterSpacing: '0.03em',
                color: 'var(--nivenxa-cta-forest, #1C2E1E)',
                textDecoration: 'none',
              }}>
                {product.linkLabel} →
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Section 5 — Selected Client Work */}
      <section style={{
        padding: 'clamp(48px, 7vw, 80px) 40px',
        maxWidth: '1040px',
        margin: '0 auto',
        borderBottom: '1px solid rgba(26,26,26,0.10)',
      }}>
        <p style={{ ...eyebrow, margin: '0 0 32px' }}>
          Selected Client Work
        </p>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))',
          gap: '20px',
        }}>
          {PROJECTS.map((project) => (
            <div key={project.title} style={{
              background: '#FFFFFF',
              border: '1px solid #E5DDD5',
              padding: '28px',
              display: 'flex',
              flexDirection: 'column' as const,
            }}>
              <div style={{
                display: 'flex',
                flexWrap: 'wrap' as const,
                gap: '4px 10px',
                margin: '0 0 12px',
              }}>
                {project.tags.map((tag, i) => (
                  <span key={tag} style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase' as const,
                    color: 'var(--nivenxa-cta-forest, #1C2E1E)',
                  }}>
                    {tag}{i < project.tags.length - 1 ? ' ·' : ''}
                  </span>
                ))}
              </div>
              <h3 style={{
                fontSize: '16px',
                fontWeight: 600,
                margin: '0 0 10px',
                letterSpacing: '0.01em',
              }}>
                {project.title}
              </h3>
              <p style={{
                fontSize: '13px',
                lineHeight: 1.65,
                color: 'rgba(26,26,26,0.65)',
                margin: '0 0 18px',
                flex: 1,
              }}>
                {project.description}
              </p>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                borderTop: '1px solid rgba(26,26,26,0.08)',
                paddingTop: '14px',
              }}>
                <p style={{
                  fontSize: '11px',
                  fontWeight: 500,
                  letterSpacing: '0.04em',
                  color: 'rgba(26,26,26,0.45)',
                  margin: 0,
                }}>
                  {project.stack ?? ''}
                </p>
                <p style={{
                  fontSize: '10px',
                  fontWeight: 600,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase' as const,
                  color: 'rgba(26,26,26,0.40)',
                  margin: 0,
                  whiteSpace: 'nowrap' as const,
                }}>
                  {project.status}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Section 6 — Clients */}
      <section style={{
        padding: 'clamp(40px, 6vw, 64px) 40px',
        maxWidth: '1040px',
        margin: '0 auto',
        borderBottom: '1px solid rgba(26,26,26,0.10)',
      }}>
        <p style={{ ...eyebrow, margin: '0 0 20px' }}>
          Clients We&rsquo;ve Worked With
        </p>
        <div style={{
          display: 'flex',
          flexWrap: 'wrap' as const,
          gap: '12px 32px',
        }}>
          {CLIENTS.map((client) => (
            <span key={client} style={{
              fontFamily: 'var(--font-playfair, Georgia, serif)',
              fontSize: '20px',
              fontWeight: 400,
              color: 'rgba(26,26,26,0.75)',
            }}>
              {client}
            </span>
          ))}
        </div>
      </section>

      {/* Section 7 — Our Process */}
      <section style={{
        padding: 'clamp(48px, 7vw, 80px) 40px',
        maxWidth: '1040px',
        margin: '0 auto',
        borderBottom: '1px solid rgba(26,26,26,0.10)',
      }}>
        <p style={{ ...eyebrow, margin: '0 0 40px' }}>
          Our process
        </p>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        }}>
          {PROCESS_STEPS.map((step, index) => (
            <div key={step.step} style={{
              paddingLeft: index === 0 ? '0' : '32px',
              paddingRight: '32px',
              paddingBottom: '8px',
              borderLeft: index === 0 ? 'none' : '1px solid rgba(26,26,26,0.12)',
            }}>
              <p style={{
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.12em',
                color: 'rgba(26,26,26,0.38)',
                margin: '0 0 12px',
              }}>
                {step.step}
              </p>
              <h3 style={{
                fontSize: '15px',
                fontWeight: 600,
                margin: '0 0 10px',
                letterSpacing: '0.01em',
              }}>
                {step.title}
              </h3>
              <p style={{
                fontSize: '13px',
                lineHeight: 1.65,
                color: 'rgba(26,26,26,0.60)',
                margin: 0,
              }}>
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Section 8 — Technologies */}
      <section style={{
        padding: 'clamp(48px, 7vw, 80px) 40px',
        maxWidth: '820px',
        margin: '0 auto',
        borderBottom: '1px solid rgba(26,26,26,0.10)',
      }}>
        <p style={{ ...eyebrow, margin: '0 0 8px' }}>
          Technology
        </p>
        <p style={{
          fontSize: '13px',
          lineHeight: 1.6,
          color: 'rgba(26,26,26,0.55)',
          margin: '0 0 32px',
          maxWidth: '480px',
        }}>
          We choose technologies appropriate to the system — not the other way round.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '20px' }}>
          {TECHNOLOGY_GROUPS.map((group) => (
            <div key={group.label} style={{
              display: 'flex',
              flexWrap: 'wrap' as const,
              alignItems: 'baseline',
              gap: '4px 10px',
            }}>
              <span style={{
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase' as const,
                color: 'rgba(26,26,26,0.42)',
                minWidth: '150px',
              }}>
                {group.label}
              </span>
              <span style={{
                fontSize: '14px',
                color: 'rgba(26,26,26,0.75)',
                letterSpacing: '0.01em',
              }}>
                {group.items.join(' · ')}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Section 9 — Industries */}
      <section style={{
        padding: 'clamp(40px, 6vw, 64px) 40px',
        maxWidth: '820px',
        margin: '0 auto',
      }}>
        <p style={{ ...eyebrow, margin: '0 0 20px' }}>
          Industries
        </p>
        <p style={{
          fontSize: '14px',
          color: 'rgba(26,26,26,0.72)',
          lineHeight: 1.8,
          margin: 0,
          letterSpacing: '0.01em',
        }}>
          {INDUSTRIES.join(' · ')}
        </p>
      </section>

      {/* Section 10 — Contact / CTA */}
      <section id="contact" style={{
        padding: 'clamp(48px, 7vw, 90px) 40px clamp(60px, 9vw, 105px)',
        maxWidth: '820px',
        margin: '0 auto',
        borderTop: '1px solid rgba(26,26,26,0.10)',
      }}>
        <h2 style={{
          fontFamily: 'var(--font-playfair, Georgia, serif)',
          fontSize: 'clamp(24px, 4vw, 42px)',
          fontWeight: 400,
          lineHeight: 1.20,
          letterSpacing: '-0.01em',
          margin: '0 0 18px',
        }}>
          Let us build something meaningful.
        </h2>
        <p style={{
          fontSize: '16px',
          lineHeight: 1.75,
          color: 'rgba(26,26,26,0.65)',
          margin: '0 0 28px',
          maxWidth: '560px',
        }}>
          Whether you are launching a startup, modernising internal systems, or exploring what AI
          can do for your business — we would like to hear about it.
        </p>
        <a
          href="mailto:info@nivenxa.com"
          style={{
            display: 'inline-block',
            fontSize: '12px',
            fontWeight: 600,
            letterSpacing: '0.10em',
            textTransform: 'uppercase' as const,
            color: 'var(--nivenxa-cta-forest-text, #E8C4A0)',
            background: 'var(--nivenxa-cta-forest, #1C2E1E)',
            padding: '14px 28px',
            textDecoration: 'none',
            marginBottom: '16px',
          }}
        >
          Start a Conversation
        </a>
        <p style={{
          fontSize: '13px',
          color: 'rgba(26,26,26,0.55)',
          margin: '12px 0 0',
          letterSpacing: '0.01em',
        }}>
          <a
            href="mailto:info@nivenxa.com"
            style={{
              color: 'rgba(26,26,26,0.60)',
              textDecoration: 'none',
            }}
          >
            info@nivenxa.com
          </a>
        </p>
      </section>

    </div>
  )
}
