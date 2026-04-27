import { db } from './database'
import type { WorkoutTemplate, TemplateExercise, Exercise, MuscleGroup, Equipment } from '@modules/health/shared/types'

export function dbGetTemplates(): WorkoutTemplate[] {
  return db.getAllSync<{ id: string; name: string; created_at: string }>(
    'SELECT * FROM workout_templates ORDER BY created_at DESC',
  ).map((r) => ({ id: r.id, name: r.name, createdAt: r.created_at }))
}

export function dbInsertTemplate(template: WorkoutTemplate): void {
  db.runSync(
    'INSERT INTO workout_templates (id, name, created_at) VALUES (?, ?, ?)',
    [template.id, template.name, template.createdAt],
  )
}

export function dbUpdateTemplateName(id: string, name: string): void {
  db.runSync('UPDATE workout_templates SET name = ? WHERE id = ?', [name, id])
}

export function dbDeleteTemplate(id: string): void {
  db.runSync('DELETE FROM workout_templates WHERE id = ?', [id])
}

export function dbInsertTemplateExercise(te: TemplateExercise): void {
  db.runSync(
    'INSERT INTO template_exercises (id, template_id, exercise_id, order_index, created_at) VALUES (?, ?, ?, ?, ?)',
    [te.id, te.templateId, te.exerciseId, te.orderIndex, te.createdAt],
  )
}

export function dbGetTemplateExercises(templateId: string): Exercise[] {
  return db.getAllSync<{
    id: string; name: string; muscle_group: string; equipment: string | null
    is_custom: number; created_at: string
  }>(
    `SELECT ex.* FROM template_exercises te
     JOIN exercises ex ON te.exercise_id = ex.id
     WHERE te.template_id = ?
     ORDER BY te.order_index ASC`,
    [templateId],
  ).map((r) => ({
    id: r.id, name: r.name,
    muscleGroup: r.muscle_group as MuscleGroup,
    equipment: r.equipment as Equipment | undefined,
    isCustom: r.is_custom === 1, createdAt: r.created_at,
  }))
}

export interface TemplateWithMeta {
  template: WorkoutTemplate
  exerciseCount: number
  muscleGroups: string[]
}

export function dbGetTemplatesWithMeta(): TemplateWithMeta[] {
  const templates = dbGetTemplates()
  return templates.map((template) => {
    const exercises = dbGetTemplateExercises(template.id)
    const muscleGroups = [...new Set(exercises.map((e) => e.muscleGroup))]
    return { template, exerciseCount: exercises.length, muscleGroups }
  })
}
