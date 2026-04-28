import { Platform } from 'react-native'
import * as Notifications from 'expo-notifications'
import { dbGetPeople, dbGetTiers, dbGetTierRules, dbGetPersonRules } from '@core/db/organizerQueries'
import {
  daysUntilBirthday, nextBirthdayDate, ageTheyAreTurning, resolveTemplate,
} from './organizerUtils'
import { localDateStr } from '@core/utils/units'

const ID_PREFIX = 'organizer_birthday_'

// ── Public API ─────────────────────────────────────────────────────────────────

export async function runBirthdayScheduler(): Promise<void> {
  if (Platform.OS === 'web') return
  const { status } = await Notifications.getPermissionsAsync()
  if (status !== 'granted') return

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = localDateStr(today)

  // Cancel previously scheduled organizer birthday notifications
  const scheduled = await Notifications.getAllScheduledNotificationsAsync()
  await Promise.all(
    scheduled
      .filter((n) => n.identifier.startsWith(ID_PREFIX))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  )

  const people = dbGetPeople()
  const tiers  = dbGetTiers()
  const tierMap = Object.fromEntries(tiers.map((t) => [t.id, t]))

  for (const person of people) {
    if (person.birthdayDay === null || person.birthdayMonth === null) continue

    const daysUntil = daysUntilBirthday(person.birthdayDay, person.birthdayMonth)
    const bdayDateStr = nextBirthdayDate(person.birthdayDay, person.birthdayMonth)

    const tier = tierMap[person.tierId]
    const rules = person.overrideNotifications
      ? dbGetPersonRules(person.id)
      : dbGetTierRules(person.tierId)

    // Standard per-rule notifications
    for (const rule of rules) {
      if (!rule.isEnabled) continue

      const notifyDate = new Date(bdayDateStr + 'T12:00:00')
      notifyDate.setDate(notifyDate.getDate() - rule.daysBefore)
      const notifyDateStr = localDateStr(notifyDate)

      if (notifyDateStr !== todayStr) continue

      const age = person.birthdayYear
        ? ageTheyAreTurning(person.birthdayYear, person.birthdayDay, person.birthdayMonth)
        : null

      const body = resolveTemplate(
        rule.messageTemplate,
        person.name.split(' ')[0],
        daysUntil,
        age,
        person.relationship,
      )

      await scheduleAt(
        `${ID_PREFIX}${person.id}_${rule.id}`,
        rule.daysBefore === 0 ? '🎂 Birthday Today!' : 'Birthday Reminder',
        body,
        rule.notificationTime,
      )
    }

    // Daily countdown — fires today if daysUntil is within the countdown window
    if (!person.overrideNotifications && tier?.dailyCountdown && daysUntil > 0 && daysUntil <= tier.dailyCountdownStartDays) {
      const age = person.birthdayYear
        ? ageTheyAreTurning(person.birthdayYear, person.birthdayDay, person.birthdayMonth)
        : null

      const body = resolveTemplate(
        "[Name]'s birthday is in [Days] days!",
        person.name.split(' ')[0],
        daysUntil,
        age,
        person.relationship,
      )

      // Use 09:00 for countdown unless a tier rule exists for time
      const tierRules = dbGetTierRules(person.tierId)
      const countdownTime = tierRules.find((r) => r.isEnabled)?.notificationTime ?? '09:00'

      await scheduleAt(
        `${ID_PREFIX}${person.id}_countdown_${todayStr}`,
        '🗓 Birthday Countdown',
        body,
        countdownTime,
      )
    }
  }
}

export async function sendTestBirthdayNotification(): Promise<void> {
  if (Platform.OS === 'web') return
  const { status } = await Notifications.getPermissionsAsync()
  if (status !== 'granted') return

  await Notifications.scheduleNotificationAsync({
    identifier: `${ID_PREFIX}test`,
    content: {
      title: '🎂 Birthday Today!',
      body: "Ana's birthday is today! Don't forget to wish her well 🎉",
    },
    trigger: null,
  })
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false
  const { status: existing } = await Notifications.getPermissionsAsync()
  if (existing === 'granted') return true
  const { status } = await Notifications.requestPermissionsAsync()
  return status === 'granted'
}

// ── Internal ───────────────────────────────────────────────────────────────────

async function scheduleAt(identifier: string, title: string, body: string, time: string): Promise<void> {
  const [hh, mm] = time.split(':').map(Number)
  if (isNaN(hh) || isNaN(mm)) return

  const triggerDate = new Date()
  triggerDate.setHours(hh, mm, 0, 0)

  // Skip if the time has already passed today
  if (triggerDate <= new Date()) return

  await Notifications.scheduleNotificationAsync({
    identifier,
    content: { title, body, sound: true },
    trigger: { date: triggerDate } as unknown as Notifications.NotificationTriggerInput,
  })
}
