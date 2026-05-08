import type { OnboardingGoal } from '@core/store/onboardingStore'
import type { Sex, ActivityLevel } from '@core/types'

// Physical Activity Level multipliers (FAO/WHO standard + Mifflin-St Jeor meta-analysis values)
export const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary:   1.2,    // desk job, office, mostly sitting
  light:       1.375,  // driver, teacher, 1-3 light walks/day
  moderate:    1.55,   // retail, trades, nurse — on feet most of day
  active:      1.725,  // construction, soldier on duty, farmer
  very_active: 1.9,    // athlete in training, military combat training
}

export const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary:   'Desk job / Office',
  light:       'Driver / Teacher',
  moderate:    'Retail / Trades / Nurse',
  active:      'Construction / Soldier',
  very_active: 'Athlete / Intense training',
}

export const ACTIVITY_DESCRIPTIONS: Record<ActivityLevel, string> = {
  sedentary:   'Mostly sitting, little daily movement',
  light:       'Light walking, standing occasionally',
  moderate:    'On feet most of the day',
  active:      'Hard physical work most of the day',
  very_active: 'Intense physical activity daily',
}

function ageFromDOB(dob: string): number {
  const birth = new Date(dob)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return Math.max(age, 1)
}

// Mifflin-St Jeor BMR — most accurate formula per 2024 comparative analysis
// Male:   BMR = 10×weight + 6.25×height − 5×age + 5
// Female: BMR = 10×weight + 6.25×height − 5×age − 161
// Unknown: gender-neutral average offset (−78)
export function calculateBMR(
  weightKg: number,
  heightCm: number,
  dob: string,
  sex?: Sex,
): number {
  const age = ageFromDOB(dob)
  const sexOffset = sex === 'male' ? 5 : sex === 'female' ? -161 : -78
  return Math.round(10 * weightKg + 6.25 * heightCm - 5 * age + sexOffset)
}

export function calculateTDEE(
  weightKg: number,
  heightCm: number,
  dob: string,
  sex?: Sex,
  activityLevel?: ActivityLevel,
): number {
  const bmr = calculateBMR(weightKg, heightCm, dob, sex)
  const pal = ACTIVITY_MULTIPLIERS[activityLevel ?? 'moderate']
  return Math.round(bmr * pal)
}

export function goalAdjustedCalories(tdee: number, goal: OnboardingGoal): number {
  switch (goal) {
    case 'lose_weight':   return Math.max(1200, tdee - 300)
    case 'build_muscle':  return tdee + 200
    default:              return tdee
  }
}
