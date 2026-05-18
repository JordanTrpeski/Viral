import { create } from 'zustand'
import * as Crypto from 'expo-crypto'
import {
  getAllExercises,
  getLastPerformanceV2,
  getPersonalBestV2,
  insertSessionV2,
  updateSessionV2,
  discardSessionV2,
  insertSetV2,
  upsertExercisePRV2,
  getRecentSessionsV2,
  getActiveSessionTodayV2,
  type SessionSummaryRowV2,
} from '@core/db/workoutQueriesV2'
import { localDateStr } from '@core/utils/units'
import { estimateOneRM } from './workoutUtils'
import type { ExerciseV2, WorkoutSessionV2 } from '@modules/health/shared/types'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ActiveSet {
  id: string
  setNumber: number
  weightInput: string
  repsInput: string
  rpeInput: string
  notes: string
  isWarmup: boolean
  confirmed: boolean
}

export interface SessionExerciseV2 {
  exercise: ExerciseV2
  prevPerformance: { weightKg: number; reps: number } | null
  sets: ActiveSet[]
}

export interface RestTimer {
  endsAt: number       // ms timestamp
  totalSeconds: number
}

export interface PersonalBestV2 {
  exercise: ExerciseV2
  weightKg: number
  reps: number
  estimatedOneRM: number
  isNew: boolean
}

export interface SessionSummaryV2 {
  totalExercises: number
  totalSets: number
  totalVolumeKg: number
  durationSeconds: number
  personalBests: PersonalBestV2[]
}

function newPendingSet(setNumber: number, prev?: { weightKg: number; reps: number }): ActiveSet {
  return {
    id: Crypto.randomUUID(),
    setNumber,
    weightInput: prev ? String(prev.weightKg) : '',
    repsInput: prev ? String(prev.reps) : '',
    rpeInput: '',
    notes: '',
    isWarmup: false,
    confirmed: false,
  }
}

function todayStr(): string {
  return localDateStr()
}

// ─── Store interface ──────────────────────────────────────────────────────────

interface WorkoutStoreV2State {
  // Session
  activeSession: WorkoutSessionV2 | null
  sessionExercises: SessionExerciseV2[]
  restTimer: RestTimer | null
  sessionSummary: SessionSummaryV2 | null

  // History
  recentSessions: SessionSummaryRowV2[]

  // ── Actions ────────────────────────────────────────────────────────────────

  startSession: (templateId?: string) => void
  resumeTodaySession: () => boolean
  addExercise: (exercise: ExerciseV2) => void
  removeExercise: (exerciseId: string) => void
  moveExercise: (exerciseId: string, direction: 'up' | 'down') => void
  addSet: (exerciseId: string) => void
  removeSet: (exerciseId: string, setIdx: number) => void
  updateSetInput: (exerciseId: string, setIdx: number, field: keyof Pick<ActiveSet, 'weightInput' | 'repsInput' | 'rpeInput' | 'notes'>, value: string) => void
  toggleWarmup: (exerciseId: string, setIdx: number) => void
  confirmSet: (exerciseId: string, setIdx: number) => void
  startRestTimer: (seconds?: number) => void
  addRestTime: (seconds: number) => void
  clearRestTimer: () => void
  finishSession: (notes?: string, perceivedDifficulty?: number) => SessionSummaryV2 | null
  discardSession: () => void
  clearSummary: () => void

