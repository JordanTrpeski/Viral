import { create } from 'zustand'
import { localDateStr } from '@core/utils/units'
import * as Crypto from 'expo-crypto'
import {
  dbGetWeightForDate,
  dbUpsertWeight,
  dbGetWeightHistory,
  dbGetAllWeightDates,
} from '@core/db/bodyWeightQueries'
import { useUserStore } from '@core/store/userStore'
import type { WeightEntry } from './types'

export type WeightRange = '7d' | '30d' | '90d' | 'all'

const RANGE_LIMIT: Record<WeightRange, number | null> = {
  '7d':  7,
  '30d': 30,
  '90d': 90,
  'all': null,
}

interface BodyWeightState {
  todayEntry: WeightEntry | null
  history: WeightEntry[]
  streak: number
  range: WeightRange

  loadToday: (date: string) => void
  loadHistory: (range: WeightRange) => void
  logWeight: (date: string, weightKg: number) => void
  setRange: (range: WeightRange) => void
}

function calcStreak(dates: string[]): number {
  if (dates.length === 0) return 0
  const today = localDateStr()
  let streak = 0
  const cursor = new Date(today + 'T00:00:00')

  for (let i = 0; i < dates.length; i++) {
    const expected = localDateStr(cursor)
    if (dates[i] !== expected) break
    streak++
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

export const useBodyWeightStore = create<BodyWeightState>((set, get) => ({
  todayEntry: null,
  history: [],
  streak: 0,
  range: '30d',

  loadToday: (date) => {
    const entry = dbGetWeightForDate(date)
    set({ todayEntry: entry })
  },

  loadHistory: (range) => {
    const limit = RANGE_LIMIT[range]
    const history = dbGetWeightHistory(limit)
    const allDates = dbGetAllWeightDates()
    const streak = calcStreak(allDates)
    set({ history, streak, range })
  },

  logWeight: (date, weightKg) => {
    const entry: WeightEntry = {
      id: Crypto.randomUUID(),
      date,
      weightKg,
      createdAt: new Date().toISOString(),
    }
    dbUpsertWeight(entry)
    set({ todayEntry: entry })
    get().loadHistory(get().range)
    // Recalculate calorie goal with new weight
    useUserStore.getState().recalcCaloriesFromWeight(weightKg)
  },

  setRange: (range) => {
    get().loadHistory(range)
  },
}))
