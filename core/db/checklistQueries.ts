import { db } from './database'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Checklist {
  id: string
  name: string
  isTemplate: boolean
  createdAt: string
}

export interface ChecklistItem {
  id: string
  checklistId: string
  title: string
  isChecked: boolean
  orderIndex: number
  createdAt: string
}

export interface ChecklistWithProgress extends Checklist {
  totalItems: number
  checkedItems: number
}

// ─── Checklists ───────────────────────────────────────────────────────────────

interface RawChecklist {
  id: string; name: string; is_template: number; created_at: string
  total_items: number; checked_items: number
}

function rowToChecklist(r: RawChecklist): ChecklistWithProgress {
  return {
    id: r.id,
    name: r.name,
    isTemplate: r.is_template === 1,
    createdAt: r.created_at,
    totalItems: r.total_items,
    checkedItems: r.checked_items,
  }
}

export function dbGetChecklists(): ChecklistWithProgress[] {
  return db.getAllSync<RawChecklist>(
    `SELECT c.*,
            COUNT(ci.id) as total_items,
            SUM(ci.is_checked) as checked_items
     FROM checklists c
     LEFT JOIN checklist_items ci ON ci.checklist_id = c.id
     GROUP BY c.id
     ORDER BY c.created_at DESC`,
  ).map(rowToChecklist)
}

export function dbInsertChecklist(c: Checklist): void {
  db.runSync(
    'INSERT INTO checklists (id, name, is_template, created_at) VALUES (?, ?, ?, ?)',
    [c.id, c.name, c.isTemplate ? 1 : 0, c.createdAt],
  )
}

export function dbUpdateChecklistName(id: string, name: string): void {
  db.runSync('UPDATE checklists SET name = ? WHERE id = ?', [name, id])
}

export function dbSetChecklistTemplate(id: string, isTemplate: boolean): void {
  db.runSync('UPDATE checklists SET is_template = ? WHERE id = ?', [isTemplate ? 1 : 0, id])
}

export function dbDeleteChecklist(id: string): void {
  db.runSync('DELETE FROM checklists WHERE id = ?', [id])
}

// ─── Items ────────────────────────────────────────────────────────────────────

interface RawItem {
  id: string; checklist_id: string; title: string
  is_checked: number; order_index: number; created_at: string
}

function rowToItem(r: RawItem): ChecklistItem {
  return {
    id: r.id,
    checklistId: r.checklist_id,
    title: r.title,
    isChecked: r.is_checked === 1,
    orderIndex: r.order_index,
    createdAt: r.created_at,
  }
}

export function dbGetChecklistItems(checklistId: string): ChecklistItem[] {
  return db.getAllSync<RawItem>(
    'SELECT * FROM checklist_items WHERE checklist_id = ? ORDER BY order_index ASC',
    [checklistId],
  ).map(rowToItem)
}

export function dbInsertChecklistItem(item: ChecklistItem): void {
  db.runSync(
    'INSERT INTO checklist_items (id, checklist_id, title, is_checked, order_index, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    [item.id, item.checklistId, item.title, item.isChecked ? 1 : 0, item.orderIndex, item.createdAt],
  )
}

export function dbToggleChecklistItem(id: string, isChecked: boolean): void {
  db.runSync('UPDATE checklist_items SET is_checked = ? WHERE id = ?', [isChecked ? 1 : 0, id])
}

export function dbUpdateItemTitle(id: string, title: string): void {
  db.runSync('UPDATE checklist_items SET title = ? WHERE id = ?', [title, id])
}

export function dbUpdateItemOrder(id: string, orderIndex: number): void {
  db.runSync('UPDATE checklist_items SET order_index = ? WHERE id = ?', [orderIndex, id])
}

export function dbDeleteChecklistItem(id: string): void {
  db.runSync('DELETE FROM checklist_items WHERE id = ?', [id])
}

export function dbUncheckAllItems(checklistId: string): void {
  db.runSync('UPDATE checklist_items SET is_checked = 0 WHERE checklist_id = ?', [checklistId])
}

export function dbGetChecklistItemCount(checklistId: string): number {
  const row = db.getFirstSync<{ count: number }>(
    'SELECT COUNT(*) as count FROM checklist_items WHERE checklist_id = ?',
    [checklistId],
  )
  return row?.count ?? 0
}
