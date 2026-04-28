import { create } from 'zustand'
import type {
  OrganizerTier, OrganizerTierRule,
  OrganizerPerson,
  OrganizerReminder,
  OrganizerEvent,
  OrganizerNote,
  OrganizerTag,
} from '@core/types'
import {
  dbGetTiers, dbGetTierRules, dbInsertTier, dbUpdateTier, dbDeleteTier,
  dbDeleteTierRules, dbInsertTierRule, dbReorderTiers, dbToggleTierRule,
  dbGetPeople, dbInsertPerson, dbUpdatePerson, dbDeletePerson,
  dbGetReminders, dbInsertReminder, dbUpdateReminder, dbCompleteReminder, dbUncompleteReminder,
  dbDeleteReminder, dbSnoozeReminder, dbUpdateReminderDueDate,
  dbGetEventsForMonth, dbInsertEvent, dbDeleteEvent,
  dbGetNotes, dbInsertNote, dbUpdateNote, dbPinNote, dbArchiveNote, dbDeleteNote,
  dbGetTags, dbInsertTag, dbDeleteTag, dbAddNoteTag, dbRemoveNoteTag, dbGetAllNoteTagPairs,
} from '@core/db/organizerQueries'

let _idCounter = 0
function genId(prefix: string): string {
  return `${prefix}_${Date.now()}_${++_idCounter}`
}

interface OrganizerStore {
  tiers: OrganizerTier[]
  tierRules: Record<string, OrganizerTierRule[]>
  people: OrganizerPerson[]
  reminders: OrganizerReminder[]
  events: OrganizerEvent[]
  notes: OrganizerNote[]
  tags: OrganizerTag[]
  noteTagMap: Record<string, string[]>

  // Tiers
  loadTiers: () => void
  loadTierRules: (tierId: string) => void
  addTier: (name: string, color: string, emoji: string, dailyCountdown: boolean, dailyCountdownStartDays: number) => string
  editTier: (id: string, name: string, color: string, emoji: string, dailyCountdown: boolean, dailyCountdownStartDays: number) => void
  removeTier: (id: string) => void
  reorderTiers: (orderedIds: string[]) => void
  addTierRule: (tierId: string, daysBefore: number, notificationTime: string, messageTemplate: string) => void
  clearTierRules: (tierId: string) => void
  toggleTierRule: (ruleId: string, tierId: string, enabled: boolean) => void

  // People
  loadPeople: () => void
  addPerson: (
    name: string,
    birthdayDay: number | null, birthdayMonth: number | null, birthdayYear: number | null,
    photoUri: string | null, tierId: string, relationship: string | null,
    phone: string | null, notes: string | null,
  ) => string
  editPerson: (
    id: string, name: string,
    birthdayDay: number | null, birthdayMonth: number | null, birthdayYear: number | null,
    photoUri: string | null, tierId: string, relationship: string | null,
    phone: string | null, notes: string | null, overrideNotifications: boolean,
  ) => void
  removePerson: (id: string) => void

  // Reminders
  loadReminders: () => void
  addReminder: (
    title: string, dueDate: string, dueTime: string | null,
    repeat: string | null, priority: string,
    personId: string | null, noteId: string | null,
  ) => void
  editReminder: (
    id: string, title: string, dueDate: string, dueTime: string | null,
    repeat: string | null, priority: string,
    personId: string | null, noteId: string | null,
  ) => void
  completeReminder: (id: string) => void
  uncompleteReminder: (id: string) => void
  snoozeReminder: (id: string, dueDate: string, dueTime: string | null) => void
  removeReminder: (id: string) => void

  // Events
  loadEvents: (year: number, month: number) => void
  addEvent: (
    title: string, date: string, startTime: string | null, endTime: string | null,
    isAllDay: boolean, location: string | null, repeat: string | null,
    color: string | null, notes: string | null, personId: string | null,
  ) => void
  removeEvent: (id: string, year: number, month: number) => void

  // Notes
  loadNotes: () => void
  addNote: (title: string | null, body: string, personId: string | null, eventId: string | null) => string
  editNote: (id: string, title: string | null, body: string) => void
  pinNote: (id: string, pinned: boolean) => void
  archiveNote: (id: string, archived: boolean) => void
  removeNote: (id: string) => void

  // Tags
  loadTags: () => void
  addTag: (name: string, color: string) => string
  deleteTag: (id: string) => void
  tagNote: (noteId: string, tagId: string, add: boolean) => void
}

