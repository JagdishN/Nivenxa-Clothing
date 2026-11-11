// Human player's profile avatars (TEST ONLY, same flag as the opponent avatar).
// The artwork is ONE original knight mark in several colourways, so a choice never implies rank, strength or status.
// The final default (the "N cut" refinement A vs the plain refinement B) is NOT decided: PLAIN is used as a stand-in.
// A saved choice is only an id; unknown ids fall back to the default, so a removed/renamed avatar can never break the page.

export interface PlayerAvatarOption {
  id: string
  label: string
  /** Disc colour behind the knight. */
  bg: string
  /** Thin ring colour (never a rank/status cue). */
  ring: string
}

export const PLAYER_AVATARS: readonly PlayerAvatarOption[] = [
  { id: 'plum', label: 'Plum', bg: '#3A1550', ring: '#D6A85F' },
  { id: 'indigo', label: 'Indigo', bg: '#22306B', ring: '#C9B8F0' },
  { id: 'teal', label: 'Teal', bg: '#12525A', ring: '#E3C98A' },
  { id: 'forest', label: 'Forest', bg: '#1F4A33', ring: '#D9C38B' },
  { id: 'rust', label: 'Rust', bg: '#7A3418', ring: '#F0D5A8' },
]

export const DEFAULT_PLAYER_AVATAR_ID = 'plum'

/** Account metadata key that holds the saved choice. */
export const PLAYER_AVATAR_METADATA_KEY = 'chess_avatar'

export function resolvePlayerAvatar(id: unknown): PlayerAvatarOption {
  return PLAYER_AVATARS.find((a) => a.id === id) ?? PLAYER_AVATARS[0]
}
