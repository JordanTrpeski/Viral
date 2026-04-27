import { create } from 'zustand'
import * as Crypto from 'expo-crypto'
import {
  dbGetExercises, dbInsertExercise, dbGetLastPerformance, dbGetPersonalBestExcluding,
} from '@core/db/exerciseQueries'
import {
  dbInsertSession, dbUpdateSession, dbUpdateSessionName,
  dbGetActiveSessionToday, dbGetRecentSessions, dbGetSessionMuscleGroups,
  dbInsertSet, type SessionSummaryRow,
} from '@core/db/workoutQueries'
import {
  dbGetTemplates, dbInsertTemplate, dbInsertTemplateExercise,
  dbDeleteTemplate, dbUpdateTemplateName, dbGetTemplateExercises,
  dbGetTemplatesWithMeta, type TemplateWithMeta,
} from '@core/db/templateQueries'
import { calcTotalVolume, todayStr } from './workoutUtils'
import type { Exercise, WorkoutSession, WorkoutSet, WorkoutTemplate, MuscleGroup, Equipment } from '@modules/health/shared/types'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ActiveSet {
  id: string
  setNumber: number
  weightInput: string
  repsInput: string
  confirmed: boolean
}

export interface SessionExercise {
  exercise: Exercise
  prevPerformance: { weightKg: number; reps: number } | null
  sets: ActiveSet[]
}

export interface RestTimer {
  endsAt: number      // timestamp ms
  totalSeconds: number
}

export interface PersonalBest {
  exercise: Exercise
  weightKg: number
  reps: number
}

export interface SessionSummary {
  sessionName: string
  totalExercises: number
  totalSets: number
  totalVolumeKg: number
  durationMinutes: number
  personalBests: PersonalBest[]
}

function newPendingSet(setNumber: number): ActiveSet {
  return { id: Crypto.randomUUID(), setNumber, weightInput: '', repsInput: '', confirmed: false }
}

// ─── Store ────────────────────────────────────────────────────────────────────

interface WorkoutState {
  // Library
  exercises: Exercise[]

  // Active session
  activeSession: WorkoutSession | null
  sessionExercises: SessionExercise[]
  restTimer: RestTimer | null

  // Post-session
  sessionSummary: SessionSummary | null

  // History
  recentSessions: SessionSummaryRow[]

  // Templates
  templates: TemplateWithMeta[]

  // ── Actions ────────────────────────────────────────────────────────────────

  loadExercises: () => void
  addCustomExercise: (name: string, muscleGroup: MuscleGroup, equipment?: Equipment) => void

  startSession: (name?: string) => void
  resumeTodaySession: () => boolean
  updateSessionName: (name: string) => void
  addExercise: (exercise: Exercise) => void
  removeExercise: (exerciseId: string) => void
  addSet: (exerciseId: string) => void
  updateSetInput: (exerciseId: string, setIdx: number, field: 'weightInput' | 'repsInput', value: string) => void
  confirmSet: (exerciseId: string, setIdx: number) => void
  startRestTimer: (seconds?: number) => void
  clearRestTimer: () => void
  finishSession: () => SessionSummary | null
  discardSession: () => void

  loadRecentSessions: () => void
  loadTemplates: () => void
  saveAsTemplate: (name: string) => void
  loadTemplate: (templateId: string) => void
  deleteTemplate: (id: string) => void
  renameTemplate: (id: string, name: string) => void
}

