import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getLivingMembership } from '@/lib/living/auth'

// Same lazy-client pattern as the chess explanation routes — a missing
// ANTHROPIC_API_KEY fails the first real request with a clear error
// instead of throwing at module load.
let client: Anthropic | null = null
function getClient(): Anthropic {
  if (!client) client = new Anthropic()
  return client
}

const ACCEPTED_MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const
type AcceptedMediaType = (typeof ACCEPTED_MEDIA_TYPES)[number]

const PROMPT = `You are reading a water-meter reading sheet, photographed by an apartment building's admin. Each row names a flat and a meter reading — some sheets show both a previous and a current reading side by side (if so, extract the CURRENT one, usually the rightmost or most recently written column); others show only one reading per flat, which is the current one.

Extract every row you can actually read. Respond with ONLY a JSON array, no markdown fences, no other text, matching exactly this shape:
[{"flat_no": "<the flat number exactly as written, e.g. \\"205\\">", "current_reading": <number, no commas or units>, "confidence": "high" | "low"}]

Use "low" confidence for any digit you're not fully sure about — smudged, cut off, ambiguous handwriting, glare. If a row's flat number or reading is fully illegible, omit that row entirely rather than guessing at it.`

export interface ExtractedReadingRow {
  flat_no: string
  current_reading: number
  confidence: 'high' | 'low'
}

function parseRows(raw: string): ExtractedReadingRow[] {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/, '')
  const parsed: unknown = JSON.parse(cleaned)
  if (!Array.isArray(parsed)) throw new Error('Expected a JSON array')
  return parsed
    .filter(
      (row): row is ExtractedReadingRow =>
        typeof row === 'object' &&
        row !== null &&
        typeof (row as ExtractedReadingRow).flat_no === 'string' &&
        typeof (row as ExtractedReadingRow).current_reading === 'number'
    )
    .map((row) => ({
      flat_no: row.flat_no.trim(),
      current_reading: row.current_reading,
      confidence: row.confidence === 'low' ? 'low' : 'high',
    }))
}

export async function POST(request: NextRequest) {
  const membership = await getLivingMembership(['admin'])
  if (!membership) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'Reading extraction is not configured' }, { status: 503 })
  }

  const formData = await request.formData()
  const file = formData.get('file')
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: 'No image uploaded' }, { status: 400 })
  }
  if (!ACCEPTED_MEDIA_TYPES.includes(file.type as AcceptedMediaType)) {
    return NextResponse.json({ error: `Unsupported image type: ${file.type || 'unknown'}. Use JPEG, PNG, GIF, or WebP.` }, { status: 400 })
  }

  try {
    const bytes = await file.arrayBuffer()
    const base64 = Buffer.from(bytes).toString('base64')

    const response = await getClient().messages.create({
      model: 'claude-sonnet-5',
      max_tokens: 4000,
      thinking: { type: 'adaptive' },
      output_config: { effort: 'low' },
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: file.type as AcceptedMediaType, data: base64 } },
            { type: 'text', text: PROMPT },
          ],
        },
      ],
    })

    const textBlock = response.content.find((block): block is Anthropic.TextBlock => block.type === 'text')
    const rows = parseRows(textBlock?.text.trim() ?? '[]')
    return NextResponse.json({ rows })
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) {
      return NextResponse.json({ error: 'Reading extraction is not configured' }, { status: 503 })
    }
    if (err instanceof Anthropic.RateLimitError) {
      return NextResponse.json({ error: 'Rate limited — try again shortly' }, { status: 429 })
    }
    if (err instanceof Anthropic.APIError) {
      return NextResponse.json({ error: err.message }, { status: err.status ?? 500 })
    }
    if (err instanceof SyntaxError) {
      return NextResponse.json({ error: "Couldn't read that sheet clearly — try a clearer photo, or enter readings manually." }, { status: 422 })
    }
    return NextResponse.json({ error: 'Failed to extract readings' }, { status: 500 })
  }
}
