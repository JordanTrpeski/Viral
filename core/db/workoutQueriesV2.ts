import { db } from './database'
import type {
  ExerciseV2,
  ExercisePR,
  WorkoutSessionV2,
  WorkoutSetV2,
  WorkoutTemplateV2,
  TemplateExerciseV2,
  GoalType,
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
  start_image: string | null
  end_image: string | null
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
    startImage: row.start_image ?? undefined,
    endImage: row.end_image ?? undefined,
    createdAt: row.created_at,
  }
}

// ─── Custom Exercise Row ──────────────────────────────────────────────────────

type CustomExerciseRow = {
  id: string
  name: string
  category: string
  equipment: string
  difficulty: string
  primary_muscles: string
  secondary_muscles: string | null
  notes: string | null
  created_at: string
}

function parseCustomExerciseRow(row: CustomExerciseRow): ExerciseV2 {
  return {
    id: row.id,
    name: row.name,
    slug: row.id,   // custom exercises have no slug; id is unique enough
    category: row.category as ExerciseV2['category'],
    primaryMuscles: JSON.parse(row.primary_muscles ?? '[]'),
    secondaryMuscles: JSON.parse(row.secondary_muscles ?? '[]'),
    equipment: row.equipment as ExerciseV2['equipment'],
    movementPattern: undefined,
    description: undefined,
    formCues: [],
    commonMistakes: [],
    difficulty: row.difficulty as ExerciseV2['difficulty'],
    substituteIds: [],
    isUnilateral: false,
    isCustom: true,
    customNotes: row.notes ?? undefined,
    createdAt: row.created_at,
  }
}

// ─── Exercise Library ─────────────────────────────────────────────────────────

export function getAllExercises(): ExerciseV2[] {
  const seeded = db.getAllSync<ExerciseRow>(
    'SELECT * FROM exercises ORDER BY name ASC',
  ).map(parseExerciseRow)
  const custom = db.getAllSync<CustomExerciseRow>(
    'SELECT * FROM custom_exercises ORDER BY name ASC',
  ).map(parseCustomExerciseRow)
  // Merge and sort: custom exercises appear inline alphabetically
  return [...seeded, ...custom].sort((a, b) => a.name.localeCompare(b.name))
}

export function searchExercises(query: string): ExerciseV2[] {
  const q = `%${query}%`
  const seeded = db.getAllSync<ExerciseRow>(
    `SELECT * FROM exercises WHERE name LIKE ? OR primary_muscles LIKE ? ORDER BY name ASC`,
    [q, q],
  ).map(parseExerciseRow)
  const custom = db.getAllSync<CustomExerciseRow>(
    `SELECT * FROM custom_exercises WHERE name LIKE ? OR primary_muscles LIKE ? ORDER BY name ASC`,
    [q, q],
  ).map(parseCustomExerciseRow)
  return [...seeded, ...custom].sort((a, b) => a.name.localeCompare(b.name))
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
    'SELECT * FROM exercises WHERE id = ?', [id],
  )
  if (row) return parseExerciseRow(row)
  // Fall through to user-created exercises
  const custom = db.getFirstSync<CustomExerciseRow>(
    'SELECT * FROM custom_exercises WHERE id = ?', [id],
  )
  return custom ? parseCustomExerciseRow(custom) : null
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

// ─── Custom Exercise CRUD ─────────────────────────────────────────────────────

export interface CustomExerciseParams {
  id: string
  name: string
  category: ExerciseV2['category']
  equipment: ExerciseV2['equipment']
  difficulty: ExerciseV2['difficulty']
  primaryMuscles: string[]
  secondaryMuscles: string[]
  notes: string | null
}

