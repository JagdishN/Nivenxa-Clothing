import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'NIVENXA Technologies — Digital products built with precision',
  description: 'We design and build digital products for startups and growing businesses. AI solutions, enterprise platforms, mobile apps, and business automation.',
}

const WHAT_WE_BUILD = [
  {
    title: 'AI Solutions & Agents',
    description: 'AI-powered workflows, intelligent agents, and OpenAI integrations that create measurable value.',
  },
  {
    title: 'Enterprise Platforms',
    description: 'Scalable web platforms built for real business complexity — not demos.',
  },
  {
    title: 'Mobile Applications',
    description: 'iOS and Android apps built in React Native — one codebase, both platforms.',
  },
  {
    title: 'Business Automation',
    description: 'Internal tools, workflow automation, and dashboards that save hours every week.',
  },
  {
    title: 'API & System Integration',
    description: 'Connect your systems. Payment gateways, third-party APIs, and custom integrations.',
  },
  {
    title: 'Cloud & DevOps',
    description: 'Azure-hosted infrastructure, CI/CD pipelines, and production-ready deployments.',
  },
]

const TECHNOLOGIES = [
  '.NET', 'Azure', 'React', 'Next.js', 'React Native',
  'Python', 'PostgreSQL', 'OpenAI', 'Azure AI Search',
  'Node.js', 'TypeScript', 'Docker', 'GitHub Actions',
]

const HOW_WE_WORK = [
  {
    title: 'Small Teams',
    description: 'Every project is led by experienced engineers. Not outsourced. Not handed to juniors.',
  },
  {
    title: 'Quality First',
    description: 'We favour long-term maintainability over quick fixes. Code we are proud to put our name on.',
  },
  {
    title: 'AI Native',
    description: 'We integrate AI where it creates measurable value — not because it is a trend.',
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
    title: 'Support',
    description: 'Deployment, monitoring, and ongoing product evolution.',
  },
]

const PROJECTS = [
  {
    title: 'Home Services Platform',
    description: 'On-demand laundry and ironing app for apartment communities.',
    tags: ['Mobile + Web', 'React Native'],
    status: 'In Development',
    footer: 'Powered by NIVENXA Technologies',
  },
  {
    title: 'AI Compliance Platform',
    description: 'Enterprise SaaS with AI-powered compliance workflows.',
    tags: ['Enterprise SaaS', 'AI'],
    status: 'In Development',
    footer: 'Confidential',
  },
  {
    title: 'Manufacturing ERP',
    description: 'End-to-end production tracking and inventory management platform.',
    tags: ['Enterprise', 'Web Platform'],
    status: 'Private Project',
    footer: 'Confidential',
  },
  {
    title: 'Healthcare Workflow Platform',
    description: 'Clinical workflow automation for healthcare providers.',
    tags: ['Healthcare', 'Automation'],
    status: 'Private Project',
    footer: 'Confidential',
  },
]

