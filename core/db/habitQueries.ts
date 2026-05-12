import { db } from './database'
import type { Habit, HabitFrequency, HabitLog } from '@core/types'

interface HabitRow {
  id: string
  name: string
  icon: string
  color: string
  frequency: HabitFrequency
  custom_days: string | null
  reminder_time: string | null
  sort_order: number
  is_archived: number
  created_at: string
}

interface HabitLogRow {
  id: string
  habit_id: string
  date: string
  completed_at: string
}

function parseDays(raw: string | null): number[] {
  if (!raw) return []
  try {
    const value = JSON.parse(raw) as unknown
    return Array.isArray(value) ? value.filter((d): d is number => typeof d === 'number') : []
  } catch {
    return []
  }
}

function mapHabit(row: HabitRow): Habit {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon,
    color: row.color,
    frequency: row.frequency,
    customDays: parseDays(row.custom_days),
    reminderTime: row.reminder_time,
    sortOrder: row.sort_order,
    isArchived: row.is_archived === 1,
    createdAt: row.created_at,
  }
}

function mapLog(row: HabitLogRow): HabitLog {
  return {
    id: row.id,
    habitId: row.habit_id,
    date: row.date,
    completedAt: row.completed_at,
  }
}

export function dbGetHabits(includeArchived = false): Habit[] {
  const rows = db.getAllSync<HabitRow>(
    `SELECT * FROM habits ${includeArchived ? '' : 'WHERE is_archived = 0'} ORDER BY sort_order ASC, created_at ASC`,
  )
  return rows.map(mapHabit)
}

export function dbGetHabit(id: string): Habit | null {
  const row = db.getFirstSync<HabitRow>('SELECT * FROM habits WHERE id = ?', [id])
  return row ? mapHabit(row) : null
}

export function dbInsertHabit(habit: Habit): void {
  db.runSync(
    `INSERT INTO habits (id, name, icon, color, frequency, custom_days, reminder_time, sort_order, is_archived, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      habit.id, habit.name, habit.icon, habit.color, habit.frequency,
      JSON.stringify(habit.customDays), habit.reminderTime, habit.sortOrder,
      habit.isArchived ? 1 : 0, habit.createdAt,
    ],
  )
}

export function dbUpdateHabit(habit: Habit): void {
  db.runSync(
    `UPDATE habits
     SET name = ?, icon = ?, color = ?, frequency = ?, custom_days = ?, reminder_time = ?, sort_order = ?, is_archived = ?
     WHERE id = ?`,
    [
      habit.name, habit.icon, habit.color, habit.frequency, JSON.stringify(habit.customDays),
      habit.reminderTime, habit.sortOrder, habit.isArchived ? 1 : 0, habit.id,
    ],
  )
}

export function dbArchiveHabit(id: string): void {
  db.runSync('UPDATE habits SET is_archived = 1 WHERE id = ?', [id])
}

export function dbGetHabitLogs(fromDate: string, toDate: string): HabitLog[] {
  return db.getAllSync<HabitLogRow>(
    'SELECT * FROM habit_logs WHERE date BETWEEN ? AND ? ORDER BY date ASC',
    [fromDate, toDate],
  ).map(mapLog)
}

export function dbGetHabitLogsForHabit(habitId: string, fromDate: string, toDate: string): HabitLog[] {
  return db.getAllSync<HabitLogRow>(
    'SELECT * FROM habit_logs WHERE habit_id = ? AND date BETWEEN ? AND ? ORDER BY date ASC',
    [habitId, fromDate, toDate],
  ).map(mapLog)
}

export function dbToggleHabitLog(id: string, habitId: string, date: string): boolean {
  const existing = db.getFirstSync<{ id: string }>(
    'SELECT id FROM habit_logs WHERE habit_id = ? AND date = ?',
    [habitId, date],
  )
  if (existing) {
    db.runSync('DELETE FROM habit_logs WHERE id = ?', [existing.id])
    return false
  }
  db.runSync(
    'INSERT INTO habit_logs (id, habit_id, date, completed_at) VALUES (?, ?, ?, ?)',
    [id, habitId, date, new Date().toISOString()],
  )
  return true
}

export function dbGetHabitCompletionCount(habitId: string): number {
  return db.getFirstSync<{ count: number }>(
    'SELECT COUNT(*) as count FROM habit_logs WHERE habit_id = ?',
    [habitId],
  )?.count ?? 0
}
