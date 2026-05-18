import { create } from 'zustand'
import type { Sex, ActivityLevel } from '@core/types'
import type { TrainingExperience, TrainingGoal, Equipment } from '@core/store/healthSettingsStore'

export type OnboardingGoal = 'lose_weight' | 'maintain' | 'build_muscle' | 'general_health'
export type Units = 'metric' | 'imperial'

interface OnboardingState {
  name: string
  weightKg: number
  heightCm: number
  dateOfBirth: string
  sex: Sex | undefined
  activityLevel: ActivityLevel | undefined
  goal: OnboardingGoal
  units: Units
  calorieGoal: number

  // Health-specific
  trainingExperience: TrainingExperience
  trainingGoal: TrainingGoal
  equipment: Equipment[]
  daysPerWeek: number

  setName: (name: string) => void
  setWeight: (kg: number) => void
  setHeight: (cm: number) => void
  setDateOfBirth: (dob: string) => void
  setSex: (sex: Sex) => void
  setActivityLevel: (level: ActivityLevel) => void
  setGoal: (goal: OnboardingGoal) => void
  setUnits: (units: Units) => void
  setCalorieGoal: (kcal: number) => void
  setTrainingExperience: (exp: TrainingExperience) => void
  setTrainingGoal: (goal: TrainingGoal) => void
  toggleEquipment: (item: Equipment) => void
  setDaysPerWeek: (days: number) => void
  reset: () => void
}

const defaults = {
  name: '',
  weightKg: 0,
  heightCm: 0,
  dateOfBirth: '',
  sex: undefined as Sex | undefined,
  activityLevel: undefined as ActivityLevel | undefined,
  goal: 'general_health' as OnboardingGoal,
  units: 'metric' as Units,
  calorieGoal: 0,
  trainingExperience: 'beginner' as TrainingExperience,
  trainingGoal: 'general' as TrainingGoal,
  equipment: ['barbell', 'dumbbell', 'bodyweight'] as Equipment[],
  daysPerWeek: 3,
}

export const useOnboardingStore = create<OnboardingState>((set, get) => ({
  ...defaults,
  setName: (name) => set({ name }),
  setWeight: (weightKg) => set({ weightKg }),
  setHeight: (heightCm) => set({ heightCm }),
  setDateOfBirth: (dateOfBirth) => set({ dateOfBirth }),
  setSex: (sex) => set({ sex }),
  setActivityLevel: (activityLevel) => set({ activityLevel }),
  setGoal: (goal) => set({ goal }),
  setUnits: (units) => set({ units }),
  setCalorieGoal: (calorieGoal) => set({ calorieGoal }),
  setTrainingExperience: (trainingExperience) => set({ trainingExperience }),
  setTrainingGoal: (trainingGoal) => set({ trainingGoal }),
  toggleEquipment: (item) => {
    const current = get().equipment
    set({ equipment: current.includes(item) ? current.filter((e) => e !== item) : [...current, item] })
  },
  setDaysPerWeek: (daysPerWeek) => set({ daysPerWeek }),
  reset: () => set(defaults),
}))
