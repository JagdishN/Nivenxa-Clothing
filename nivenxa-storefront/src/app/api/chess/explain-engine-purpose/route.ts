import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import type { ExplainEnginePurposeRequestBody, ExplainEnginePurposeResponseBody } from '@/lib/chess/types'

// Lazily constructed so a missing ANTHROPIC_API_KEY doesn't crash the route
// module at build/import time — only the first real request fails, with a
// clear error instead of a build-time throw.
let client: Anthropic | null = null
function getClient(): Anthropic {
  if (!client) client = new Anthropic()
  return client
}

const JARGON_RULE =
  'Never use engine jargon such as centipawns, eval, +0.42, positional concession, or theoretical line — describe the move in plain chess language instead.'

function buildPrompt(body: ExplainEnginePurposeRequestBody): string {
  const { fenBefore, move, fenAfter } = body
  const depth = body.depth ?? 'plain'

  const context = `Position (FEN) before the move: ${fenBefore}
Move played: ${move}
Position (FEN) after the move: ${fenAfter}`

  if (depth === 'plain') {
    return `${context}

In 1-2 sentences, plainly explain what this move accomplishes — what it develops, threatens, or defends. Do not judge whether it was a good or bad move; this is a purpose explanation, not a quality assessment. Write for a player learning the game. Do not use markdown formatting.`
  }

  // A mover label ("NIVENXA PLAYED") is rendered above this in the UI, so the
  // headline itself shouldn't repeat "Nivenxa played" — it mirrors the
  // player-move headline shape ("{move} — {short phrase}") instead, just
  // with a neutral intent phrase rather than a quality verdict, since these
  // moves are never graded.
  const headlineInstruction = `"headline": "<"${move}" followed by \\" — \\" and a 2-4 word NEUTRAL intent phrase — never a verdict like good/bad/strong/weak, e.g. \\"${move} — Central expansion\\" or \\"${move} — Develops the knight\\">"`

  if (depth === 'rich') {
    return `${context}

Write a short, scannable note explaining what Nivenxa Engine's move accomplishes — never judge it as good or bad, only its intent (what it develops, threatens, or defends), framed so a beginner understands why it's worth knowing. ${JARGON_RULE}
Respond with ONLY a single JSON object, no markdown fences, no other text. The object MUST have exactly these four keys — none are optional:
{
  ${headlineInstruction},
  "body": "<one short sentence on what the move develops, threatens, or defends>",
  "bullets": ["<2-3 short phrases (3-6 words each) on why this is worth knowing/watching>"],
  "remember": "<one short standalone opening/middlegame principle this illustrates, not specific to this exact position>"
}`
  }

  return `${context}

Write a short, scannable note explaining what Nivenxa Engine's move accomplishes — never judge it as good or bad, only its intent (what it develops, threatens, or defends). ${JARGON_RULE}
Respond with ONLY a single JSON object, no markdown fences, no other text. The object MUST have exactly these three keys — never omit "notice", it is not optional:
{
  ${headlineInstruction},
  "body": "<one short sentence on what the move develops, threatens, or defends>",
  "notice": "<required — one short sentence telling the player what to notice or consider in response>"
}`
}

interface ParsedExplanation {
  explanation: string
  headline?: string
  bullets?: string[]
  notice?: string
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
      notice: typeof parsed.notice === 'string' ? parsed.notice : undefined,
      remember: typeof parsed.remember === 'string' ? parsed.remember : undefined,
    }
  } catch {
    return { explanation: raw.trim() }
  }
}

export async function POST(request: NextRequest) {
  let body: ExplainEnginePurposeRequestBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!body.fenBefore || !body.move || !body.fenAfter) {
    return NextResponse.json({ error: 'fenBefore, move, and fenAfter are required' }, { status: 400 })
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'AI explanation service is not configured' }, { status: 503 })
  }

  try {
    const response = await getClient().messages.create({
      model: 'claude-opus-5',
      max_tokens: 300,
      thinking: { type: 'adaptive' },
      output_config: { effort: 'low' },
      messages: [{ role: 'user', content: buildPrompt(body) }],
    })

    const textBlock = response.content.find((block): block is Anthropic.TextBlock => block.type === 'text')
    const raw = textBlock?.text.trim() ?? ''
    const depth = body.depth ?? 'plain'
    const result: ExplainEnginePurposeResponseBody = depth === 'plain' ? { explanation: raw } : parseStructured(raw)
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
