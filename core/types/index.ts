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
