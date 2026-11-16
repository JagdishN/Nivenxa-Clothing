'use server'
import { getSupabaseAdmin } from '@/lib/chess/supabase'
import { getTournamentById } from '@/lib/chess/tournaments'
import { formatLongDate } from '@/lib/chess/tournamentFormat'
import {
  TOURNAMENT_FEEDBACK_EXPERIENCE,
  TOURNAMENT_FEEDBACK_MAX_TEXT,
  TOURNAMENT_FEEDBACK_ROLES,
  TOURNAMENT_FEEDBACK_TOPICS,
} from './tournamentFeedbackOptions'

export interface TournamentFeedbackInput {
  tournamentId: string
  role: string
  experience: number | null
  /** Any number of topics, including none. */
  topics: string[]
  message: string
  email: string
  /** Honeypot: a real visitor never sees or fills this. */
  website?: string
  userAgent: string
  screenWidth: number
  screenHeight: number
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Stores one tournament feedback response in the existing `feedback_items` table (no schema change):
 * category 'other', the response details in `context`, so it shows up in /admin/feedback beside the rest.
 * The tournament's name and date are looked up here from its id, never taken from the browser.
 */
export async function submitTournamentFeedback(input: TournamentFeedbackInput): Promise<{ ok: true } | { ok: false; error: string }> {
  if (input.website) return { ok: true } // bot: pretend it worked, store nothing

  const tournament = await getTournamentById(input.tournamentId)
  if (!tournament) return { ok: false, error: 'That tournament could not be found.' }

  const role = TOURNAMENT_FEEDBACK_ROLES.find((r) => r.value === input.role)
  if (!role) return { ok: false, error: 'Please choose your role.' }
  const topics = [...new Set(input.topics)].map((value) => TOURNAMENT_FEEDBACK_TOPICS.find((t) => t.value === value))
  if (topics.some((t) => !t)) return { ok: false, error: 'One of the topics is not valid.' }
  const topicLabels = topics.map((t) => t!.label)
  // Overall experience is required: exactly one of the five levels.
  if (input.experience === null || input.experience === undefined) return { ok: false, error: 'Please choose how your overall experience was.' }
  const experience = TOURNAMENT_FEEDBACK_EXPERIENCE.find((e) => e.value === input.experience)
  if (!experience) return { ok: false, error: 'That rating is not valid.' }

  const message = input.message.trim()
  if (!message) return { ok: false, error: 'Please write your feedback or suggestion.' }
  if (message.length > TOURNAMENT_FEEDBACK_MAX_TEXT) return { ok: false, error: `Please keep it under ${TOURNAMENT_FEEDBACK_MAX_TEXT} characters.` }

  const email = input.email.trim()
  if (email && (email.length > 254 || !EMAIL.test(email))) return { ok: false, error: 'That email address does not look right.' }

  const width = Number.isFinite(input.screenWidth) ? Math.round(input.screenWidth) : null
  const { error } = await getSupabaseAdmin()
    .from('feedback_items')
    .insert({
      app: 'chess',
      category: 'other',
      rating: null,
      comment: message,
      allow_contact: email !== '',
      user_email: email || null,
      user_role: role.label,
      screen_label: `Tournament feedback — ${tournament.title}`,
      route: `/chess/tournaments/${tournament.id}/feedback`,
      context: {
        kind: 'tournament_feedback',
        tournamentId: tournament.id,
        tournamentName: tournament.title,
        tournamentDate: formatLongDate(tournament.dates.startsAt, tournament.dates.endsAt),
        topic: topicLabels.length ? topicLabels.join(', ') : null,
        topics: topicLabels,
        experience: `${experience.value}/5 — ${experience.label}`,
      },
      app_version: process.env.NEXT_PUBLIC_APP_VERSION ?? null,
      device_type: width === null ? null : width < 640 ? 'mobile' : width < 1024 ? 'tablet' : 'desktop',
      user_agent: input.userAgent.slice(0, 500),
      screen_width: width,
      screen_height: Number.isFinite(input.screenHeight) ? Math.round(input.screenHeight) : null,
    })
  if (error) return { ok: false, error: 'Sorry, your feedback could not be saved. Please try again in a moment.' }
  return { ok: true }
}
