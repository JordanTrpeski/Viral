import { db } from './database'
import type { Exercise, MuscleGroup, Equipment } from '@modules/health/shared/types'

interface RawExercise {
  id: string
  name: string
  muscle_group: string
  equipment: string | null
  is_custom: number
  created_at: string
}

function rowToExercise(row: RawExercise): Exercise {
  return {
    id: row.id,
    name: row.name,
    muscleGroup: row.muscle_group as MuscleGroup,
    equipment: row.equipment as Equipment | undefined,
    isCustom: row.is_custom === 1,
    createdAt: row.created_at,
  }
}

export function dbGetExercises(): Exercise[] {
  return db.getAllSync<RawExercise>('SELECT * FROM exercises ORDER BY name ASC').map(rowToExercise)
}

export function dbGetExercise(id: string): Exercise | null {
  const row = db.getFirstSync<RawExercise>('SELECT * FROM exercises WHERE id = ?', [id])
  return row ? rowToExercise(row) : null
}

export function dbInsertExercise(exercise: Exercise): void {
  db.runSync(
    'INSERT INTO exercises (id, name, muscle_group, equipment, is_custom, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    [exercise.id, exercise.name, exercise.muscleGroup, exercise.equipment ?? null, exercise.isCustom ? 1 : 0, exercise.createdAt],
  )
}

export function dbGetLastPerformance(exerciseId: string): { weightKg: number; reps: number } | null {
  const row = db.getFirstSync<{ weight_kg: number; reps: number }>(
    `SELECT ws.weight_kg, ws.reps
     FROM workout_sets ws
     JOIN workout_sessions sess ON ws.session_id = sess.id
     WHERE ws.exercise_id = ? AND sess.ended_at IS NOT NULL AND ws.weight_kg IS NOT NULL
     ORDER BY sess.date DESC, ws.set_number DESC
     LIMIT 1`,
    [exerciseId],
  )
  return row ? { weightKg: row.weight_kg, reps: row.reps } : null
}

export function dbGetPersonalBestExcluding(exerciseId: string, excludeSessionId: string): { weightKg: number } | null {
  const row = db.getFirstSync<{ weight_kg: number }>(
    `SELECT MAX(weight_kg) as weight_kg FROM workout_sets
     WHERE exercise_id = ? AND session_id != ? AND weight_kg IS NOT NULL`,
    [exerciseId, excludeSessionId],
  )
  return row?.weight_kg != null ? { weightKg: row.weight_kg } : null
}

export function dbGetExerciseHistory(exerciseId: string): { date: string; maxWeightKg: number; totalVolumeKg: number }[] {
  return db.getAllSync<{ date: string; max_weight: number; total_volume: number }>(
    `SELECT sess.date, MAX(ws.weight_kg) as max_weight,
            COALESCE(SUM(ws.weight_kg * ws.reps), 0) as total_volume
     FROM workout_sets ws
     JOIN workout_sessions sess ON ws.session_id = sess.id
     WHERE ws.exercise_id = ? AND sess.ended_at IS NOT NULL AND ws.weight_kg IS NOT NULL
     GROUP BY sess.id
     ORDER BY sess.date ASC`,
    [exerciseId],
  ).map((r) => ({ date: r.date, maxWeightKg: r.max_weight, totalVolumeKg: r.total_volume }))
}
