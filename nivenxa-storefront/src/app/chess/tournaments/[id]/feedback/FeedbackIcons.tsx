import Image from 'next/image'

// Artwork for the tournament feedback form. The role figures and the five rating knights are the NIVENXA illustrations in
// public/images/Chess (512x512 PNGs with transparent backgrounds). Their files have the label printed under the artwork;
// the form shows its own (selectable, readable-by-screen-reader) text labels, so the art is cropped above the printed label.
// The topic icons below are small line icons in the same lavender family.

const ROLE_ART: Record<string, string> = {
  player: '/images/Chess/role-player.png',
  parent: '/images/Chess/role-parent-guardian.png',
  spectator: '/images/Chess/role-spectator.png',
  other: '/images/Chess/role-other.png',
}

const KNIGHT_ART: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: '/images/Chess/experience-01-very-poor.png',
  2: '/images/Chess/experience-02-poor.png',
  3: '/images/Chess/experience-03-okay.png',
  4: '/images/Chess/experience-04-good.png',
  5: '/images/Chess/experience-05-excellent.png',
}

// The visible window into each 512x512 PNG: the artwork only, without the transparent margins or the printed label.
interface Crop {
  x: number
  y: number
  w: number
  h: number
}
const KNIGHT_CROP: Crop = { x: 125, y: 22, w: 262, h: 350 }
const ROLE_CROP: Crop = { x: 100, y: 26, w: 312, h: 352 }

/** Decorative: the visible label next to it names the choice. Next optimises and resizes the PNG for the size it is shown at. */
function Art({ src, sizes, crop }: { src: string; sizes: string; crop: Crop }) {
  return (
    <span style={{ display: 'block', width: '100%', aspectRatio: `${crop.w} / ${crop.h}`, overflow: 'hidden' }}>
      <Image
        src={src}
        alt=""
        width={512}
        height={512}
        sizes={sizes}
        quality={82}
        draggable={false}
        style={{ display: 'block', maxWidth: 'none', height: 'auto', width: `${(512 / crop.w) * 100}%`, marginLeft: `-${(crop.x / crop.w) * 100}%`, marginTop: `-${(crop.y / crop.w) * 100}%` }}
      />
    </span>
  )
}

export function RoleIcon({ role }: { role: string }) {
  return <Art src={ROLE_ART[role] ?? ROLE_ART.other} sizes="120px" crop={ROLE_CROP} />
}

/** The NIVENXA knight for a rating: 1 disappointed, 2 concerned, 3 neutral, 4 happy, 5 delighted. */
export function KnightFace({ level }: { level: 1 | 2 | 3 | 4 | 5 }) {
  return <Art src={KNIGHT_ART[level]} sizes="(max-width: 520px) 140px, 200px" crop={KNIGHT_CROP} />
}

const base = { viewBox: '0 0 64 64', fill: 'none', 'aria-hidden': true, focusable: false } as const

// ───── Topic illustrations ────────────────────────────────────────────────
// Small, simple and in the same material as the knights (ivory surface, lavender shade, fine dark-purple edge, one gold
// accent each). They use the shared gradients from <IllustrationDefs />, rendered once by the form.

const INK = '#4B3A7A'
const GOLD = '#D6A85F'
const edge = { stroke: INK, strokeWidth: 1.5, strokeLinejoin: 'round', strokeLinecap: 'round' } as const

/** Shared gradients (light from the top-left), rendered ONCE per page. */
export function IllustrationDefs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="nvx-ivory" x1="0.1" y1="0" x2="0.9" y2="1">
          <stop offset="0" stopColor="#FFFEFA" />
          <stop offset="0.55" stopColor="#F4EEE0" />
          <stop offset="1" stopColor="#D9D0EE" />
        </linearGradient>
        <linearGradient id="nvx-lavender" x1="0.1" y1="0" x2="0.9" y2="1">
          <stop offset="0" stopColor="#E6DFF6" />
          <stop offset="1" stopColor="#B9ABDF" />
        </linearGradient>
      </defs>
    </svg>
  )
}

const ivory = 'url(#nvx-ivory)'
const lav = 'url(#nvx-lavender)'

