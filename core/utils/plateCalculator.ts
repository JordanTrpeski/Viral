// Standard plate sets in kg and lb
const PLATES_KG = [25, 20, 15, 10, 5, 2.5, 1.25]
const PLATES_LB = [45, 35, 25, 10, 5, 2.5]

const BAR_WEIGHTS_KG: Record<string, number> = {
  olympic: 20,
  ez: 10,
  trap: 30,
  dumbbell: 0,
}

export interface PlateResult {
  barWeightKg: number
  platesPerSide: { weightKg: number; count: number }[]
  totalKg: number
  achievable: boolean
}

export function calculatePlates(
  targetKg: number,
  barType: keyof typeof BAR_WEIGHTS_KG = 'olympic',
): PlateResult {
  const barWeightKg = BAR_WEIGHTS_KG[barType] ?? 20
  const loadPerSide = (targetKg - barWeightKg) / 2

  if (loadPerSide < 0) {
    return { barWeightKg, platesPerSide: [], totalKg: barWeightKg, achievable: false }
  }

  let remaining = loadPerSide
  const platesPerSide: { weightKg: number; count: number }[] = []

  for (const plate of PLATES_KG) {
    if (remaining <= 0) break
    const count = Math.floor(remaining / plate)
    if (count > 0) {
      platesPerSide.push({ weightKg: plate, count })
      remaining -= plate * count
      remaining = Math.round(remaining * 1000) / 1000  // float safety
    }
  }

  const totalKg = barWeightKg + platesPerSide.reduce((s, p) => s + p.weightKg * p.count * 2, 0)
  const achievable = Math.abs(remaining) < 0.01

  return { barWeightKg, platesPerSide, totalKg, achievable }
}

export function nearestLoadable(targetKg: number, barType: keyof typeof BAR_WEIGHTS_KG = 'olympic'): number {
  const barWeightKg = BAR_WEIGHTS_KG[barType] ?? 20
  const loadPerSide = Math.max(0, (targetKg - barWeightKg) / 2)
  let remaining = loadPerSide
  let loaded = 0

  for (const plate of PLATES_KG) {
    const count = Math.floor(remaining / plate)
    loaded += plate * count
    remaining -= plate * count
    remaining = Math.round(remaining * 1000) / 1000
  }

  return barWeightKg + loaded * 2
}
