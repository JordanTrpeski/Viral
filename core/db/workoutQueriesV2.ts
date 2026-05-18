import { db } from './database'
import type {
  ExerciseV2,
  ExercisePR,
  WorkoutSessionV2,
  WorkoutSetV2,
} from '@modules/health/shared/types'

// ─── Helpers ─────────────────────────────────────────────────────────────────

type ExerciseRow = {
  id: string
  name: string
  slug: string
  category: string
  primary_muscles: string
  secondary_muscles: string
  equipment: string
  movement_pattern: string | null
  description: string | null
  form_cues: string
  common_mistakes: string
  difficulty: string
  substitute_ids: string
  is_unilateral: number
  created_at: string
}

function parseExerciseRow(row: ExerciseRow): ExerciseV2 {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    category: row.category as ExerciseV2['category'],
    primaryMuscles: JSON.parse(row.primary_muscles ?? '[]'),
    secondaryMuscles: JSON.parse(row.secondary_muscles ?? '[]'),
    equipment: row.equipment as ExerciseV2['equipment'],
    movementPattern: row.movement_pattern
      ? (row.movement_pattern as ExerciseV2['movementPattern'])
      : undefined,
    description: row.description ?? undefined,
    formCues: JSON.parse(row.form_cues ?? '[]'),
    commonMistakes: JSON.parse(row.common_mistakes ?? '[]'),
    difficulty: row.difficulty as ExerciseV2['difficulty'],
    substituteIds: JSON.parse(row.substitute_ids ?? '[]'),
    isUnilateral: row.is_unilateral === 1,
    createdAt: row.created_at,
  }
}

// ─── Exercise Library ─────────────────────────────────────────────────────────

export function getAllExercises(): ExerciseV2[] {
  const rows = db.getAllSync<ExerciseRow>(
    'SELECT * FROM exercises ORDER BY name ASC',
  )
  return rows.map(parseExerciseRow)
}

export function searchExercises(query: string): ExerciseV2[] {
  const rows = db.getAllSync<ExerciseRow>(
    `SELECT * FROM exercises
     WHERE name LIKE ? OR primary_muscles LIKE ?
     ORDER BY name ASC`,
    [`%${query}%`, `%${query}%`],
  )
  return rows.map(parseExerciseRow)
}

export function getExercisesByCategory(category: ExerciseV2['category']): ExerciseV2[] {
  const rows = db.getAllSync<ExerciseRow>(
    'SELECT * FROM exercises WHERE category = ? ORDER BY name ASC',
    [category],
  )
  return rows.map(parseExerciseRow)
}

export function getExercisesByEquipment(equipment: ExerciseV2['equipment']): ExerciseV2[] {
  const rows = db.getAllSync<ExerciseRow>(
    'SELECT * FROM exercises WHERE equipment = ? ORDER BY name ASC',
    [equipment],
  )
  return rows.map(parseExerciseRow)
}

export function getExerciseById(id: string): ExerciseV2 | null {
  const row = db.getFirstSync<ExerciseRow>(
    'SELECT * FROM exercises WHERE id = ?',
    [id],
  )
  return row ? parseExerciseRow(row) : null
}

export function getExerciseBySlug(slug: string): ExerciseV2 | null {
  const row = db.getFirstSync<ExerciseRow>(
    'SELECT * FROM exercises WHERE slug = ?',
    [slug],
  )
  return row ? parseExerciseRow(row) : null
}

export function getExercisesByIds(ids: string[]): ExerciseV2[] {
  if (ids.length === 0) return []
  const placeholders = ids.map(() => '?').join(', ')
  const rows = db.getAllSync<ExerciseRow>(
    `SELECT * FROM exercises WHERE id IN (${placeholders}) ORDER BY name ASC`,
    ids,
  )
  return rows.map(parseExerciseRow)
}

// ─── Exercise PRs ─────────────────────────────────────────────────────────────

export function getPRsForExercise(exerciseId: string): ExercisePR[] {
  const rows = db.getAllSync<{
    id: string
    exercise_id: string
    date: string
    weight_kg: number
    reps: number
    estimated_one_rep_max: number
    session_id: string | null
    created_at: string
  }>(
    'SELECT * FROM exercise_prs WHERE exercise_id = ? ORDER BY date DESC',
    [exerciseId],
  )
  return rows.map((r) => ({
    id: r.id,
    exerciseId: r.exercise_id,
    date: r.date,
    weightKg: r.weight_kg,
    reps: r.reps,
    estimatedOneRepMax: r.estimated_one_rep_max,
    sessionId: r.session_id ?? undefined,
    createdAt: r.created_at,
  }))
}