export function TopicIcon({ topic }: { topic: string }) {
  switch (topic) {
    case 'organisation': {
      // A small chessboard with two pieces set out neatly.
      const squares = []
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) if ((i + j) % 2 === 1) squares.push(<rect key={`${i}${j}`} x={10 + i * 11} y={14 + j * 9.5} width="11" height="9.5" fill={lav} />)
      return (
        <svg {...base}>
          <rect x="10" y="14" width="44" height="38" rx="3" fill={ivory} />
          {squares}
          <rect x="10" y="14" width="44" height="38" rx="3" {...edge} />
          <circle cx="21.5" cy="30" r="3.2" fill={GOLD} {...edge} strokeWidth={1.2} />
          <path d="M17.5 42c.4-4 1.8-7 4-7s3.6 3 4 7z" fill={GOLD} {...edge} strokeWidth={1.2} />
          <circle cx="42.5" cy="21" r="3" fill={ivory} {...edge} strokeWidth={1.2} />
          <path d="M39 31c.4-3.5 1.6-6.5 3.5-6.5s3.1 3 3.5 6.5z" fill={ivory} {...edge} strokeWidth={1.2} />
        </svg>
      )
    }
    case 'scheduling':
      // A two-sided chess clock.
      return (
        <svg {...base}>
          <rect x="8" y="24" width="48" height="30" rx="7" fill={ivory} {...edge} />
          <rect x="15" y="14" width="9" height="11" rx="2.5" fill={GOLD} {...edge} strokeWidth={1.2} />
          <rect x="40" y="14" width="9" height="11" rx="2.5" fill={GOLD} {...edge} strokeWidth={1.2} />
          <circle cx="21" cy="39" r="9" fill={lav} {...edge} />
          <circle cx="43" cy="39" r="9" fill={lav} {...edge} />
          <circle cx="21" cy="39" r="6.5" fill={ivory} />
          <circle cx="43" cy="39" r="6.5" fill={ivory} />
          <path d="M21 39v-4.5M21 39l3 1.5M43 39v-4.5M43 39l3 1.5" stroke={INK} strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      )
    case 'venue':
      // A hall with columns and a flag.
      return (
        <svg {...base}>
          <path d="M32 11V4" {...edge} />
          <path d="M32 4h9l-3 3 3 3h-9z" fill={GOLD} {...edge} strokeWidth={1.1} />
          <path d="M6 27L32 11l26 16z" fill={lav} {...edge} />
          <rect x="8" y="27" width="48" height="5" rx="1" fill={ivory} {...edge} />
          {[12, 24, 36, 48].map((x) => (
            <rect key={x} x={x} y="32" width="5" height="20" fill={ivory} {...edge} strokeWidth={1.2} />
          ))}
          <rect x="5" y="52" width="54" height="6" rx="2" fill={lav} {...edge} />
        </svg>
      )
    case 'communication':
      // Two overlapping speech bubbles.
      return (
        <svg {...base}>
          <path d="M10 10h26a4 4 0 0 1 4 4v16a4 4 0 0 1-4 4H22l-8 7v-7h-4a4 4 0 0 1-4-4V14a4 4 0 0 1 4-4z" fill={ivory} {...edge} />
          <path d="M28 27h24a4 4 0 0 1 4 4v14a4 4 0 0 1-4 4h-3v7l-8-7H28a4 4 0 0 1-4-4V31a4 4 0 0 1 4-4z" fill={lav} {...edge} />
          <circle cx="34" cy="38" r="1.9" fill={GOLD} />
          <circle cx="40" cy="38" r="1.9" fill={GOLD} />
          <circle cx="46" cy="38" r="1.9" fill={GOLD} />
          <path d="M14 19h18M14 25h10" stroke={INK} strokeWidth="1.3" strokeLinecap="round" opacity="0.6" />
        </svg>
      )
    case 'results':
      // A trophy in front of a scorecard.
      return (
        <svg {...base}>
          <rect x="6" y="12" width="26" height="42" rx="3" fill={ivory} {...edge} />
          <path d="M11 22h16M11 29h16M11 36h10" stroke={INK} strokeWidth="1.3" strokeLinecap="round" opacity="0.55" />
          <path d="M30 14h24v14a12 12 0 0 1-24 0z" fill={GOLD} {...edge} />
          <path d="M30 18h-6c0 6 2 9 6 10M54 18h6c0 6-2 9-6 10" {...edge} fill="none" />
          <path d="M42 40v8M35 54h14M37.5 48h9" {...edge} fill="none" />
          <path d="M34 17v9" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
        </svg>
      )
    default:
      // A note with a pencil.
      return (
        <svg {...base}>
          <rect x="10" y="8" width="36" height="46" rx="4" fill={ivory} {...edge} />
          <path d="M17 20h22M17 28h22M17 36h12" stroke={INK} strokeWidth="1.3" strokeLinecap="round" opacity="0.55" />
          <g transform="rotate(38 46 40)">
            <rect x="42.5" y="20" width="7" height="26" rx="1.5" fill={GOLD} {...edge} strokeWidth={1.3} />
            <path d="M42.5 46h7l-3.5 8z" fill={ivory} {...edge} strokeWidth={1.3} />
          </g>
        </svg>
      )
  }
}
