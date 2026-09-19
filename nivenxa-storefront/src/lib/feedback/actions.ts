'use server'
import { getSupabaseAdmin } from '@/lib/chess/supabase'
import type { DeviceType, FeedbackApp, FeedbackCategory, FeedbackRating } from './types'

export interface SubmitFeedbackInput {
  app: FeedbackApp
  category: FeedbackCategory
  rating: FeedbackRating | null
  comment: string
  allowContact: boolean
  userId?: string | null
  userEmail?: string | null
  userRole?: string | null
  screenLabel: string
  route: string
  context?: Record<string, unknown>
  appVersion?: string | null
  deviceType: DeviceType
  userAgent: string
  screenWidth: number
  screenHeight: number
  screenshotPath?: string | null
}

/**
 * Writes one feedback_items row via the secret-key admin client — deliberately
 * no auth check: the widget must work for a logged-out/anonymous visitor in
 * both apps. Each caller resolves its own identity (or none) before calling
 * this; nothing here trusts the client for anything beyond what it reports
 * about itself (screen size, user agent) — none of that is security-sensitive.
 */
export async function submitFeedback(input: SubmitFeedbackInput): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = getSupabaseAdmin()
  const { error } = await supabase.from('feedback_items').insert({
    app: input.app,
    category: input.category,
    rating: input.rating,
    comment: input.comment.trim() || null,
    allow_contact: input.allowContact,
    user_id: input.userId ?? null,
    user_email: input.userEmail ?? null,
    user_role: input.userRole ?? null,
    screen_label: input.screenLabel,
    route: input.route,
    context: input.context ?? null,
    app_version: input.appVersion ?? null,
    device_type: input.deviceType,
    user_agent: input.userAgent,
    screen_width: input.screenWidth,
    screen_height: input.screenHeight,
    screenshot_path: input.screenshotPath ?? null,
  })
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}
