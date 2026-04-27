import { db } from './database'
import type { WeightEntry } from '@modules/health/shared/types'

interface RawRow {
  id: string
  date: string
  weight_kg: number
  created_at: string
}

function rowToEntry(row: RawRow): WeightEntry {
  return { id: row.id, date: row.date, weightKg: row.weight_kg, createdAt: row.created_at }
}

export function dbGetWeightForDate(date: string): WeightEntry | null {
  const row = db.getFirstSync<RawRow>(
    'SELECT * FROM body_weight_log WHERE date = ?',
    [date],
  )
  return row ? rowToEntry(row) : null
}

export function dbUpsertWeight(entry: WeightEntry): void {
  db.runSync(
    `INSERT INTO body_weight_log (id, date, weight_kg, created_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(date) DO UPDATE SET weight_kg = excluded.weight_kg`,
    [entry.id, entry.date, entry.weightKg, entry.createdAt],
  )
}

export function dbGetWeightHistory(limit: number | null): WeightEntry[] {
  const sql = limit
    ? `SELECT * FROM body_weight_log ORDER BY date DESC LIMIT ${limit}`
    : 'SELECT * FROM body_weight_log ORDER BY date DESC'
  const rows = db.getAllSync<RawRow>(sql)
  return rows.map(rowToEntry).reverse() // chronological
}

export function dbGetAllWeightDates(): string[] {
  const rows = db.getAllSync<{ date: string }>('SELECT date FROM body_weight_log ORDER BY date DESC')
  return rows.map((r) => r.date)
}
