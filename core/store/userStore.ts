import { create } from 'zustand'
import { MMKV } from 'react-native-mmkv'
import { dbGetUserProfile, dbInsertUserProfile, dbUpdateUserProfile } from '@core/db/userQueries'
import type { UserProfile } from '@core/types'

export type Units = 'metric' | 'imperial'

const mmkv = new MMKV({ id: 'user-store' })

interface UserState {
  profile: UserProfile | null
  units: Units
  onboardingComplete: boolean

  loadProfile: () => void
  saveProfile: (profile: UserProfile) => void
  updateProfile: (partial: Partial<UserProfile>) => void
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

  setUnits: (units) => {
    mmkv.set('units', units)
    set({ units })
  },

  completeOnboarding: () => {
    mmkv.set('onboarding_complete', true)
    set({ onboardingComplete: true })
  },
}))
