import { db } from './database'
import type { UserProfile } from '@core/types'

interface RawProfileRow {
  id: string
  name: string
  date_of_birth: string
  weight_kg: number
  height_cm: number
  goals: string
  calorie_goal_kcal: number | null
  created_at: string
  updated_at: string
}

function rowToProfile(row: RawProfileRow): UserProfile {
  return {
    id: row.id,
    name: row.name,
    dateOfBirth: row.date_of_birth,
    weightKg: row.weight_kg,
    heightCm: row.height_cm,
    goals: JSON.parse(row.goals) as string[],
    calorieGoalKcal: row.calorie_goal_kcal ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function dbGetUserProfile(): UserProfile | null {
  const row = db.getFirstSync<RawProfileRow>('SELECT * FROM user_profile LIMIT 1')
  return row ? rowToProfile(row) : null
}

export function dbInsertUserProfile(profile: UserProfile): void {
  db.runSync(
    `INSERT INTO user_profile
       (id, name, date_of_birth, weight_kg, height_cm, goals, calorie_goal_kcal, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      profile.id,
      profile.name,
      profile.dateOfBirth,
      profile.weightKg,
      profile.heightCm,
      JSON.stringify(profile.goals),
      profile.calorieGoalKcal ?? null,
      profile.createdAt,
      profile.updatedAt,
    ],
  )
}

export function dbUpdateUserProfile(profile: UserProfile): void {
  db.runSync(
    `UPDATE user_profile
     SET name=?, date_of_birth=?, weight_kg=?, height_cm=?, goals=?, calorie_goal_kcal=?, updated_at=?
     WHERE id=?`,
    [
      profile.name,
      profile.dateOfBirth,
      profile.weightKg,
      profile.heightCm,
      JSON.stringify(profile.goals),
      profile.calorieGoalKcal ?? null,
      profile.updatedAt,
      profile.id,
    ],
  )
}
