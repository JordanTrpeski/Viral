import { create } from 'zustand'
import type { Sex, ActivityLevel } from '@core/types'

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

  setName: (name: string) => void
  setWeight: (kg: number) => void
  setHeight: (cm: number) => void
  setDateOfBirth: (dob: string) => void
  setSex: (sex: Sex) => void
  setActivityLevel: (level: ActivityLevel) => void
  setGoal: (goal: OnboardingGoal) => void
  setUnits: (units: Units) => void
  setCalorieGoal: (kcal: number) => void
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
}

export const useOnboardingStore = create<OnboardingState>((set) => ({
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
  reset: () => set(defaults),
}))
