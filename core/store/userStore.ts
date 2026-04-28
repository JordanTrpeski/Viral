import { create } from 'zustand'
import { createStorage } from '@core/utils/storage'
import { dbGetUserProfile, dbInsertUserProfile, dbUpdateUserProfile } from '@core/db/userQueries'
import { calculateTDEE, goalAdjustedCalories } from '@core/utils/tdee'
import type { UserProfile } from '@core/types'

export type Units = 'metric' | 'imperial'

const mmkv = createStorage('user-store')

interface UserState {
  profile: UserProfile | null
  units: Units
  onboardingComplete: boolean

  loadProfile: () => void
  saveProfile: (profile: UserProfile) => void
  updateProfile: (partial: Partial<UserProfile>) => void
  recalcCaloriesFromWeight: (newWeightKg: number) => void
  setUnits: (units: Units) => void
  completeOnboarding: () => void
}

export const useUserStore = create<UserState>((set, get) => ({
  profile: null,
  units: (mmkv.getString('units') as Units | undefined) ?? 'metric',
  onboardingComplete: mmkv.getBoolean('onboarding_complete') ?? false,

  loadProfile: () => {
    const profile = dbGetUserProfile()
    set({ profile })
  },

  saveProfile: (profile) => {
    const existing = dbGetUserProfile()
    if (existing) {
      dbUpdateUserProfile(profile)
    } else {
      dbInsertUserProfile(profile)
    }
    set({ profile })
  },

  updateProfile: (partial) => {
    const current = get().profile
    if (!current) return
    const updated: UserProfile = { ...current, ...partial, updatedAt: new Date().toISOString() }
    dbUpdateUserProfile(updated)
    set({ profile: updated })
  },

  recalcCaloriesFromWeight: (newWeightKg) => {
    const profile = get().profile
    if (!profile?.heightCm || !profile?.dateOfBirth) return
    const goal = (profile.goals?.[0] ?? 'general_health') as Parameters<typeof goalAdjustedCalories>[1]
    const tdee = calculateTDEE(newWeightKg, profile.heightCm, profile.dateOfBirth)
    const newGoal = goalAdjustedCalories(tdee, goal)
    get().updateProfile({ calorieGoalKcal: newGoal })
  },

  setUnits: (units) => {
    mmkv.set('units', units)
    set({ units })
  },

  completeOnboarding: () => {
    mmkv.set('onboarding_complete', true)
    set({ onboardingComplete: true })
  },
}))
