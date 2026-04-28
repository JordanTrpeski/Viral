import { db } from './database'
import type {
  OrganizerTier,
  OrganizerTierRule,
  OrganizerPerson,
  OrganizerPersonRule,
  OrganizerGiftIdea,
  OrganizerReminder,
  OrganizerEvent,
  OrganizerEventReminder,
  OrganizerNote,
  OrganizerTag,
} from '@core/types'

// ── Helpers ───────────────────────────────────────────────────────────────────

function bool(v: number): boolean { return v === 1 }

// ── Tiers ─────────────────────────────────────────────────────────────────────

export function dbGetTierCount(): number {
  const row = db.getFirstSync<{ count: number }>('SELECT COUNT(*) as count FROM organizer_tiers')
  return row?.count ?? 0
}

export function dbGetTiers(): OrganizerTier[] {
  const rows = db.getAllSync<{
    id: string; name: string; color: string; emoji: string
    daily_countdown: number; daily_countdown_start_days: number
    order_index: number; is_system: number; created_at: string
  }>('SELECT * FROM organizer_tiers ORDER BY order_index ASC')
  return rows.map((r) => ({
    id: r.id, name: r.name, color: r.color, emoji: r.emoji,
    dailyCountdown: bool(r.daily_countdown),
    dailyCountdownStartDays: r.daily_countdown_start_days,
    orderIndex: r.order_index,
    isSystem: bool(r.is_system),
    createdAt: r.created_at,
  }))
}

