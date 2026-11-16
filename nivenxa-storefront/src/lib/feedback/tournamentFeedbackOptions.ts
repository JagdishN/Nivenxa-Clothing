// Shared by the tournament feedback form (client) and its server action. Kept out of the 'use server'
// file, which may only export async functions.

export const TOURNAMENT_FEEDBACK_ROLES = [
  { value: 'player', label: 'Player' },
  { value: 'parent', label: 'Parent / guardian' },
  { value: 'spectator', label: 'Spectator' },
  { value: 'other', label: 'Other' },
] as const

export const TOURNAMENT_FEEDBACK_TOPICS = [
  { value: 'organisation', label: 'Organisation', hint: 'Check-in & event management' },
  { value: 'scheduling', label: 'Timing & rounds', hint: 'Start times & breaks' },
  { value: 'venue', label: 'Venue & facilities', hint: 'Seating, comfort & amenities' },
  { value: 'communication', label: 'Communication', hint: 'Updates & announcements' },
  { value: 'results', label: 'Prizes & scoring', hint: 'Awards & published scores' },
  { value: 'other', label: 'Something else', hint: 'Anything we missed' },
] as const

export const TOURNAMENT_FEEDBACK_EXPERIENCE = [
  { value: 1, label: 'Very poor' },
  { value: 2, label: 'Poor' },
  { value: 3, label: 'Okay' },
  { value: 4, label: 'Good' },
  { value: 5, label: 'Excellent' },
] as const

export const TOURNAMENT_FEEDBACK_MAX_TEXT = 2000