export const useOrganizerStore = create<OrganizerStore>((set, get) => ({
  tiers: [],
  tierRules: {},
  people: [],
  reminders: [],
  events: [],
  notes: [],
  tags: [],
  noteTagMap: {},

  loadTiers() {
    set({ tiers: dbGetTiers() })
  },

  loadTierRules(tierId) {
    set((s) => ({ tierRules: { ...s.tierRules, [tierId]: dbGetTierRules(tierId) } }))
  },

  addTier(name, color, emoji, dailyCountdown, dailyCountdownStartDays) {
    const id = genId('tier')
    const orderIndex = get().tiers.length
    dbInsertTier(id, name, color, emoji, dailyCountdown, dailyCountdownStartDays, orderIndex, false)
    get().loadTiers()
    return id
  },

  editTier(id, name, color, emoji, dailyCountdown, dailyCountdownStartDays) {
    dbUpdateTier(id, name, color, emoji, dailyCountdown, dailyCountdownStartDays)
    get().loadTiers()
  },

  removeTier(id) {
    dbDeleteTier(id)
    get().loadTiers()
  },

  reorderTiers(orderedIds) {
    dbReorderTiers(orderedIds)
    get().loadTiers()
  },

  addTierRule(tierId, daysBefore, notificationTime, messageTemplate) {
    dbInsertTierRule(genId('trule'), tierId, daysBefore, notificationTime, messageTemplate)
    get().loadTierRules(tierId)
  },

  clearTierRules(tierId) {
    dbDeleteTierRules(tierId)
    set((s) => ({ tierRules: { ...s.tierRules, [tierId]: [] } }))
  },

  toggleTierRule(ruleId, tierId, enabled) {
    dbToggleTierRule(ruleId, enabled)
    get().loadTierRules(tierId)
  },

  loadPeople() {
    set({ people: dbGetPeople() })
  },

  addPerson(name, birthdayDay, birthdayMonth, birthdayYear, photoUri, tierId, relationship, phone, notes) {
    const id = genId('person')
    dbInsertPerson(id, name, birthdayDay, birthdayMonth, birthdayYear, photoUri, tierId, relationship, phone, notes)
    get().loadPeople()
    return id
  },

  editPerson(id, name, birthdayDay, birthdayMonth, birthdayYear, photoUri, tierId, relationship, phone, notes, overrideNotifications) {
    dbUpdatePerson(id, name, birthdayDay, birthdayMonth, birthdayYear, photoUri, tierId, relationship, phone, notes, overrideNotifications)
    get().loadPeople()
  },

  removePerson(id) {
    dbDeletePerson(id)
    get().loadPeople()
  },

  loadReminders() {
    set({ reminders: dbGetReminders() })
  },

  addReminder(title, dueDate, dueTime, repeat, priority, personId, noteId) {
    dbInsertReminder(genId('reminder'), title, dueDate, dueTime, repeat, priority, personId, noteId)
    get().loadReminders()
  },

  editReminder(id, title, dueDate, dueTime, repeat, priority, personId, noteId) {
    dbUpdateReminder(id, title, dueDate, dueTime, repeat, priority, personId, noteId)
    get().loadReminders()
  },

  completeReminder(id) {
    dbCompleteReminder(id)
    get().loadReminders()
  },

  uncompleteReminder(id) {
    dbUncompleteReminder(id)
    get().loadReminders()
  },

  snoozeReminder(id, dueDate, dueTime) {
    dbUpdateReminderDueDate(id, dueDate, dueTime)
    get().loadReminders()
  },

  removeReminder(id) {
    dbDeleteReminder(id)
    get().loadReminders()
  },

  loadEvents(year, month) {
    set({ events: dbGetEventsForMonth(year, month) })
  },

  addEvent(title, date, startTime, endTime, isAllDay, location, repeat, color, notes, personId) {
    const [y, m] = date.split('-').map(Number)
    dbInsertEvent(genId('event'), title, date, startTime, endTime, isAllDay, location, repeat, color, notes, personId)
    get().loadEvents(y, m)
  },

  removeEvent(id, year, month) {
    dbDeleteEvent(id)
    get().loadEvents(year, month)
  },

  loadNotes() {
    set({ notes: dbGetNotes() })
  },

  addNote(title, body, personId, eventId) {
    const id = genId('note')
    dbInsertNote(id, title, body, personId, eventId)
    get().loadNotes()
    return id
  },

  editNote(id, title, body) {
    dbUpdateNote(id, title, body)
    get().loadNotes()
  },

  pinNote(id, pinned) {
    dbPinNote(id, pinned)
    get().loadNotes()
  },

  archiveNote(id, archived) {
    dbArchiveNote(id, archived)
    get().loadNotes()
  },

  removeNote(id) {
    dbDeleteNote(id)
    get().loadNotes()
  },

  loadTags() {
    const tags = dbGetTags()
    const pairs = dbGetAllNoteTagPairs()
    const map: Record<string, string[]> = {}
    for (const p of pairs) {
      if (!map[p.noteId]) map[p.noteId] = []
      map[p.noteId].push(p.tagId)
    }
    set({ tags, noteTagMap: map })
  },

  addTag(name, color) {
    const id = genId('tag')
    dbInsertTag(id, name, color)
    get().loadTags()
    return id
  },

  deleteTag(id) {
    dbDeleteTag(id)
    get().loadTags()
  },

  tagNote(noteId, tagId, add) {
    if (add) {
      dbAddNoteTag(noteId, tagId)
    } else {
      dbRemoveNoteTag(noteId, tagId)
    }
    get().loadTags()
  },
}))
