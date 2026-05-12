import { useCallback, useMemo, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { colors, fontSize, fonts, radius, spacing } from '@core/theme'
import { Button, Card } from '@core/components'
import {
  convertCurrency,
  getCurrencyRates,
  getFavoritePairs,
  saveFavoritePairs,
  type CurrencyCode,
  type CurrencyRates,
} from '@core/utils/currencyRates'

const CURRENCIES: CurrencyCode[] = ['EUR', 'MKD', 'USD', 'GBP', 'CHF', 'ALL', 'RSD']

export default function CurrencyScreen() {
  const router = useRouter()
  const [amount, setAmount] = useState('1')
  const [from, setFrom] = useState<CurrencyCode>('EUR')
  const [to, setTo] = useState<CurrencyCode>('MKD')
  const [rates, setRates] = useState<CurrencyRates | null>(null)
  const [favorites, setFavorites] = useState(getFavoritePairs())
  const [loading, setLoading] = useState(false)

  async function load(force = false) {
    setLoading(true)
    setRates(await getCurrencyRates(force))
    setLoading(false)
  }

  useFocusEffect(useCallback(() => { void load(false) }, []))

  const converted = useMemo(() => {
    const value = Number(amount)
    if (!Number.isFinite(value) || !rates) return 0
    return convertCurrency(value, from, to, rates.rates)
  }, [amount, from, to, rates])

  function addFavorite() {
    const pair: [CurrencyCode, CurrencyCode] = [from, to]
    const exists = favorites.some(([a, b]) => a === from && b === to)
    if (exists) return
    const next = [...favorites, pair]
    setFavorites(next)
    saveFavoritePairs(next)
  }

  function moveFavorite(index: number, direction: -1 | 1) {
    const next = [...favorites]
    const target = index + direction
    if (target < 0 || target >= next.length) return
    const item = next[index]
    if (!item) return
    next.splice(index, 1)
    next.splice(target, 0, item)
    setFavorites(next)
    saveFavoritePairs(next)
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <Pressable onPress={() => router.back()} style={{ padding: spacing.sm, marginRight: spacing.sm }}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={{ color: colors.text, fontSize: fontSize.sectionHeader, fontWeight: '600', flex: 1 }}>Currency</Text>
        {loading ? <ActivityIndicator color={colors.primary} /> : null}
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
        <Card>
          <Text style={{ color: colors.textMuted, fontSize: fontSize.label }}>Amount</Text>
          <TextInput
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            style={{ color: colors.text, fontSize: 32, fontWeight: '700', fontFamily: `${fonts.mono}_700Bold`, paddingVertical: spacing.sm }}
          />
          <CurrencyPicker selected={from} onSelect={setFrom} />
          <View style={{ height: 1, backgroundColor: colors.border, marginVertical: spacing.md }} />
          <Text style={{ color: colors.textMuted, fontSize: fontSize.label }}>Converted</Text>
          <Text style={{ color: colors.text, fontSize: 32, fontWeight: '700', fontFamily: `${fonts.mono}_700Bold`, paddingVertical: spacing.sm }}>
            {converted.toFixed(2)}
          </Text>
          <CurrencyPicker selected={to} onSelect={setTo} />
        </Card>

        {rates?.stale ? (
          <Card>
            <Text style={{ color: colors.warning, fontSize: fontSize.body }}>Rates may be outdated. Using cached offline rates.</Text>
          </Card>
        ) : null}

        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <Button label="Refresh" onPress={() => load(true)} loading={loading} style={{ flex: 1 }} />
          <Button label="Favorite" onPress={addFavorite} variant="secondary" style={{ flex: 1 }} />
        </View>

        <Text style={{ color: colors.textMuted, fontSize: fontSize.label }}>
          Last updated {rates?.fetchedAt ? new Date(rates.fetchedAt).toLocaleString() : 'using bundled fallback'}
        </Text>

        <Card>
          <Text style={{ color: colors.text, fontSize: fontSize.cardTitle, fontWeight: '600', marginBottom: spacing.sm }}>Favorite pairs</Text>
          <View style={{ gap: spacing.sm }}>
            {favorites.map(([a, b], index) => (
              <Pressable key={`${a}-${b}-${index}`} onPress={() => { setFrom(a); setTo(b) }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surface2, borderRadius: radius.md, padding: spacing.sm }}>
                  <Text style={{ color: colors.text, fontSize: fontSize.body, fontWeight: '600', flex: 1 }}>{a} → {b}</Text>
                  <Pressable onPress={() => moveFavorite(index, -1)}><Ionicons name="arrow-up" size={18} color={colors.textMuted} /></Pressable>
                  <Pressable onPress={() => moveFavorite(index, 1)}><Ionicons name="arrow-down" size={18} color={colors.textMuted} /></Pressable>
                </View>
              </Pressable>
            ))}
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  )
}

function CurrencyPicker({ selected, onSelect }: { selected: CurrencyCode; onSelect: (code: CurrencyCode) => void }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
      {CURRENCIES.map((code) => (
        <Pressable key={code} onPress={() => onSelect(code)}>
          <View style={{ paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.full, backgroundColor: selected === code ? colors.primary : colors.surface2, borderWidth: 1, borderColor: selected === code ? colors.primary : colors.border }}>
            <Text style={{ color: selected === code ? colors.bg : colors.textMuted, fontSize: fontSize.label, fontWeight: '700' }}>{code}</Text>
          </View>
        </Pressable>
      ))}
    </View>
  )
}
