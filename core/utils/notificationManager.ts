/**
 * notificationManager.ts — single source of truth for push notification scheduling.
 *
 * All modules must use these helpers instead of calling Notifications directly.
 * Benefits:
 *   - Consistent permission guard in one place
 *   - Consistent error logging
 *   - Predictable identifier format for each notification type
 *   - cancelNotificationsByPrefix() for batch cancellation (events, birthdays, etc.)
 *
 * Three scheduling modes:
 *   scheduleNotification()          — specific future Date (events, birthdays)
 *   scheduleImmediateNotification() — fire now / trigger:null (budget alerts)
 *   scheduleDailyNotification()     — repeating daily at HH:MM (sleep reminders)
 */

import { Platform } from 'react-native'
import * as Notifications from 'expo-notifications'

const LOG = '[NotificationManager]'

// ── Permission helper ──────────────────────────────────────────────────────────

async function isGranted(): Promise<boolean> {
  if (Platform.OS === 'web') return false
  const { status } = await Notifications.getPermissionsAsync()
  return status === 'granted'
}

// ── Schedule: specific future date/time ───────────────────────────────────────

/**
 * Schedule a notification at a specific future date.
 * Silently skips if the trigger date is already in the past.
 * Used by: event reminders, birthday notifications.
 */
export async function scheduleNotification(
  identifier: string,
  title: string,
  body: string,
  triggerDate: Date,
  payload?: Record<string, unknown>,
): Promise<void> {
  if (!(await isGranted())) return
  if (triggerDate <= new Date()) return // already past — skip silently

  try {
    await Notifications.scheduleNotificationAsync({
      identifier,
      content: { title, body, sound: true, data: payload ?? {} },
      trigger: { date: triggerDate, type: Notifications.SchedulableTriggerInputTypes.DATE },
    })
  } catch (e) {
    console.error(`${LOG} scheduleNotification failed [${identifier}]:`, e)
  }
}

// ── Schedule: immediate (trigger: null) ───────────────────────────────────────

/**
 * Schedule a notification that fires immediately (trigger: null).
 * Used by: budget spending alerts, recurring entry reminders.
 */
export async function scheduleImmediateNotification(
  identifier: string,
  title: string,
  body: string,
  payload?: Record<string, unknown>,
): Promise<void> {
  if (!(await isGranted())) return

  try {
    await Notifications.scheduleNotificationAsync({
      identifier,
      content: { title, body, sound: true, data: payload ?? {} },
      trigger: null,
    })
  } catch (e) {
    console.error(`${LOG} scheduleImmediateNotification failed [${identifier}]:`, e)
  }
}

// ── Schedule: repeating daily at HH:MM ────────────────────────────────────────

/**
 * Schedule a notification that repeats every day at a given hour:minute.
 * Replaces any previously scheduled notification with the same identifier.
 * Used by: sleep bedtime and wake reminders.
 */
export async function scheduleDailyNotification(
  identifier: string,
  title: string,
  body: string,
  hour: number,
  minute: number,
): Promise<void> {
  if (!(await isGranted())) return
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
    console.error(`${LOG} scheduleDailyNotification invalid time [${identifier}]: ${hour}:${minute}`)
    return
  }

  try {
    await Notifications.scheduleNotificationAsync({
      identifier,
      content: { title, body, sound: true },
      trigger: { hour, minute, repeats: true } as unknown as Notifications.NotificationTriggerInput,
    })
  } catch (e) {
    console.error(`${LOG} scheduleDailyNotification failed [${identifier}]:`, e)
  }
}

// ── Cancel ─────────────────────────────────────────────────────────────────────

/**
 * Cancel a single scheduled notification by exact identifier.
 * No-ops silently if the notification is not found.
 * Used by: sleep reminders (cancel before rescheduling).
 */
export async function cancelNotification(identifier: string): Promise<void> {
  if (Platform.OS === 'web') return
  try {
    await Notifications.cancelScheduledNotificationAsync(identifier)
  } catch (e) {
    console.error(`${LOG} cancelNotification failed [${identifier}]:`, e)
  }
}

/**
 * Cancel all scheduled notifications whose identifier starts with `prefix`.
 * Used by: event delete (event-${id}-*), birthday reschedule (birthday-${personId}-*),
 *           legacy cleanup (organizer_birthday_*).
 */
export async function cancelNotificationsByPrefix(prefix: string): Promise<void> {
  if (Platform.OS === 'web') return
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync()
    await Promise.all(
      scheduled
        .filter((n) => n.identifier.startsWith(prefix))
        .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
    )
  } catch (e) {
    console.error(`${LOG} cancelNotificationsByPrefix failed [${prefix}]:`, e)
  }
}
