import { createStorage } from '@core/utils/storage'

const storage = createStorage('currency-rates')
const API_URL = 'https://open.er-api.com/v6/latest/EUR'
const CACHE_KEY = 'latest-eur'
const ONE_HOUR_MS = 60 * 60 * 1000

export type CurrencyCode = 'EUR' | 'MKD' | 'USD' | 'GBP' | 'CHF' | 'ALL' | 'RSD'

export interface CurrencyRates {
  base: 'EUR'
  rates: Record<string, number>
  fetchedAt: number
  stale: boolean
}

export const DEFAULT_PAIRS: [CurrencyCode, CurrencyCode][] = [
  ['EUR', 'MKD'],
  ['EUR', 'USD'],
  ['USD', 'MKD'],
]

function fallbackRates(stale = true): CurrencyRates {
  return {
    base: 'EUR',
    rates: { EUR: 1, MKD: 61.5, USD: 1.08, GBP: 0.86, CHF: 0.96, ALL: 100, RSD: 117 },
    fetchedAt: 0,
    stale,
  }
}

function readCached(): CurrencyRates | null {
  const raw = storage.getString(CACHE_KEY)
  if (!raw) return null
  try {
    const cached = JSON.parse(raw) as CurrencyRates
    return { ...cached, stale: Date.now() - cached.fetchedAt > ONE_HOUR_MS }
  } catch {
    return null
  }
}

export async function getCurrencyRates(forceRefresh = false): Promise<CurrencyRates> {
  const cached = readCached()
  if (cached && !forceRefresh && Date.now() - cached.fetchedAt < ONE_HOUR_MS) return cached

  try {
    const response = await fetch(API_URL)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const data = await response.json() as { rates?: Record<string, number> }
    const rates = data.rates ?? {}
    const next: CurrencyRates = { base: 'EUR', rates: { ...rates, EUR: 1 }, fetchedAt: Date.now(), stale: false }
    storage.set(CACHE_KEY, JSON.stringify(next))
    return next
  } catch {
    return cached ? { ...cached, stale: true } : fallbackRates(true)
  }
}

export function convertCurrency(amount: number, from: string, to: string, rates: Record<string, number>): number {
  const fromRate = rates[from] ?? 1
  const toRate = rates[to] ?? 1
  return fromRate > 0 ? (amount / fromRate) * toRate : 0
}

export function getFavoritePairs(): [CurrencyCode, CurrencyCode][] {
  const raw = storage.getString('favorite-pairs')
  if (!raw) return DEFAULT_PAIRS
  try {
    const parsed = JSON.parse(raw) as [CurrencyCode, CurrencyCode][]
    return parsed.length > 0 ? parsed : DEFAULT_PAIRS
  } catch {
    return DEFAULT_PAIRS
  }
}

export function saveFavoritePairs(pairs: [CurrencyCode, CurrencyCode][]): void {
  storage.set('favorite-pairs', JSON.stringify(pairs))
}