export function insertCustomExercise(p: CustomExerciseParams): void {
  const now = new Date().toISOString()
  db.runSync(
    `INSERT INTO custom_exercises
       (id, name, category, equipment, difficulty, primary_muscles, secondary_muscles, notes, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      p.id, p.name, p.category, p.equipment, p.difficulty,
      JSON.stringify(p.primaryMuscles),
      p.secondaryMuscles.length > 0 ? JSON.stringify(p.secondaryMuscles) : null,
      p.notes, now,
    ],
  )
}

export function updateCustomExercise(p: CustomExerciseParams): void {
  db.runSync(
    `UPDATE custom_exercises SET
       name=?, category=?, equipment=?, difficulty=?,
       primary_muscles=?, secondary_muscles=?, notes=?
     WHERE id=?`,
    [
      p.name, p.category, p.equipment, p.difficulty,
      JSON.stringify(p.primaryMuscles),
      p.secondaryMuscles.length > 0 ? JSON.stringify(p.secondaryMuscles) : null,
      p.notes, p.id,
    ],
  )
}

export function deleteCustomExercise(id: string): void {
  db.runSync('DELETE FROM custom_exercises WHERE id=?', [id])
}

export function getCustomExerciseById(id: string): ExerciseV2 | null {
  const row = db.getFirstSync<CustomExerciseRow>(
    'SELECT * FROM custom_exercises WHERE id=?', [id],
  )
  return row ? parseCustomExerciseRow(row) : null
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
  templateName?: string
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
       (id, exercise_id, date, weight_kg, reps, estimated_one_rep_max, session_id, created_at, metric_type)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [args.id, args.exerciseId, args.date, args.weightKg, args.reps,
     args.estimatedOneRepMax, args.sessionId, args.createdAt, 'max_weight'],
  )
}

// ─── Template V2 CRUD ─────────────────────────────────────────────────────────

export interface TemplateWithMetaV2 {
  template: WorkoutTemplateV2
  exerciseCount: number
  primaryMuscles: string[]
  lastUsedDate: string | null
}

export interface TemplateExerciseWithDetails extends TemplateExerciseV2 {
  exercise: ExerciseV2
}

function parseTemplateRow(r: {
  id: string; name: string; description: string | null; goal_type: string | null
  duration_weeks: number | null; days_per_week: number | null; created_at: string
}): WorkoutTemplateV2 {
  return {
    id: r.id, name: r.name,
    description: r.description ?? undefined,
    goalType: r.goal_type ? (r.goal_type as GoalType) : undefined,
    durationWeeks: r.duration_weeks ?? undefined,
    daysPerWeek: r.days_per_week ?? undefined,
    createdAt: r.created_at,
  }
}

export function getTemplatesV2(): WorkoutTemplateV2[] {
  return db.getAllSync<{
    id: string; name: string; description: string | null; goal_type: string | null
    duration_weeks: number | null; days_per_week: number | null; created_at: string
  }>('SELECT * FROM workout_templates ORDER BY created_at DESC').map(parseTemplateRow)
}

export function getTemplateByIdV2(id: string): WorkoutTemplateV2 | null {
  const r = db.getFirstSync<{
    id: string; name: string; description: string | null; goal_type: string | null
    duration_weeks: number | null; days_per_week: number | null; created_at: string
  }>('SELECT * FROM workout_templates WHERE id = ?', [id])
  return r ? parseTemplateRow(r) : null
}

export function getTemplatesWithMetaV2(): TemplateWithMetaV2[] {
  const templates = getTemplatesV2()
  return templates.map((template) => {
    const exercises = getTemplateExercisesV2(template.id)
    const muscles = [...new Set(exercises.flatMap((e) => e.exercise.primaryMuscles))].slice(0, 4)
    const lastUsed = db.getFirstSync<{ date: string | null }>(
      `SELECT MAX(date) AS date FROM workout_sessions WHERE template_id = ? AND ended_at IS NOT NULL`,
      [template.id],
    )
    return {
      template,
      exerciseCount: exercises.length,
      primaryMuscles: muscles,
      lastUsedDate: lastUsed?.date ?? null,
    }
  })
}

export function getTemplateExercisesV2(templateId: string): TemplateExerciseWithDetails[] {
  const rows = db.getAllSync<{
    te_id: string; te_template_id: string; te_exercise_id: string
    te_day_number: number; te_order_index: number; te_sets: number
    te_rep_min: number | null; te_rep_max: number | null
    te_rest_seconds: number | null; te_is_optional: number; te_created_at: string
    ex_id: string; ex_name: string; ex_slug: string; ex_category: string
    ex_primary_muscles: string; ex_secondary_muscles: string; ex_equipment: string
    ex_movement_pattern: string | null; ex_description: string | null
    ex_form_cues: string; ex_common_mistakes: string; ex_difficulty: string
    ex_substitute_ids: string; ex_is_unilateral: number; ex_created_at: string
  }>(
    `SELECT
       te.id AS te_id, te.template_id AS te_template_id,
       te.exercise_id AS te_exercise_id, te.day_number AS te_day_number,
       te.order_index AS te_order_index, te.sets AS te_sets,
       te.rep_min AS te_rep_min, te.rep_max AS te_rep_max,
       te.rest_seconds AS te_rest_seconds, te.is_optional AS te_is_optional,
       te.created_at AS te_created_at,
       ex.id AS ex_id, ex.name AS ex_name, ex.slug AS ex_slug,
       ex.category AS ex_category, ex.primary_muscles AS ex_primary_muscles,
       ex.secondary_muscles AS ex_secondary_muscles, ex.equipment AS ex_equipment,
       ex.movement_pattern AS ex_movement_pattern, ex.description AS ex_description,
       ex.form_cues AS ex_form_cues, ex.common_mistakes AS ex_common_mistakes,
       ex.difficulty AS ex_difficulty, ex.substitute_ids AS ex_substitute_ids,
       ex.is_unilateral AS ex_is_unilateral, ex.created_at AS ex_created_at
     FROM template_exercises te
     JOIN exercises ex ON te.exercise_id = ex.id
     WHERE te.template_id = ?
     ORDER BY te.day_number ASC, te.order_index ASC`,
    [templateId],
  )
  return rows.map((r) => ({
    id: r.te_id,
    templateId: r.te_template_id,
    exerciseId: r.te_exercise_id,
    dayNumber: r.te_day_number,
    orderIndex: r.te_order_index,
    sets: r.te_sets,
    repMin: r.te_rep_min ?? undefined,
    repMax: r.te_rep_max ?? undefined,
    restSeconds: r.te_rest_seconds ?? undefined,
    isOptional: r.te_is_optional === 1,
    createdAt: r.te_created_at,
    exercise: {
      id: r.ex_id, name: r.ex_name, slug: r.ex_slug,
      category: r.ex_category as ExerciseV2['category'],
      primaryMuscles: JSON.parse(r.ex_primary_muscles ?? '[]'),
      secondaryMuscles: JSON.parse(r.ex_secondary_muscles ?? '[]'),
      equipment: r.ex_equipment as ExerciseV2['equipment'],
      movementPattern: r.ex_movement_pattern ? (r.ex_movement_pattern as ExerciseV2['movementPattern']) : undefined,
      description: r.ex_description ?? undefined,
      formCues: JSON.parse(r.ex_form_cues ?? '[]'),
      commonMistakes: JSON.parse(r.ex_common_mistakes ?? '[]'),
      difficulty: r.ex_difficulty as ExerciseV2['difficulty'],
      substituteIds: JSON.parse(r.ex_substitute_ids ?? '[]'),
      isUnilateral: r.ex_is_unilateral === 1,
      createdAt: r.ex_created_at,
    },
  }))
}

export function insertTemplateV2(args: {
  id: string; name: string; description?: string; goalType?: GoalType
  durationWeeks?: number; daysPerWeek?: number; createdAt: string
}): void {
  db.runSync(
    `INSERT INTO workout_templates (id, name, description, goal_type, duration_weeks, days_per_week, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [args.id, args.name, args.description ?? null, args.goalType ?? null,
     args.durationWeeks ?? null, args.daysPerWeek ?? null, args.createdAt],
  )
}

export function insertTemplateExerciseV2(args: {
  id: string; templateId: string; exerciseId: string
  dayNumber: number; orderIndex: number; sets: number
  repMin?: number; repMax?: number; restSeconds?: number; createdAt: string
}): void {
  db.runSync(
    `INSERT INTO template_exercises
       (id, template_id, exercise_id, day_number, order_index, sets, rep_min, rep_max, rest_seconds, is_optional, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
    [args.id, args.templateId, args.exerciseId, args.dayNumber, args.orderIndex,
     args.sets, args.repMin ?? null, args.repMax ?? null, args.restSeconds ?? null, args.createdAt],
  )
}

export function updateTemplateNameV2(id: string, name: string): void {
  db.runSync('UPDATE workout_templates SET name = ? WHERE id = ?', [name, id])
}

export function updateTemplateV2(id: string, args: {
  name: string; goalType?: GoalType; description?: string
}): void {
  db.runSync(
    'UPDATE workout_templates SET name = ?, goal_type = ?, description = ? WHERE id = ?',
    [args.name, args.goalType ?? null, args.description ?? null, id],
  )
}

export function deleteTemplateV2(id: string): void {
  db.runSync('DELETE FROM workout_templates WHERE id = ?', [id])
}

export function deleteTemplateExercisesV2(templateId: string): void {
  db.runSync('DELETE FROM template_exercises WHERE template_id = ?', [templateId])
}

export function isProgramSeeded(): boolean {
  const row = db.getFirstSync<{ c: number }>(
    `SELECT COUNT(*) AS c FROM workout_templates WHERE duration_weeks IS NOT NULL`,
  )
  return (row?.c ?? 0) > 0
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

// ─── History ──────────────────────────────────────────────────────────────────

export function getAllSessionsV2(): SessionSummaryRowV2[] {
  const rows = db.getAllSync<{
    id: string; date: string; template_id: string | null
    duration_seconds: number | null; started_at: string; ended_at: string | null
    created_at: string; exercise_count: number; total_sets: number; total_volume: number
    template_name: string | null
  }>(
    `SELECT sess.id, sess.date, sess.template_id, sess.duration_seconds,
            sess.started_at, sess.ended_at, sess.created_at,
            COUNT(DISTINCT ws.exercise_id) AS exercise_count,
            COUNT(ws.id) AS total_sets,
            COALESCE(SUM(COALESCE(ws.performed_weight,0) * COALESCE(ws.performed_reps,0)), 0) AS total_volume,
            wt.name AS template_name
     FROM workout_sessions sess
     LEFT JOIN workout_sets ws ON ws.session_id = sess.id AND ws.is_warmup = 0
     LEFT JOIN workout_templates wt ON wt.id = sess.template_id
     WHERE sess.ended_at IS NOT NULL
     GROUP BY sess.id
     ORDER BY sess.date DESC, sess.started_at DESC`,
  )
  return rows.map((r) => ({
    id: r.id, date: r.date, templateId: r.template_id,
    durationSeconds: r.duration_seconds, startedAt: r.started_at,
    endedAt: r.ended_at, createdAt: r.created_at,
    exerciseCount: r.exercise_count, totalSets: r.total_sets, totalVolume: r.total_volume,
    templateName: r.template_name ?? undefined,
  }))
}

export interface SessionDetailV2 {
  session: WorkoutSessionV2
  templateName: string | null
  exercises: {
    exercise: ExerciseV2
    sets: WorkoutSetV2[]
  }[]
  totalVolumeKg: number
}

export function getSessionDetailV2(sessionId: string): SessionDetailV2 | null {
  const sessionRow = db.getFirstSync<{
    id: string; date: string; template_id: string | null
    duration_seconds: number | null; notes: string | null; perceived_difficulty: number | null
    started_at: string; ended_at: string | null; created_at: string
    template_name: string | null
  }>(
    `SELECT sess.*, wt.name AS template_name
     FROM workout_sessions sess
     LEFT JOIN workout_templates wt ON wt.id = sess.template_id
     WHERE sess.id = ?`,
    [sessionId],
  )
  if (!sessionRow) return null

  const session: WorkoutSessionV2 = {
    id: sessionRow.id, date: sessionRow.date,
    templateId: sessionRow.template_id ?? undefined,
    durationSeconds: sessionRow.duration_seconds ?? undefined,
    notes: sessionRow.notes ?? undefined,
    perceivedDifficulty: sessionRow.perceived_difficulty ?? undefined,
    startedAt: sessionRow.started_at,
    endedAt: sessionRow.ended_at ?? undefined,
    createdAt: sessionRow.created_at,
  }

  const setRows = db.getAllSync<{
    id: string; session_id: string; exercise_id: string; set_number: number
    performed_reps: number | null; performed_weight: number | null
    rpe: number | null; duration_seconds: number | null
    is_warmup: number; is_failed: number; notes: string | null
    completed_at: string | null; created_at: string
    ex_id: string; ex_name: string; ex_slug: string; ex_category: string
    ex_primary_muscles: string; ex_secondary_muscles: string; ex_equipment: string
    ex_movement_pattern: string | null; ex_description: string | null
    ex_form_cues: string; ex_common_mistakes: string; ex_difficulty: string
    ex_substitute_ids: string; ex_is_unilateral: number; ex_created_at: string
  }>(
    `SELECT ws.id, ws.session_id, ws.exercise_id, ws.set_number,
            ws.performed_reps, ws.performed_weight, ws.rpe, ws.duration_seconds,
            ws.is_warmup, ws.is_failed, ws.notes, ws.completed_at, ws.created_at,
            ex.id AS ex_id, ex.name AS ex_name, ex.slug AS ex_slug,
            ex.category AS ex_category, ex.primary_muscles AS ex_primary_muscles,
            ex.secondary_muscles AS ex_secondary_muscles, ex.equipment AS ex_equipment,
            ex.movement_pattern AS ex_movement_pattern, ex.description AS ex_description,
            ex.form_cues AS ex_form_cues, ex.common_mistakes AS ex_common_mistakes,
            ex.difficulty AS ex_difficulty, ex.substitute_ids AS ex_substitute_ids,
            ex.is_unilateral AS ex_is_unilateral, ex.created_at AS ex_created_at
     FROM workout_sets ws
     JOIN exercises ex ON ws.exercise_id = ex.id
     WHERE ws.session_id = ?
     ORDER BY ws.exercise_id, ws.set_number ASC`,
    [sessionId],
  )

  const exerciseMap = new Map<string, { exercise: ExerciseV2; sets: WorkoutSetV2[] }>()
  const exerciseOrder: string[] = []

  for (const r of setRows) {
    if (!exerciseMap.has(r.ex_id)) {
      exerciseOrder.push(r.ex_id)
      exerciseMap.set(r.ex_id, {
        exercise: {
          id: r.ex_id, name: r.ex_name, slug: r.ex_slug,
          category: r.ex_category as ExerciseV2['category'],
          primaryMuscles: JSON.parse(r.ex_primary_muscles ?? '[]'),
          secondaryMuscles: JSON.parse(r.ex_secondary_muscles ?? '[]'),
          equipment: r.ex_equipment as ExerciseV2['equipment'],
          movementPattern: r.ex_movement_pattern ? (r.ex_movement_pattern as ExerciseV2['movementPattern']) : undefined,
          description: r.ex_description ?? undefined,
          formCues: JSON.parse(r.ex_form_cues ?? '[]'),
          commonMistakes: JSON.parse(r.ex_common_mistakes ?? '[]'),
          difficulty: r.ex_difficulty as ExerciseV2['difficulty'],
          substituteIds: JSON.parse(r.ex_substitute_ids ?? '[]'),
          isUnilateral: r.ex_is_unilateral === 1,
          createdAt: r.ex_created_at,
        },
        sets: [],
      })
    }
    exerciseMap.get(r.ex_id)!.sets.push({
      id: r.id, sessionId: r.session_id, exerciseId: r.exercise_id,
      setNumber: r.set_number,
      performedReps: r.performed_reps ?? undefined,
      performedWeight: r.performed_weight ?? undefined,
      rpe: r.rpe ?? undefined,
      durationSeconds: r.duration_seconds ?? undefined,
      isWarmup: r.is_warmup === 1, isFailed: r.is_failed === 1,
      notes: r.notes ?? undefined, completedAt: r.completed_at ?? undefined,
      createdAt: r.created_at,
    })
  }

  const exercises = exerciseOrder.map((id) => exerciseMap.get(id)!)
  const totalVolumeKg = exercises.flatMap((e) => e.sets)
    .filter((s) => !s.isWarmup)
    .reduce((sum, s) => sum + (s.performedWeight ?? 0) * (s.performedReps ?? 0), 0)

  return { session, templateName: sessionRow.template_name, exercises, totalVolumeKg }
}

export function getLastSessionByTemplateV2(templateId: string, excludeSessionId: string): SessionDetailV2 | null {
  const row = db.getFirstSync<{ id: string }>(
    `SELECT id FROM workout_sessions
     WHERE template_id = ? AND ended_at IS NOT NULL AND id != ?
     ORDER BY date DESC, started_at DESC LIMIT 1`,
    [templateId, excludeSessionId],
  )
  return row ? getSessionDetailV2(row.id) : null
}

// ─── PRs ──────────────────────────────────────────────────────────────────────

export interface PRRowV2 {
  exerciseId: string
  exerciseName: string
  weightKg: number
  reps: number
  estimatedOneRM: number
  date: string
  sessionId: string
}

export function getAllPRsV2(): PRRowV2[] {
  return db.getAllSync<{
    exercise_id: string; name: string; weight_kg: number; reps: number
    estimated_one_rep_max: number; date: string; session_id: string
  }>(
    `SELECT ep.exercise_id, ex.name, ep.weight_kg, ep.reps,
            ep.estimated_one_rep_max, ep.date, ep.session_id
     FROM exercise_prs ep
     JOIN exercises ex ON ex.id = ep.exercise_id
     ORDER BY ep.estimated_one_rep_max DESC`,
  ).map((r) => ({
    exerciseId: r.exercise_id, exerciseName: r.name,
    weightKg: r.weight_kg, reps: r.reps,
    estimatedOneRM: r.estimated_one_rep_max,
    date: r.date, sessionId: r.session_id,
  }))
}

// ─── Volume analytics ─────────────────────────────────────────────────────────

export interface WeeklyMuscleVolumeV2 {
  weekStart: string
  muscle: string
  sets: number
}

export function getWeeklyVolumeByMuscleV2(weeksBack: number): WeeklyMuscleVolumeV2[] {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - weeksBack * 7)
  const cutoffStr = cutoff.toISOString().slice(0, 10)

  const rows = db.getAllSync<{
    week_start: string; primary_muscles: string; set_count: number
  }>(
    `SELECT
       date(sess.date, 'weekday 0', '-6 days') AS week_start,
       ex.primary_muscles,
       COUNT(ws.id) AS set_count
     FROM workout_sets ws
     JOIN workout_sessions sess ON ws.session_id = sess.id
     JOIN exercises ex ON ws.exercise_id = ex.id
     WHERE sess.ended_at IS NOT NULL AND ws.is_warmup = 0 AND sess.date >= ?
     GROUP BY week_start, ex.id`,
    [cutoffStr],
  )

  const result: WeeklyMuscleVolumeV2[] = []
  for (const r of rows) {
    let muscles: string[] = []
    try { muscles = JSON.parse(r.primary_muscles ?? '[]') } catch { /* skip */ }
    for (const muscle of muscles) {
      const existing = result.find((x) => x.weekStart === r.week_start && x.muscle === muscle)
      if (existing) {
        existing.sets += r.set_count
      } else {
        result.push({ weekStart: r.week_start, muscle, sets: r.set_count })
      }
    }
  }
  return result
}

// ─── Streak ───────────────────────────────────────────────────────────────────

export interface WorkoutStreakV2 {
  currentStreakWeeks: number
  longestStreakWeeks: number
  thisWeekCount: number
  thisWeekTarget: number
}

export function getWorkoutStreakV2(minPerWeek: number = 2): WorkoutStreakV2 {
  const rows = db.getAllSync<{ date: string }>(
    `SELECT DISTINCT date FROM workout_sessions WHERE ended_at IS NOT NULL ORDER BY date DESC`,
  )

  const today = new Date()
  const monday = (d: Date) => {
    const dt = new Date(d)
    const day = dt.getDay()
    dt.setDate(dt.getDate() - ((day + 6) % 7))
    dt.setHours(0, 0, 0, 0)
    return dt
  }
  const weekKey = (d: Date) => monday(d).toISOString().slice(0, 10)

  const weekCounts = new Map<string, number>()
  for (const r of rows) {
    const k = weekKey(new Date(r.date))
    weekCounts.set(k, (weekCounts.get(k) ?? 0) + 1)
  }

  const thisWeek = weekKey(today)
  const thisWeekCount = weekCounts.get(thisWeek) ?? 0

  // Current streak: walk backwards from current week
  let current = 0
  let wk = monday(today)
  while (true) {
    const k = wk.toISOString().slice(0, 10)
    if ((weekCounts.get(k) ?? 0) >= minPerWeek) {
      current++
      wk.setDate(wk.getDate() - 7)
    } else {
      break
    }
  }

  // Longest streak: scan all weeks in order
  const allWeeks = [...weekCounts.keys()].sort()
  let longest = 0
  let run = 0
  for (const k of allWeeks) {
    if ((weekCounts.get(k) ?? 0) >= minPerWeek) {
      run++
      longest = Math.max(longest, run)
    } else {
      run = 0
    }
  }

  return { currentStreakWeeks: current, longestStreakWeeks: longest, thisWeekCount, thisWeekTarget: minPerWeek }
}
