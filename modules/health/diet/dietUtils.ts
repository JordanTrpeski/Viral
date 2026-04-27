import { calculateTDEE } from '@core/utils/tdee'
import type { UserProfile } from '@core/types'

export interface MacroGoals {
  calorieGoal: number
  proteinGoalG: number
  carbsGoalG: number
  fatGoalG: number
}

export function getMacroGoals(profile: UserProfile): MacroGoals {
  const calorieGoal = profile.calorieGoalKcal
    ?? (() => {
      const tdee = calculateTDEE(profile.weightKg, profile.heightCm, profile.dateOfBirth)
      const g = profile.goals[0] ?? 'maintain'
      if (g === 'lose_weight') return Math.max(1200, tdee - 300)
      if (g === 'build_muscle') return tdee + 200
      return tdee
    })()

  const proteinGoalG = Math.round(profile.weightKg * 2)
  const fatGoalG = Math.round((calorieGoal * 0.25) / 9)
  const carbsGoalG = Math.max(0, Math.round((calorieGoal - proteinGoalG * 4 - fatGoalG * 9) / 4))

  return { calorieGoal, proteinGoalG, carbsGoalG, fatGoalG }
}

export function calcEntryNutrition(
  caloriesPer100g: number,
  proteinPer100g: number,
  carbsPer100g: number,
  fatPer100g: number,
  amountGrams: number,
): { calories: number; proteinG: number; carbsG: number; fatG: number } {
  return {
    calories: Math.round(caloriesPer100g * amountGrams / 100),
    proteinG: Math.round(proteinPer100g * amountGrams / 10) / 10,
    carbsG: Math.round(carbsPer100g * amountGrams / 10) / 10,
    fatG: Math.round(fatPer100g * amountGrams / 10) / 10,
  }
}

export const MEAL_TYPE_ORDER = ['breakfast', 'lunch', 'dinner', 'snack'] as const

export const MEAL_TYPE_LABELS: Record<string, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
}

export const MEAL_TYPE_ICONS: Record<string, string> = {
  breakfast: 'sunny-outline',
  lunch: 'partly-sunny-outline',
  dinner: 'moon-outline',
  snack: 'nutrition-outline',
}
