// ─── Exercise Library V2 ─────────────────────────────────────────────────────

export type ExerciseCategory = 'strength' | 'cardio' | 'mobility'
export type ExerciseEquipmentV2 = 'barbell' | 'dumbbell' | 'machine' | 'bodyweight' | 'cable' | 'band' | 'other'
export type MovementPattern = 'push' | 'pull' | 'squat' | 'hinge' | 'carry' | 'core'
export type Difficulty = 'beginner' | 'intermediate' | 'advanced'

export interface ExerciseV2 {
  id: string
  name: string
  slug: string
  category: ExerciseCategory
  primaryMuscles: string[]
  secondaryMuscles: string[]
  equipment: ExerciseEquipmentV2
  movementPattern?: MovementPattern
  description?: string
  formCues: string[]
  commonMistakes: string[]
  difficulty: Difficulty
  substituteIds: string[]
  isUnilateral: boolean
  startImage?: string   // lookup key into EXERCISE_IMAGES map in the detail screen
  endImage?: string     // same — null until actual image files are generated
  createdAt: string
}

export interface ExercisePR {
  id: string
  exerciseId: string
  date: string          // YYYY-MM-DD
  weightKg: number
  reps: number
  estimatedOneRepMax: number
  sessionId?: string
  createdAt: string
}

// ─── Workout Session V2 ───────────────────────────────────────────────────────

export interface WorkoutSessionV2 {
  id: string
  date: string          // YYYY-MM-DD
  templateId?: string
  durationSeconds?: number
  perceivedDifficulty?: number  // 1-10
  notes?: string
  startedAt: string
  endedAt?: string
  createdAt: string
}

export interface WorkoutSetV2 {
  id: string
  sessionId: string
  exerciseId: string
  setNumber: number
  targetReps?: number
  performedReps?: number
  targetWeight?: number
  performedWeight?: number
  rpe?: number          // Rate of Perceived Exertion 1-10
  durationSeconds?: number
  isWarmup: boolean
  isFailed: boolean
  tempo?: string        // e.g. "3-1-2-0"
  notes?: string
  completedAt?: string
  createdAt: string
}

// ─── Workout Templates V2 ────────────────────────────────────────────────────

export type GoalType = 'strength' | 'hypertrophy' | 'endurance' | 'general'

export interface WorkoutTemplateV2 {
  id: string
  name: string
  description?: string
  goalType?: GoalType
  durationWeeks?: number
  daysPerWeek?: number
  createdAt: string
}

export interface TemplateExerciseV2 {
  id: string
  templateId: string
  exerciseId: string
  dayNumber: number
  orderIndex: number
  sets: number
  repMin?: number
  repMax?: number
  restSeconds?: number
  isOptional: boolean
  createdAt: string
}

// ─── Body Weight ─────────────────────────────────────────────────────────────

// Body Weight
export interface WeightEntry {
  id: string
  date: string        // YYYY-MM-DD
  weightKg: number
  createdAt: string
}

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

// Templates
export interface WorkoutTemplate {
  id: string
  name: string
  createdAt: string
}

export interface TemplateExercise {
  id: string
  templateId: string
  exerciseId: string
  orderIndex: number
  createdAt: string
}

// Steps
export interface StepEntry {
  id: string
  date: string       // YYYY-MM-DD
  stepCount: number
  goal: number
  createdAt: string
}

export type ActivityType = 'walk' | 'jog' | 'run' | 'hike'
export type InclineLevel = 0 | 1 | 2 | 3

export interface StepSession {
  id: string
  date: string
  activityType: ActivityType
  stepCount: number
  durationMinutes: number | null
  incline: InclineLevel
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

// Body Measurements
export type MeasurementField =
  | 'chest_cm' | 'waist_cm' | 'hips_cm'
  | 'left_arm_cm' | 'right_arm_cm'
  | 'left_thigh_cm' | 'right_thigh_cm'

export interface BodyMeasurement {
  id: string
  date: string          // YYYY-MM-DD
  chestCm?: number
  waistCm?: number
  hipsCm?: number
  leftArmCm?: number
  rightArmCm?: number
  leftThighCm?: number
  rightThighCm?: number
  notes?: string
  createdAt: string
}
