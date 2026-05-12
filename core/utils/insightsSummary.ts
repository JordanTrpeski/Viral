import { db } from '@core/db/database'
import { dbGetDailyTotals, dbGetWeeklyCategoryBreakdown } from '@core/db/budgetQueries'
import { dbGetMacroHistory, dbGetWaterHistory } from '@core/db/dietQueries'
import { dbGetSleepRange } from '@core/db/sleepQueries'
import { dbGetStepsHistory } from '@core/db/stepsQueries'
import { createStorage } from '@core/utils/storage'
import { localDateStr } from '@core/utils/units'

const ANTHROPIC_API_KEY = ''
const ANTHROPIC_MODEL = 'claude-3-haiku-20240307'
const storage = createStorage('weekly-insights')

export interface WeeklyInsightsResult {
  ok: boolean
  insights: string[]
  generatedAt: string | null
  message?: string
  weekStart: string
  weekEnd: string
}

interface WorkoutSummaryRow {
  date: string
  session_name: string | null
  duration_minutes: number | null
  exercise_name: string
  total_volume: number | null
  set_count: number
}

function mondayFor(date = new Date()): Date {
  const d = new Date(date)
  d.setHours(12, 0, 0, 0)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d
}

export function currentWeekRange(): { weekStart: string; weekEnd: string; cacheKey: string } {
  const monday = mondayFor()
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  const weekStart = localDateStr(monday)
  const weekEnd = localDateStr(sunday)
  return { weekStart, weekEnd, cacheKey: `insights-${weekStart}` }
}

function rangeDays(start: string, end: string): string[] {
  const days: string[] = []
  for (const d = new Date(`${start}T12:00:00`); d <= new Date(`${end}T12:00:00`); d.setDate(d.getDate() + 1)) {
    days.push(localDateStr(d))
  }
  return days
}

function summarizeWorkouts(start: string, end: string): string {
  const rows = db.getAllSync<WorkoutSummaryRow>(
    `SELECT ws.date, ws.name as session_name, ws.duration_minutes, e.name as exercise_name,
            SUM(COALESCE(wset.weight_kg, 0) * COALESCE(wset.reps, 0)) as total_volume,
            COUNT(wset.id) as set_count
     FROM workout_sessions ws
     LEFT JOIN workout_sets wset ON wset.session_id = ws.id
     LEFT JOIN exercises e ON e.id = wset.exercise_id
     WHERE ws.date BETWEEN ? AND ? AND ws.ended_at IS NOT NULL
     GROUP BY ws.date, ws.id, e.id
     ORDER BY ws.date ASC`,
    [start, end],
  )
  if (rows.length === 0) return 'Workouts: no completed workouts logged.'
  const totalVolume = rows.reduce((sum, r) => sum + (r.total_volume ?? 0), 0)
  const exercises = rows
    .filter((r) => r.exercise_name)
    .slice(0, 8)
    .map((r) => `${r.exercise_name} ${Math.round(r.total_volume ?? 0)}kg`)
    .join(', ')
  return `Workouts: ${new Set(rows.map((r) => r.date)).size} sessions, ${Math.round(totalVolume)}kg total volume. Exercises: ${exercises || 'none'}.`
}

