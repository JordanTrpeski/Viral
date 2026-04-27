import { create } from 'zustand'

export type OnboardingGoal = 'lose_weight' | 'maintain' | 'build_muscle' | 'general_health'
export type Units = 'metric' | 'imperial'

interface OnboardingState {
  name: string
  weightKg: number
  heightCm: number
  dateOfBirth: string
  goal: OnboardingGoal
  units: Units
  calorieGoal: number

  setName: (name: string) => void
  setWeight: (kg: number) => void
  setHeight: (cm: number) => void
  setDateOfBirth: (dob: string) => void
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
  setGoal: (goal) => set({ goal }),
  setUnits: (units) => set({ units }),
  setCalorieGoal: (calorieGoal) => set({ calorieGoal }),
  reset: () => set(defaults),
}))
