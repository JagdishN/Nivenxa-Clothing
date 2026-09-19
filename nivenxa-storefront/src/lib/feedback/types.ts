export type FeedbackApp = 'chess' | 'living'

/** 'lesson_check' | 'game_check' | 'task_check' are reserved for the contextual
 * micro-surveys (Learn end-of-lesson, Play post-game, Living task-completion) —
 * not used by the main feedback widget yet, but already accepted by the schema. */
export type FeedbackCategory = 'bug' | 'improvement' | 'usability' | 'feature' | 'other' | 'lesson_check' | 'game_check' | 'task_check'

export type FeedbackRating = 'poor' | 'okay' | 'good' | 'excellent'

export type FeedbackStatus = 'new' | 'reviewed' | 'planned' | 'in_progress' | 'completed' | 'wont_do'

export type FeedbackPriority = 'low' | 'medium' | 'high' | 'critical'

export type FeedbackArea = 'ui' | 'ux' | 'functional' | 'performance' | 'content'

export type DeviceType = 'mobile' | 'tablet' | 'desktop'

export const FEEDBACK_CATEGORY_LABEL: Record<Extract<FeedbackCategory, 'bug' | 'improvement' | 'usability' | 'feature' | 'other'>, string> = {
  bug: "Something isn't working",
  improvement: 'Suggest an improvement',
  usability: 'Screen / usability feedback',
  feature: 'New feature idea',
  other: 'Other',
}

export const FEEDBACK_CATEGORY_EMOJI: Record<Extract<FeedbackCategory, 'bug' | 'improvement' | 'usability' | 'feature' | 'other'>, string> = {
  bug: '🐞',
  improvement: '✨',
  usability: '🎨',
  feature: '💡',
  other: '💬',
}

export const FEEDBACK_RATING_EMOJI: Record<FeedbackRating, string> = {
  poor: '😟',
  okay: '😐',
  good: '🙂',
  excellent: '😍',
}

export const FEEDBACK_STATUS_LABEL: Record<FeedbackStatus, string> = {
  new: 'New',
  reviewed: 'Reviewed',
  planned: 'Planned',
  in_progress: 'In Progress',
  completed: 'Completed',
  wont_do: "Won't Do",
}

/** Row shape of `feedback_items` — mirrors supabase/feedback_schema.sql. */
export interface FeedbackItem {
  id: string
  app: FeedbackApp
  category: FeedbackCategory
  rating: FeedbackRating | null
  comment: string | null
  allow_contact: boolean
  user_id: string | null
  user_email: string | null
  user_role: string | null
  screen_label: string
  route: string
  context: Record<string, unknown> | null
  app_version: string | null
  device_type: DeviceType | null
  user_agent: string | null
  screen_width: number | null
  screen_height: number | null
  screenshot_path: string | null
  status: FeedbackStatus
  priority: FeedbackPriority | null
  area: FeedbackArea | null
  owner: string | null
  internal_notes: string | null
  created_at: string
  updated_at: string
}
