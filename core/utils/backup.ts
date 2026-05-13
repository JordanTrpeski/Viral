import * as FileSystem from 'expo-file-system/legacy'
import * as Sharing from 'expo-sharing'
import * as DocumentPicker from 'expo-document-picker'
import { Alert, Platform } from 'react-native'
import { db } from '@core/db/database'

// ── File naming ──────────────────────────────────────────────────────────────

const FILE_PREFIX = 'seed-viral'

export function backupFileName(): string {
  const d = new Date()
  const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  return `${FILE_PREFIX}-${ymd}.json`
}

// ── Tables to export (all user data tables) ─────────────────────────────────

const EXPORT_TABLES = [
  'user_profile',
  'body_weight_log',
  'workout_sessions',
  'workout_sets',
  'exercises',
  'meals',
  'meal_entries',
  'meal_templates',
  'meal_template_entries',
  'foods',
  'steps_log',
  'step_sessions',
  'water_log',
  'budget_categories',
  'budget_income',
  'budget_expenses',
  'budget_expense_items',
  'budget_templates',
  'budget_template_items',
  'budget_template_uses',
  'checklists',
  'checklist_items',
  'organizer_tiers',
  'organizer_tier_rules',
  'organizer_people',
  'organizer_person_rules',
  'organizer_gift_ideas',
  'organizer_reminders',
  'organizer_events',
  'organizer_event_reminders',
  'organizer_notes',
  'organizer_tags',
  'organizer_note_tags',
] as const

// Tables to CLEAR before restore (order matters for FK constraints)
const RESTORE_ORDER = [
  'organizer_note_tags',
  'organizer_gift_ideas',
  'organizer_person_rules',
  'organizer_event_reminders',
  'organizer_notes',
  'organizer_events',
  'organizer_reminders',
  'organizer_people',
  'organizer_tier_rules',
  'organizer_tiers',
  'checklist_items',
  'checklists',
  'budget_template_uses',
  'budget_template_items',
  'budget_templates',
  'budget_expense_items',
  'budget_expenses',
  'budget_income',
  'budget_categories',
  'step_sessions',
  'steps_log',
  'water_log',
  'meal_template_entries',
  'meal_templates',
  'meal_entries',
  'meals',
  'foods',
  'workout_sets',
  'workout_sessions',
  'exercises',
  'body_weight_log',
  'user_profile',
]

// ── Export ───────────────────────────────────────────────────────────────────

export async function exportBackup(): Promise<void> {
  try {
    const snapshot: Record<string, unknown[]> = {}
    for (const table of EXPORT_TABLES) {
      try {
        snapshot[table] = db.getAllSync(`SELECT * FROM ${table}`) as unknown[]
      } catch {
        snapshot[table] = []
      }
    }

    const payload = JSON.stringify({
      version: 1,
      exportedAt: new Date().toISOString(),
      app: 'Viral MyOS',
      tables: snapshot,
    }, null, 2)

    const fileName = backupFileName()
    const filePath = (FileSystem.cacheDirectory ?? '') + fileName

    await FileSystem.writeAsStringAsync(filePath, payload, { encoding: FileSystem.EncodingType.UTF8 })

    const canShare = await Sharing.isAvailableAsync()
    if (!canShare) {
      Alert.alert('Sharing unavailable', 'Cannot share files on this device.')
      return
    }

    await Sharing.shareAsync(filePath, {
      mimeType: 'application/json',
      dialogTitle: `Save ${fileName}`,
      UTI: 'public.json',
    })
  } catch (e) {
    Alert.alert('Export failed', String(e))
  }
}

// ── Import ───────────────────────────────────────────────────────────────────

export async function importBackup(onSuccess: () => void): Promise<void> {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: Platform.OS === 'ios' ? 'public.json' : 'application/json',
      copyToCacheDirectory: true,
    })

    if (result.canceled || !result.assets?.[0]) return

    const asset = result.assets[0]

    // Warn user that the file name looks like a seed-viral backup
    const fileName = asset.name ?? ''
    const looksValid = fileName.startsWith(FILE_PREFIX) || fileName.endsWith('.json')
    if (!looksValid) {
      Alert.alert('Wrong file?', `"${fileName}" doesn't look like a ${FILE_PREFIX} backup. Continue anyway?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Import anyway', onPress: () => void doRestore(asset.uri, onSuccess) },
      ])
      return
    }

    Alert.alert(
      'Restore backup?',
      `This will replace all current data with the contents of "${fileName}". This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Restore', style: 'destructive', onPress: () => void doRestore(asset.uri, onSuccess) },
      ],
    )
  } catch (e) {
    Alert.alert('Import failed', String(e))
  }
}

async function doRestore(uri: string, onSuccess: () => void): Promise<void> {
  try {
    const raw = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.UTF8 })
    const parsed = JSON.parse(raw) as { version?: number; tables?: Record<string, unknown[]> }

    if (!parsed.tables) {
      Alert.alert('Invalid backup', 'File does not contain a valid seed-viral backup.')
      return
    }

    db.withTransactionSync(() => {
      // Disable FK checks during restore so order is flexible
      db.execSync('PRAGMA foreign_keys = OFF;')

      for (const table of RESTORE_ORDER) {
        try { db.execSync(`DELETE FROM ${table}`) } catch { /* table may not exist yet */ }
      }

      for (const [table, rows] of Object.entries(parsed.tables ?? {})) {
        if (!Array.isArray(rows) || rows.length === 0) continue
        const cols = Object.keys(rows[0] as Record<string, unknown>)
        const placeholders = cols.map(() => '?').join(', ')
        const sql = `INSERT OR IGNORE INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})`
        for (const row of rows) {
          const values = cols.map((c) => (row as Record<string, unknown>)[c] ?? null)
          try { db.runSync(sql, values as (string | number | null)[]) } catch { /* skip bad rows */ }
        }
      }

      db.execSync('PRAGMA foreign_keys = ON;')
    })

    onSuccess()
    Alert.alert('Restored', 'Your data has been restored successfully. Restart the app to see all changes.')
  } catch (e) {
    Alert.alert('Restore failed', String(e))
  }
}
