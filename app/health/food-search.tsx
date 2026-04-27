import { useEffect, useState } from 'react'
import { View, Text, TextInput, FlatList, Pressable, KeyboardAvoidingView, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { colors, fontSize, spacing, radius } from '@core/theme'
import { useDietStore } from '@modules/health/diet/dietStore'
import { calcEntryNutrition } from '@modules/health/diet/dietUtils'
import type { Food } from '@modules/health/shared/types'

// ─── Food result row ──────────────────────────────────────────────────────────

function FoodRow({ food, onSelect }: { food: Food; onSelect: () => void }) {
  return (
    <Pressable
      onPress={onSelect}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        padding: spacing.md,
        marginBottom: spacing.sm,
        gap: spacing.md,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.text, fontSize: fontSize.body, fontWeight: '600' }} numberOfLines={1}>
          {food.name}
        </Text>
        {food.brand && (
          <Text style={{ color: colors.textMuted, fontSize: fontSize.micro }}>{food.brand}</Text>
        )}
        <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: 3 }}>
          <Text style={{ color: colors.textMuted, fontSize: fontSize.label }}>
            <Text style={{ color: colors.text, fontWeight: '600' }}>{food.caloriesPer100g}</Text> kcal
          </Text>
          <Text style={{ color: '#64D2FF', fontSize: fontSize.label }}>P {food.proteinPer100g}g</Text>
          <Text style={{ color: '#FFD60A', fontSize: fontSize.label }}>C {food.carbsPer100g}g</Text>
          <Text style={{ color: '#FF6B9D', fontSize: fontSize.label }}>F {food.fatPer100g}g</Text>
          <Text style={{ color: colors.textMuted, fontSize: fontSize.micro }}>per 100g</Text>
        </View>
      </View>
      <Ionicons name="add-circle-outline" size={22} color={colors.primary} />
    </Pressable>
  )
}

// ─── Amount entry panel ───────────────────────────────────────────────────────

function AmountPanel({ food, onAdd, onCancel }: {
  food: Food
  onAdd: (grams: number) => void
  onCancel: () => void
}) {
  const [gramsText, setGramsText] = useState('100')
  const grams = parseFloat(gramsText) || 0
  const { calories, proteinG, carbsG, fatG } = calcEntryNutrition(
    food.caloriesPer100g, food.proteinPer100g, food.carbsPer100g, food.fatPer100g, grams,
  )

  return (
    <View style={{
      backgroundColor: colors.surface,
      borderTopWidth: 1, borderTopColor: colors.border,
      padding: spacing.md, gap: spacing.md,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Text style={{ flex: 1, color: colors.text, fontSize: fontSize.cardTitle, fontWeight: '600' }} numberOfLines={1}>
          {food.name}
        </Text>
        <Pressable onPress={onCancel}>
          <Ionicons name="close" size={20} color={colors.textMuted} />
        </Pressable>
      </View>

      {/* Grams input */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <TextInput
          value={gramsText}
          onChangeText={setGramsText}
          keyboardType="decimal-pad"
          selectTextOnFocus
          style={{
            flex: 1, backgroundColor: colors.surface2,
            borderRadius: radius.sm, borderWidth: 1, borderColor: colors.primary,
            color: colors.text, fontSize: 20, fontWeight: '700',
            paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
            textAlign: 'center',
          }}
          selectionColor={colors.primary}
        />
        <Text style={{ color: colors.textMuted, fontSize: fontSize.body }}>grams</Text>
      </View>

      {/* Live nutrition */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <NutrientPill label="Calories" value={`${calories} kcal`} color={colors.primary} />
        <NutrientPill label="Protein" value={`${proteinG}g`} color="#64D2FF" />
        <NutrientPill label="Carbs" value={`${carbsG}g`} color="#FFD60A" />
        <NutrientPill label="Fat" value={`${fatG}g`} color="#FF6B9D" />
      </View>

      <Pressable
        onPress={() => grams > 0 && onAdd(grams)}
        disabled={grams <= 0}
        style={({ pressed }) => ({
          backgroundColor: grams > 0 ? colors.diet : colors.surface2,
          borderRadius: radius.md,
          paddingVertical: spacing.sm + 2,
          alignItems: 'center',
          opacity: pressed ? 0.8 : 1,
        })}
      >
        <Text style={{ color: grams > 0 ? '#fff' : colors.textMuted, fontSize: fontSize.body, fontWeight: '600' }}>
          Add to Meal
        </Text>
      </Pressable>
    </View>
  )
}

function NutrientPill({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={{ color, fontSize: fontSize.cardTitle, fontWeight: '700' }}>{value}</Text>
      <Text style={{ color: colors.textMuted, fontSize: fontSize.micro }}>{label}</Text>
    </View>
  )
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function FoodSearchScreen() {
  const router = useRouter()
  const { mealId } = useLocalSearchParams<{ mealId: string }>()
  const { searchResults, searchFoods, addEntry } = useDietStore()

  const [query, setQuery] = useState('')
  const [selectedFood, setSelectedFood] = useState<Food | null>(null)

  useEffect(() => { searchFoods('') }, [])

  useEffect(() => {
    const timer = setTimeout(() => searchFoods(query), 200)
    return () => clearTimeout(timer)
  }, [query])

  function handleAdd(grams: number) {
    if (!mealId || !selectedFood) return
    addEntry(mealId, selectedFood, grams)
    setSelectedFood(null)
    setQuery('')
    searchFoods('')
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {/* Header */}
        <View style={{
          flexDirection: 'row', alignItems: 'center',
          paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
          borderBottomWidth: 1, borderBottomColor: colors.border, gap: spacing.sm,
        }}>
          <Pressable onPress={() => router.back()} style={{ padding: spacing.xs }}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </Pressable>
          <Text style={{ flex: 1, color: colors.text, fontSize: fontSize.sectionHeader, fontWeight: '600' }}>
            Search Food
          </Text>
        </View>

        {/* Search bar */}
        <View style={{ paddingHorizontal: spacing.md, paddingVertical: spacing.sm }}>
          <View style={{
            flexDirection: 'row', alignItems: 'center',
            backgroundColor: colors.surface2, borderRadius: radius.md,
            paddingHorizontal: spacing.sm, gap: spacing.xs,
          }}>
            <Ionicons name="search" size={16} color={colors.textMuted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search foods…"
              placeholderTextColor={colors.textMuted}
              autoFocus
              style={{ flex: 1, color: colors.text, fontSize: fontSize.body, paddingVertical: spacing.sm }}
              selectionColor={colors.primary}
            />
            {query.length > 0 && (
              <Pressable onPress={() => { setQuery(''); searchFoods('') }}>
                <Ionicons name="close-circle" size={16} color={colors.textMuted} />
              </Pressable>
            )}
          </View>
        </View>

        {/* Results list */}
        <FlatList
          data={searchResults}
          keyExtractor={(f) => f.id}
          contentContainerStyle={{ paddingHorizontal: spacing.md, paddingBottom: spacing.xl }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingVertical: spacing.xxl }}>
              <Ionicons name="search-outline" size={40} color={colors.textMuted} style={{ marginBottom: spacing.md }} />
              <Text style={{ color: colors.textMuted, fontSize: fontSize.body }}>No foods found</Text>
            </View>
          }
          renderItem={({ item }) => (
            <FoodRow
              food={item}
              onSelect={() => setSelectedFood(item)}
            />
          )}
        />

        {/* Amount entry panel */}
        {selectedFood && (
          <AmountPanel
            food={selectedFood}
            onAdd={handleAdd}
            onCancel={() => setSelectedFood(null)}
          />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
