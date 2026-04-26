// Workout
export type MuscleGroup = 'chest' | 'back' | 'legs' | 'shoulders' | 'arms' | 'core' | 'cardio'
export type Equipment = 'barbell' | 'dumbbell' | 'machine' | 'bodyweight' | 'cable' | 'other'

export interface Exercise {
  id: string
  name: string
  muscleGroup: MuscleGroup
  equipment?: Equipment
  isCustom: boolean
  createdAt: string
}

export interface WorkoutSession {
  id: string
  date: string
  name?: string
  durationMinutes?: number
  notes?: string
  startedAt: string
  endedAt?: string
  createdAt: string
}

export interface WorkoutSet {
  id: string
  sessionId: string
  exerciseId: string
  setNumber: number
  reps?: number
  weightKg?: number
  durationSeconds?: number
  notes?: string
  createdAt: string
}

// Diet
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'

export interface Food {
  id: string
  name: string
  brand?: string
  caloriesPer100g: number
  proteinPer100g: number
  carbsPer100g: number
  fatPer100g: number
  fiberPer100g?: number
  isCustom: boolean
  createdAt: string
}

export interface Meal {
  id: string
  date: string
  mealType: MealType
  name?: string
  loggedAt: string
  createdAt: string
}

export interface MealEntry {
  id: string
  mealId: string
  foodId: string
  amountGrams: number
  createdAt: string
}

// Computed / derived
export interface DailyNutritionSummary {
  date: string
  totalCalories: number
  totalProteinG: number
  totalCarbsG: number
  totalFatG: number
  calorieGoal: number
  proteinGoalG: number
}

export interface DailyWorkoutSummary {
  date: string
  sessionCount: number
  totalVolumeKg: number
  totalDurationMinutes: number
  muscleGroupsHit: MuscleGroup[]
}
