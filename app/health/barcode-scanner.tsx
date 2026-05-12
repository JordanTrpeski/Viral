/**
 * Barcode Scanner Screen
 *
 * Scans barcodes and looks up nutrition data via the Open Food Facts API.
 *
 * Current implementation: manual barcode entry (no native camera required).
 * Camera integration: install `expo-camera` + rebuild, then uncomment the
 * CameraView section below and remove the manual-entry fallback.
 */

import { useState } from 'react'
import {
  View, Text, TextInput, Pressable,
  ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import * as Crypto from 'expo-crypto'
import { colors, fontSize, spacing, radius } from '@core/theme'
import { useDietStore } from '@modules/health/diet/dietStore'
import type { Food } from '@modules/health/shared/types'

// ─── Open Food Facts ──────────────────────────────────────────────────────────

interface OFFProduct {
  product_name?: string
  brands?: string
  nutriments?: {
    'energy-kcal_100g'?: number
    proteins_100g?: number
    carbohydrates_100g?: number
    fat_100g?: number
    fiber_100g?: number
  }
}

async function fetchBarcode(barcode: string): Promise<Food | null> {
  try {
    const url = `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`
    const res = await fetch(url, { headers: { 'User-Agent': 'ViralMyOS/1.0' } })
    if (!res.ok) return null
    const json = await res.json() as { status: number; product?: OFFProduct }
    if (json.status !== 1 || !json.product) return null

    const p = json.product
    const n = p.nutriments ?? {}

    const name = p.product_name?.trim()
    if (!name) return null

    return {
      id: Crypto.randomUUID(),
      name,
      brand: p.brands?.trim() || undefined,
      caloriesPer100g: Math.round(n['energy-kcal_100g'] ?? 0),
      proteinPer100g:  Math.round((n.proteins_100g ?? 0) * 10) / 10,
      carbsPer100g:    Math.round((n.carbohydrates_100g ?? 0) * 10) / 10,
      fatPer100g:      Math.round((n.fat_100g ?? 0) * 10) / 10,
      fiberPer100g:    n.fiber_100g != null ? Math.round(n.fiber_100g * 10) / 10 : undefined,
      isCustom: false,
      createdAt: new Date().toISOString(),
    }
  } catch {
    return null
  }
}

// ─── Macro pill ───────────────────────────────────────────────────────────────

function MacroPill({ label, value, unit = 'g', color }: {
  label: string; value: number; unit?: string; color: string
}) {
  return (
    <View style={{
      flex: 1, alignItems: 'center',
      backgroundColor: `${color}18`,
      borderRadius: radius.md, padding: spacing.sm,
    }}>
      <Text style={{ color, fontSize: fontSize.cardTitle, fontWeight: '700' }}>
        {value}{unit}
      </Text>
      <Text style={{ color: colors.textMuted, fontSize: fontSize.micro }}>{label}</Text>
    </View>
  )
}

// ─── Amount selector ──────────────────────────────────────────────────────────

function AmountSelector({
  food, mealId, onDone,
}: { food: Food; mealId: string; onDone: () => void }) {
  const [grams, setGrams] = useState('100')
  const { addEntry, createCustomFood } = useDietStore()

  const g = parseFloat(grams) || 0
  const factor = g / 100
  const kcal = Math.round(food.caloriesPer100g * factor)

  function handleAdd() {
    if (g <= 0) return
    // Save to DB as a custom food so it appears in search later
    const savedFood = createCustomFood({
      name: food.name,
      brand: food.brand,
      caloriesPer100g: food.caloriesPer100g,
      proteinPer100g: food.proteinPer100g,
      carbsPer100g: food.carbsPer100g,
      fatPer100g: food.fatPer100g,
      fiberPer100g: food.fiberPer100g,
    })
    addEntry(mealId, savedFood, g)
    onDone()
  }

  return (
    <View style={{
      marginTop: spacing.lg,
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1, borderColor: colors.border,
      padding: spacing.md, gap: spacing.md,
    }}>
      <Text style={{ color: colors.textMuted, fontSize: fontSize.label, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8 }}>
        How much?
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <TextInput
          value={grams}
          onChangeText={setGrams}
          keyboardType="decimal-pad"
          style={{
            flex: 1, backgroundColor: colors.surface2,
            borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
            color: colors.text, fontSize: 28, fontWeight: '700', textAlign: 'center',
            paddingVertical: spacing.sm,
          }}
          selectionColor={colors.primary}
          selectTextOnFocus
        />
        <Text style={{ color: colors.textMuted, fontSize: fontSize.sectionHeader, fontWeight: '500' }}>g</Text>
      </View>
      <Text style={{ color: colors.textMuted, fontSize: fontSize.label, textAlign: 'center' }}>
        = <Text style={{ color: colors.text, fontWeight: '700' }}>{kcal} kcal</Text>
      </Text>
      <Pressable
        onPress={handleAdd}
        style={({ pressed }) => ({
          backgroundColor: colors.diet,
          borderRadius: radius.md, padding: spacing.md,
          alignItems: 'center', opacity: pressed ? 0.85 : 1,
        })}
      >
        <Text style={{ color: '#fff', fontWeight: '700', fontSize: fontSize.body }}>
          Add to Meal
        </Text>
      </Pressable>
    </View>
  )
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function BarcodeScannerScreen() {
  const router = useRouter()
  const { mealId } = useLocalSearchParams<{ mealId: string }>()

  const [barcode, setBarcode] = useState('')
  const [loading, setLoading] = useState(false)
  const [food, setFood] = useState<Food | null>(null)
  const [notFound, setNotFound] = useState(false)

  async function handleSearch() {
    const code = barcode.trim()
    if (!code) return
    setLoading(true)
    setFood(null)
    setNotFound(false)
    const result = await fetchBarcode(code)
    setLoading(false)
    if (result) {
      setFood(result)
    } else {
      setNotFound(true)
    }
  }

  function handleDone() {
    router.back()
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={{
          flexDirection: 'row', alignItems: 'center',
          paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
          borderBottomWidth: 1, borderBottomColor: colors.border,
        }}>
          <Pressable onPress={() => router.back()} style={{ padding: spacing.sm }}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </Pressable>
          <Text style={{
            flex: 1, color: colors.text,
            fontSize: fontSize.sectionHeader, fontWeight: '600', marginLeft: spacing.xs,
          }}>
            Barcode Lookup
          </Text>
        </View>

        <ScrollView
          contentContainerStyle={{ padding: spacing.md, paddingBottom: 80 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Camera placeholder — enable after installing expo-camera */}
          <View style={{
            height: 180, borderRadius: radius.lg,
            backgroundColor: colors.surface,
            borderWidth: 1, borderColor: colors.border,
            alignItems: 'center', justifyContent: 'center',
            marginBottom: spacing.md, gap: spacing.sm,
          }}>
            <View style={{
              width: 120, height: 80,
              borderWidth: 2, borderColor: colors.diet,
              borderRadius: radius.sm,
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Ionicons name="barcode-outline" size={40} color={colors.diet} />
            </View>
            <Text style={{ color: colors.textMuted, fontSize: fontSize.label, textAlign: 'center' }}>
              Camera scanning coming soon
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: fontSize.micro, textAlign: 'center', paddingHorizontal: spacing.md }}>
              Enter barcode manually below
            </Text>
          </View>

          {/* Manual barcode input */}
          <Text style={{
            color: colors.textMuted, fontSize: fontSize.label, fontWeight: '600',
            textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: spacing.xs,
          }}>
            Barcode Number
          </Text>
          <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md }}>
            <TextInput
              value={barcode}
              onChangeText={(v) => {
                setBarcode(v)
                setFood(null)
                setNotFound(false)
              }}
              placeholder="e.g. 5449000000996"
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
              returnKeyType="search"
              onSubmitEditing={handleSearch}
              style={{
                flex: 1, backgroundColor: colors.surface2,
                borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
                color: colors.text, fontSize: fontSize.body,
                paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
              }}
              selectionColor={colors.primary}
            />
            <Pressable
              onPress={handleSearch}
              disabled={loading || !barcode.trim()}
              style={({ pressed }) => ({
                backgroundColor: colors.diet,
                borderRadius: radius.md,
                paddingHorizontal: spacing.lg,
                alignItems: 'center', justifyContent: 'center',
                opacity: pressed || !barcode.trim() ? 0.6 : 1,
              })}
            >
              {loading
                ? <ActivityIndicator size="small" color="#fff" />
                : <Ionicons name="search" size={20} color="#fff" />
              }
            </Pressable>
          </View>

          {/* Not found */}
          {notFound && (
            <View style={{
              backgroundColor: colors.surface,
              borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border,
              padding: spacing.md, alignItems: 'center', gap: spacing.sm,
            }}>
              <Ionicons name="alert-circle-outline" size={32} color={colors.textMuted} />
              <Text style={{ color: colors.text, fontSize: fontSize.body, fontWeight: '600' }}>
                Product not found
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: fontSize.label, textAlign: 'center' }}>
                This barcode isn't in the Open Food Facts database.{'\n'}
                Try searching by name instead.
              </Text>
              <Pressable
                onPress={() => router.back()}
                style={({ pressed }) => ({
                  marginTop: spacing.xs,
                  backgroundColor: colors.surface2,
                  borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
                  paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Text style={{ color: colors.text, fontSize: fontSize.label, fontWeight: '600' }}>
                  Search by name
                </Text>
              </Pressable>
            </View>
          )}

          {/* Product card */}
          {food && (
            <View>
              <View style={{
                backgroundColor: colors.surface,
                borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border,
                overflow: 'hidden',
              }}>
                {/* Product header */}
                <View style={{
                  padding: spacing.md,
                  borderBottomWidth: 1, borderBottomColor: colors.border,
                }}>
                  <Text style={{ color: colors.text, fontSize: fontSize.sectionHeader, fontWeight: '700' }} numberOfLines={2}>
                    {food.name}
                  </Text>
                  {food.brand && (
                    <Text style={{ color: colors.textMuted, fontSize: fontSize.label, marginTop: 2 }}>
                      {food.brand}
                    </Text>
                  )}
                </View>

                {/* Calorie highlight */}
                <View style={{ padding: spacing.md, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.border }}>
                  <Text style={{ color: colors.diet, fontSize: 40, fontWeight: '700', letterSpacing: -1 }}>
                    {food.caloriesPer100g}
                  </Text>
                  <Text style={{ color: colors.textMuted, fontSize: fontSize.label }}>kcal per 100g</Text>
                </View>

                {/* Macros */}
                <View style={{ flexDirection: 'row', gap: spacing.xs, padding: spacing.md }}>
                  <MacroPill label="Protein" value={food.proteinPer100g} color="#64D2FF" />
                  <MacroPill label="Carbs"   value={food.carbsPer100g}   color="#FFD60A" />
                  <MacroPill label="Fat"      value={food.fatPer100g}     color="#FF6B9D" />
                  {food.fiberPer100g != null && (
                    <MacroPill label="Fiber" value={food.fiberPer100g} color={colors.textMuted} />
                  )}
                </View>
              </View>

              {/* Amount selector */}
              {mealId && (
                <AmountSelector food={food} mealId={mealId} onDone={handleDone} />
              )}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
