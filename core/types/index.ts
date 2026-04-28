export interface UserProfile {
  id: string
  name: string
  dateOfBirth: string
  weightKg: number
  heightCm: number
  goals: string[]
  calorieGoalKcal?: number
  createdAt: string
  updatedAt: string
}

export interface DailyLog {
  id: string
  date: string        // YYYY-MM-DD, unique
  notes: string | null
  createdAt: string
}

// ── Organizer ──────────────────────────────────────────────────────────────────

export interface OrganizerTier {
  id: string
  name: string
  color: string
  emoji: string
  dailyCountdown: boolean
  dailyCountdownStartDays: number
  orderIndex: number
  isSystem: boolean
  createdAt: string
}

export interface OrganizerTierRule {
  id: string
  tierId: string
  daysBefore: number
  notificationTime: string  // HH:MM
  messageTemplate: string
  isEnabled: boolean
  createdAt: string
}

export interface OrganizerPerson {
  id: string
  name: string
  birthdayDay: number | null
  birthdayMonth: number | null
  birthdayYear: number | null
  photoUri: string | null
  tierId: string
  relationship: string | null
  phone: string | null
  notes: string | null
  overrideNotifications: boolean
  createdAt: string
}

export interface OrganizerPersonRule {
  id: string
  personId: string
  daysBefore: number
  notificationTime: string
  messageTemplate: string
  isEnabled: boolean
  createdAt: string
}

export interface OrganizerGiftIdea {
  id: string
  personId: string
  idea: string
  priceEstimate: number | null
  isPurchased: boolean
  createdAt: string
}

export type ReminderRepeat = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly'
export type ReminderPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface OrganizerReminder {
  id: string
  title: string
  dueDate: string           // YYYY-MM-DD
  dueTime: string | null    // HH:MM
  repeat: ReminderRepeat | null
  priority: ReminderPriority
  personId: string | null
  noteId: string | null
  isCompleted: boolean
  completedAt: string | null
  snoozedUntil: string | null
  createdAt: string
}

export type EventRepeat = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly'

export interface OrganizerEvent {
  id: string
  title: string
  date: string              // YYYY-MM-DD
  startTime: string | null  // HH:MM
  endTime: string | null    // HH:MM
  isAllDay: boolean
  location: string | null
  repeat: EventRepeat | null
  color: string | null
  notes: string | null
  personId: string | null
  createdAt: string
}

export interface OrganizerEventReminder {
  id: string
  eventId: string
  minutesBefore: number
  createdAt: string
}

export interface OrganizerNote {
  id: string
  title: string | null
  body: string
  isPinned: boolean
  isArchived: boolean
  personId: string | null
  eventId: string | null
  createdAt: string
  updatedAt: string
}

export interface OrganizerTag {
  id: string
  name: string
  color: string
  createdAt: string
}

export interface OrganizerNoteTag {
  noteId: string
  tagId: string
}
