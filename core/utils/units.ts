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

export function localDateStr(date: Date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
