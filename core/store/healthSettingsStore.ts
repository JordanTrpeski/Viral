import { create } from 'zustand'
import { createStorage } from '@core/utils/storage'

const mmkv = createStorage('health-settings')

export type TrainingExperience = 'beginner' | 'intermediate' | 'advanced'
export type TrainingGoal = 'strength' | 'hypertrophy' | 'endurance' | 'general'
export type Equipment = 'barbell' | 'dumbbell' | 'machine' | 'bodyweight' | 'cable' | 'band'

export interface HealthSettings {
  // Workout
  defaultRestTimerSeconds: number
  equipment: Equipment[]
  workoutReminder: boolean
  volumeWarnings: boolean
  trainingExperience: TrainingExperience
  trainingGoal: TrainingGoal
  daysPerWeek: number

  // Nutrition
  nutritionGoalSource: 'auto' | 'manual'

  // Steps
  stepsGoalSource: 'auto' | 'custom'
}

const EQUIPMENT_KEY = 'equipment'

function loadEquipment(): Equipment[] {
  try {
    const raw = mmkv.getString(EQUIPMENT_KEY)
    return raw ? (JSON.parse(raw) as Equipment[]) : ['barbell', 'dumbbell', 'bodyweight']
  } catch {
    return ['barbell', 'dumbbell', 'bodyweight']
  }
}

interface HealthSettingsState extends HealthSettings {
  setDefaultRestTimer: (seconds: number) => void
  setEquipment: (equipment: Equipment[]) => void
  toggleEquipment: (item: Equipment) => void
  setWorkoutReminder: (enabled: boolean) => void
  setVolumeWarnings: (enabled: boolean) => void
  setTrainingExperience: (exp: TrainingExperience) => void
  setTrainingGoal: (goal: TrainingGoal) => void
  setDaysPerWeek: (days: number) => void
  setNutritionGoalSource: (source: 'auto' | 'manual') => void
  setStepsGoalSource: (source: 'auto' | 'custom') => void
}

export const useHealthSettingsStore = create<HealthSettingsState>((set, get) => ({
  defaultRestTimerSeconds: mmkv.getNumber('rest_timer') ?? 90,
  equipment: loadEquipment(),
  workoutReminder: mmkv.getBoolean('workout_reminder') ?? false,
  volumeWarnings: mmkv.getBoolean('volume_warnings') ?? false,
  trainingExperience: (mmkv.getString('training_experience') as TrainingExperience | undefined) ?? 'beginner',
  trainingGoal: (mmkv.getString('training_goal') as TrainingGoal | undefined) ?? 'general',
  daysPerWeek: mmkv.getNumber('days_per_week') ?? 3,
  nutritionGoalSource: (mmkv.getString('nutrition_goal_source') as 'auto' | 'manual' | undefined) ?? 'auto',
  stepsGoalSource: (mmkv.getString('steps_goal_source') as 'auto' | 'custom' | undefined) ?? 'auto',

  setDefaultRestTimer: (seconds) => {
    mmkv.set('rest_timer', seconds)
    set({ defaultRestTimerSeconds: seconds })
  },
  setEquipment: (equipment) => {
    mmkv.set(EQUIPMENT_KEY, JSON.stringify(equipment))
    set({ equipment })
  },
  toggleEquipment: (item) => {
    const current = get().equipment
    const next = current.includes(item) ? current.filter((e) => e !== item) : [...current, item]
    mmkv.set(EQUIPMENT_KEY, JSON.stringify(next))
    set({ equipment: next })
  },
  setWorkoutReminder: (enabled) => {
    mmkv.set('workout_reminder', enabled)
    set({ workoutReminder: enabled })
  },
  setVolumeWarnings: (enabled) => {
    mmkv.set('volume_warnings', enabled)
    set({ volumeWarnings: enabled })
  },
  setTrainingExperience: (exp) => {
    mmkv.set('training_experience', exp)
    set({ trainingExperience: exp })
  },
  setTrainingGoal: (goal) => {
    mmkv.set('training_goal', goal)
    set({ trainingGoal: goal })
  },
  setDaysPerWeek: (days) => {
    mmkv.set('days_per_week', days)
    set({ daysPerWeek: days })
  },
  setNutritionGoalSource: (source) => {
    mmkv.set('nutrition_goal_source', source)
    set({ nutritionGoalSource: source })
  },
  setStepsGoalSource: (source) => {
    mmkv.set('steps_goal_source', source)
    set({ stepsGoalSource: source })
  },
}))