export function dbInsertTier(
  id: string, name: string, color: string, emoji: string,
  dailyCountdown: boolean, dailyCountdownStartDays: number,
  orderIndex: number, isSystem: boolean,
): void {
  const now = new Date().toISOString()
  db.runSync(
    `INSERT INTO organizer_tiers
     (id, name, color, emoji, daily_countdown, daily_countdown_start_days, order_index, is_system, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, name, color, emoji, dailyCountdown ? 1 : 0, dailyCountdownStartDays, orderIndex, isSystem ? 1 : 0, now],
  )
}

export function dbUpdateTier(
  id: string, name: string, color: string, emoji: string,
  dailyCountdown: boolean, dailyCountdownStartDays: number,
): void {
  db.runSync(
    `UPDATE organizer_tiers
     SET name=?, color=?, emoji=?, daily_countdown=?, daily_countdown_start_days=?
     WHERE id=?`,
    [name, color, emoji, dailyCountdown ? 1 : 0, dailyCountdownStartDays, id],
  )
}

export function dbDeleteTier(id: string): void {
  db.runSync('DELETE FROM organizer_tiers WHERE id=?', [id])
}

export function dbReorderTiers(orderedIds: string[]): void {
  orderedIds.forEach((id, i) => {
    db.runSync('UPDATE organizer_tiers SET order_index=? WHERE id=?', [i, id])
  })
}

// ── Tier Rules ────────────────────────────────────────────────────────────────

export function dbGetTierRules(tierId: string): OrganizerTierRule[] {
  const rows = db.getAllSync<{
    id: string; tier_id: string; days_before: number
    notification_time: string; message_template: string
    is_enabled: number; created_at: string
  }>('SELECT * FROM organizer_tier_rules WHERE tier_id=? ORDER BY days_before DESC', [tierId])
  return rows.map((r) => ({
    id: r.id, tierId: r.tier_id, daysBefore: r.days_before,
    notificationTime: r.notification_time,
    messageTemplate: r.message_template,
    isEnabled: bool(r.is_enabled),
    createdAt: r.created_at,
  }))
}

export function dbInsertTierRule(
  id: string, tierId: string, daysBefore: number,
  notificationTime: string, messageTemplate: string,
): void {
  const now = new Date().toISOString()
  db.runSync(
    `INSERT INTO organizer_tier_rules
     (id, tier_id, days_before, notification_time, message_template, is_enabled, created_at)
     VALUES (?, ?, ?, ?, ?, 1, ?)`,
    [id, tierId, daysBefore, notificationTime, messageTemplate, now],
  )
}

export function dbDeleteTierRules(tierId: string): void {
  db.runSync('DELETE FROM organizer_tier_rules WHERE tier_id=?', [tierId])
}

export function dbToggleTierRule(id: string, enabled: boolean): void {
  db.runSync('UPDATE organizer_tier_rules SET is_enabled=? WHERE id=?', [enabled ? 1 : 0, id])
}

// ── People ────────────────────────────────────────────────────────────────────

export function dbGetPeople(): OrganizerPerson[] {
  const rows = db.getAllSync<{
    id: string; name: string; birthday_day: number | null
    birthday_month: number | null; birthday_year: number | null
    photo_uri: string | null; tier_id: string; relationship: string | null
    phone: string | null; notes: string | null
    override_notifications: number; created_at: string
  }>('SELECT * FROM organizer_people ORDER BY name ASC')
  return rows.map((r) => ({
    id: r.id, name: r.name,
    birthdayDay: r.birthday_day, birthdayMonth: r.birthday_month, birthdayYear: r.birthday_year,
    photoUri: r.photo_uri, tierId: r.tier_id,
    relationship: r.relationship, phone: r.phone, notes: r.notes,
    overrideNotifications: bool(r.override_notifications),
    createdAt: r.created_at,
  }))
}

export function dbGetPersonById(id: string): OrganizerPerson | null {
  const r = db.getFirstSync<{
    id: string; name: string; birthday_day: number | null
    birthday_month: number | null; birthday_year: number | null
    photo_uri: string | null; tier_id: string; relationship: string | null
    phone: string | null; notes: string | null
    override_notifications: number; created_at: string
  }>('SELECT * FROM organizer_people WHERE id=?', [id])
  if (!r) return null
  return {
    id: r.id, name: r.name,
    birthdayDay: r.birthday_day, birthdayMonth: r.birthday_month, birthdayYear: r.birthday_year,
    photoUri: r.photo_uri, tierId: r.tier_id,
    relationship: r.relationship, phone: r.phone, notes: r.notes,
    overrideNotifications: bool(r.override_notifications),
    createdAt: r.created_at,
  }
}

export function dbInsertPerson(
  id: string, name: string,
  birthdayDay: number | null, birthdayMonth: number | null, birthdayYear: number | null,
  photoUri: string | null, tierId: string, relationship: string | null,
  phone: string | null, notes: string | null,
): void {
  const now = new Date().toISOString()
  db.runSync(
    `INSERT INTO organizer_people
     (id, name, birthday_day, birthday_month, birthday_year, photo_uri, tier_id,
      relationship, phone, notes, override_notifications, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
    [id, name, birthdayDay, birthdayMonth, birthdayYear, photoUri, tierId,
     relationship, phone, notes, now],
  )
}

export function dbUpdatePerson(
  id: string, name: string,
  birthdayDay: number | null, birthdayMonth: number | null, birthdayYear: number | null,
  photoUri: string | null, tierId: string, relationship: string | null,
  phone: string | null, notes: string | null, overrideNotifications: boolean,
): void {
  db.runSync(
    `UPDATE organizer_people SET name=?, birthday_day=?, birthday_month=?, birthday_year=?,
     photo_uri=?, tier_id=?, relationship=?, phone=?, notes=?, override_notifications=?
     WHERE id=?`,
    [name, birthdayDay, birthdayMonth, birthdayYear, photoUri, tierId,
     relationship, phone, notes, overrideNotifications ? 1 : 0, id],
  )
}

export function dbDeletePerson(id: string): void {
  db.runSync('DELETE FROM organizer_people WHERE id=?', [id])
}

// ── Person Rules ──────────────────────────────────────────────────────────────

export function dbGetPersonRules(personId: string): OrganizerPersonRule[] {
  const rows = db.getAllSync<{
    id: string; person_id: string; days_before: number
    notification_time: string; message_template: string
    is_enabled: number; created_at: string
  }>('SELECT * FROM organizer_person_rules WHERE person_id=? ORDER BY days_before DESC', [personId])
  return rows.map((r) => ({
    id: r.id, personId: r.person_id, daysBefore: r.days_before,
    notificationTime: r.notification_time,
    messageTemplate: r.message_template,
    isEnabled: bool(r.is_enabled),
    createdAt: r.created_at,
  }))
}

export function dbInsertPersonRule(
  id: string, personId: string, daysBefore: number,
  notificationTime: string, messageTemplate: string,
): void {
  const now = new Date().toISOString()
  db.runSync(
    `INSERT INTO organizer_person_rules
     (id, person_id, days_before, notification_time, message_template, is_enabled, created_at)
     VALUES (?, ?, ?, ?, ?, 1, ?)`,
    [id, personId, daysBefore, notificationTime, messageTemplate, now],
  )
}

export function dbDeletePersonRules(personId: string): void {
  db.runSync('DELETE FROM organizer_person_rules WHERE person_id=?', [personId])
}

// ── Gift Ideas ────────────────────────────────────────────────────────────────

export function dbGetGiftIdeas(personId: string): OrganizerGiftIdea[] {
  const rows = db.getAllSync<{
    id: string; person_id: string; idea: string
    price_estimate: number | null; is_purchased: number; created_at: string
  }>('SELECT * FROM organizer_gift_ideas WHERE person_id=? ORDER BY created_at ASC', [personId])
  return rows.map((r) => ({
    id: r.id, personId: r.person_id, idea: r.idea,
    priceEstimate: r.price_estimate,
    isPurchased: bool(r.is_purchased),
    createdAt: r.created_at,
  }))
}

export function dbInsertGiftIdea(id: string, personId: string, idea: string, priceEstimate: number | null): void {
  const now = new Date().toISOString()
  db.runSync(
    'INSERT INTO organizer_gift_ideas (id, person_id, idea, price_estimate, is_purchased, created_at) VALUES (?, ?, ?, ?, 0, ?)',
    [id, personId, idea, priceEstimate, now],
  )
}

export function dbToggleGiftIdea(id: string, purchased: boolean): void {
  db.runSync('UPDATE organizer_gift_ideas SET is_purchased=? WHERE id=?', [purchased ? 1 : 0, id])
}

export function dbDeleteGiftIdea(id: string): void {
  db.runSync('DELETE FROM organizer_gift_ideas WHERE id=?', [id])
}

// ── Reminders ─────────────────────────────────────────────────────────────────

export function dbGetReminders(): OrganizerReminder[] {
  const rows = db.getAllSync<{
    id: string; title: string; due_date: string; due_time: string | null
    repeat: string | null; priority: string; person_id: string | null
    note_id: string | null; is_completed: number; completed_at: string | null
    snoozed_until: string | null; created_at: string
  }>('SELECT * FROM organizer_reminders ORDER BY due_date ASC, due_time ASC')
  return rows.map((r) => ({
    id: r.id, title: r.title, dueDate: r.due_date, dueTime: r.due_time,
    repeat: r.repeat as OrganizerReminder['repeat'],
    priority: r.priority as OrganizerReminder['priority'],
    personId: r.person_id, noteId: r.note_id,
    isCompleted: bool(r.is_completed),
    completedAt: r.completed_at, snoozedUntil: r.snoozed_until,
    createdAt: r.created_at,
  }))
}

export function dbInsertReminder(
  id: string, title: string, dueDate: string, dueTime: string | null,
  repeat: string | null, priority: string, personId: string | null, noteId: string | null,
): void {
  const now = new Date().toISOString()
  db.runSync(
    `INSERT INTO organizer_reminders
     (id, title, due_date, due_time, repeat, priority, person_id, note_id,
      is_completed, completed_at, snoozed_until, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, NULL, NULL, ?)`,
    [id, title, dueDate, dueTime, repeat, priority, personId, noteId, now],
  )
}

export function dbCompleteReminder(id: string): void {
  const now = new Date().toISOString()
  db.runSync('UPDATE organizer_reminders SET is_completed=1, completed_at=? WHERE id=?', [now, id])
}

export function dbUncompleteReminder(id: string): void {
  db.runSync('UPDATE organizer_reminders SET is_completed=0, completed_at=NULL WHERE id=?', [id])
}

export function dbSnoozeReminder(id: string, until: string): void {
  db.runSync('UPDATE organizer_reminders SET snoozed_until=? WHERE id=?', [until, id])
}

export function dbDeleteReminder(id: string): void {
  db.runSync('DELETE FROM organizer_reminders WHERE id=?', [id])
}

export function dbUpdateReminderDueDate(id: string, dueDate: string, dueTime: string | null): void {
  db.runSync(
    'UPDATE organizer_reminders SET due_date=?, due_time=?, snoozed_until=? WHERE id=?',
    [dueDate, dueTime, new Date().toISOString(), id],
  )
}

export function dbUpdateReminder(
  id: string, title: string, dueDate: string, dueTime: string | null,
  repeat: string | null, priority: string, personId: string | null, noteId: string | null,
): void {
  db.runSync(
    `UPDATE organizer_reminders SET title=?, due_date=?, due_time=?, repeat=?, priority=?, person_id=?, note_id=?
     WHERE id=?`,
    [title, dueDate, dueTime, repeat, priority, personId, noteId, id],
  )
}

// ── Events ────────────────────────────────────────────────────────────────────

export function dbGetEventsForMonth(year: number, month: number): OrganizerEvent[] {
  const prefix = `${year}-${String(month).padStart(2, '0')}`
  const rows = db.getAllSync<{
    id: string; title: string; date: string; start_time: string | null
    end_time: string | null; is_all_day: number; location: string | null
    repeat: string | null; color: string | null; notes: string | null
    person_id: string | null; created_at: string
  }>('SELECT * FROM organizer_events WHERE date LIKE ? ORDER BY date ASC, start_time ASC', [`${prefix}%`])
  return rows.map((r) => ({
    id: r.id, title: r.title, date: r.date,
    startTime: r.start_time, endTime: r.end_time,
    isAllDay: bool(r.is_all_day), location: r.location,
    repeat: r.repeat as OrganizerEvent['repeat'],
    color: r.color, notes: r.notes, personId: r.person_id,
    createdAt: r.created_at,
  }))
}

export function dbGetEventsForDate(date: string): OrganizerEvent[] {
  const rows = db.getAllSync<{
    id: string; title: string; date: string; start_time: string | null
    end_time: string | null; is_all_day: number; location: string | null
    repeat: string | null; color: string | null; notes: string | null
    person_id: string | null; created_at: string
  }>('SELECT * FROM organizer_events WHERE date=? ORDER BY start_time ASC', [date])
  return rows.map((r) => ({
    id: r.id, title: r.title, date: r.date,
    startTime: r.start_time, endTime: r.end_time,
    isAllDay: bool(r.is_all_day), location: r.location,
    repeat: r.repeat as OrganizerEvent['repeat'],
    color: r.color, notes: r.notes, personId: r.person_id,
    createdAt: r.created_at,
  }))
}

export function dbInsertEvent(
  id: string, title: string, date: string,
  startTime: string | null, endTime: string | null, isAllDay: boolean,
  location: string | null, repeat: string | null, color: string | null,
  notes: string | null, personId: string | null,
): void {
  const now = new Date().toISOString()
  db.runSync(
    `INSERT INTO organizer_events
     (id, title, date, start_time, end_time, is_all_day, location, repeat, color, notes, person_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, title, date, startTime, endTime, isAllDay ? 1 : 0, location, repeat, color, notes, personId, now],
  )
}

export function dbDeleteEvent(id: string): void {
  db.runSync('DELETE FROM organizer_events WHERE id=?', [id])
}

// ── Event Reminders ───────────────────────────────────────────────────────────

export function dbGetEventReminders(eventId: string): OrganizerEventReminder[] {
  const rows = db.getAllSync<{ id: string; event_id: string; minutes_before: number; created_at: string }>(
    'SELECT * FROM organizer_event_reminders WHERE event_id=?', [eventId],
  )
  return rows.map((r) => ({ id: r.id, eventId: r.event_id, minutesBefore: r.minutes_before, createdAt: r.created_at }))
}

export function dbInsertEventReminder(id: string, eventId: string, minutesBefore: number): void {
  const now = new Date().toISOString()
  db.runSync(
    'INSERT INTO organizer_event_reminders (id, event_id, minutes_before, created_at) VALUES (?, ?, ?, ?)',
    [id, eventId, minutesBefore, now],
  )
}

export function dbDeleteEventReminders(eventId: string): void {
  db.runSync('DELETE FROM organizer_event_reminders WHERE event_id=?', [eventId])
}

// ── Notes ─────────────────────────────────────────────────────────────────────

export function dbGetNotes(includeArchived = false): OrganizerNote[] {
  const query = includeArchived
    ? 'SELECT * FROM organizer_notes ORDER BY is_pinned DESC, updated_at DESC'
    : 'SELECT * FROM organizer_notes WHERE is_archived=0 ORDER BY is_pinned DESC, updated_at DESC'
  const rows = db.getAllSync<{
    id: string; title: string | null; body: string; is_pinned: number
    is_archived: number; person_id: string | null; event_id: string | null
    created_at: string; updated_at: string
  }>(query)
  return rows.map((r) => ({
    id: r.id, title: r.title, body: r.body,
    isPinned: bool(r.is_pinned), isArchived: bool(r.is_archived),
    personId: r.person_id, eventId: r.event_id,
    createdAt: r.created_at, updatedAt: r.updated_at,
  }))
}

export function dbInsertNote(id: string, title: string | null, body: string, personId: string | null, eventId: string | null): void {
  const now = new Date().toISOString()
  db.runSync(
    `INSERT INTO organizer_notes (id, title, body, is_pinned, is_archived, person_id, event_id, created_at, updated_at)
     VALUES (?, ?, ?, 0, 0, ?, ?, ?, ?)`,
    [id, title, body, personId, eventId, now, now],
  )
}

export function dbUpdateNote(id: string, title: string | null, body: string): void {
  const now = new Date().toISOString()
  db.runSync('UPDATE organizer_notes SET title=?, body=?, updated_at=? WHERE id=?', [title, body, now, id])
}

export function dbPinNote(id: string, pinned: boolean): void {
  db.runSync('UPDATE organizer_notes SET is_pinned=? WHERE id=?', [pinned ? 1 : 0, id])
}

export function dbArchiveNote(id: string, archived: boolean): void {
  db.runSync('UPDATE organizer_notes SET is_archived=? WHERE id=?', [archived ? 1 : 0, id])
}

export function dbDeleteNote(id: string): void {
  db.runSync('DELETE FROM organizer_notes WHERE id=?', [id])
}

// ── Tags ──────────────────────────────────────────────────────────────────────

export function dbGetTags(): OrganizerTag[] {
  const rows = db.getAllSync<{ id: string; name: string; color: string; created_at: string }>(
    'SELECT * FROM organizer_tags ORDER BY name ASC',
  )
  return rows.map((r) => ({ id: r.id, name: r.name, color: r.color, createdAt: r.created_at }))
}

export function dbInsertTag(id: string, name: string, color: string): void {
  const now = new Date().toISOString()
  db.runSync('INSERT INTO organizer_tags (id, name, color, created_at) VALUES (?, ?, ?, ?)', [id, name, color, now])
}

export function dbGetNoteTags(noteId: string): OrganizerTag[] {
  const rows = db.getAllSync<{ id: string; name: string; color: string; created_at: string }>(
    `SELECT t.* FROM organizer_tags t
     JOIN organizer_note_tags nt ON nt.tag_id = t.id
     WHERE nt.note_id=?`, [noteId],
  )
  return rows.map((r) => ({ id: r.id, name: r.name, color: r.color, createdAt: r.created_at }))
}

export function dbAddNoteTag(noteId: string, tagId: string): void {
  db.runSync('INSERT OR IGNORE INTO organizer_note_tags (note_id, tag_id) VALUES (?, ?)', [noteId, tagId])
}

export function dbRemoveNoteTag(noteId: string, tagId: string): void {
  db.runSync('DELETE FROM organizer_note_tags WHERE note_id=? AND tag_id=?', [noteId, tagId])
}

export function dbDeleteTag(id: string): void {
  db.runSync('DELETE FROM organizer_tags WHERE id=?', [id])
}

export function dbGetAllNoteTagPairs(): { noteId: string; tagId: string }[] {
  return db.getAllSync<{ note_id: string; tag_id: string }>(
    'SELECT note_id, tag_id FROM organizer_note_tags',
  ).map((r) => ({ noteId: r.note_id, tagId: r.tag_id }))
}

export function dbGetNotesByPerson(personId: string): OrganizerNote[] {
  const rows = db.getAllSync<{
    id: string; title: string | null; body: string; is_pinned: number
    is_archived: number; person_id: string | null; event_id: string | null
    created_at: string; updated_at: string
  }>('SELECT * FROM organizer_notes WHERE person_id=? AND is_archived=0 ORDER BY updated_at DESC', [personId])
  return rows.map((r) => ({
    id: r.id, title: r.title, body: r.body,
    isPinned: bool(r.is_pinned), isArchived: bool(r.is_archived),
    personId: r.person_id, eventId: r.event_id,
    createdAt: r.created_at, updatedAt: r.updated_at,
  }))
}

export function dbGetEventsByPerson(personId: string): OrganizerEvent[] {
  const rows = db.getAllSync<{
    id: string; title: string; date: string; start_time: string | null
    end_time: string | null; is_all_day: number; location: string | null
    repeat: string | null; color: string | null; notes: string | null
    person_id: string | null; created_at: string
  }>('SELECT * FROM organizer_events WHERE person_id=? ORDER BY date ASC', [personId])
  return rows.map((r) => ({
    id: r.id, title: r.title, date: r.date,
    startTime: r.start_time, endTime: r.end_time,
    isAllDay: bool(r.is_all_day), location: r.location,
    repeat: r.repeat as OrganizerEvent['repeat'],
    color: r.color, notes: r.notes, personId: r.person_id,
    createdAt: r.created_at,
  }))
}
