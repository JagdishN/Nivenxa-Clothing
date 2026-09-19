import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

// Same lazy-client pattern as the other chess AI routes — a missing
// ANTHROPIC_API_KEY fails the first real request with a clear error instead
// of throwing at module load. No auth check here (unlike Living's
// extract-readings route) — chess has no auth anywhere yet, matching every
// other /api/chess/* route.
let client: Anthropic | null = null
function getClient(): Anthropic {
  if (!client) client = new Anthropic()
  return client
}

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const
const ACCEPTED_TYPES = [...ACCEPTED_IMAGE_TYPES, 'application/pdf'] as const
type AcceptedType = (typeof ACCEPTED_TYPES)[number]

const PROMPT = `You are reading a chess game score sheet — handwritten or printed, photographed or scanned. It records a full game in algebraic notation, move by move, White and Black alternating.

Transcribe every move you can read, in order, as standard algebraic notation (SAN) — e.g. "e4", "Nf3", "O-O", "Qxh7+", "exd8=Q". Also read the header area if present (event name, player names, date, result — a score sheet often has a printed header block for these).

Respond with ONLY a single JSON object, no markdown fences, no other text, matching exactly this shape:
{
  "moves": [{"ply": <0-indexed half-move number, White's first move is 0>, "san_guess": "<the move exactly as you read it>", "confidence": "high" | "low"}],
  "white": "<player name or null>",
  "black": "<player name or null>",
  "event": "<event name or null>",
  "played_on": "<date or null>",
  "result": "<one of \\"1-0\\", \\"0-1\\", \\"1/2-1/2\\", or null if not recorded>"
}

Use "low" confidence for any move you're not fully sure about — smudged handwriting, ambiguous piece letters, crossed-out corrections, cut-off text. Still include your best guess for a low-confidence move rather than omitting it — never skip a move number entirely, since that would misalign every move after it. If the sheet is double-sided or continues on a second sheet you can't see, transcribe only what's visible.`

interface ExtractedRow {
  ply: number
  san_guess: string
  confidence: 'high' | 'low'
}

interface ExtractedPayload {
  moves: ExtractedRow[]
  white: string | null
  black: string | null
  event: string | null
  played_on: string | null
  result: string | null
}

function parsePayload(raw: string): ExtractedPayload {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/, '')
  const parsed = JSON.parse(cleaned)
  if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.moves)) {
    throw new Error('Expected an object with a moves array')
  }
  const moves = (parsed.moves as unknown[])
    .filter(
      (row): row is ExtractedRow =>
        typeof row === 'object' &&
        row !== null &&
        typeof (row as ExtractedRow).ply === 'number' &&
        typeof (row as ExtractedRow).san_guess === 'string'
    )
    .map((row) => ({
      ply: row.ply,
      san_guess: row.san_guess.trim(),
      confidence: row.confidence === 'low' ? ('low' as const) : ('high' as const),
    }))
  return {
    moves,
    white: typeof parsed.white === 'string' ? parsed.white : null,
    black: typeof parsed.black === 'string' ? parsed.black : null,
    event: typeof parsed.event === 'string' ? parsed.event : null,
    played_on: typeof parsed.played_on === 'string' ? parsed.played_on : null,
    result: typeof parsed.result === 'string' ? parsed.result : null,
  }
}

export async function POST(request: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'Score sheet reading is not configured' }, { status: 503 })
  }

  const formData = await request.formData()
  const file = formData.get('file')
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
  }
  if (!ACCEPTED_TYPES.includes(file.type as AcceptedType)) {
    return NextResponse.json({ error: `Unsupported file type: ${file.type || 'unknown'}. Use JPEG, PNG, GIF, WebP, or PDF.` }, { status: 400 })
  }

  try {
    const bytes = await file.arrayBuffer()
    const base64 = Buffer.from(bytes).toString('base64')
    const isPdf = file.type === 'application/pdf'

    const response = await getClient().messages.create({
      model: 'claude-sonnet-5',
      max_tokens: 8000,
      thinking: { type: 'adaptive' },
      output_config: { effort: 'low' },
      messages: [
        {
          role: 'user',
          content: [
            isPdf
              ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } }
              : { type: 'image', source: { type: 'base64', media_type: file.type as (typeof ACCEPTED_IMAGE_TYPES)[number], data: base64 } },
            { type: 'text', text: PROMPT },
          ],
        },
      ],
    })

    const textBlock = response.content.find((block): block is Anthropic.TextBlock => block.type === 'text')
    const payload = parsePayload(textBlock?.text.trim() ?? '{}')
    return NextResponse.json(payload)
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) {
      return NextResponse.json({ error: 'Score sheet reading is not configured' }, { status: 503 })
    }
    if (err instanceof Anthropic.RateLimitError) {
      return NextResponse.json({ error: 'Rate limited — try again shortly' }, { status: 429 })
    }
    if (err instanceof Anthropic.APIError) {
      return NextResponse.json({ error: err.message }, { status: err.status ?? 500 })
    }
    if (err instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Couldn't read that score sheet clearly — try a clearer photo, or use Paste Moves instead." },
        { status: 422 }
      )
    }
    return NextResponse.json({ error: 'Failed to read the score sheet' }, { status: 500 })
  }
}
