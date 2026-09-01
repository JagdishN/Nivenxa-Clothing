import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import type { ExplainMoveRequestBody, ExplainMoveResponseBody } from '@/lib/chess/types'

// Lazily constructed so a missing ANTHROPIC_API_KEY doesn't crash the route
// module at build/import time — only the first real request fails, with a
// clear error instead of a build-time throw.
let client: Anthropic | null = null
function getClient(): Anthropic {
  if (!client) client = new Anthropic()
  return client
}

const JARGON_RULE =
  'Never use engine jargon such as centipawns, eval, +0.42, positional concession, theoretical line, or inaccuracy — describe the move in plain chess language instead.'

function buildPrompt(body: ExplainMoveRequestBody): string {
  const { fen, move, classification, evalBefore, evalAfter, bestMove } = body
  const wantsAlternative = !!bestMove && classification !== 'best'
  const isWeak = classification === 'mistake' || classification === 'blunder' || classification === 'inaccuracy'
  const depth = body.depth ?? 'plain'

  const context = `Position (FEN) before the move: ${fen}
Move played: ${move}
Classification: ${classification}
Evaluation before the move (centipawns, positive favors the mover): ${evalBefore}
Evaluation after the move (same perspective): ${evalAfter}
${wantsAlternative ? `Engine's best move instead: ${bestMove}` : ''}`

  if (depth === 'plain') {
    const toneInstruction =
      body.tone === 'technical'
        ? 'Write for an advanced player: standard chess terminology (tempo, outpost, zwischenzug, etc.) is fine.'
        : 'Write for a beginner: plain language, no jargon, encouraging tone.'
    return `${context}

In 1-3 sentences, explain why this move was ${classification}${wantsAlternative ? `, and what made ${bestMove} the better choice` : ''}. ${toneInstruction} Do not use markdown formatting.`
  }

  if (depth === 'minimal') {
    // Strong moves get a short principled phrase (what the move accomplishes)
    // rather than a bare scoring word — "e4 — Best" reads like every other
    // reasonable opening move lost to it, when in an opening position several
    // moves are often equally sound. Weak moves still get a direct verdict —
    // that's genuinely useful signal, not gamification.
    const headlineInstruction = isWeak
      ? `<the move in SAN followed by \\" — \\" and a 1-3 word verdict that names the problem, e.g. \\"${move} — Inaccurate\\" or \\"${move} — Loses material\\">`
      : `<the move in SAN followed by \\" — \\" and a 2-4 word phrase naming what the move accomplishes, e.g. \\"${move} — Claims the centre\\" or \\"${move} — Strong opening choice\\" — NOT a bare scoring word like \\"Best\\" or \\"Good\\" on its own, even though the move is objectively strong; save blunt verdict words for moves that are actually weak>`
    return `${context}

Write the shortest possible live read on this move for a strong player who just wants a quick pulse-check, not a lesson. ${JARGON_RULE}
Respond with ONLY a single JSON object, no markdown fences, no other text, matching exactly this shape:
{
  "headline": "${headlineInstruction}",
  "body": "<exactly one short sentence (under 18 words) on why — no more>"
}
Always fill both fields, whether the move was strong or weak.`
  }

  const richExtra =
    depth === 'rich'
      ? ' Also fill "remember": one short standalone tip for the opening/middlegame principle this move illustrates (not specific to this exact position) — a beginner should be able to apply it in a future game.'
      : ' Omit "remember" (set it to null) — this is for a more experienced player who doesn\'t need standing tips.'

  return `${context}

Write a short, scannable explanation of this move for a player learning the game, playing live. ${JARGON_RULE}
Respond with ONLY a single JSON object, no markdown fences, no other text, matching exactly this shape:
{
  "headline": "<the move in SAN followed by \\" — \\" and a 2-5 word verdict, e.g. \\"${move} — Good opening move\\" or \\"${move} — Be careful\\">",
  "body": "<one short sentence on what this move accomplishes>",
  "bullets": ${isWeak ? 'null' : '<array of 2-3 short phrases (3-6 words each) on why this move works, or null if the move was weak>'},
  "suggestion": ${isWeak ? `"<one short sentence recommending what to consider instead${wantsAlternative ? `, informed by ${bestMove} without naming it as \\"the engine's move\\"` : ''}>"` : 'null'},
  "remember": "<see instruction below, or null>"
}
${isWeak ? 'The move was weak — fill "suggestion", leave "bullets" null.' : 'The move was solid — fill "bullets", leave "suggestion" null.'}${richExtra}`
}

interface ParsedExplanation {
  explanation: string
  headline?: string
  bullets?: string[]
  suggestion?: string
  remember?: string
}

function parseStructured(raw: string): ParsedExplanation {
  try {
    const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '')
    const parsed = JSON.parse(cleaned)
    return {
      explanation: typeof parsed.body === 'string' ? parsed.body : '',
      headline: typeof parsed.headline === 'string' ? parsed.headline : undefined,
      bullets: Array.isArray(parsed.bullets) ? parsed.bullets.filter((b: unknown) => typeof b === 'string') : undefined,
      suggestion: typeof parsed.suggestion === 'string' ? parsed.suggestion : undefined,
      remember: typeof parsed.remember === 'string' ? parsed.remember : undefined,
    }
  } catch {
    // Model didn't return valid JSON — degrade to plain-paragraph rendering
    // rather than failing the request outright.
    return { explanation: raw.trim() }
  }
}

export async function POST(request: NextRequest) {
  let body: ExplainMoveRequestBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!body.fen || !body.move || !body.classification) {
    return NextResponse.json({ error: 'fen, move, and classification are required' }, { status: 400 })
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'AI explanation service is not configured' }, { status: 503 })
  }

  try {
    const response = await getClient().messages.create({
      model: 'claude-opus-5',
      max_tokens: 400,
      thinking: { type: 'adaptive' },
      output_config: { effort: 'low' },
      messages: [{ role: 'user', content: buildPrompt(body) }],
    })

    const textBlock = response.content.find((block): block is Anthropic.TextBlock => block.type === 'text')
    const raw = textBlock?.text.trim() ?? ''
    const depth = body.depth ?? 'plain'
    const result: ExplainMoveResponseBody = depth === 'plain' ? { explanation: raw } : parseStructured(raw)
    return NextResponse.json(result)
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) {
      return NextResponse.json({ error: 'AI explanation service is not configured' }, { status: 503 })
    }
    if (err instanceof Anthropic.RateLimitError) {
      return NextResponse.json({ error: 'Rate limited — try again shortly' }, { status: 429 })
    }
    if (err instanceof Anthropic.APIError) {
      return NextResponse.json({ error: err.message }, { status: err.status ?? 500 })
    }
    return NextResponse.json({ error: 'Failed to generate explanation' }, { status: 500 })
  }
}
