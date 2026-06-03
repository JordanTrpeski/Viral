import { Platform } from 'react-native'
import * as Notifications from 'expo-notifications'
import * as TaskManager from 'expo-task-manager'
import * as BackgroundFetch from 'expo-background-fetch'
import { scheduleNotification, scheduleImmediateNotification, cancelNotificationsByPrefix } from '@core/utils/notificationManager'
import { dbGetPeople, dbGetTiers, dbGetTierRules, dbGetPersonRules } from '@core/db/organizerQueries'
import {
  daysUntilBirthday, nextBirthdayDate, ageTheyAreTurning, resolveTemplate,
} from './organizerUtils'
import { localDateStr } from '@core/utils/units'

// ── Constants ──────────────────────────────────────────────────────────────────

// New per-person prefix: birthday-${personId}-
// Old prefix (organizer_birthday_) is cleaned up by runBirthdayScheduler on first run.
const PERSON_NOTIF_PREFIX = 'birthday-'
const LEGACY_PREFIX       = 'organizer_birthday_'

const BIRTHDAY_SCHEDULER_TASK = 'organizer-birthday-scheduler'

// ── Background task definition ─────────────────────────────────────────────────
// defineTask must be called at module load time (top-level), not inside a function.

TaskManager.defineTask(BIRTHDAY_SCHEDULER_TASK, async () => {
  try {
    console.log('[BirthdayScheduler] Background task running')
    await runBirthdayScheduler()
    return BackgroundFetch.BackgroundFetchResult.NewData
  } catch (e) {
    console.error('[BirthdayScheduler] Background task error:', e)
    return BackgroundFetch.BackgroundFetchResult.Failed
  }
})

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Register the daily background fetch task. Call once at app startup.
 * Guards against re-registration (which would throw an error).
 * Requires a native EAS build — does not work over OTA-only.
 */
export async function registerBirthdayBackgroundTask(): Promise<void> {
  if (Platform.OS === 'web') return
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BIRTHDAY_SCHEDULER_TASK)
    if (!isRegistered) {
      await BackgroundFetch.registerTaskAsync(BIRTHDAY_SCHEDULER_TASK, {
        minimumInterval: 60 * 60 * 24, // 24 hours
        stopOnTerminate: false,
        startOnBoot: true,
      })
      console.log('[BirthdayScheduler] Background task registered')
    }
  } catch (e) {
    console.error('[BirthdayScheduler] Failed to register background task:', e)
  }
}

/**
 * Schedule all upcoming birthday notifications for one person.
 * - Cancels all existing birthday-${personId}-* notifications first.
 * - Schedules per-rule notifications (X days before birthday).
 * - Schedules daily countdown notifications if enabled on the tier.
 * Safe to call fire-and-forget from sync store actions.
 */
