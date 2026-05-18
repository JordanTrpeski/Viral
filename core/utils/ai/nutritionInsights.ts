import { dbGetMacroHistory } from '@core/db/dietQueries'

const ANTHROPIC_API_KEY = '' // Add your Anthropic API key here

export interface NutritionInsightsResult {
  insights: string[]
  summary: string
  weekStats: {
    avgCalories: number
    calorieGoal: number
    avgProteinG: number
    avgCarbsG: number
    avgFatG: number
    daysLogged: number
    daysOverGoal: number
  } | null
}

export async function generateWeeklyNutritionInsights(
  weekStartDate: string,
  calorieGoal: number,
): Promise<NutritionInsightsResult> {
  const weekEnd = new Date(weekStartDate)
  weekEnd.setDate(weekEnd.getDate() + 6)
  const weekEndStr = weekEnd.toISOString().slice(0, 10)

  const history = dbGetMacroHistory(weekStartDate, weekEndStr)
  const logged = history.filter((d) => d.calories > 0)

  const daysLogged = logged.length
  const avg = (field: keyof typeof logged[0]) =>
    daysLogged > 0 ? Math.round(logged.reduce((s, d) => s + (d[field] as number), 0) / daysLogged) : 0

  const weekStats = {
    avgCalories: avg('calories'),
    calorieGoal,
    avgProteinG: avg('proteinG'),
    avgCarbsG: avg('carbsG'),
    avgFatG: avg('fatG'),
    daysLogged,
    daysOverGoal: history.filter((d) => d.calories > calorieGoal).length,
  }

  if (!ANTHROPIC_API_KEY) {
    return {
      insights: [],
      summary: 'Weekly AI nutrition insights require an Anthropic API key. Add it in core/utils/ai/nutritionInsights.ts to enable this feature.',
      weekStats,
    }
  }

  const prompt = `Analyze this week's nutrition data and provide 3-5 actionable insights.

Week: ${weekStartDate} to ${weekEndStr}
Days logged: ${weekStats.daysLogged}/7
Calorie goal: ${calorieGoal} kcal
Average calories: ${weekStats.avgCalories} kcal
Days over goal: ${weekStats.daysOverGoal}
Average protein: ${weekStats.avgProteinG}g | carbs: ${weekStats.avgCarbsG}g | fat: ${weekStats.avgFatG}g

Respond in JSON: { "summary": "2-3 sentence overview", "insights": ["insight 1", ...] }`

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
    const parsed = JSON.parse(text) as { summary: string; insights: string[] }
    return { summary: parsed.summary ?? '', insights: parsed.insights ?? [], weekStats }
  } catch {
    return { summary: text, insights: [], weekStats }
  }
}