export function getLatestPRForExercise(exerciseId: string): ExercisePR | null {
  const row = db.getFirstSync<{
    id: string
    exercise_id: string
    date: string
    weight_kg: number
    reps: number
    estimated_one_rep_max: number
    session_id: string | null
    created_at: string
  }>(
    `SELECT * FROM exercise_prs WHERE exercise_id = ?
     ORDER BY estimated_one_rep_max DESC LIMIT 1`,
    [exerciseId],
  )
  if (!row) return null
  return {
    id: row.id,
    exerciseId: row.exercise_id,
    date: row.date,
    weightKg: row.weight_kg,
    reps: row.reps,
    estimatedOneRepMax: row.estimated_one_rep_max,
    sessionId: row.session_id ?? undefined,
    createdAt: row.created_at,
  }
}

// ─── Session history for an exercise ─────────────────────────────────────────

export interface ExerciseSetHistoryRow {
  sessionId: string
  date: string
  setNumber: number
  performedWeight: number | null
  performedReps: number | null
  rpe: number | null
  isWarmup: boolean
}

export function getSetHistoryForExercise(
  exerciseId: string,
  limit = 20,
): ExerciseSetHistoryRow[] {
  const rows = db.getAllSync<{
    session_id: string
    date: string
    set_number: number
    performed_weight: number | null
    performed_reps: number | null
    rpe: number | null
    is_warmup: number
  }>(
    `SELECT
       ws.session_id,
       s.date,
       ws.set_number,
       ws.performed_weight,
       ws.performed_reps,
       ws.rpe,
       ws.is_warmup
     FROM workout_sets ws
     JOIN workout_sessions s ON s.id = ws.session_id
     WHERE ws.exercise_id = ?
       AND ws.is_warmup = 0
     ORDER BY s.date DESC, ws.set_number ASC
     LIMIT ?`,
    [exerciseId, limit],
  )
  return rows.map((r) => ({
    sessionId: r.session_id,
    date: r.date,
    setNumber: r.set_number,
    performedWeight: r.performed_weight,
    performedReps: r.performed_reps,
    rpe: r.rpe,
    isWarmup: r.is_warmup === 1,
  }))
}

// Groups sets by session date for the history screen
export interface SessionVolumeSummary {
  sessionId: string
  date: string
  topSet: { weightKg: number; reps: number } | null
  totalSets: number
  totalVolume: number  // kg * reps
}

export function getSessionSummariesForExercise(
  exerciseId: string,
  limit = 15,
): SessionVolumeSummary[] {
  const rows = db.getAllSync<{
    session_id: string
    date: string
    total_sets: number
    max_weight: number | null
    reps_at_max: number | null
    total_volume: number | null
  }>(
    `SELECT
       ws.session_id,
       s.date,
       COUNT(*) AS total_sets,
       MAX(ws.performed_weight) AS max_weight,
       ws.performed_reps AS reps_at_max,
       SUM(COALESCE(ws.performed_weight, 0) * COALESCE(ws.performed_reps, 0)) AS total_volume
     FROM workout_sets ws
     JOIN workout_sessions s ON s.id = ws.session_id
     WHERE ws.exercise_id = ? AND ws.is_warmup = 0
     GROUP BY ws.session_id
     ORDER BY s.date DESC
     LIMIT ?`,
    [exerciseId, limit],
  )
  return rows.map((r) => ({
    sessionId: r.session_id,
    date: r.date,
    topSet:
      r.max_weight != null && r.reps_at_max != null
        ? { weightKg: r.max_weight, reps: r.reps_at_max }
        : null,
    totalSets: r.total_sets,
    totalVolume: r.total_volume ?? 0,
  }))
}

// ─── Workout sessions ─────────────────────────────────────────────────────────

