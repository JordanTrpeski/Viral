import { create } from 'zustand'
import * as Crypto from 'expo-crypto'
import {
  dbGetChecklists, dbInsertChecklist, dbUpdateChecklistName,
  dbSetChecklistTemplate, dbDeleteChecklist,
  dbGetChecklistItems, dbInsertChecklistItem, dbToggleChecklistItem,
  dbUpdateItemTitle, dbUpdateItemOrder, dbDeleteChecklistItem,
  dbUncheckAllItems, dbGetChecklistItemCount,
  type ChecklistWithProgress, type ChecklistItem,
} from '@core/db/checklistQueries'

// ─── Store ────────────────────────────────────────────────────────────────────

interface ChecklistState {
  checklists: ChecklistWithProgress[]
  items: ChecklistItem[]

  loadChecklists: () => void
  createChecklist: (name: string) => string
  deleteChecklist: (id: string) => void
  renameChecklist: (id: string, name: string) => void
  setTemplate: (id: string, isTemplate: boolean) => void
  startFromTemplate: (templateId: string) => string

  loadItems: (checklistId: string) => void
  addItem: (checklistId: string, title: string) => void
  deleteItem: (checklistId: string, itemId: string) => void
  toggleItem: (checklistId: string, itemId: string) => void
  renameItem: (itemId: string, title: string) => void
  moveItem: (checklistId: string, itemId: string, direction: 'up' | 'down') => void
  resetChecklist: (checklistId: string) => void
}

export const useChecklistStore = create<ChecklistState>((set, get) => ({
  checklists: [],
  items: [],

  // ── Checklists ────────────────────────────────────────────────────────────

  loadChecklists: () => {
    set({ checklists: dbGetChecklists() })
  },

  createChecklist: (name) => {
    const now = new Date().toISOString()
    const id = Crypto.randomUUID()
    dbInsertChecklist({ id, name, isTemplate: false, createdAt: now })
    get().loadChecklists()
    return id
  },

  deleteChecklist: (id) => {
    dbDeleteChecklist(id)
    set((s) => ({ checklists: s.checklists.filter((c) => c.id !== id) }))
  },

  renameChecklist: (id, name) => {
    dbUpdateChecklistName(id, name)
    set((s) => ({
      checklists: s.checklists.map((c) => c.id === id ? { ...c, name } : c),
    }))
  },

  setTemplate: (id, isTemplate) => {
    dbSetChecklistTemplate(id, isTemplate)
    set((s) => ({
      checklists: s.checklists.map((c) => c.id === id ? { ...c, isTemplate } : c),
    }))
  },

  startFromTemplate: (templateId) => {
    const now = new Date().toISOString()
    const templateMeta = get().checklists.find((c) => c.id === templateId)
    const newId = Crypto.randomUUID()

    dbInsertChecklist({
      id: newId,
      name: templateMeta?.name ?? 'New Checklist',
      isTemplate: false,
      createdAt: now,
    })

    const sourceItems = dbGetChecklistItems(templateId)
    sourceItems.forEach((item) => {
      dbInsertChecklistItem({
        id: Crypto.randomUUID(),
        checklistId: newId,
        title: item.title,
        isChecked: false,
        orderIndex: item.orderIndex,
        createdAt: now,
      })
    })

    get().loadChecklists()
    return newId
  },

  // ── Items ─────────────────────────────────────────────────────────────────

  loadItems: (checklistId) => {
    set({ items: dbGetChecklistItems(checklistId) })
  },

  addItem: (checklistId, title) => {
    const now = new Date().toISOString()
    const nextOrder = dbGetChecklistItemCount(checklistId)
    const newItem: ChecklistItem = {
      id: Crypto.randomUUID(),
      checklistId,
      title,
      isChecked: false,
      orderIndex: nextOrder,
      createdAt: now,
    }
    dbInsertChecklistItem(newItem)
    set((s) => ({
      items: [...s.items, newItem],
      checklists: s.checklists.map((c) =>
        c.id === checklistId ? { ...c, totalItems: c.totalItems + 1 } : c,
      ),
    }))
  },

  deleteItem: (checklistId, itemId) => {
    dbDeleteChecklistItem(itemId)
    set((s) => {
      const remaining = s.items.filter((i) => i.id !== itemId)
      const deleted = s.items.find((i) => i.id === itemId)
      // Re-normalise order
      remaining.forEach((item, idx) => {
        if (item.orderIndex !== idx) dbUpdateItemOrder(item.id, idx)
      })
      return {
        items: remaining.map((item, idx) => ({ ...item, orderIndex: idx })),
        checklists: s.checklists.map((c) =>
          c.id === checklistId
            ? {
                ...c,
                totalItems: c.totalItems - 1,
                checkedItems: deleted?.isChecked ? c.checkedItems - 1 : c.checkedItems,
              }
            : c,
        ),
      }
    })
  },

  toggleItem: (checklistId, itemId) => {
    const item = get().items.find((i) => i.id === itemId)
    if (!item) return
    const next = !item.isChecked
    dbToggleChecklistItem(itemId, next)
    set((s) => ({
      items: s.items.map((i) => i.id === itemId ? { ...i, isChecked: next } : i),
      checklists: s.checklists.map((c) =>
        c.id === checklistId
          ? { ...c, checkedItems: c.checkedItems + (next ? 1 : -1) }
          : c,
      ),
    }))
  },

  renameItem: (itemId, title) => {
    dbUpdateItemTitle(itemId, title)
    set((s) => ({
      items: s.items.map((i) => i.id === itemId ? { ...i, title } : i),
    }))
  },

  moveItem: (checklistId, itemId, direction) => {
    set((s) => {
      const items = [...s.items]
      const idx = items.findIndex((i) => i.id === itemId)
      if (idx === -1) return {}
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1
      if (swapIdx < 0 || swapIdx >= items.length) return {}

      // Swap order_index values
      const a = { ...items[idx], orderIndex: swapIdx }
      const b = { ...items[swapIdx], orderIndex: idx }
      items[idx] = b
      items[swapIdx] = a

      dbUpdateItemOrder(a.id, a.orderIndex)
      dbUpdateItemOrder(b.id, b.orderIndex)

      return { items: items.sort((x, y) => x.orderIndex - y.orderIndex) }
    })
  },

  resetChecklist: (checklistId) => {
    dbUncheckAllItems(checklistId)
    set((s) => ({
      items: s.items.map((i) => i.checklistId === checklistId ? { ...i, isChecked: false } : i),
      checklists: s.checklists.map((c) =>
        c.id === checklistId ? { ...c, checkedItems: 0 } : c,
      ),
    }))
  },
}))
