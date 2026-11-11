'use client'
import { botAvailability, introLabel, INTRO_GAMES } from '@/lib/chess/botRoster'
import type { BotId } from '@/lib/chess/botRoster'
import type { SkillTier } from '@/lib/chess/skillTiers'
import BotArt from './BotArt'
import styles from './BotPicker.module.scss'

interface Props {
  tier: SkillTier
  completedIntro: number
  selected: BotId
  onSelect: (id: BotId) => void
  /** True while progress is only kept in this browser (guest, or the account could not be reached). */
  browserOnly: boolean
  signedIn: boolean
  /** A short note, e.g. that the previous coach game was abandoned and did not count. */
  notice?: string
}

/**
 * Opponent choice for the NEXT game. Character artwork, name and a short line; the selected one is marked. During the Beginner coach
 * introduction only the coach can be chosen: the others are shown as previews with the reason. A character is cosmetic: strength
 * comes from the level, feedback from the assistance mode, and reply timing from the level.
 */
export default function BotPicker({ tier, completedIntro, selected, onSelect, browserOnly, signedIn, notice }: Props) {
  const items = botAvailability(tier, completedIntro)
  const restricted = items.some((i) => !i.available)
  return (
    <div data-testid="bot-picker">
      {restricted && (
        <div className={styles.intro} data-testid="coach-intro-banner">
          <strong>{introLabel(completedIntro)}</strong>
          <span>Beginner starts with {INTRO_GAMES} coach games with Lumio. After that, every opponent is available.</span>
          <span className={styles.note} data-testid="coach-intro-rules">A game counts when it ends, or when you resign after 10 of your own moves.</span>
          {notice && (
            <span className={styles.note} role="status" data-testid="coach-intro-notice">
              {notice}
            </span>
          )}
          {browserOnly && (
            <span className={styles.note} data-testid="coach-intro-device-note">
              {signedIn
                ? 'Progress could not be saved to your account just now. It is kept in this browser and added later.'
                : 'Progress is saved in this browser only. Sign in to keep it on your account.'}
            </span>
          )}
        </div>
      )}
      <div
        className={styles.grid}
        role="radiogroup"
        aria-label="Opponent"
        onKeyDown={(e) => {
          // Standard radio-group keys: arrows move to the next/previous AVAILABLE character and choose it.
          const dir = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
          if (!dir) return
          e.preventDefault()
          const group = e.currentTarget
          const open = items.filter((i) => i.available)
          const at = open.findIndex((i) => i.bot.id === selected)
          const next = open[(at + dir + open.length) % open.length]
          if (!next) return
          onSelect(next.bot.id)
          requestAnimationFrame(() => (group.querySelector(`[data-testid="bot-${next.bot.id}"]`) as HTMLElement | null)?.focus())
        }}
      >
        {items.map(({ bot, available, reason }) => {
          const on = bot.id === selected
          return (
            <button
              key={bot.id}
              type="button"
              role="radio"
              aria-checked={on}
              aria-disabled={!available}
              tabIndex={on && available ? 0 : -1}
              aria-label={`${bot.name}. ${bot.role === 'Opponent' ? '' : `${bot.role}. `}${available ? bot.description : `Not available yet: ${reason}`}${on ? ' Selected.' : ''}`}
              className={`${styles.card} ${on ? styles.on : ''} ${!available ? styles.preview : ''}`}
              data-testid={`bot-${bot.id}`}
              data-available={available}
              onClick={() => available && onSelect(bot.id)}
            >
              <BotArt id={bot.id} name={bot.name} size={40} className={styles.art} />
              <span className={styles.name}>
                {bot.name}
                {on && (
                  <span className={styles.badge} data-testid="bot-selected-badge">
                    Selected
                  </span>
                )}
              </span>
              {bot.role !== 'Opponent' && <span className={styles.role}>{bot.role}</span>}
              <span className={styles.desc}>{available ? bot.description : reason}</span>
            </button>
          )
        })}
      </div>
      <p className={styles.hint}>Every opponent plays at the strength of your level.</p>
    </div>
  )
}
