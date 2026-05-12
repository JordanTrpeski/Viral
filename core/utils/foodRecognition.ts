export type RecognizedFoodItem = {
  name: string
  estimatedGrams: number
  caloriesPer100g: number
  proteinPer100g: number
  carbsPer100g: number
  fatPer100g: number
  fiberPer100g?: number
}

export type FoodRecognitionResult =
  | { ok: true; items: RecognizedFoodItem[] }
  | { ok: false; reason: 'missing-api-key' | 'no-results' | 'network-error' | 'parse-error'; message: string }

const GEMINI_API_KEY = ''
const GEMINI_MODEL = 'gemini-1.5-flash'

async function imageToBase64(uri: string): Promise<string> {
  const response = await fetch(uri)
  const blob = await response.blob()

  return await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Could not read image'))
    reader.onloadend = () => {
      const result = String(reader.result ?? '')
      resolve(result.replace(/^data:image\/\w+;base64,/, ''))
    }
    reader.readAsDataURL(blob)
  })
}

function parseJson(text: string): unknown {
  const trimmed = text.trim()
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/)
  return JSON.parse(fenced ? fenced[1] : trimmed)
}

function normalizeItems(value: unknown): RecognizedFoodItem[] {
  if (!Array.isArray(value)) return []

  const items: RecognizedFoodItem[] = []

  for (const item of value) {
    if (!item || typeof item !== 'object') continue
    const row = item as Record<string, unknown>
    const name = typeof row.name === 'string' ? row.name.trim() : ''
    const estimatedGrams = Number(row.estimatedGrams)
    const caloriesPer100g = Number(row.caloriesPer100g)
    const proteinPer100g = Number(row.proteinPer100g)
    const carbsPer100g = Number(row.carbsPer100g)
    const fatPer100g = Number(row.fatPer100g)
    const fiberPer100g = row.fiberPer100g == null ? undefined : Number(row.fiberPer100g)

    if (!name || !Number.isFinite(estimatedGrams) || estimatedGrams <= 0) continue
    if (![caloriesPer100g, proteinPer100g, carbsPer100g, fatPer100g].every(Number.isFinite)) continue

    const normalized: RecognizedFoodItem = {
      name,
      estimatedGrams: Math.round(estimatedGrams),
      caloriesPer100g: Math.max(0, Math.round(caloriesPer100g)),
      proteinPer100g: Math.max(0, Math.round(proteinPer100g * 10) / 10),
      carbsPer100g: Math.max(0, Math.round(carbsPer100g * 10) / 10),
      fatPer100g: Math.max(0, Math.round(fatPer100g * 10) / 10),
    }

    if (typeof fiberPer100g === 'number' && Number.isFinite(fiberPer100g)) {
      normalized.fiberPer100g = Math.max(0, Math.round(fiberPer100g * 10) / 10)
    }

    items.push(normalized)
  }

  return items
}

export function foodRecognitionSetupMessage(): string {
  return [
    'AI food recognition is wired but no API key is set yet.',
    'Add a Gemini Vision key in core/utils/foodRecognition.ts to unlock:',
    '- meal photo identification',
    '- estimated portions in grams',
    '- one-tap logging of all detected foods',
  ].join('\n')
}

export async function recognizeFoodFromImage(uri: string): Promise<FoodRecognitionResult> {
  if (!GEMINI_API_KEY.trim()) {
    return {
      ok: false,
      reason: 'missing-api-key',
      message: foodRecognitionSetupMessage(),
    }
  }

  try {
    const base64Image = await imageToBase64(uri)
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              {
                text: [
                  'Identify visible foods in this meal photo.',
                  'Return JSON only, as an array of objects.',
                  'Each object must include:',
                  'name, estimatedGrams, caloriesPer100g, proteinPer100g, carbsPer100g, fatPer100g, fiberPer100g.',
                  'Use realistic nutrition estimates per 100g. Do not include explanations.',
                ].join(' '),
              },
              {
                inlineData: {
                  mimeType: 'image/jpeg',
                  data: base64Image,
                },
              },
            ],
          }],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: 'application/json',
          },
        }),
      },
    )

    if (!response.ok) {
      return { ok: false, reason: 'network-error', message: 'Food recognition request failed. Check the API key and try again.' }
    }

    const json = await response.json() as {
      candidates?: { content?: { parts?: { text?: string }[] } }[]
    }
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) {
      return { ok: false, reason: 'no-results', message: "Couldn't identify food in this photo." }
    }

    const parsed = parseJson(text)
    const items = normalizeItems(parsed)
    if (items.length === 0) {
      return { ok: false, reason: 'no-results', message: "Couldn't identify food in this photo." }
    }

    return { ok: true, items }
  } catch {
    return { ok: false, reason: 'parse-error', message: 'Food recognition returned an unreadable result. Try again or search manually.' }
  }
}
