import { create } from 'zustand'
import { Platform } from 'react-native'
import * as Crypto from 'expo-crypto'
import type { StepEntry, StepSession, ActivityType, InclineLevel } from '@modules/health/shared/types'
import {
  dbGetStepsForDate, dbUpsertSteps, dbGetStepsHistory,
  dbGetSessionsForDate, dbInsertSession, dbDeleteSession,
} from '@core/db/stepsQueries'
import { defaultGoal } from './stepsUtils'

interface StepsState {
  todayEntry: StepEntry | null
  todaySessions: StepSession[]
  history: StepEntry[]
  /** 'unknown' = not yet checked, 'granted' = OK, 'denied' = user refused */
  pedometerStatus: 'unknown' | 'granted' | 'denied' | 'unavailable'

  loadToday: (date: string, dateOfBirth: string) => void
  loadSessions: (date: string) => void
  loadHistory: () => void
  setSteps: (date: string, count: number, goal: number) => void
  addSteps: (date: string, delta: number, dateOfBirth: string) => void
  setGoal: (date: string, goal: number, dateOfBirth: string) => void
  addSession: (date: string, session: { activityType: ActivityType; stepCount: number; durationMinutes: number | null; incline: InclineLevel }) => void
  deleteSession: (id: string, date: string) => void
  syncPedometer: (date: string, dateOfBirth: string) => Promise<void>
}

export const useStepsStore = create<StepsState>((set, get) => ({
  todayEntry: null,
  todaySessions: [],
  history: [],
  pedometerStatus: 'unknown',

  loadToday(date, dateOfBirth) {
    const entry = dbGetStepsForDate(date) ?? {
      id: Crypto.randomUUID(),
      date,
      stepCount: 0,
      goal: defaultGoal(dateOfBirth),
      createdAt: new Date().toISOString(),
    }
    set({ todayEntry: entry })
  },

  loadSessions(date) {
    set({ todaySessions: dbGetSessionsForDate(date) })
  },

  loadHistory() {
    set({ history: dbGetStepsHistory(30) })
  },

  setSteps(date, count, goal) {
    dbUpsertSteps(Crypto.randomUUID(), date, count, goal)
    set({ todayEntry: dbGetStepsForDate(date) })
    get().loadHistory()
  },

  addSteps(date, delta, dateOfBirth) {
    const current = get().todayEntry
    const goal = current?.goal ?? defaultGoal(dateOfBirth)
    const newCount = Math.max(0, (current?.stepCount ?? 0) + delta)
    get().setSteps(date, newCount, goal)
  },

  setGoal(date, goal, dateOfBirth) {
    const current = get().todayEntry
    const count = current?.stepCount ?? 0
    get().setSteps(date, count, goal)
  },

  addSession(date, { activityType, stepCount, durationMinutes, incline }) {
    const session: StepSession = {
      id: Crypto.randomUUID(),
      date,
      activityType,
      stepCount,
      durationMinutes,
      incline,
      createdAt: new Date().toISOString(),
    }
    dbInsertSession(session)
    get().loadSessions(date)
  },

  deleteSession(id, date) {
    dbDeleteSession(id)
    get().loadSessions(date)
  },

  async syncPedometer(date, dateOfBirth) {
    if (Platform.OS === 'web') return
    try {
      const { Pedometer } = await import('expo-sensors')
      const { status } = await Pedometer.requestPermissionsAsync()
      if (status !== 'granted') {
        set({ pedometerStatus: 'denied' })
        return
      }
      set({ pedometerStatus: 'granted' })
      const start = new Date(date + 'T00:00:00')
      const end   = new Date(date + 'T23:59:59')
      const { steps } = await Pedometer.getStepCountAsync(start, end)
      const current = get().todayEntry
      // Only update if pedometer reports more steps than manually logged
      if (steps > (current?.stepCount ?? 0)) {
        get().setSteps(date, steps, current?.goal ?? defaultGoal(dateOfBirth))
      }
    } catch {
      // Sensor not available on this device
      set({ pedometerStatus: 'unavailable' })
    }
  },
}))
