import { db } from './database'
import type { WorkoutSession, WorkoutSet } from '@modules/health/shared/types'

// ─── Sessions ────────────────────────────────────────────────────────────────

interface RawSession {
  id: string; date: string; name: string | null
  duration_minutes: number | null; notes: string | null
  started_at: string; ended_at: string | null; created_at: string
}

function rowToSession(r: RawSession): WorkoutSession {
  return {
    id: r.id, date: r.date, name: r.name ?? undefined,
    durationMinutes: r.duration_minutes ?? undefined,
    notes: r.notes ?? undefined,
    startedAt: r.started_at, endedAt: r.ended_at ?? undefined,
    createdAt: r.created_at,
  }
}

export function dbInsertSession(session: WorkoutSession): void {
  db.runSync(
    `INSERT INTO workout_sessions (id, date, name, started_at, created_at) VALUES (?, ?, ?, ?, ?)`,
    [session.id, session.date, session.name ?? null, session.startedAt, session.createdAt],
  )
}

export function dbUpdateSession(id: string, endedAt: string, durationMinutes: number): void {
  db.runSync(
    `UPDATE workout_sessions SET ended_at = ?, duration_minutes = ? WHERE id = ?`,
    [endedAt, durationMinutes, id],
  )
}

export function dbUpdateSessionName(id: string, name: string): void {
  db.runSync('UPDATE workout_sessions SET name = ? WHERE id = ?', [name, id])
}

export function dbGetActiveSessionToday(date: string): WorkoutSession | null {
  const row = db.getFirstSync<RawSession>(
    `SELECT * FROM workout_sessions WHERE date = ? AND ended_at IS NULL ORDER BY started_at DESC LIMIT 1`,
    [date],
  )
  return row ? rowToSession(row) : null
}

export interface SessionSummaryRow {
  id: string; date: string; name: string | null
  duration_minutes: number | null; started_at: string; ended_at: string | null
  created_at: string; exercise_count: number; total_sets: number; total_volume: number
}

export function dbGetRecentSessions(limit: number): SessionSummaryRow[] {
  return db.getAllSync<SessionSummaryRow>(
    `SELECT sess.id, sess.date, sess.name, sess.duration_minutes, sess.started_at,
            sess.ended_at, sess.created_at,
            COUNT(DISTINCT ws.exercise_id) as exercise_count,
            COUNT(ws.id) as total_sets,
            COALESCE(SUM(ws.weight_kg * ws.reps), 0) as total_volume
     FROM workout_sessions sess
     LEFT JOIN workout_sets ws ON ws.session_id = sess.id
     WHERE sess.ended_at IS NOT NULL
     GROUP BY sess.id
     ORDER BY sess.date DESC, sess.started_at DESC
     LIMIT ?`,
    [limit],
  )
}

export function dbGetSessionMuscleGroups(sessionId: string): string[] {
  return db.getAllSync<{ muscle_group: string }>(
    `SELECT DISTINCT ex.muscle_group FROM workout_sets ws
     JOIN exercises ex ON ws.exercise_id = ex.id
     WHERE ws.session_id = ?`,
    [sessionId],
  ).map((r) => r.muscle_group)
}

// ─── Sets ─────────────────────────────────────────────────────────────────────

interface RawSet {
  id: string; session_id: string; exercise_id: string
  set_number: number; reps: number | null; weight_kg: number | null
  duration_seconds: number | null; notes: string | null; created_at: string
}

function rowToSet(r: RawSet): WorkoutSet {
  return {
    id: r.id, sessionId: r.session_id, exerciseId: r.exercise_id,
    setNumber: r.set_number, reps: r.reps ?? undefined, weightKg: r.weight_kg ?? undefined,
    durationSeconds: r.duration_seconds ?? undefined, notes: r.notes ?? undefined,
    createdAt: r.created_at,
  }
}

export function dbInsertSet(set: WorkoutSet): void {
  db.runSync(
    `INSERT INTO workout_sets (id, session_id, exercise_id, set_number, reps, weight_kg, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [set.id, set.sessionId, set.exerciseId, set.setNumber, set.reps ?? null, set.weightKg ?? null, set.createdAt],
  )
}

export function dbGetSessionSets(sessionId: string): WorkoutSet[] {
  return db.getAllSync<RawSet>(
    'SELECT * FROM workout_sets WHERE session_id = ? ORDER BY set_number ASC',
    [sessionId],
  ).map(rowToSet)
}

export interface SessionSetWithExercise {
  exerciseId: string
  exerciseName: string
  muscleGroup: string
  sets: WorkoutSet[]
}

export function dbGetSessionExercisesWithSets(sessionId: string): SessionSetWithExercise[] {
  const sets = db.getAllSync<RawSet & { exercise_name: string; muscle_group: string }>(
    `SELECT ws.*, ex.name as exercise_name, ex.muscle_group
     FROM workout_sets ws
     JOIN exercises ex ON ws.exercise_id = ex.id
     WHERE ws.session_id = ?
     ORDER BY ws.set_number ASC`,
    [sessionId],
  )

  const map = new Map<string, SessionSetWithExercise>()
  for (const row of sets) {
    if (!map.has(row.exercise_id)) {
      map.set(row.exercise_id, {
        exerciseId: row.exercise_id, exerciseName: row.exercise_name,
        muscleGroup: row.muscle_group, sets: [],
      })
    }
    map.get(row.exercise_id)!.sets.push(rowToSet(row))
  }
  return Array.from(map.values())
}