export function buildWeeklySummary(): { summary: string; weekStart: string; weekEnd: string } {
  const { weekStart, weekEnd } = currentWeekRange()
  const days = rangeDays(weekStart, weekEnd)
  const macros = dbGetMacroHistory(weekStart, weekEnd)
  const water = dbGetWaterHistory(14).filter((d) => d.date >= weekStart && d.date <= weekEnd)
  const steps = dbGetStepsHistory(14).filter((d) => d.date >= weekStart && d.date <= weekEnd)
  const sleep = dbGetSleepRange(weekStart, weekEnd)
  const budget = dbGetDailyTotals(weekStart, weekEnd)
  const budgetByCategory = dbGetWeeklyCategoryBreakdown(weekStart, weekEnd)
  const profile = db.getFirstSync<{ calorie_goal_kcal: number | null }>('SELECT calorie_goal_kcal FROM user_profile LIMIT 1')
  const calorieGoal = profile?.calorie_goal_kcal ?? 2000

  const macroByDate = Object.fromEntries(macros.map((m) => [m.date, m]))
  const waterByDate = Object.fromEntries(water.map((w) => [w.date, w.amountMl]))
  const stepsByDate = Object.fromEntries(steps.map((s) => [s.date, s.stepCount]))
  const sleepByDate = Object.fromEntries(sleep.map((s) => [s.date, s.durationMinutes]))

  const nutritionLines = days.map((date) => {
    const m = macroByDate[date]
    return `${date}: ${m?.calories ?? 0}/${calorieGoal} kcal, P${m?.proteinG ?? 0} C${m?.carbsG ?? 0} F${m?.fatG ?? 0}`
  })

  const stepLines = days.map((date) => `${date}: ${stepsByDate[date] ?? 0} steps`)
  const waterLines = days.map((date) => `${date}: ${waterByDate[date] ?? 0} ml`)
  const sleepLines = days.map((date) => `${date}: ${Math.round((sleepByDate[date] ?? 0) / 60 * 10) / 10}h`)
  const budgetLines = budget.map((b) => `${b.date}: income ${b.income}, spending ${b.spending}, net ${b.net}`)
  const categoryLines = budgetByCategory.map((c) => `${c.categoryEmoji} ${c.categoryName}: ${c.total}`).join(', ') || 'none'

  const summary = [
    `Week: ${weekStart} to ${weekEnd}`,
    'Nutrition:',
    ...nutritionLines,
    summarizeWorkouts(weekStart, weekEnd),
    'Steps:',
    ...stepLines,
    'Water:',
    ...waterLines,
    'Sleep:',
    ...sleepLines,
    'Budget:',
    ...budgetLines,
    `Spending categories: ${categoryLines}`,
  ].join('\n')

  return { summary, weekStart, weekEnd }
}

function parseInsights(text: string): string[] {
  return text
    .split(/\n+/)
    .map((line) => line.replace(/^\s*\d+[\).\s-]*/, '').trim())
    .filter(Boolean)
    .slice(0, 5)
}

export function insightsPlaceholderMessage(): string {
  return 'Claude API key placeholder: weekly insights are wired, but the key is intentionally blank. Add an Anthropic API key in core/utils/insightsSummary.ts to unlock 3-5 specific coaching insights from your real health and budget data.'
}

export async function getWeeklyInsights(forceRefresh = false): Promise<WeeklyInsightsResult> {
  const { weekStart, weekEnd, cacheKey } = currentWeekRange()
  const cached = storage.getString(cacheKey)
  if (!forceRefresh && cached) {
    const parsed = JSON.parse(cached) as { insights: string[]; generatedAt: string }
    return { ok: true, insights: parsed.insights, generatedAt: parsed.generatedAt, weekStart, weekEnd }
  }

  if (!ANTHROPIC_API_KEY) {
    return { ok: false, insights: [], generatedAt: null, weekStart, weekEnd, message: insightsPlaceholderMessage() }
  }

  const { summary } = buildWeeklySummary()
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 700,
      system: 'You are a personal health and finance coach. Analyse this week\'s data and provide 3-5 specific, actionable insights. Be direct and specific - reference actual numbers from the data. Do not be generic. Format as a numbered list.',
      messages: [{ role: 'user', content: summary }],
    }),
  })

  if (!response.ok) {
    return { ok: false, insights: [], generatedAt: null, weekStart, weekEnd, message: `Couldn't generate insights (${response.status}).` }
  }

  const data = await response.json() as { content?: { text?: string }[] }
  const text = data.content?.map((c) => c.text ?? '').join('\n') ?? ''
  const insights = parseInsights(text)
  const generatedAt = new Date().toISOString()
  storage.set(cacheKey, JSON.stringify({ insights, generatedAt }))
  return { ok: true, insights, generatedAt, weekStart, weekEnd }
}