  loadRecentSessions: () => void
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useWorkoutStoreV2 = create<WorkoutStoreV2State>((set, get) => ({
  activeSession: null,
  sessionExercises: [],
  restTimer: null,
  sessionSummary: null,
  recentSessions: [],

  startSession: (templateId) => {
    const now = new Date().toISOString()
    const date = todayStr()
    const session: WorkoutSessionV2 = {
      id: Crypto.randomUUID(),
      date,
      templateId,
      startedAt: now,
      createdAt: now,
    }
    insertSessionV2({ id: session.id, date, templateId, startedAt: now, createdAt: now })
    set({ activeSession: session, sessionExercises: [], restTimer: null, sessionSummary: null })
  },

  resumeTodaySession: () => {
    const session = getActiveSessionTodayV2(todayStr())
    if (!session) return false
    set({ activeSession: session, sessionExercises: [], restTimer: null, sessionSummary: null })
    return true
  },

  addExercise: (exercise) => {
    const prevPerformance = getLastPerformanceV2(exercise.id)
    const entry: SessionExerciseV2 = {
      exercise,
      prevPerformance,
      sets: [newPendingSet(1, prevPerformance ?? undefined)],
    }
    set((s) => ({ sessionExercises: [...s.sessionExercises, entry] }))
  },

  removeExercise: (exerciseId) => {
    set((s) => ({ sessionExercises: s.sessionExercises.filter((e) => e.exercise.id !== exerciseId) }))
  },

  moveExercise: (exerciseId, direction) => {
    set((s) => {
      const list = [...s.sessionExercises]
      const idx = list.findIndex((e) => e.exercise.id === exerciseId)
      if (idx < 0) return {}
      const swap = direction === 'up' ? idx - 1 : idx + 1
      if (swap < 0 || swap >= list.length) return {}
      ;[list[idx], list[swap]] = [list[swap], list[idx]]
      return { sessionExercises: list }
    })
  },

  addSet: (exerciseId) => {
    set((s) => ({
      sessionExercises: s.sessionExercises.map((e) => {
        if (e.exercise.id !== exerciseId) return e
        const last = e.sets.filter((ss) => ss.confirmed).at(-1)
        const prev = last ? { weightKg: parseFloat(last.weightInput) || 0, reps: parseInt(last.repsInput) || 0 } : undefined
        return { ...e, sets: [...e.sets, newPendingSet(e.sets.length + 1, prev)] }
      }),
    }))
  },

  removeSet: (exerciseId, setIdx) => {
    set((s) => ({
      sessionExercises: s.sessionExercises.map((e) => {
        if (e.exercise.id !== exerciseId) return e
        const sets = e.sets.filter((_, i) => i !== setIdx).map((ss, i) => ({ ...ss, setNumber: i + 1 }))
        return { ...e, sets }
      }),
    }))
  },

  updateSetInput: (exerciseId, setIdx, field, value) => {
    set((s) => ({
      sessionExercises: s.sessionExercises.map((e) => {
        if (e.exercise.id !== exerciseId) return e
        return { ...e, sets: e.sets.map((ss, i) => (i === setIdx ? { ...ss, [field]: value } : ss)) }
      }),
    }))
  },

  toggleWarmup: (exerciseId, setIdx) => {
    set((s) => ({
      sessionExercises: s.sessionExercises.map((e) => {
        if (e.exercise.id !== exerciseId) return e
        return { ...e, sets: e.sets.map((ss, i) => (i === setIdx ? { ...ss, isWarmup: !ss.isWarmup } : ss)) }
      }),
    }))
  },

  confirmSet: (exerciseId, setIdx) => {
    const { activeSession, sessionExercises } = get()
    if (!activeSession) return

    const exEntry = sessionExercises.find((e) => e.exercise.id === exerciseId)
    if (!exEntry) return
    const activeSet = exEntry.sets[setIdx]
    if (!activeSet || activeSet.confirmed) return

    const performedWeight = parseFloat(activeSet.weightInput)
    const performedReps = parseInt(activeSet.repsInput)

    if (!activeSet.isWarmup && (isNaN(performedWeight) || isNaN(performedReps) || performedReps <= 0)) return

    const now = new Date().toISOString()
    insertSetV2({
      id: activeSet.id,
      sessionId: activeSession.id,
      exerciseId,
      setNumber: activeSet.setNumber,
      performedReps: isNaN(performedReps) ? undefined : performedReps,
      performedWeight: isNaN(performedWeight) ? undefined : performedWeight,
      rpe: activeSet.rpeInput ? parseFloat(activeSet.rpeInput) : undefined,
      isWarmup: activeSet.isWarmup,
      notes: activeSet.notes.trim() || undefined,
      completedAt: now,
      createdAt: now,
    })

    const restSeconds = activeSet.isWarmup ? 30 : 90

    set((s) => ({
      sessionExercises: s.sessionExercises.map((e) => {
        if (e.exercise.id !== exerciseId) return e
        const updatedSets = e.sets.map((ss, i) => (i === setIdx ? { ...ss, confirmed: true } : ss))
        const prev = { weightKg: performedWeight || 0, reps: performedReps || 0 }
        updatedSets.push(newPendingSet(updatedSets.length + 1, prev))
        return { ...e, sets: updatedSets }
      }),
      restTimer: activeSet.isWarmup ? s.restTimer : { endsAt: Date.now() + restSeconds * 1_000, totalSeconds: restSeconds },
    }))
  },

  startRestTimer: (seconds = 90) => {
    set({ restTimer: { endsAt: Date.now() + seconds * 1_000, totalSeconds: seconds } })
  },

  addRestTime: (seconds) => {
    set((s) => s.restTimer
      ? { restTimer: { ...s.restTimer, endsAt: s.restTimer.endsAt + seconds * 1_000 } }
      : {},
    )
  },

  clearRestTimer: () => set({ restTimer: null }),

  finishSession: (notes, perceivedDifficulty) => {
    const { activeSession, sessionExercises } = get()
    if (!activeSession) return null

    const endedAt = new Date().toISOString()
    const durationSeconds = Math.max(
      60,
      Math.round((Date.now() - new Date(activeSession.startedAt).getTime()) / 1_000),
    )
    updateSessionV2({ id: activeSession.id, endedAt, durationSeconds, notes, perceivedDifficulty })

    const confirmedSets = sessionExercises.flatMap((e) =>
      e.sets.filter((s) => s.confirmed && !s.isWarmup),
    )
    const totalVolumeKg = Math.round(
      confirmedSets.reduce(
        (sum, s) => sum + (parseFloat(s.weightInput) || 0) * (parseInt(s.repsInput) || 0),
        0,
      ),
    )

    const personalBests: PersonalBestV2[] = []
    const now = new Date().toISOString()

    for (const ex of sessionExercises) {
      const workSets = ex.sets.filter((s) => s.confirmed && !s.isWarmup)
      if (workSets.length === 0) continue

      let bestWeight = 0
      let bestReps = 0
      let best1RM = 0

      for (const s of workSets) {
        const w = parseFloat(s.weightInput) || 0
        const r = parseInt(s.repsInput) || 0
        const orm = estimateOneRM(w, r)
        if (orm > best1RM) { best1RM = orm; bestWeight = w; bestReps = r }
      }

      if (bestWeight === 0) continue

      const historical = getPersonalBestV2(ex.exercise.id, activeSession.id)
      const isNew = !historical || bestWeight > historical.weightKg

      personalBests.push({ exercise: ex.exercise, weightKg: bestWeight, reps: bestReps, estimatedOneRM: best1RM, isNew })

      if (isNew) {
        upsertExercisePRV2({
          id: Crypto.randomUUID(),
          exerciseId: ex.exercise.id,
          date: activeSession.date,
          weightKg: bestWeight,
          reps: bestReps,
          estimatedOneRepMax: best1RM,
          sessionId: activeSession.id,
          createdAt: now,
        })
      }
    }

    const summary: SessionSummaryV2 = {
      totalExercises: sessionExercises.filter((e) => e.sets.some((s) => s.confirmed && !s.isWarmup)).length,
      totalSets: confirmedSets.length,
      totalVolumeKg,
      durationSeconds,
      personalBests,
    }

    set({ sessionSummary: summary, activeSession: null, sessionExercises: [], restTimer: null })
    return summary
  },

  discardSession: () => {
    const { activeSession } = get()
    if (activeSession) discardSessionV2(activeSession.id)
    set({ activeSession: null, sessionExercises: [], restTimer: null, sessionSummary: null })
  },

  clearSummary: () => set({ sessionSummary: null }),

  loadRecentSessions: () => {
    set({ recentSessions: getRecentSessionsV2(20) })
  },
}))
