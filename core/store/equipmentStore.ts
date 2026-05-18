import { create } from 'zustand'
import { createStorage } from '@core/utils/storage'
import type { ExerciseEquipmentV2 } from '@modules/health/shared/types'

const mmkv = createStorage('equipment-store')
const STORAGE_KEY = 'available_equipment'

export const ALL_EQUIPMENT: ExerciseEquipmentV2[] = [
  'barbell', 'dumbbell', 'machine', 'cable', 'bodyweight', 'band', 'other',
]

function loadFromStorage(): ExerciseEquipmentV2[] {
  const raw = mmkv.getString(STORAGE_KEY)
  if (!raw) return ALL_EQUIPMENT
  try {
    return JSON.parse(raw) as ExerciseEquipmentV2[]
  } catch {
    return ALL_EQUIPMENT
  }
}

interface EquipmentState {
  available: ExerciseEquipmentV2[]
  toggle: (eq: ExerciseEquipmentV2) => void
  setAll: () => void
}

export const useEquipmentStore = create<EquipmentState>((set, get) => ({
  available: loadFromStorage(),

  toggle: (eq) => {
    const current = get().available
    const next = current.includes(eq)
      ? current.filter((e) => e !== eq)
      : [...current, eq]
    mmkv.set(STORAGE_KEY, JSON.stringify(next))
    set({ available: next })
  },

  setAll: () => {
    mmkv.set(STORAGE_KEY, JSON.stringify(ALL_EQUIPMENT))
    set({ available: ALL_EQUIPMENT })
  },
}))
