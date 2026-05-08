import { db } from './database'
import type { StepEntry, StepSession, ActivityType, InclineLevel } from '@modules/health/shared/types'

function rowToEntry(row: Record<string, unknown>): StepEntry {
  return {
    id:         row.id as string,
    date:       row.date as string,
    stepCount:  row.step_count as number,
    goal:       row.goal as number,
    createdAt:  row.created_at as string,
  }
}

function rowToSession(row: Record<string, unknown>): StepSession {
  return {
    id:              row.id as string,
    date:            row.date as string,
    activityType:    row.activity_type as ActivityType,
    stepCount:       row.step_count as number,
    durationMinutes: row.duration_minutes != null ? (row.duration_minutes as number) : null,
    incline:         row.incline as InclineLevel,
    createdAt:       row.created_at as string,
  }
}

export function dbGetStepsForDate(date: string): StepEntry | null {
  const row = db.getFirstSync<Record<string, unknown>>(
    `SELECT * FROM steps_log WHERE date = ?`, [date]
  )
  return row ? rowToEntry(row) : null
}

export function dbUpsertSteps(id: string, date: string, stepCount: number, goal: number): void {
  db.runSync(
    `INSERT INTO steps_log (id, date, step_count, goal, created_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(date) DO UPDATE SET step_count = excluded.step_count, goal = excluded.goal`,
    [id, date, stepCount, goal, new Date().toISOString()]
  )
}

export function dbGetStepsHistory(limit: number): StepEntry[] {
  const rows = db.getAllSync<Record<string, unknown>>(
    `SELECT * FROM steps_log ORDER BY date DESC LIMIT ?`, [limit]
  )
  return rows.map(rowToEntry)
}

export function dbGetSessionsForDate(date: string): StepSession[] {
  const rows = db.getAllSync<Record<string, unknown>>(
    `SELECT * FROM step_sessions WHERE date = ? ORDER BY created_at ASC`, [date]
  )
  return rows.map(rowToSession)
}

export function dbInsertSession(session: StepSession): void {
  db.runSync(
    `INSERT INTO step_sessions (id, date, activity_type, step_count, duration_minutes, incline, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [session.id, session.date, session.activityType, session.stepCount,
     session.durationMinutes ?? null, session.incline, session.createdAt]
  )
}

export function dbDeleteSession(id: string): void {
  db.runSync(`DELETE FROM step_sessions WHERE id = ?`, [id])
}
