import type { StepSession, ActivityType, InclineLevel } from '@modules/health/shared/types'

// MET values by activity type (base, at typical cadence)
const MET_BASE: Record<ActivityType, number> = {
  walk: 3.5,
  hike: 4.3,
  jog:  7.0,
  run:  10.5,
}

// Incline MET modifier per level (0=flat, 1=slight, 2=moderate, 3=steep)
const INCLINE_MET: Record<ActivityType, number> = {
  walk: 0.5,
  hike: 0.7,
  jog:  0.8,
  run:  1.0,
}

// Typical cadence (steps/min) by activity — used to estimate duration from steps alone
const CADENCE: Record<ActivityType, number> = {
  walk: 100,
  hike: 90,
  jog:  140,
  run:  165,
}

function metForSession(type: ActivityType, incline: InclineLevel): number {
  return MET_BASE[type] + INCLINE_MET[type] * incline
}

function sessionCalories(session: StepSession, weightKg: number): number {
  const met = metForSession(session.activityType, session.incline)
  const durationMin = session.durationMinutes ?? session.stepCount / CADENCE[session.activityType]
  return met * weightKg * (durationMin / 60)
}

export function estimateCalories(
  stepCount: number,
  weightKg: number,
  heightCm: number,
  sessions: StepSession[],
): { low: number; high: number } {
  if (stepCount <= 0) return { low: 0, high: 0 }

  if (sessions.length > 0) {
    const sessionTotal = sessions.reduce((sum, s) => sum + sessionCalories(s, weightKg), 0)
    const sessionSteps = sessions.reduce((sum, s) => sum + s.stepCount, 0)
    const residualSteps = Math.max(0, stepCount - sessionSteps)
    const residualMin = residualSteps / CADENCE.walk
    // Residual range: slow walk (MET 2.5) → brisk walk (MET 4.3)
    const residualLow  = 2.5 * weightKg * (residualMin / 60)
    const residualHigh = 4.3 * weightKg * (residualMin / 60)
    return {
      low:  Math.round(sessionTotal + residualLow),
      high: Math.round(sessionTotal + residualHigh),
    }
  }

  // No sessions — range from slow walk to brisk walk (pace unknown)
  const durationMin = stepCount / CADENCE.walk
  const low  = Math.round(2.5 * weightKg * (durationMin / 60))
  const high = Math.round(4.3 * weightKg * (durationMin / 60))
  return { low, high }
}

export function strideMetres(heightCm: number, running = false): number {
  return running
    ? (0.413 * heightCm / 100) * 1.14
    : 0.415 * heightCm / 100
}

export function formatDistance(steps: number, heightCm: number): string {
  const km = (steps * strideMetres(heightCm)) / 1000
  return km >= 1 ? `${km.toFixed(1)} km` : `${Math.round(km * 1000)} m`
}

export function formatSteps(n: number): string {
  return n.toLocaleString()
}

export function defaultGoal(dateOfBirth: string): number {
  const age = new Date().getFullYear() - new Date(dateOfBirth).getFullYear()
  if (age < 30) return 10000
  if (age < 50) return 9000
  return 7500
}

export const ACTIVITY_LABELS: Record<ActivityType, string> = {
  walk: 'Walk',
  hike: 'Hike',
  jog:  'Jog',
  run:  'Run',
}

export const INCLINE_LABELS: Record<InclineLevel, string> = {
  0: 'Flat',
  1: 'Slight (~3%)',
  2: 'Moderate (~6%)',
  3: 'Steep (~10%+)',
}
