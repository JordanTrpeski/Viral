import { getAllExercises } from '@core/db/workoutQueriesV2'

const ANTHROPIC_API_KEY = '' // Add your Anthropic API key here

export interface ExerciseSwapResult {
  suggestions: {
    exerciseId: string | null
    name: string
    reason: string
  }[]
  message: string
}

export async function suggestExerciseSwap(
  exerciseId: string,
  reason: string,
  availableEquipment: string[],
): Promise<ExerciseSwapResult> {
  if (!ANTHROPIC_API_KEY) {
    return {
      suggestions: [],
      message: 'AI exercise swap suggestions require an Anthropic API key. Add it in core/utils/ai/exerciseSwap.ts to enable this feature.',
    }
  }

  const allExercises = getAllExercises()
  const currentExercise = allExercises.find((e) => e.id === exerciseId)
  if (!currentExercise) {
    return { suggestions: [], message: 'Exercise not found.' }
  }

  const candidates = allExercises
    .filter((e) => e.id !== exerciseId)
    .filter((e) => !e.equipment || availableEquipment.includes(e.equipment))
    .slice(0, 30)

  const prompt = `Suggest 3-5 exercise substitutes for "${currentExercise.name}" (${currentExercise.primaryMuscles?.join(', ')}).

Reason for swap: ${reason}
Available equipment: ${availableEquipment.join(', ') || 'bodyweight only'}

Candidate exercises (name — equipment):
${candidates.map((e) => `- ${e.name} (${e.equipment ?? 'bodyweight'})`).join('\n')}

Respond in JSON: { "suggestions": [{ "name": "Exercise name", "reason": "Why it works" }] }`

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  const data = await response.json() as { content: { text: string }[] }
  const text = data.content?.[0]?.text ?? '{}'
  try {
    const parsed = JSON.parse(text) as { suggestions: { name: string; reason: string }[] }
    return {
      suggestions: (parsed.suggestions ?? []).map((s) => ({
        exerciseId: allExercises.find((e) => e.name === s.name)?.id ?? null,
        name: s.name,
        reason: s.reason,
      })),
      message: '',
    }
  } catch {
    return { suggestions: [], message: text }
  }
}
