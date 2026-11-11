import type { SkillTier } from './skillTiers'

/**
 * The eight opponent characters. Provisional working names (not cleared, not approved). A character is a COSMETIC choice: it changes
 * who you play with, never how strongly the engine plays (that is the level and strength) and never the feedback you get
 * (that is the assistance mode) or the reply timing (that is the level's pace). No playing style is claimed.
 */
export type BotId = 'lumio' | 'tivvi' | 'piplo' | 'zorvi' | 'veluno' | 'mivro' | 'orvyn' | 'kelvo'

export interface Bot {
  id: BotId
  name: string
  /** Short role line (also the card label). */
  role: string
  description: string
  /** Only Tivvi has approved layered animation artwork; every other character is flat artwork. */
  animated: boolean
}

export const BOTS: readonly Bot[] = [
  // Descriptions say who a character is, never how it plays: every character uses the same engine at the level's strength.
  { id: 'lumio', name: 'Lumio', role: 'Guided opponent', description: 'Play a guided game with Lumio.', animated: false },
  { id: 'tivvi', name: 'TIVVI', role: 'Friendly partner', description: 'A friendly practice partner.', animated: true },
  { id: 'piplo', name: 'Piplo', role: 'Opponent', description: 'Cheerful and curious.', animated: false },
  { id: 'zorvi', name: 'Zorvi', role: 'Opponent', description: 'Bold and lively.', animated: false },
  { id: 'veluno', name: 'Veluno', role: 'Opponent', description: 'Calm and careful.', animated: false },
  { id: 'mivro', name: 'Mivro', role: 'Opponent', description: 'Sharp-eyed and quick.', animated: false },
  { id: 'orvyn', name: 'Orvyn', role: 'Opponent', description: 'Patient and thoughtful.', animated: false },
  { id: 'kelvo', name: 'Kelvo', role: 'Opponent', description: 'Steady and friendly.', animated: false },
]

export const DEFAULT_BOT_ID: BotId = 'tivvi'
export const COACH_BOT_ID: BotId = 'lumio'
export const BOT_STORAGE_KEY = 'nivenxa.chess.play.bot'

export const isBotId = (v: unknown): v is BotId => BOTS.some((b) => b.id === v)
export const botById = (id: unknown): Bot => BOTS.find((b) => b.id === id) ?? BOTS.find((b) => b.id === DEFAULT_BOT_ID)!

/** How many completed coach games a Beginner needs before choosing any opponent. */
export const INTRO_GAMES = 3

/** Only Beginner is restricted, and only until the introduction games are done. */
export const introRestricted = (tier: SkillTier, completed: number): boolean => tier === 'beginner' && completed < INTRO_GAMES

export interface BotAvailability {
  bot: Bot
  available: boolean
  /** Why it is not available (shown as a clear message). */
  reason?: string
}

export function botAvailability(tier: SkillTier, completed: number): BotAvailability[] {
  const restricted = introRestricted(tier, completed)
  return BOTS.map((bot) => ({
    bot,
    available: !restricted || bot.id === COACH_BOT_ID,
    reason: restricted && bot.id !== COACH_BOT_ID ? 'After your coach games' : undefined,
  }))
}

/** The opponent for the next game: the coach while the introduction is running, else the saved choice, else the default. */
export function resolveBot(tier: SkillTier, completed: number, saved: unknown): BotId {
  if (introRestricted(tier, completed)) return COACH_BOT_ID
  return isBotId(saved) ? saved : DEFAULT_BOT_ID
}

export function introLabel(completed: number): string {
  return `Coach introduction · Game ${Math.min(completed + 1, INTRO_GAMES)} of ${INTRO_GAMES}`
}
