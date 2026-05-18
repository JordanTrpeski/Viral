import React, { useState, useCallback, useRef } from 'react'
import {
  View, Text, TextInput, FlatList, Pressable, StyleSheet,
  Modal, KeyboardAvoidingView, Platform, StatusBar,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useDietStore } from '@modules/health/diet/dietStore'
import { MEAL_TYPE_LABELS } from '@modules/health/diet/dietUtils'
import { colors, fonts, fontSize, spacing, radius } from '@core/theme'
import type { Food } from '@modules/health/shared/types'

// ─── Amount input bottom sheet ────────────────────────────────────────────────

function AmountSheet({
  food,
  onConfirm,
  onClose,
}: {
  food: Food
  onConfirm: (grams: number) => void
  onClose: () => void
}) {
  const [grams, setGrams] = useState('100')
  const parsed = parseFloat(grams)
  const valid = !isNaN(parsed) && parsed > 0
  const calories = valid ? Math.round(food.caloriesPer100g * parsed / 100) : 0
  const protein  = valid ? Math.round(food.proteinPer100g  * parsed / 10) / 10 : 0
  const carbs    = valid ? Math.round(food.carbsPer100g    * parsed / 10) / 10 : 0
  const fat      = valid ? Math.round(food.fatPer100g      * parsed / 10) / 10 : 0

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.sheetOverlay}
    >
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.sheetHandle} />
        <Text style={styles.sheetFoodName} numberOfLines={2}>{food.name}</Text>
        {food.brand && <Text style={styles.sheetBrand}>{food.brand}</Text>}

        {/* Per-100g reference */}
        <View style={styles.sheetPer100}>
          <Text style={styles.sheetPer100Label}>Per 100g:</Text>
          <Text style={styles.sheetPer100Value}>{Math.round(food.caloriesPer100g)} kcal</Text>
          <Text style={styles.sheetPer100Value}>P {food.proteinPer100g}g</Text>
          <Text style={styles.sheetPer100Value}>C {food.carbsPer100g}g</Text>
          <Text style={styles.sheetPer100Value}>F {food.fatPer100g}g</Text>
        </View>

        {/* Grams input */}
        <Text style={styles.sheetInputLabel}>Amount (grams)</Text>
        <TextInput
          style={styles.sheetInput}
          value={grams}
          onChangeText={setGrams}
          keyboardType="decimal-pad"
          selectTextOnFocus
          placeholderTextColor={colors.textMuted}
          autoFocus
        />

        {/* Live preview */}
        {valid && (
          <View style={styles.sheetPreview}>
            <View style={styles.sheetPreviewItem}>
              <Text style={styles.sheetPreviewVal}>{calories}</Text>
              <Text style={styles.sheetPreviewKey}>kcal</Text>
            </View>
            <View style={styles.sheetPreviewItem}>
              <Text style={styles.sheetPreviewVal}>{protein}g</Text>
              <Text style={styles.sheetPreviewKey}>protein</Text>
            </View>
            <View style={styles.sheetPreviewItem}>
              <Text style={styles.sheetPreviewVal}>{carbs}g</Text>
              <Text style={styles.sheetPreviewKey}>carbs</Text>
            </View>
            <View style={styles.sheetPreviewItem}>
              <Text style={styles.sheetPreviewVal}>{fat}g</Text>
              <Text style={styles.sheetPreviewKey}>fat</Text>
            </View>
          </View>
        )}

        <Pressable
          style={[styles.sheetConfirm, !valid && styles.sheetConfirmDisabled]}
          onPress={() => valid && onConfirm(parsed)}
          disabled={!valid}
        >
          <Text style={styles.sheetConfirmText}>Add to meal</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  )
}

// ─── Food row ─────────────────────────────────────────────────────────────────

