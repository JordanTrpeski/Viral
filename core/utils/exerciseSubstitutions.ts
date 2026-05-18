import type { ExerciseV2, ExerciseEquipmentV2 } from '@modules/health/shared/types'

// ─── Substitution logic ───────────────────────────────────────────────────────
//
// Priority order:
//   1. Exercises listed in exercise.substituteIds (curated by the seed data)
//   2. Fallback: same primary muscle, same equipment
//   3. Fallback: same primary muscle, any equipment (filtered by availableEquipment)
//
// Never returns the source exercise itself.

export function getSubstitutes(
  exercise: ExerciseV2,
  allExercises: ExerciseV2[],
  availableEquipment?: ExerciseEquipmentV2[],
): ExerciseV2[] {
  const exclude = new Set([exercise.id])

  // 1. Curated substitutes from seed data
  const curated = exercise.substituteIds
    .map((id) => allExercises.find((e) => e.id === id))
    .filter((e): e is ExerciseV2 => e != null && !exclude.has(e.id))
    .filter((e) => !availableEquipment || availableEquipment.includes(e.equipment))

  if (curated.length >= 3) return curated.slice(0, 6)

  // 2. Same primary muscle + same equipment
  const sameEquip = allExercises.filter(
    (e) =>
      !exclude.has(e.id) &&
      e.equipment === exercise.equipment &&
      e.primaryMuscles.some((m) => exercise.primaryMuscles.includes(m)) &&
      !curated.some((c) => c.id === e.id),
  )

  // 3. Same primary muscle, available equipment
  const sameMuscle = allExercises.filter(
    (e) =>
      !exclude.has(e.id) &&
      e.primaryMuscles.some((m) => exercise.primaryMuscles.includes(m)) &&
      !curated.some((c) => c.id === e.id) &&
      !sameEquip.some((s) => s.id === e.id) &&
      (!availableEquipment || availableEquipment.includes(e.equipment)),
  )

  return [...curated, ...sameEquip, ...sameMuscle].slice(0, 6)
}

// Equipment filter helper — used across builder, library, and swap sheet
export function filterByEquipment<T extends { equipment: ExerciseEquipmentV2 }>(
  items: T[],
  available: ExerciseEquipmentV2[] | undefined,
): T[] {
  if (!available || available.length === 0) return items
  return items.filter((i) => available.includes(i.equipment))
}
