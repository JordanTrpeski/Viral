import type { Habit, HabitLog } from '@core/types'
import { localDateStr } from '@core/utils/units'

export function isHabitScheduledOn(habit: Habit, date: string): boolean {
  const day = new Date(`${date}T12:00:00`).getDay()
  const isoDay = day === 0 ? 7 : day
  if (habit.frequency === 'daily') return true
  if (habit.frequency === 'weekdays') return isoDay >= 1 && isoDay <= 5
  if (habit.frequency === 'weekends') return isoDay === 6 || isoDay === 7
  return habit.customDays.includes(isoDay)
}

export function previousDate(date: string): string {
  const d = new Date(`${date}T12:00:00`)
  d.setDate(d.getDate() - 1)
  return localDateStr(d)
}

export function calculateCurrentStreak(habit: Habit, logs: HabitLog[], fromDate = localDateStr()): number {
  const completed = new Set(logs.filter((l) => l.habitId === habit.id).map((l) => l.date))
  let cursor = fromDate
  let streak = 0

  for (let i = 0; i < 370; i++) {
    if (!isHabitScheduledOn(habit, cursor)) {
      cursor = previousDate(cursor)
      continue
    }
    if (!completed.has(cursor)) break
    streak += 1
    cursor = previousDate(cursor)
  }

  return streak
}

export function calculateLongestStreak(habit: Habit, logs: HabitLog[]): number {
  const completed = new Set(logs.filter((l) => l.habitId === habit.id).map((l) => l.date))
  const sortedDates = [...completed].sort()
  if (sortedDates.length === 0) return 0

  const first = new Date(`${sortedDates[0]}T12:00:00`)
  const last = new Date(`${sortedDates[sortedDates.length - 1]}T12:00:00`)
  let current = 0
  let longest = 0

  for (const d = new Date(first); d <= last; d.setDate(d.getDate() + 1)) {
    const date = localDateStr(d)
    if (!isHabitScheduledOn(habit, date)) continue
    if (completed.has(date)) {
      current += 1
      longest = Math.max(longest, current)
    } else {
      current = 0
    }
  }

  return longest
}

export function completionRate(habit: Habit, logs: HabitLog[], fromDate: string, toDate: string): number {
  const completed = new Set(logs.filter((l) => l.habitId === habit.id).map((l) => l.date))
  const start = new Date(`${fromDate}T12:00:00`)
  const end = new Date(`${toDate}T12:00:00`)
  let scheduled = 0
  let done = 0

  for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const date = localDateStr(d)
    if (!isHabitScheduledOn(habit, date)) continue
    scheduled += 1
    if (completed.has(date)) done += 1
  }

  return scheduled > 0 ? Math.round((done / scheduled) * 100) : 0
}