function FoodRow({ food, onPress }: { food: Food; onPress: () => void }) {
  return (
    <Pressable style={styles.foodRow} onPress={onPress}>
      <View style={styles.foodInfo}>
        <Text style={styles.foodName} numberOfLines={1}>{food.name}</Text>
        {food.brand && <Text style={styles.foodBrand}>{food.brand}</Text>}
        <Text style={styles.foodMacros}>
          {Math.round(food.caloriesPer100g)} kcal · P {food.proteinPer100g}g · C {food.carbsPer100g}g · F {food.fatPer100g}g
          {' '}
          <Text style={styles.foodPer}>(per 100g)</Text>
        </Text>
      </View>
      {food.isCustom && (
        <View style={styles.customBadge}>
          <Text style={styles.customBadgeText}>custom</Text>
        </View>
      )}
      <Ionicons name="add-circle-outline" size={24} color={colors.diet} />
    </Pressable>
  )
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function FoodSearch() {
  const router = useRouter()
  const { mealId, mealType } = useLocalSearchParams<{ mealId: string; mealType: string }>()
  const { searchFoods, searchResults, addEntry } = useDietStore()

  const [query, setQuery] = useState('')
  const [selectedFood, setSelectedFood] = useState<Food | null>(null)
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load all foods on mount
  const init = useCallback(() => { searchFoods('') }, [])
  React.useEffect(() => { init() }, [])

  const handleQueryChange = (text: string) => {
    setQuery(text)
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => searchFoods(text), 200)
  }

  const handleConfirm = (grams: number) => {
    if (!selectedFood || !mealId) return
    addEntry(mealId, selectedFood, grams)
    setSelectedFood(null)
  }

  const mealLabel = mealType ? MEAL_TYPE_LABELS[mealType] ?? mealType : 'Meal'

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Add Food</Text>
          <Text style={styles.headerSub}>{mealLabel}</Text>
        </View>
        <Pressable onPress={() => router.push('/health/nutrition/barcode-scanner')} style={styles.headerIconBtn}>
          <Ionicons name="barcode-outline" size={24} color={colors.textMuted} />
        </Pressable>
      </View>

      {/* Search bar */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={handleQueryChange}
          placeholder="Search foods..."
          placeholderTextColor={colors.textMuted}
          autoFocus
          returnKeyType="search"
        />
        {query.length > 0 && (
          <Pressable onPress={() => { setQuery(''); searchFoods('') }}>
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </Pressable>
        )}
      </View>

      {/* Results */}
      <FlatList
        data={searchResults}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <FoodRow food={item} onPress={() => setSelectedFood(item)} />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={40} color={colors.textMuted} />
            <Text style={styles.emptyText}>No foods found</Text>
            <Pressable style={styles.createLink} onPress={() => router.push('/health/nutrition/food-create')}>
              <Text style={styles.createLinkText}>+ Create custom food</Text>
            </Pressable>
          </View>
        }
        ListFooterComponent={
          searchResults.length > 0 ? (
            <Pressable style={styles.createFooter} onPress={() => router.push('/health/nutrition/food-create')}>
              <Ionicons name="add-circle-outline" size={16} color={colors.primary} />
              <Text style={styles.createLinkText}>Create custom food</Text>
            </Pressable>
          ) : null
        }
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.list}
      />

      {/* Amount sheet */}
      <Modal
        visible={selectedFood !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedFood(null)}
      >
        {selectedFood && (
          <AmountSheet
            food={selectedFood}
            onConfirm={handleConfirm}
            onClose={() => setSelectedFood(null)}
          />
        )}
      </Modal>
    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingTop: 56, paddingBottom: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backBtn: { padding: spacing.xs, marginRight: spacing.xs },
  headerTitle: {
    fontFamily: `${fonts.ui}_700Bold`, fontSize: fontSize.sectionHeader, color: colors.text,
  },
  headerSub: {
    fontFamily: `${fonts.ui}_400Regular`, fontSize: fontSize.label, color: colors.textMuted,
  },
  headerIconBtn: { padding: spacing.xs },

  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    margin: spacing.md,
    backgroundColor: colors.surface, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontFamily: `${fonts.ui}_400Regular`, fontSize: fontSize.body, color: colors.text,
  },

  list: { paddingHorizontal: spacing.md, paddingBottom: spacing.xxl },
  separator: { height: 1, backgroundColor: colors.border },

  foodRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  foodInfo: { flex: 1 },
  foodName: {
    fontFamily: `${fonts.ui}_600SemiBold`, fontSize: fontSize.body, color: colors.text,
  },
  foodBrand: {
    fontFamily: `${fonts.ui}_400Regular`, fontSize: fontSize.label, color: colors.textMuted,
  },
  foodMacros: {
    fontFamily: `${fonts.mono}_400Regular`, fontSize: fontSize.micro, color: colors.textMuted,
    marginTop: 2,
  },
  foodPer: { color: colors.border },
  customBadge: {
    backgroundColor: colors.surface2, borderRadius: radius.sm,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  customBadgeText: {
    fontFamily: `${fonts.ui}_400Regular`, fontSize: fontSize.micro, color: colors.primary,
  },

  emptyState: { alignItems: 'center', paddingTop: spacing.xxl, gap: spacing.sm },
  emptyText: {
    fontFamily: `${fonts.ui}_400Regular`, fontSize: fontSize.body, color: colors.textMuted,
  },
  createLink: { marginTop: spacing.sm },
  createLinkText: {
    fontFamily: `${fonts.ui}_600SemiBold`, fontSize: fontSize.body, color: colors.primary,
  },
  createFooter: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    paddingVertical: spacing.md, justifyContent: 'center',
  },

  // Sheet
  sheetOverlay: {
    flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    backgroundColor: colors.surface, borderTopLeftRadius: radius.lg * 2,
    borderTopRightRadius: radius.lg * 2,
    padding: spacing.md, paddingBottom: spacing.xxl,
    borderTopWidth: 1, borderColor: colors.border,
  },
  sheetHandle: {
    width: 36, height: 4, backgroundColor: colors.border,
    borderRadius: radius.full, alignSelf: 'center', marginBottom: spacing.md,
  },
  sheetFoodName: {
    fontFamily: `${fonts.ui}_700Bold`, fontSize: fontSize.sectionHeader, color: colors.text,
    marginBottom: 4,
  },
  sheetBrand: {
    fontFamily: `${fonts.ui}_400Regular`, fontSize: fontSize.label, color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  sheetPer100: {
    flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap',
    backgroundColor: colors.surface2, borderRadius: radius.sm,
    padding: spacing.sm, marginBottom: spacing.md,
  },
  sheetPer100Label: {
    fontFamily: `${fonts.ui}_400Regular`, fontSize: fontSize.label, color: colors.textMuted,
  },
  sheetPer100Value: {
    fontFamily: `${fonts.mono}_500Medium`, fontSize: fontSize.label, color: colors.text,
  },
  sheetInputLabel: {
    fontFamily: `${fonts.ui}_400Regular`, fontSize: fontSize.label, color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  sheetInput: {
    backgroundColor: colors.surface2, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.borderAccent,
    padding: spacing.sm,
    fontFamily: `${fonts.mono}_600SemiBold`, fontSize: fontSize.sectionHeader, color: colors.text,
    textAlign: 'center', marginBottom: spacing.md,
  },
  sheetPreview: {
    flexDirection: 'row', justifyContent: 'space-around',
    backgroundColor: colors.surface2, borderRadius: radius.sm,
    padding: spacing.sm, marginBottom: spacing.md,
  },
  sheetPreviewItem: { alignItems: 'center' },
  sheetPreviewVal: {
    fontFamily: `${fonts.mono}_600SemiBold`, fontSize: fontSize.body, color: colors.text,
  },
  sheetPreviewKey: {
    fontFamily: `${fonts.ui}_400Regular`, fontSize: fontSize.micro, color: colors.textMuted,
  },
  sheetConfirm: {
    backgroundColor: colors.diet, borderRadius: radius.md,
    padding: spacing.md, alignItems: 'center',
  },
  sheetConfirmDisabled: { opacity: 0.4 },
  sheetConfirmText: {
    fontFamily: `${fonts.ui}_700Bold`, fontSize: fontSize.body, color: colors.bg,
  },
})
