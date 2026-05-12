import { Platform } from 'react-native'
import { create } from 'zustand'
import * as Notifications from 'expo-notifications'
import { createStorage } from '@core/utils/storage'
import { dbGetSleepHistory, dbGetSleepLog, dbUpsertSleepLog } from '@core/db/sleepQueries'
import { localDateStr } from '@core/utils/units'
import type { SleepLog } from '@core/types'

const storage = createStorage('sleep-store')

interface SleepState {
  todayLog: SleepLog | null
  history: SleepLog[]
  bedtimeReminder: string | null
  wakeReminder: string | null
  loadSleep: () => void
  saveSleep: (log: Omit<SleepLog, 'id' | 'createdAt'>) => void
  setReminder: (type: 'bedtime' | 'wake', time: string | null) => Promise<void>
}

async function cancelReminder(identifier: string): Promise<void> {
  if (Platform.OS === 'web') return
  const scheduled = await Notifications.getAllScheduledNotificationsAsync()
  await Promise.all(
    scheduled
      .filter((n) => n.identifier === identifier)
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  )
}

async function scheduleReminder(identifier: string, title: string, body: string, time: string | null): Promise<void> {
  await cancelReminder(identifier)
  if (Platform.OS === 'web' || !time) return
  const [hour, minute] = time.split(':').map(Number)
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return
  const { status: existing } = await Notifications.getPermissionsAsync()
  const granted = existing === 'granted' || (await Notifications.requestPermissionsAsync()).status === 'granted'
  if (!granted) return
  await Notifications.scheduleNotificationAsync({
    identifier,
    content: { title, body, sound: true },
    trigger: { hour, minute, repeats: true } as unknown as Notifications.NotificationTriggerInput,
  })
}

export const useSleepStore = create<SleepState>((set, get) => ({
  todayLog: null,
  history: [],
  bedtimeReminder: storage.getString('bedtime_reminder') ?? null,
  wakeReminder: storage.getString('wake_reminder') ?? null,

  loadSleep() {
    set({
      todayLog: dbGetSleepLog(localDateStr()),
      history: dbGetSleepHistory(7),
      bedtimeReminder: storage.getString('bedtime_reminder') ?? null,
      wakeReminder: storage.getString('wake_reminder') ?? null,
    })
  },

  saveSleep(log) {
    dbUpsertSleepLog(log)
    get().loadSleep()
  },

  async setReminder(type, time) {
    const key = type === 'bedtime' ? 'bedtime_reminder' : 'wake_reminder'
    const identifier = type === 'bedtime' ? 'sleep-bedtime' : 'sleep-wake'
    if (time) storage.set(key, time)
    else storage.delete(key)
    await scheduleReminder(
      identifier,
      type === 'bedtime' ? 'Time to wind down for bed.' : 'Wake-up reminder',
      type === 'bedtime' ? 'Start your bedtime routine.' : 'Start the day.',
      time,
    )
    get().loadSleep()
  },
}))
