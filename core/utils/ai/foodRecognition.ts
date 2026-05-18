const GEMINI_API_KEY = '' // Add your Google Gemini API key here

export interface RecognizedFood {
  name: string
  estimatedGrams: number
  confidenceScore: number
}

export interface FoodRecognitionResult {
  foods: RecognizedFood[]
  message: string
}

export async function recognizeFoodFromPhoto(imageUri: string): Promise<FoodRecognitionResult> {
  if (!GEMINI_API_KEY) {
    return {
      foods: [],
      message: 'Food photo recognition requires a Gemini Vision API key. Add your Google Gemini API key in core/utils/ai/foodRecognition.ts to enable this feature.',
    }
  }

  // Convert image to base64
  let base64Data: string
  try {
    const response = await fetch(imageUri)
    const blob = await response.blob()
    base64Data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve((reader.result as string).split(',')[1])
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  } catch {
    return { foods: [], message: 'Failed to read image.' }
  }

  const prompt = `Analyze this food photo. Identify all food items visible and estimate portion sizes.

Respond in JSON: { "foods": [{ "name": "food name", "estimatedGrams": 150, "confidenceScore": 0.9 }] }
Confidence score: 0.0 to 1.0. Only include items you can see clearly.`

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            { inline_data: { mime_type: 'image/jpeg', data: base64Data } },
          ],
        }],
      }),
    },
  )

  const data = await response.json() as { candidates: { content: { parts: { text: string }[] } }[] }
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}'
  try {
    const parsed = JSON.parse(text) as { foods: RecognizedFood[] }
    return { foods: parsed.foods ?? [], message: '' }
  } catch {
    return { foods: [], message: 'Could not parse recognition response.' }
  }
}
