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
