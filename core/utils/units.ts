export function kgToLbs(kg: number): number {
  return Math.round(kg * 2.20462 * 10) / 10
}

export function lbsToKg(lbs: number): number {
  return Math.round((lbs / 2.20462) * 10) / 10
}

export function cmToFtIn(cm: number): { ft: number; inches: number } {
  const totalInches = cm / 2.54
  const ft = Math.floor(totalInches / 12)
  const inches = Math.round(totalInches % 12)
  return { ft, inches }
}

export function ftInToCm(ft: number, inches: number): number {
  return Math.round((ft * 12 + inches) * 2.54)
}

export function formatHeight(heightCm: number, units: 'metric' | 'imperial'): string {
  if (units === 'metric') return `${heightCm} cm`
  const { ft, inches } = cmToFtIn(heightCm)
  return `${ft}'${inches}"`
}

export function formatWeight(weightKg: number, units: 'metric' | 'imperial'): string {
  if (units === 'metric') return `${weightKg} kg`
  return `${kgToLbs(weightKg)} lbs`
}
