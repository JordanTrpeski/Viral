// ─── Double Progression Logic ─────────────────────────────────────────────────
//
// Rules:
//   1. If every set hit the top of the rep range → increase weight by step
//   2. If any set missed the bottom of the rep range → maintain (failed)
//   3. If weight unchanged for 3+ consecutive sessions → deload by 10%
//
// This is intentionally simple — no periodisation model, no velocity tracking.

export type ProgressionAction = 'increase' | 'maintain' | 'deload'

export interface ProgressionSuggestion {
  action: ProgressionAction
  newWeightKg: number
  reason: string
}

export interface SetRecord {
  reps: number
  weightKg: number
}

export interface SessionRecord {
  weightKg: number
  sets: SetRecord[]
}

function round(kg: number, step: number): number {
  return Math.round(kg / step) * step
}

function incrementStep(weightKg: number): number {
  if (weightKg < 40) return 2.5
  if (weightKg < 80) return 2.5
  return 5
}

export function suggestProgression(args: {
  currentWeightKg: number
  repMin: number
  repMax: number
  lastSessionSets: SetRecord[]
  recentHistory: SessionRecord[]
}): ProgressionSuggestion {
  const { currentWeightKg, repMin, repMax, lastSessionSets, recentHistory } = args

  if (lastSessionSets.length === 0) {
    return { action: 'maintain', newWeightKg: currentWeightKg, reason: 'No sets recorded yet.' }
  }

  const allHitTop = lastSessionSets.every((s) => s.reps >= repMax)
  const anyMissedBottom = lastSessionSets.some((s) => s.reps < repMin)

  if (anyMissedBottom) {
    return {
      action: 'maintain',
      newWeightKg: currentWeightKg,
      reason: `Rep target not met — stay at ${currentWeightKg} kg.`,
    }
  }

  if (allHitTop) {
    const step = incrementStep(currentWeightKg)
    const next = round(currentWeightKg + step, 1.25)
    return {
      action: 'increase',
      newWeightKg: next,
      reason: `All sets hit ${repMax} reps — increase to ${next} kg.`,
    }
  }

  // Check stall: last N sessions all used the same weight without progressing
  const STALL_THRESHOLD = 3
  const atSameWeight = recentHistory
    .slice(0, STALL_THRESHOLD)
    .filter((s) => s.weightKg === currentWeightKg)

  if (atSameWeight.length >= STALL_THRESHOLD) {
    const deloaded = round(currentWeightKg * 0.9, 2.5)
    return {
      action: 'deload',
      newWeightKg: deloaded,
      reason: `${STALL_THRESHOLD} sessions at same weight — deload to ${deloaded} kg.`,
    }
  }

  return {
    action: 'maintain',
    newWeightKg: currentWeightKg,
    reason: 'Keep building reps before adding weight.',
  }
}