const INDUSTRIES = [
  'Fashion & Retail',
  'Healthcare',
  'Manufacturing',
  'Financial Services',
  'Real Estate',
  'Hospitality',
  'On-demand Services',
  'Enterprise',
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
          textTransform: 'uppercase' as const,
        }}>
          NIVENXA
        </Link>
        <span style={{
          fontSize: '11px',
          fontWeight: 500,
          letterSpacing: '0.12em',
          textTransform: 'uppercase' as const,
          color: 'rgba(26,26,26,0.50)',
        }}>
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
        <p style={{
          fontSize: '11px',
          fontWeight: 600,
          letterSpacing: '0.15em',
          textTransform: 'uppercase' as const,
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
          We design and build digital products for startups and growing businesses.
        </h1>
        <p style={{
          fontSize: '16px',
          lineHeight: 1.80,
          color: 'rgba(26,26,26,0.65)',
          margin: 0,
          maxWidth: '620px',
        }}>
          We partner with founders and organisations to design, build, and scale modern web platforms,
          mobile applications, AI solutions, and business automation systems. We do not just write
          software — we build digital products that businesses rely on every day.
        </p>
      </section>

      {/* Section 2 — What We Build */}
      <section style={{
        padding: 'clamp(48px, 7vw, 80px) 40px',
        maxWidth: '1040px',
        margin: '0 auto',
        borderBottom: '1px solid rgba(26,26,26,0.10)',
      }}>
        <p style={{
          fontSize: '11px',
          fontWeight: 600,
          letterSpacing: '0.15em',
          textTransform: 'uppercase' as const,
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

      {/* Section 3 — Technologies */}
      <section style={{
        padding: 'clamp(48px, 7vw, 80px) 40px',
        maxWidth: '820px',
        margin: '0 auto',
        borderBottom: '1px solid rgba(26,26,26,0.10)',
      }}>
        <p style={{
          fontSize: '11px',
          fontWeight: 600,
          letterSpacing: '0.15em',
          textTransform: 'uppercase' as const,
          color: 'rgba(26,26,26,0.45)',
          margin: '0 0 24px',
        }}>
          Technologies
        </p>
        <div style={{
          display: 'flex',
          flexWrap: 'wrap' as const,
          gap: '8px',
        }}>
          {TECHNOLOGIES.map((tech) => (
            <span key={tech} style={{
              fontSize: '12px',
              fontWeight: 500,
              letterSpacing: '0.03em',
              color: 'var(--nivenxa-text-primary, #1A1A1A)',
              background: 'rgba(26,26,26,0.07)',
              border: '1px solid rgba(26,26,26,0.12)',
              padding: '6px 14px',
              borderRadius: '2px',
            }}>
              {tech}
            </span>
          ))}
        </div>
      </section>

      {/* Section 4 — How We Work */}
      <section style={{
        padding: 'clamp(48px, 7vw, 80px) 40px',
        maxWidth: '1040px',
        margin: '0 auto',
        borderBottom: '1px solid rgba(26,26,26,0.10)',
      }}>
        <p style={{
          fontSize: '11px',
          fontWeight: 600,
          letterSpacing: '0.15em',
          textTransform: 'uppercase' as const,
          color: 'rgba(26,26,26,0.45)',
          margin: '0 0 32px',
        }}>
          How we work
        </p>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '24px',
        }}>
          {HOW_WE_WORK.map((card) => (
            <div key={card.title} style={{
              background: '#FFFFFF',
              border: '1px solid #E5DDD5',
              padding: '32px',
            }}>
              <h3 style={{
                fontSize: '12px',
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

      {/* Section 5 — Our Process */}
      <section style={{
        padding: 'clamp(48px, 7vw, 80px) 40px',
        maxWidth: '1040px',
        margin: '0 auto',
        borderBottom: '1px solid rgba(26,26,26,0.10)',
      }}>
        <p style={{
          fontSize: '11px',
          fontWeight: 600,
          letterSpacing: '0.15em',
          textTransform: 'uppercase' as const,
          color: 'rgba(26,26,26,0.45)',
          margin: '0 0 40px',
        }}>
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
                color: 'rgba(26,26,26,0.28)',
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

      {/* Section 6 — Projects */}
      <section style={{
        padding: 'clamp(48px, 7vw, 80px) 40px',
        maxWidth: '1040px',
        margin: '0 auto',
        borderBottom: '1px solid rgba(26,26,26,0.10)',
      }}>
        <p style={{
          fontSize: '11px',
          fontWeight: 600,
          letterSpacing: '0.15em',
          textTransform: 'uppercase' as const,
          color: 'rgba(26,26,26,0.45)',
          margin: '0 0 32px',
        }}>
          Projects
        </p>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '16px',
        }}>
          {PROJECTS.map((project) => (
            <div key={project.title} style={{
              background: '#FFFFFF',
              border: '1px solid #E5DDD5',
              padding: '28px',
              display: 'flex',
              flexDirection: 'column' as const,
              position: 'relative' as const,
            }}>
              <div style={{
                position: 'absolute' as const,
                top: '20px',
                right: '20px',
                fontSize: '9px',
                fontWeight: 700,
                letterSpacing: '0.12em',
                textTransform: 'uppercase' as const,
                color: project.status === 'In Development'
                  ? 'var(--nivenxa-cta-forest, #1C2E1E)'
                  : 'rgba(26,26,26,0.45)',
                background: project.status === 'In Development'
                  ? 'rgba(28,46,30,0.08)'
                  : 'rgba(26,26,26,0.05)',
                padding: '4px 8px',
              }}>
                {project.status}
              </div>
              <h3 style={{
                fontSize: '15px',
                fontWeight: 600,
                margin: '0 0 10px',
                paddingRight: '90px',
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
                flexWrap: 'wrap' as const,
                gap: '6px',
                marginBottom: '20px',
              }}>
                {project.tags.map((tag) => (
                  <span key={tag} style={{
                    fontSize: '10px',
                    fontWeight: 600,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase' as const,
                    color: 'rgba(26,26,26,0.50)',
                    background: 'rgba(26,26,26,0.05)',
                    padding: '3px 8px',
                    borderRadius: '1px',
                  }}>
                    {tag}
                  </span>
                ))}
              </div>
              <p style={{
                fontSize: '10px',
                fontWeight: 500,
                letterSpacing: '0.08em',
                color: 'rgba(26,26,26,0.35)',
                margin: 0,
                borderTop: '1px solid rgba(26,26,26,0.08)',
                paddingTop: '14px',
              }}>
                {project.footer}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Section 7 — Industries */}
      <section style={{
        padding: 'clamp(48px, 7vw, 80px) 40px',
        maxWidth: '820px',
        margin: '0 auto',
        borderBottom: '1px solid rgba(26,26,26,0.10)',
      }}>
        <p style={{
          fontSize: '11px',
          fontWeight: 600,
          letterSpacing: '0.15em',
          textTransform: 'uppercase' as const,
          color: 'rgba(26,26,26,0.45)',
          margin: '0 0 24px',
        }}>
          Industries we have worked in
        </p>
        <div style={{
          display: 'flex',
          flexWrap: 'wrap' as const,
          gap: '8px',
        }}>
          {INDUSTRIES.map((industry) => (
            <span key={industry} style={{
              fontSize: '12px',
              fontWeight: 500,
              letterSpacing: '0.03em',
              color: 'rgba(26,26,26,0.70)',
              background: 'transparent',
              border: '1px solid rgba(26,26,26,0.18)',
              padding: '6px 14px',
              borderRadius: '2px',
            }}>
              {industry}
            </span>
          ))}
        </div>
      </section>

      {/* Section 8 — Contact / CTA */}
      <section style={{
        padding: 'clamp(64px, 10vw, 120px) 40px clamp(80px, 12vw, 140px)',
        maxWidth: '820px',
        margin: '0 auto',
      }}>
        <h2 style={{
          fontFamily: 'var(--font-playfair, Georgia, serif)',
          fontSize: 'clamp(24px, 4vw, 42px)',
          fontWeight: 400,
          lineHeight: 1.20,
          letterSpacing: '-0.01em',
          margin: '0 0 20px',
        }}>
          Let us build something meaningful.
        </h2>
        <p style={{
          fontSize: '16px',
          lineHeight: 1.75,
          color: 'rgba(26,26,26,0.65)',
          margin: '0 0 36px',
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
            marginBottom: '20px',
          }}
        >
          Start a Conversation
        </a>
        <p style={{
          fontSize: '13px',
          color: 'rgba(26,26,26,0.50)',
          margin: '16px 0 0',
          letterSpacing: '0.01em',
        }}>
          <a
            href="mailto:info@nivenxa.com"
            style={{
              color: 'rgba(26,26,26,0.55)',
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