export const useWorkoutStore = create<WorkoutState>((set, get) => ({
  exercises: [],
  activeSession: null,
  sessionExercises: [],
  restTimer: null,
  sessionSummary: null,
  recentSessions: [],
  templates: [],

  // ── Library ──────────────────────────────────────────────────────────────

  loadExercises: () => {
    set({ exercises: dbGetExercises() })
  },

  addCustomExercise: (name, muscleGroup, equipment) => {
    const exercise: Exercise = {
      id: Crypto.randomUUID(),
      name, muscleGroup, equipment,
      isCustom: true,
      createdAt: new Date().toISOString(),
    }
    dbInsertExercise(exercise)
    set((s) => ({ exercises: [...s.exercises, exercise].sort((a, b) => a.name.localeCompare(b.name)) }))
  },

  // ── Session management ────────────────────────────────────────────────────

  startSession: (name) => {
    const now = new Date().toISOString()
    const date = todayStr()
    const session: WorkoutSession = {
      id: Crypto.randomUUID(),
      date,
      name: name ?? date,
      startedAt: now,
      createdAt: now,
    }
    dbInsertSession(session)
    set({ activeSession: session, sessionExercises: [], restTimer: null, sessionSummary: null })
  },

  resumeTodaySession: () => {
    const session = dbGetActiveSessionToday(todayStr())
    if (!session) return false
    set({ activeSession: session, sessionExercises: [], restTimer: null, sessionSummary: null })
    return true
  },

  updateSessionName: (name) => {
    const { activeSession } = get()
    if (!activeSession) return
    dbUpdateSessionName(activeSession.id, name)
    set((s) => ({ activeSession: s.activeSession ? { ...s.activeSession, name } : null }))
  },

  addExercise: (exercise) => {
    const prevPerformance = dbGetLastPerformance(exercise.id)
    const sessionExercise: SessionExercise = {
      exercise,
      prevPerformance,
      sets: [newPendingSet(1)],
    }
    set((s) => ({ sessionExercises: [...s.sessionExercises, sessionExercise] }))
  },

  removeExercise: (exerciseId) => {
    set((s) => ({ sessionExercises: s.sessionExercises.filter((e) => e.exercise.id !== exerciseId) }))
  },

  addSet: (exerciseId) => {
    set((s) => ({
      sessionExercises: s.sessionExercises.map((e) => {
        if (e.exercise.id !== exerciseId) return e
        return { ...e, sets: [...e.sets, newPendingSet(e.sets.length + 1)] }
      }),
    }))
  },

  updateSetInput: (exerciseId, setIdx, field, value) => {
    set((s) => ({
      sessionExercises: s.sessionExercises.map((e) => {
        if (e.exercise.id !== exerciseId) return e
        return {
          ...e,
          sets: e.sets.map((ss, i) => (i === setIdx ? { ...ss, [field]: value } : ss)),
        }
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

    const weightKg = parseFloat(activeSet.weightInput)
    const reps = parseInt(activeSet.repsInput)
    if (isNaN(weightKg) || isNaN(reps) || weightKg <= 0 || reps <= 0) return

    const workoutSet: WorkoutSet = {
      id: activeSet.id,
      sessionId: activeSession.id,
      exerciseId,
      setNumber: activeSet.setNumber,
      weightKg,
      reps,
      createdAt: new Date().toISOString(),
    }
    dbInsertSet(workoutSet)

    set((s) => ({
      sessionExercises: s.sessionExercises.map((e) => {
        if (e.exercise.id !== exerciseId) return e
        const updatedSets = e.sets.map((ss, i) =>
          i === setIdx ? { ...ss, confirmed: true } : ss,
        )
        // Auto-add next pending set
        updatedSets.push(newPendingSet(updatedSets.length + 1))
        return { ...e, sets: updatedSets }
      }),
      restTimer: { endsAt: Date.now() + 90_000, totalSeconds: 90 },
    }))
  },

  startRestTimer: (seconds = 90) => {
    set({ restTimer: { endsAt: Date.now() + seconds * 1_000, totalSeconds: seconds } })
  },

  clearRestTimer: () => set({ restTimer: null }),

  finishSession: () => {
    const { activeSession, sessionExercises } = get()
    if (!activeSession) return null

    const endedAt = new Date().toISOString()
    const durationMinutes = Math.max(
      1,
      Math.round((Date.now() - new Date(activeSession.startedAt).getTime()) / 60_000),
    )
    dbUpdateSession(activeSession.id, endedAt, durationMinutes)

    const confirmedSets = sessionExercises.flatMap((e) => e.sets.filter((s) => s.confirmed))
    const totalVolumeKg = Math.round(
      confirmedSets.reduce((sum, s) => sum + (parseFloat(s.weightInput) || 0) * (parseInt(s.repsInput) || 0), 0),
    )

    const personalBests: PersonalBest[] = []
    for (const ex of sessionExercises) {
      const confirmed = ex.sets.filter((s) => s.confirmed)
      if (confirmed.length === 0) continue
      const maxW = Math.max(...confirmed.map((s) => parseFloat(s.weightInput) || 0))
      const historical = dbGetPersonalBestExcluding(ex.exercise.id, activeSession.id)
      if (!historical || maxW > historical.weightKg) {
        const bestSet = confirmed.find((s) => parseFloat(s.weightInput) === maxW)
        personalBests.push({
          exercise: ex.exercise,
          weightKg: maxW,
          reps: parseInt(bestSet?.repsInput || '0') || 0,
        })
      }
    }

    const summary: SessionSummary = {
      sessionName: activeSession.name ?? activeSession.date,
      totalExercises: sessionExercises.filter((e) => e.sets.some((s) => s.confirmed)).length,
      totalSets: confirmedSets.length,
      totalVolumeKg,
      durationMinutes,
      personalBests,
    }

    set({ sessionSummary: summary, activeSession: null, sessionExercises: [], restTimer: null })
    return summary
  },

  discardSession: () => {
    set({ activeSession: null, sessionExercises: [], restTimer: null, sessionSummary: null })
  },

  // ── History ───────────────────────────────────────────────────────────────

  loadRecentSessions: () => {
    set({ recentSessions: dbGetRecentSessions(20) })
  },

  // ── Templates ─────────────────────────────────────────────────────────────

  loadTemplates: () => {
    set({ templates: dbGetTemplatesWithMeta() })
  },

  saveAsTemplate: (name) => {
    const { sessionExercises } = get()
    const now = new Date().toISOString()
    const template: WorkoutTemplate = { id: Crypto.randomUUID(), name, createdAt: now }
    dbInsertTemplate(template)

    sessionExercises.forEach((ex, i) => {
      dbInsertTemplateExercise({
        id: Crypto.randomUUID(),
        templateId: template.id,
        exerciseId: ex.exercise.id,
        orderIndex: i,
        createdAt: now,
      })
    })

    get().loadTemplates()
  },

  loadTemplate: (templateId) => {
    const exercises = dbGetTemplateExercises(templateId)
    const templates = get().templates
    const meta = templates.find((t) => t.template.id === templateId)
    const name = meta?.template.name ?? todayStr()

    const now = new Date().toISOString()
    const session: WorkoutSession = {
      id: Crypto.randomUUID(), date: todayStr(),
      name, startedAt: now, createdAt: now,
    }
    dbInsertSession(session)

    const sessionExercises: SessionExercise[] = exercises.map((ex) => ({
      exercise: ex,
      prevPerformance: dbGetLastPerformance(ex.id),
      sets: [newPendingSet(1)],
    }))

    set({ activeSession: session, sessionExercises, restTimer: null, sessionSummary: null })
  },

  deleteTemplate: (id) => {
    dbDeleteTemplate(id)
    set((s) => ({ templates: s.templates.filter((t) => t.template.id !== id) }))
  },

  renameTemplate: (id, name) => {
    dbUpdateTemplateName(id, name)
    set((s) => ({
      templates: s.templates.map((t) =>
        t.template.id === id ? { ...t, template: { ...t.template, name } } : t,
      ),
    }))
  },
}))