export function getWorkoutSessionById(id: string): WorkoutSessionV2 | null {
  const row = db.getFirstSync<{
    id: string
    date: string
    template_id: string | null
    duration_seconds: number | null
    perceived_difficulty: number | null
    notes: string | null
    started_at: string
    ended_at: string | null
    created_at: string
  }>('SELECT * FROM workout_sessions WHERE id = ?', [id])
  if (!row) return null
  return {
    id: row.id,
    date: row.date,
    templateId: row.template_id ?? undefined,
    durationSeconds: row.duration_seconds ?? undefined,
    perceivedDifficulty: row.perceived_difficulty ?? undefined,
    notes: row.notes ?? undefined,
    startedAt: row.started_at,
    endedAt: row.ended_at ?? undefined,
    createdAt: row.created_at,
  }
}

// ─── Active session helpers ───────────────────────────────────────────────────

export function getActiveSessionTodayV2(date: string): WorkoutSessionV2 | null {
  const row = db.getFirstSync<{
    id: string; date: string; template_id: string | null
    duration_seconds: number | null; notes: string | null
    perceived_difficulty: number | null
    started_at: string; ended_at: string | null; created_at: string
  }>(
    'SELECT * FROM workout_sessions WHERE date = ? AND ended_at IS NULL ORDER BY started_at DESC LIMIT 1',
    [date],
  )
  if (!row) return null
  return {
    id: row.id, date: row.date,
    templateId: row.template_id ?? undefined,
    durationSeconds: row.duration_seconds ?? undefined,
    notes: row.notes ?? undefined,
    perceivedDifficulty: row.perceived_difficulty ?? undefined,
    startedAt: row.started_at,
    endedAt: row.ended_at ?? undefined,
    createdAt: row.created_at,
  }
}

export interface SessionSummaryRowV2 {
  id: string; date: string; templateId: string | null
  durationSeconds: number | null; startedAt: string; endedAt: string | null
  createdAt: string; exerciseCount: number; totalSets: number; totalVolume: number
}

export function getRecentSessionsV2(limit: number): SessionSummaryRowV2[] {
  const rows = db.getAllSync<{
    id: string; date: string; template_id: string | null
    duration_seconds: number | null; started_at: string; ended_at: string | null
    created_at: string; exercise_count: number; total_sets: number; total_volume: number
  }>(
    `SELECT sess.id, sess.date, sess.template_id, sess.duration_seconds,
            sess.started_at, sess.ended_at, sess.created_at,
            COUNT(DISTINCT ws.exercise_id) AS exercise_count,
            COUNT(ws.id) AS total_sets,
            COALESCE(SUM(COALESCE(ws.performed_weight,0) * COALESCE(ws.performed_reps,0)), 0) AS total_volume
     FROM workout_sessions sess
     LEFT JOIN workout_sets ws ON ws.session_id = sess.id AND ws.is_warmup = 0
     WHERE sess.ended_at IS NOT NULL
     GROUP BY sess.id
     ORDER BY sess.date DESC, sess.started_at DESC
     LIMIT ?`,
    [limit],
  )
  return rows.map((r) => ({
    id: r.id, date: r.date, templateId: r.template_id,
    durationSeconds: r.duration_seconds, startedAt: r.started_at,
    endedAt: r.ended_at, createdAt: r.created_at,
    exerciseCount: r.exercise_count, totalSets: r.total_sets, totalVolume: r.total_volume,
  }))
}

export function getSessionPrimaryMusclesV2(sessionId: string): string[] {
  const rows = db.getAllSync<{ primary_muscles: string }>(
    `SELECT DISTINCT ex.primary_muscles FROM workout_sets ws
     JOIN exercises ex ON ws.exercise_id = ex.id
     WHERE ws.session_id = ?`,
    [sessionId],
  )
  const all = new Set<string>()
  for (const r of rows) {
    try { (JSON.parse(r.primary_muscles ?? '[]') as string[]).forEach((m) => all.add(m)) } catch { /* skip */ }
  }
  return Array.from(all).slice(0, 4)
}

export function getLastPerformanceV2(exerciseId: string): { weightKg: number; reps: number } | null {
  const row = db.getFirstSync<{ performed_weight: number; performed_reps: number }>(
    `SELECT ws.performed_weight, ws.performed_reps
     FROM workout_sets ws
     JOIN workout_sessions sess ON ws.session_id = sess.id
     WHERE ws.exercise_id = ? AND sess.ended_at IS NOT NULL
       AND ws.performed_weight IS NOT NULL AND ws.is_warmup = 0
     ORDER BY sess.date DESC, ws.set_number DESC
     LIMIT 1`,
    [exerciseId],
  )
  return row ? { weightKg: row.performed_weight, reps: row.performed_reps } : null
}

