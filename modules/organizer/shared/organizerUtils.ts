import type { OrganizerPerson } from '@core/types'

export function daysUntilBirthday(day: number, month: number, from = new Date()): number {
  const thisYear = from.getFullYear()
  const bday = new Date(thisYear, month - 1, day)
  // Normalise to midnight
  bday.setHours(0, 0, 0, 0)
  const fromDay = new Date(from)
  fromDay.setHours(0, 0, 0, 0)
  if (bday < fromDay) bday.setFullYear(thisYear + 1)
  return Math.round((bday.getTime() - fromDay.getTime()) / 86400000)
}

export function nextBirthdayDate(day: number, month: number, from = new Date()): string {
  const thisYear = from.getFullYear()
  const bday = new Date(thisYear, month - 1, day)
  bday.setHours(0, 0, 0, 0)
  const fromDay = new Date(from)
  fromDay.setHours(0, 0, 0, 0)
  if (bday < fromDay) bday.setFullYear(thisYear + 1)
  return bday.toISOString().slice(0, 10)
}

export function ageTheyAreTurning(birthdayYear: number, day: number, month: number, from = new Date()): number {
  const nextYear = new Date(from)
  nextYear.setHours(0, 0, 0, 0)
  const bday = new Date(from.getFullYear(), month - 1, day)
  bday.setHours(0, 0, 0, 0)
  if (bday < nextYear) bday.setFullYear(from.getFullYear() + 1)
  return bday.getFullYear() - birthdayYear
}

export function currentAge(birthdayYear: number, birthdayMonth: number, birthdayDay: number, from = new Date()): number {
  let age = from.getFullYear() - birthdayYear
  const hasTurned =
    from.getMonth() + 1 > birthdayMonth ||
    (from.getMonth() + 1 === birthdayMonth && from.getDate() >= birthdayDay)
  if (!hasTurned) age -= 1
  return age
}

export function getPersonDaysUntilBirthday(person: OrganizerPerson): number | null {
  if (person.birthdayDay === null || person.birthdayMonth === null) return null
  return daysUntilBirthday(person.birthdayDay, person.birthdayMonth)
}

export function birthdayPassedWithinDays(day: number, month: number, withinDays: number, from = new Date()): boolean {
  const thisYear = from.getFullYear()
  const bday = new Date(thisYear, month - 1, day)
  bday.setHours(0, 0, 0, 0)
  const fromDay = new Date(from)
  fromDay.setHours(0, 0, 0, 0)
  if (bday > fromDay) bday.setFullYear(thisYear - 1)
  const diff = Math.round((fromDay.getTime() - bday.getTime()) / 86400000)
  return diff >= 0 && diff <= withinDays
}

export function resolveTemplate(
  template: string,
  name: string,
  days: number,
  age: number | null,
  relationship: string | null,
): string {
  return template
    .replace(/\[Name\]/g, name)
    .replace(/\[Days\]/g, String(days))
    .replace(/\[Age\]/g, age !== null ? String(age) : '')
    .replace(/\[Relationship\]/g, relationship ?? '')
}

// ── Shared rule draft type (used in tier-edit + person-add) ───────────────────

export interface DraftRule {
  id: string
  daysBefore: string
  notificationTime: string
  messageTemplate: string
  isEnabled: boolean
  isNew: boolean
}

export const TEMPLATE_VARS = ['[Name]', '[Days]', '[Age]', '[Relationship]']

export const PREVIEW_VALUES: Record<string, string> = {
  '[Name]': 'Ana', '[Days]': '7', '[Age]': '30', '[Relationship]': 'Best Friend',
}

export function resolvePreview(template: string): string {
  return Object.entries(PREVIEW_VALUES).reduce((t, [k, v]) => t.replaceAll(k, v), template)
}

export function birthdayColorForDays(days: number): string {
  if (days === 0) return '#FF453A'
  if (days <= 3) return '#FF453A'
  if (days <= 7) return '#FFD60A'
  return '#636366'
}
