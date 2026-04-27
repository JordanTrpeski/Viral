import type { WorkoutSet } from '@modules/health/shared/types'

export function calcTotalVolume(sets: Pick<WorkoutSet, 'weightKg' | 'reps'>[]): number {
  return sets.reduce((sum, s) => sum + (s.weightKg ?? 0) * (s.reps ?? 0), 0)
}

// Epley formula
export function estimateOneRM(weightKg: number, reps: number): number {
  if (reps <= 1) return weightKg
  return Math.round(weightKg * (1 + reps / 30))
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

export function formatVolume(kg: number): string {
  return kg >= 1000 ? `${(kg / 1000).toFixed(1)}t` : `${kg} kg`
}

export function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}