export function getPersonalBestV2(exerciseId: string, excludeSessionId: string): { weightKg: number } | null {
  const row = db.getFirstSync<{ max_weight: number | null }>(
    `SELECT MAX(performed_weight) AS max_weight FROM workout_sets
     WHERE exercise_id = ? AND session_id != ? AND performed_weight IS NOT NULL AND is_warmup = 0`,
    [exerciseId, excludeSessionId],
  )
  return row?.max_weight != null ? { weightKg: row.max_weight } : null
}

// ─── Session writes ───────────────────────────────────────────────────────────

export function insertSessionV2(args: {
  id: string; date: string; templateId?: string; startedAt: string; createdAt: string
}): void {
  db.runSync(
    'INSERT INTO workout_sessions (id, date, template_id, started_at, created_at) VALUES (?, ?, ?, ?, ?)',
    [args.id, args.date, args.templateId ?? null, args.startedAt, args.createdAt],
  )
}

export function updateSessionV2(args: {
  id: string; endedAt: string; durationSeconds: number; notes?: string; perceivedDifficulty?: number
}): void {
  db.runSync(
    'UPDATE workout_sessions SET ended_at = ?, duration_seconds = ?, notes = ?, perceived_difficulty = ? WHERE id = ?',
    [args.endedAt, args.durationSeconds, args.notes ?? null, args.perceivedDifficulty ?? null, args.id],
  )
}

export function discardSessionV2(id: string): void {
  db.runSync('DELETE FROM workout_sessions WHERE id = ?', [id])
}

// ─── Set writes ───────────────────────────────────────────────────────────────

export function insertSetV2(args: {
  id: string; sessionId: string; exerciseId: string; setNumber: number
  performedReps?: number; performedWeight?: number; rpe?: number
  isWarmup?: boolean; notes?: string; completedAt: string; createdAt: string
}): void {
  db.runSync(
    `INSERT INTO workout_sets
       (id, session_id, exercise_id, set_number, performed_reps, performed_weight,
        rpe, is_warmup, is_failed, notes, completed_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)`,
    [
      args.id, args.sessionId, args.exerciseId, args.setNumber,
      args.performedReps ?? null, args.performedWeight ?? null,
      args.rpe ?? null, args.isWarmup ? 1 : 0,
      args.notes ?? null, args.completedAt, args.createdAt,
    ],
  )
}

// ─── PR writes ────────────────────────────────────────────────────────────────

export function upsertExercisePRV2(args: {
  id: string; exerciseId: string; date: string
  weightKg: number; reps: number; estimatedOneRepMax: number
  sessionId: string; createdAt: string
}): void {
  db.runSync(
    `INSERT OR REPLACE INTO exercise_prs
       (id, exercise_id, date, weight_kg, reps, estimated_one_rep_max, session_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [args.id, args.exerciseId, args.date, args.weightKg, args.reps,
     args.estimatedOneRepMax, args.sessionId, args.createdAt],
  )
}

// ─── Session sets read ────────────────────────────────────────────────────────

export function getSetsForSession(sessionId: string): WorkoutSetV2[] {
  const rows = db.getAllSync<{
    id: string
    session_id: string
    exercise_id: string
    set_number: number
    target_reps: number | null
    performed_reps: number | null
    target_weight: number | null
    performed_weight: number | null
    rpe: number | null
    duration_seconds: number | null
    is_warmup: number
    is_failed: number
    tempo: string | null
    notes: string | null
    completed_at: string | null
    created_at: string
  }>(
    'SELECT * FROM workout_sets WHERE session_id = ? ORDER BY set_number ASC',
    [sessionId],
  )
  return rows.map((r) => ({
    id: r.id,
    sessionId: r.session_id,
    exerciseId: r.exercise_id,
    setNumber: r.set_number,
    targetReps: r.target_reps ?? undefined,
    performedReps: r.performed_reps ?? undefined,
    targetWeight: r.target_weight ?? undefined,
    performedWeight: r.performed_weight ?? undefined,
    rpe: r.rpe ?? undefined,
    durationSeconds: r.duration_seconds ?? undefined,
    isWarmup: r.is_warmup === 1,
    isFailed: r.is_failed === 1,
    tempo: r.tempo ?? undefined,
    notes: r.notes ?? undefined,
    completedAt: r.completed_at ?? undefined,
    createdAt: r.created_at,
  }))
}
