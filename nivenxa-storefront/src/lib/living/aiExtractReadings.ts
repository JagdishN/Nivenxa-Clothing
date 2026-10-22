import type Anthropic from '@anthropic-ai/sdk'

// Server-only module — imported solely by
// src/app/api/living/extract-readings/route.ts (a Route Handler, never
// bundled to the client).

export const ACCEPTED_MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const
export type AcceptedMediaType = (typeof ACCEPTED_MEDIA_TYPES)[number]

const PROMPT = `You are reading a water-meter reading sheet, photographed by an apartment building's admin. Each row names a flat and a meter reading — some sheets show both a previous and a current reading side by side (if so, extract the CURRENT one, usually the rightmost or most recently written column); others show only one reading per flat, which is the current one.

Extract every row you can actually read. Respond with ONLY a JSON array, no markdown fences, no other text, matching exactly this shape:
[{"flat_no": "<the flat number exactly as written, e.g. \\"205\\">", "current_reading": <number, no commas or units>, "confidence": "high" | "low"}]

Use "low" confidence for any digit you're not fully sure about — smudged, cut off, ambiguous handwriting, glare. If a row's flat number or reading is fully illegible, omit that row entirely rather than guessing at it.`

/**
 * The ONLY inputs that can ever reach Claude for a reading extraction —
 * this type is the enforcement mechanism: there is no field here for a
 * resident's name, phone, email, flat-owner mapping, user id, or the
 * apartment's own flat list, so nothing else can slip in through it,
 * including in metadata. flat_no in the response is read directly off the
 * photo by the model — matching it against the apartment's real flats
 * happens afterward, in UploadReadingsForm.tsx, entirely client-side; the
 * flat list itself is never sent to Claude.
 */
export interface AiExtractReadingsInput {
  imageBase64: string
  mediaType: AcceptedMediaType
}

export function buildExtractReadingsRequest(input: AiExtractReadingsInput): Anthropic.MessageCreateParamsNonStreaming {
  return {
    model: 'claude-sonnet-5',
    max_tokens: 4000,
    thinking: { type: 'adaptive' },
    output_config: { effort: 'low' },
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: input.mediaType, data: input.imageBase64 } },
          { type: 'text', text: PROMPT },
        ],
      },
    ],
  }
}
