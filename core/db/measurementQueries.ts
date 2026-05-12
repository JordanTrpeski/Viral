import { db } from './database'
import type { BodyMeasurement } from '@modules/health/shared/types'

// ─── Row type ─────────────────────────────────────────────────────────────────

interface MeasurementRow {
  id: string
  date: string
  chest_cm: number | null
  waist_cm: number | null
  hips_cm: number | null
  left_arm_cm: number | null
  right_arm_cm: number | null
  left_thigh_cm: number | null
  right_thigh_cm: number | null
  notes: string | null
  created_at: string
}

function rowToMeasurement(r: MeasurementRow): BodyMeasurement {
  return {
    id: r.id,
    date: r.date,
    chestCm: r.chest_cm ?? undefined,
    waistCm: r.waist_cm ?? undefined,
    hipsCm: r.hips_cm ?? undefined,
    leftArmCm: r.left_arm_cm ?? undefined,
    rightArmCm: r.right_arm_cm ?? undefined,
    leftThighCm: r.left_thigh_cm ?? undefined,
    rightThighCm: r.right_thigh_cm ?? undefined,
    notes: r.notes ?? undefined,
    createdAt: r.created_at,
  }
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export function dbGetMeasurementForDate(date: string): BodyMeasurement | null {
  const row = db.getFirstSync<MeasurementRow>(
    `SELECT * FROM body_measurements WHERE date = ?`,
    [date],
  )
  return row ? rowToMeasurement(row) : null
}

export function dbGetMeasurementHistory(limit = 90): BodyMeasurement[] {
  const rows = db.getAllSync<MeasurementRow>(
    `SELECT * FROM body_measurements ORDER BY date DESC LIMIT ?`,
    [limit],
  )
  return rows.map(rowToMeasurement)
}

export function dbUpsertMeasurement(m: BodyMeasurement): void {
  db.runSync(
    `INSERT INTO body_measurements
       (id, date, chest_cm, waist_cm, hips_cm,
        left_arm_cm, right_arm_cm, left_thigh_cm, right_thigh_cm, notes, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(date) DO UPDATE SET
       chest_cm = excluded.chest_cm,
       waist_cm = excluded.waist_cm,
       hips_cm  = excluded.hips_cm,
       left_arm_cm  = excluded.left_arm_cm,
       right_arm_cm = excluded.right_arm_cm,
       left_thigh_cm  = excluded.left_thigh_cm,
       right_thigh_cm = excluded.right_thigh_cm,
       notes = excluded.notes`,
    [
      m.id, m.date,
      m.chestCm ?? null, m.waistCm ?? null, m.hipsCm ?? null,
      m.leftArmCm ?? null, m.rightArmCm ?? null,
      m.leftThighCm ?? null, m.rightThighCm ?? null,
      m.notes ?? null,
      m.createdAt,
    ],
  )
}

export function dbGetLatestMeasurement(): BodyMeasurement | null {
  const row = db.getFirstSync<MeasurementRow>(
    `SELECT * FROM body_measurements ORDER BY date DESC LIMIT 1`,
  )
  return row ? rowToMeasurement(row) : null
}
