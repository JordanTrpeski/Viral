import * as Crypto from 'expo-crypto'
import { db } from './database'
import type { SleepLog } from '@core/types'

interface SleepLogRow {
  id: string
  date: string
  bedtime: string
  wake_time: string
  duration_minutes: number
  quality: number | null
  notes: string | null
  created_at: string
}

function mapSleep(row: SleepLogRow): SleepLog {
  return {
    id: row.id,
    date: row.date,
    bedtime: row.bedtime,
    wakeTime: row.wake_time,
    durationMinutes: row.duration_minutes,
    quality: row.quality,
    notes: row.notes,
    createdAt: row.created_at,
  }
}

export function dbGetSleepLog(date: string): SleepLog | null {
  const row = db.getFirstSync<SleepLogRow>('SELECT * FROM sleep_logs WHERE date = ?', [date])
  return row ? mapSleep(row) : null
}

export function dbGetSleepHistory(days: number): SleepLog[] {
  return db.getAllSync<SleepLogRow>(
    'SELECT * FROM sleep_logs ORDER BY date DESC LIMIT ?',
    [days],
  ).reverse().map(mapSleep)
}

export function dbGetSleepRange(fromDate: string, toDate: string): SleepLog[] {
  return db.getAllSync<SleepLogRow>(
    'SELECT * FROM sleep_logs WHERE date BETWEEN ? AND ? ORDER BY date ASC',
    [fromDate, toDate],
  ).map(mapSleep)
}

export function dbUpsertSleepLog(log: Omit<SleepLog, 'id' | 'createdAt'>): SleepLog {
  const existing = dbGetSleepLog(log.date)
  const id = existing?.id ?? Crypto.randomUUID()
  const createdAt = existing?.createdAt ?? new Date().toISOString()
  db.runSync(
    `INSERT OR REPLACE INTO sleep_logs
     (id, date, bedtime, wake_time, duration_minutes, quality, notes, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, log.date, log.bedtime, log.wakeTime, log.durationMinutes, log.quality, log.notes, createdAt],
  )
  return { ...log, id, createdAt }
}
