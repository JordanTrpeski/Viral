import { getAllSessionsV2 } from '@core/db/workoutQueriesV2'

const ANTHROPIC_API_KEY = '' // Add your Anthropic API key here

export interface WorkoutSummaryResult {
  summary: string
  insights: string[]
  weekStats: {
    sessionCount: number
    totalVolumeKg: number
    totalSets: number
    exerciseCount: number
  } | null
}

export async function generateWeeklyWorkoutSummary(weekStartDate: string): Promise<WorkoutSummaryResult> {
  // Aggregate last 7 days of session data
  const allSessions = getAllSessionsV2()
  const weekEnd = new Date(weekStartDate)
  weekEnd.setDate(weekEnd.getDate() + 7)
  const weekEndStr = weekEnd.toISOString().slice(0, 10)

  const sessions = allSessions.filter(
    (s) => s.date >= weekStartDate && s.date < weekEndStr,
  )

  const weekStats = {
    sessionCount: sessions.length,
    totalVolumeKg: sessions.reduce((sum, s) => sum + s.totalVolume, 0),
    totalSets: sessions.reduce((sum, s) => sum + s.totalSets, 0),
    exerciseCount: sessions.reduce((sum, s) => sum + s.exerciseCount, 0),
  }

  if (!ANTHROPIC_API_KEY) {
    return {
      summary: 'Weekly AI summaries require an Anthropic API key. Add it in core/utils/ai/workoutSummary.ts to enable this feature.',
      insights: [],
      weekStats,
    }
  }

  // ── API call (active when key is set) ────────────────────────────────────────
  const prompt = `Analyze this week's training data and provide 3-5 specific insights and recommendations.

Week: ${weekStartDate} to ${weekEndStr}
Sessions completed: ${weekStats.sessionCount}
Total volume: ${Math.round(weekStats.totalVolumeKg)}kg
Total sets: ${weekStats.totalSets}
Unique exercises: ${weekStats.exerciseCount}

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
