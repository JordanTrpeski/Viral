import { db } from '@core/db/database'
import { dbInsertChecklist, dbInsertChecklistItem } from '@core/db/checklistQueries'
import * as Crypto from 'expo-crypto'

const WARMUP_COOLDOWN_ITEMS = [
  'Dynamic warm-up (5 min)',
  'Hip circles — 10 each side',
  'Arm swings — 20 reps',
  'Leg swings — 10 each side',
  'Shoulder rolls — 10 each side',
  'Static quad stretch — 30s each',
  'Hamstring stretch — 30s each',
  'Hip flexor stretch — 30s each',
  'Deep breathing — 2 min',
]

export function seedChecklistIfNeeded(): void {
  const row = db.getFirstSync<{ count: number }>('SELECT COUNT(*) as count FROM checklists')
  if (row && row.count > 0) return

  const now = new Date().toISOString()
  const checklistId = Crypto.randomUUID()

  dbInsertChecklist({ id: checklistId, name: 'Workout Routine', isTemplate: false, createdAt: now })

  WARMUP_COOLDOWN_ITEMS.forEach((title, i) => {
    dbInsertChecklistItem({
      id: Crypto.randomUUID(),
      checklistId,
      title,
      isChecked: false,
      orderIndex: i,
      createdAt: now,
    })
  })
}
