import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import type { GameLesson, GameLessonsRequestBody, GameLessonsResponseBody } from '@/lib/chess/types'

// Same lazy-client pattern as the other chess AI routes.
let client: Anthropic | null = null
function getClient(): Anthropic {
  if (!client) client = new Anthropic()
  return client
}

const JARGON_RULE = 'Never use engine jargon such as centipawns, eval, or +0.42 — describe the pattern in plain chess language instead.'

function buildPrompt(body: GameLessonsRequestBody): string {
  const mine = body.moves.filter((m) => m.ply % 2 === (body.forColor === 'w' ? 0 : 1))
  const table = mine.map((m) => `ply ${m.ply}: ${m.san} — ${m.classification}${m.cpLoss > 0 ? `, lost ${m.cpLoss}cp` : ''}`).join('\n')

  const toneInstruction =
    body.tone === 'technical'
      ? 'Write for an experienced player — standard chess terminology is fine, but stay concise.'
      : 'Write for a player still learning — plain language, no jargon, encouraging tone.'

  return `Here is one player's move-by-move record from a finished chess game, in ply order (0-indexed half-moves):
${table || '(no moves recorded for this side)'}

Identify the 3 most useful, high-level lessons this player should take from the whole game — patterns across multiple moves, not a play-by-play recap. At least one lesson should highlight something they did well, if the record supports it. Each lesson must reference one specific ply number from the list above (pick the ply that best exemplifies that lesson). ${toneInstruction} ${JARGON_RULE}

Respond with ONLY a JSON object, no markdown fences, no other text, matching exactly this shape:
{"lessons": [{"ply": <a ply number from the list above>, "headline": "<3-6 word summary, e.g. \\"Check forcing moves first\\">", "body": "<1-2 sentences explaining the lesson and why it matters>"}]}
Always return exactly 3 lessons.`
}

function parseLessons(raw: string): GameLesson[] {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/, '')
  const parsed = JSON.parse(cleaned)
  if (!parsed || !Array.isArray(parsed.lessons)) throw new Error('Expected an object with a lessons array')
  return (parsed.lessons as unknown[])
    .filter(
      (l): l is GameLesson =>
        typeof l === 'object' &&
        l !== null &&
        typeof (l as GameLesson).headline === 'string' &&
        typeof (l as GameLesson).body === 'string' &&
        typeof (l as GameLesson).ply === 'number'
    )
    .slice(0, 3)
}

export async function POST(request: NextRequest) {
  let body: GameLessonsRequestBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!Array.isArray(body.moves) || body.moves.length === 0) {
    return NextResponse.json({ error: 'moves is required and must be non-empty' }, { status: 400 })
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'AI lessons are not configured' }, { status: 503 })
  }

  try {
    const response = await getClient().messages.create({
      model: 'claude-opus-5',
      max_tokens: 700,
      thinking: { type: 'adaptive' },
      output_config: { effort: 'low' },
      messages: [{ role: 'user', content: buildPrompt(body) }],
    })

    const textBlock = response.content.find((block): block is Anthropic.TextBlock => block.type === 'text')
    const lessons = parseLessons(textBlock?.text.trim() ?? '{}')
    const result: GameLessonsResponseBody = { lessons }
    return NextResponse.json(result)
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) {
      return NextResponse.json({ error: 'AI lessons are not configured' }, { status: 503 })
    }
    if (err instanceof Anthropic.RateLimitError) {
      return NextResponse.json({ error: 'Rate limited — try again shortly' }, { status: 429 })
    }
    if (err instanceof Anthropic.APIError) {
      return NextResponse.json({ error: err.message }, { status: err.status ?? 500 })
    }
    if (err instanceof SyntaxError) {
      return NextResponse.json({ error: 'Failed to generate lessons' }, { status: 422 })
    }
    return NextResponse.json({ error: 'Failed to generate lessons' }, { status: 500 })
  }
}