export async function scheduleBirthdaysForPerson(personId: string): Promise<void> {
  if (Platform.OS === 'web') return
  const { status } = await Notifications.getPermissionsAsync()
  if (status !== 'granted') return

  // Cancel all existing birthday notifications for this person
  await cancelNotificationsByPrefix(`${PERSON_NOTIF_PREFIX}${personId}-`)

  // Fetch person from DB
  const people = dbGetPeople()
  const person = people.find((p) => p.id === personId)
  if (!person || person.birthdayDay === null || person.birthdayMonth === null) return

  const rules = person.overrideNotifications
    ? dbGetPersonRules(personId)
    : dbGetTierRules(person.tierId)

  const bdayDateStr = nextBirthdayDate(person.birthdayDay, person.birthdayMonth)
  const age = person.birthdayYear
    ? ageTheyAreTurning(person.birthdayYear, person.birthdayDay, person.birthdayMonth)
    : null

  // ── Per-rule notifications ────────────────────────────────────────────────────
  for (const rule of rules) {
    if (!rule.isEnabled) continue

    // Compute the date this notification should fire
    const notifyDate = new Date(bdayDateStr + 'T12:00:00')
    notifyDate.setDate(notifyDate.getDate() - rule.daysBefore)

    // [Days] resolves to daysBefore — how many days until birthday when the notif fires
    const body = resolveTemplate(
      rule.messageTemplate,
      person.name.split(' ')[0],
      rule.daysBefore,
      age,
      person.relationship,
    )

    await scheduleAtFuture(
      `${PERSON_NOTIF_PREFIX}${personId}-rule-${rule.id}`,
      rule.daysBefore === 0 ? '🎂 Birthday Today!' : 'Birthday Reminder',
      body,
      notifyDate,
      rule.notificationTime,
    )
  }

  // ── Daily countdown notifications ─────────────────────────────────────────────
  const tiers = dbGetTiers()
  const tier = tiers.find((t) => t.id === person.tierId)
  const daysUntil = daysUntilBirthday(person.birthdayDay, person.birthdayMonth)

  if (!person.overrideNotifications && tier?.dailyCountdown && daysUntil > 0) {
    const windowDays = Math.min(daysUntil, tier.dailyCountdownStartDays)
    const tierRules = dbGetTierRules(person.tierId)
    const countdownTime = tierRules.find((r) => r.isEnabled)?.notificationTime ?? '09:00'

    // Schedule one notification per day in the countdown window.
    // dayOffset=0 → today (daysLeft=daysUntil), dayOffset=windowDays-1 → last day of window.
    for (let dayOffset = 0; dayOffset < windowDays; dayOffset++) {
      const notifyDate = new Date()
      notifyDate.setDate(notifyDate.getDate() + dayOffset)
      const daysLeft = daysUntil - dayOffset
      const notifyDateStr = localDateStr(notifyDate)

      const body = resolveTemplate(
        "[Name]'s birthday is in [Days] days!",
        person.name.split(' ')[0],
        daysLeft,
        age,
        person.relationship,
      )

      await scheduleAtFuture(
        `${PERSON_NOTIF_PREFIX}${personId}-countdown-${notifyDateStr}`,
        '🗓 Birthday Countdown',
        body,
        notifyDate,
        countdownTime,
      )
    }
  }
}

/**
 * Full reschedule for all people. Used by the daily background task and on
 * organizer tab open (existing behaviour preserved).
 * Also cleans up any legacy organizer_birthday_ notifications from the old scheduler.
 */
export async function runBirthdayScheduler(): Promise<void> {
  if (Platform.OS === 'web') return
  const { status } = await Notifications.getPermissionsAsync()
  if (status !== 'granted') return

  // One-time cleanup of legacy notification IDs from the old scheduler
  await cancelNotificationsByPrefix(LEGACY_PREFIX)

  // Reschedule for every person with a birthday
  const people = dbGetPeople()
  for (const person of people) {
    if (person.birthdayDay === null || person.birthdayMonth === null) continue
    await scheduleBirthdaysForPerson(person.id)
  }
}

export async function sendTestBirthdayNotification(): Promise<void> {
  await scheduleImmediateNotification(
    `${LEGACY_PREFIX}test`,
    '🎂 Birthday Today!',
    "Ana's birthday is today! Don't forget to wish her well 🎉",
  )
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false
  const { status: existing } = await Notifications.getPermissionsAsync()
  if (existing === 'granted') return true
  const { status } = await Notifications.requestPermissionsAsync()
  return status === 'granted'
}

// ── Internal ───────────────────────────────────────────────────────────────────

/**
 * Schedule a notification at a specific date + HH:MM time.
 * Delegates to notificationManager.scheduleNotification().
 */
async function scheduleAtFuture(
  identifier: string,
  title: string,
  body: string,
  date: Date,
  time: string,
): Promise<void> {
  const [hh, mm] = time.split(':').map(Number)
  if (isNaN(hh) || isNaN(mm)) return

  const triggerDate = new Date(date)
  triggerDate.setHours(hh, mm, 0, 0)

  await scheduleNotification(identifier, title, body, triggerDate)
}
