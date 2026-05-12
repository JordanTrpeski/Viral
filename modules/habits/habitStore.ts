import { Platform } from 'react-native'
import { create } from 'zustand'
import * as Crypto from 'expo-crypto'
import * as Notifications from 'expo-notifications'
import { colors } from '@core/theme'
import {
  dbArchiveHabit,
  dbGetHabit,
  dbGetHabitCompletionCount,
  dbGetHabitLogs,
  dbGetHabitLogsForHabit,
  dbGetHabits,
  dbInsertHabit,
  dbToggleHabitLog,
  dbUpdateHabit,
} from '@core/db/habitQueries'
import { localDateStr } from '@core/utils/units'
import type { Habit, HabitFrequency, HabitLog } from '@core/types'

interface HabitInput {
  name: string
  icon: string
  color: string
  frequency: HabitFrequency
  customDays: number[]
  reminderTime: string | null
}

interface HabitState {
  habits: Habit[]
  logs: HabitLog[]
  loadHabits: () => void
  addHabit: (input: HabitInput) => Promise<string>
  updateHabit: (habit: Habit) => Promise<void>
  archiveHabit: (habitId: string) => Promise<void>
  toggleLog: (habitId: string, date?: string) => void
  getHabit: (habitId: string) => Habit | null
  getLogsForHabit: (habitId: string, days?: number) => HabitLog[]
  getCompletionCount: (habitId: string) => number
}

function rangeStart(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return localDateStr(d)
}

async function cancelHabitReminder(habitId: string): Promise<void> {
  if (Platform.OS === 'web') return
  const scheduled = await Notifications.getAllScheduledNotificationsAsync()
  await Promise.all(
    scheduled
      .filter((n) => n.identifier === `habit-${habitId}`)
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  )
}

async function scheduleHabitReminder(habit: Habit): Promise<void> {
  await cancelHabitReminder(habit.id)
  if (Platform.OS === 'web' || !habit.reminderTime || habit.isArchived) return

  const [hour, minute] = habit.reminderTime.split(':').map(Number)
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return

  const { status: existing } = await Notifications.getPermissionsAsync()
  const granted = existing === 'granted' || (await Notifications.requestPermissionsAsync()).status === 'granted'
  if (!granted) return

  await Notifications.scheduleNotificationAsync({
    identifier: `habit-${habit.id}`,
    content: {
      title: `${habit.icon} Time for ${habit.name}!`,
      body: 'Mark it done when you finish.',
      sound: true,
    },
    trigger: { hour, minute, repeats: true } as unknown as Notifications.NotificationTriggerInput,
  })
}

export const useHabitStore = create<HabitState>((set, get) => ({
  habits: [],
  logs: [],

  loadHabits() {
    set({
      habits: dbGetHabits(),
      logs: dbGetHabitLogs(rangeStart(110), localDateStr()),
    })
  },

  async addHabit(input) {
    const habit: Habit = {
      id: Crypto.randomUUID(),
      name: input.name.trim(),
      icon: input.icon,
      color: input.color || colors.habits,
      frequency: input.frequency,
      customDays: input.customDays,
      reminderTime: input.reminderTime,
      sortOrder: get().habits.length,
      isArchived: false,
      createdAt: new Date().toISOString(),
    }
    dbInsertHabit(habit)
    await scheduleHabitReminder(habit)
    get().loadHabits()
    return habit.id
  },

  async updateHabit(habit) {
    dbUpdateHabit(habit)
    await scheduleHabitReminder(habit)
    get().loadHabits()
  },

  async archiveHabit(habitId) {
    dbArchiveHabit(habitId)
    await cancelHabitReminder(habitId)
    get().loadHabits()
  },

  toggleLog(habitId, date = localDateStr()) {
    dbToggleHabitLog(Crypto.randomUUID(), habitId, date)
    get().loadHabits()
  },

  getHabit(habitId) {
    return dbGetHabit(habitId)
  },

  getLogsForHabit(habitId, days = 110) {
    return dbGetHabitLogsForHabit(habitId, rangeStart(days), localDateStr())
  },

  getCompletionCount(habitId) {
    return dbGetHabitCompletionCount(habitId)
  },
}))
