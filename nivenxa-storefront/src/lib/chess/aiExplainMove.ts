import type Anthropic from '@anthropic-ai/sdk'

// Server-only module — imported solely by src/app/api/chess/explain-move/route.ts
// (a Route Handler, never bundled to the client). Nothing here is exported
// to, or reachable from, client code.

export type AiExplanationLevel = 'beginner' | 'next-level'

export const AI_EXPLANATION_MAX_WORDS: Record<AiExplanationLevel, number> = {
  beginner: 80,
  'next-level': 150,
}

// Deliberately narrow and fully server-side — nothing the client sends can
// change or extend these rules. Matches the Privacy Policy's own description
// of this feature (src/data/chessPrivacyPolicy.ts, "AI move explanations").
export const AI_EXPLAIN_SYSTEM_PROMPT = `You are a chess coach explaining one move to a player on Nivenxa Chess.

Rules you must always follow, with no exceptions:
- Explain chess moves only: plans, threats, tactics and common mistakes, at the requested level. Never discuss anything other than the position and move you are given.
- Assume the reader may be a child. Use simple, kind, encouraging language. Never sarcastic, never harsh.
- Never ask the player a question. Never request, reference or speculate about any personal information about them. Never include a URL or link.
- Keep it short: at most ${AI_EXPLANATION_MAX_WORDS.beginner} words for a "beginner" level request, and at most ${AI_EXPLANATION_MAX_WORDS['next-level']} words for a "next-level" request.
- Describe only the move you are told to explain, by the side you are told played it, and only what is true in the positions given. Never comment on the quality or consistency of the input, and never mention a move list.`

/**
 * The ONLY inputs that can ever reach Claude for a move explanation — this
 * type is the enforcement mechanism: there is no field here for email, user
 * id, account type, consent data, or anything else about the account, so
 * nothing else can slip in through it. Build every explain-move request
 * through buildExplainMoveRequest(); never hand-assemble this call elsewhere.
 */
export interface AiExplainMoveInput {
  fen: string
  recentMovesSan: string[]
  move: string
  level: AiExplanationLevel
  /** Verified facts about the move (side, number, canonical history, both positions); replaces the bare FEN/move lines when present. */
  factsText?: string
}

// "Recent" on purpose, not "all" — enough for plan/threat context without
// sending an ever-growing game transcript as moves accumulate.
const MAX_RECENT_MOVES = 5

export function buildExplainMoveRequest(input: AiExplainMoveInput): Anthropic.MessageCreateParamsNonStreaming {
  const recent = input.recentMovesSan.slice(-MAX_RECENT_MOVES)
  const userContent = `${
    input.factsText ??
    `Position (FEN): ${input.fen}
Recent moves (SAN, oldest first): ${recent.length > 0 ? recent.join(' ') : '(none — this is early in the game)'}
Move to explain: ${input.move}`
  }
Explanation level: ${input.level}

Explain this move for a ${input.level} player, following your instructions.`

  return {
    model: 'claude-opus-5',
    max_tokens: 300,
    thinking: { type: 'adaptive' },
    output_config: { effort: 'low' },
    system: AI_EXPLAIN_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userContent }],
  }
}

const URL_PATTERN = /\bhttps?:\/\/\S+|\bwww\.\S+/gi

/** Strips any URL the model might still slip in despite the system prompt, then enforces the per-level word cap server-side — never trust the model to have actually followed the length instruction. */
export function sanitizeExplanation(raw: string, level: AiExplanationLevel): string {
  const noUrls = raw.replace(URL_PATTERN, '').replace(/\s{2,}/g, ' ').trim()
  const words = noUrls.split(/\s+/).filter(Boolean)
  const cap = AI_EXPLANATION_MAX_WORDS[level]
  if (words.length <= cap) return noUrls
  return `${words.slice(0, cap).join(' ')}…`
}

/** Same URL strip, no word cap — for the existing eval-aware plain/minimal/rich/brief-adjacent depths this module doesn't otherwise touch. */
export function stripUrls(raw: string): string {
  return raw.replace(URL_PATTERN, '').trim()
}
