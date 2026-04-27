import type { OnboardingGoal } from '@core/store/onboardingStore'

function ageFromDOB(dob: string): number {
  const birth = new Date(dob)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return Math.max(age, 1)
}

// Mifflin-St Jeor gender-neutral average (male +5, female −161 → avg −78), moderate activity ×1.55
export function calculateTDEE(weightKg: number, heightCm: number, dob: string): number {
  const age = ageFromDOB(dob)
  const bmr = 10 * weightKg + 6.25 * heightCm - 5 * age - 78
  return Math.round(bmr * 1.55)
}

export function goalAdjustedCalories(tdee: number, goal: OnboardingGoal): number {
  switch (goal) {
    case 'lose_weight':   return Math.max(1200, tdee - 300)
    case 'build_muscle':  return tdee + 200
    default:              return tdee
  }
}
