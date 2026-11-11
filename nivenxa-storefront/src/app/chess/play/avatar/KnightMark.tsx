import styles from './PlayerAvatar.module.scss'

/** The knight mark (original vector, no face/initials/crown/rank cue) in one colourway. Inline SVG: it cannot show a broken image. */
export function KnightMark({ bg, ring, title }: { bg: string; ring: string; title?: string }) {
  return (
    <svg viewBox="0 0 1024 1024" className={styles.mark} role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true} focusable="false">
      <circle cx="512" cy="512" r="512" fill={bg} />
      <circle cx="512" cy="512" r="498" fill="none" stroke={ring} strokeWidth="8" />
      <g transform="translate(512 498) scale(.96) translate(-512 -512)">
        <path d="M650 742 L676 612 L640 566 L668 470 L624 420 L634 336 L566 276 L556 214 L498 262 L432 282 L330 468 L322 520 L356 562 L424 548 L472 520 L440 604 L396 692 L352 742 Z" fill="#F7F0E1" />
        <path d="M650 742 L676 612 L640 566 L668 470 L624 420 L634 336 L566 276 L580 360 L560 430 L584 500 L560 560 L586 640 L560 742 Z" fill="#E6DAC2" />
        <path d="M470 360 L500 392 L470 424 L440 392 Z" fill={bg} />
        <rect x="318" y="742" width="388" height="62" rx="16" fill="#F7F0E1" />
      </g>
    </svg>
  )
}
