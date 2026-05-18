import React, { useCallback } from 'react'
import {
  View, Text, ScrollView, Pressable, StyleSheet, StatusBar,
} from 'react-native'
import { useFocusEffect, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useDietStore } from '@modules/health/diet/dietStore'
import { MEAL_TYPE_LABELS, MEAL_TYPE_ICONS } from '@modules/health/diet/dietUtils'
import { colors, fonts, fontSize, spacing, radius } from '@core/theme'
import type { MealType } from '@modules/health/shared/types'

const MACRO_COLORS = {
  protein: colors.workout,
  carbs:   colors.diet,
  fat:     colors.warning,
}

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack']

const WATER_QUICK_ADD = [250, 500]

// ─── Calorie ring (simple arc via View) ──────────────────────────────────────

function CalorieRing({ eaten, goal }: { eaten: number; goal: number }) {
  const pct = Math.min(1, goal > 0 ? eaten / goal : 0)
  const remaining = Math.max(0, goal - eaten)
  const over = eaten > goal

  return (
    <View style={styles.ringContainer}>
      <View style={styles.ringTrack}>
        <View style={[styles.ringFill, { width: `${Math.round(pct * 100)}%` as any }]} />
      </View>
      <View style={styles.ringLabels}>
        <View style={styles.ringLabelGroup}>
          <Text style={styles.ringValue}>{eaten}</Text>
          <Text style={styles.ringUnit}>eaten</Text>
        </View>
        <View style={styles.ringSep} />
        <View style={styles.ringLabelGroup}>
          <Text style={[styles.ringValue, over && { color: '#c0533a' }]}>
            {over ? `+${eaten - goal}` : remaining}
          </Text>
          <Text style={styles.ringUnit}>{over ? 'over' : 'left'}</Text>
        </View>
        <View style={styles.ringSep} />
        <View style={styles.ringLabelGroup}>
          <Text style={styles.ringValue}>{goal}</Text>
          <Text style={styles.ringUnit}>goal</Text>
        </View>
      </View>
    </View>
  )
}

// ─── Macro bar ────────────────────────────────────────────────────────────────

function MacroRow({
  label, value, goal, color,
}: { label: string; value: number; goal: number; color: string }) {
  const pct = Math.min(1, goal > 0 ? value / goal : 0)
  return (
    <View style={styles.macroRow}>
      <Text style={styles.macroLabel}>{label}</Text>
      <View style={styles.macroTrack}>
        <View style={[styles.macroFill, { width: `${Math.round(pct * 100)}%` as any, backgroundColor: color }]} />
      </View>
      <Text style={styles.macroValue}>{Math.round(value)}g</Text>
      <Text style={styles.macroGoal}>/ {goal}g</Text>
    </View>
  )
}

// ─── Meal card ────────────────────────────────────────────────────────────────

function MealCard({ mealType, router }: { mealType: MealType; router: ReturnType<typeof useRouter> }) {
  const { meals, createMeal } = useDietStore()
  const meal = meals.find((m) => m.meal.mealType === mealType)
  const label = MEAL_TYPE_LABELS[mealType]
  const icon = MEAL_TYPE_ICONS[mealType] as any

  const handleLog = () => {
    const mealId = meal?.meal.id ?? createMeal(mealType)
    router.push({ pathname: '/health/nutrition/food-search', params: { mealId, mealType } })
  }

  const handleOpen = () => {
    if (meal) router.push(`/health/nutrition/meals/${meal.meal.id}`)
  }

  return (
    <View style={styles.mealCard}>
      <View style={styles.mealHeader}>
        <View style={styles.mealTitleRow}>
          <Ionicons name={icon} size={16} color={colors.diet} />
          <Text style={styles.mealTitle}>{label}</Text>
        </View>
        {meal && (
          <Text style={styles.mealCalories}>{Math.round(meal.totalCalories)} kcal</Text>
        )}
      </View>

      {meal && meal.entries.length > 0 ? (
        <>
          {meal.entries.slice(0, 3).map((e) => (
            <View key={e.entryId} style={styles.entryRow}>
              <Text style={styles.entryName} numberOfLines={1}>{e.foodName}</Text>
              <Text style={styles.entryInfo}>{e.amountGrams}g · {Math.round(e.calories)} kcal</Text>
            </View>
          ))}
          {meal.entries.length > 3 && (
            <Text style={styles.moreEntries}>+{meal.entries.length - 3} more items</Text>
          )}
          <View style={styles.mealActions}>
            <Pressable style={styles.mealActionBtn} onPress={handleOpen}>
              <Text style={styles.mealActionText}>View meal</Text>
            </Pressable>
            <Pressable style={[styles.mealActionBtn, styles.mealActionBtnPrimary]} onPress={handleLog}>
              <Ionicons name="add" size={14} color={colors.bg} />
              <Text style={styles.mealActionTextPrimary}>Add food</Text>
            </Pressable>
          </View>
        </>
      ) : (
        <Pressable style={styles.logMealBtn} onPress={handleLog}>
          <Ionicons name="add-circle-outline" size={16} color={colors.diet} />
          <Text style={styles.logMealText}>Log {label.toLowerCase()}</Text>
        </Pressable>
      )}
    </View>
  )
}

// ─── Water card ───────────────────────────────────────────────────────────────

function WaterCard() {
  const { waterMl, waterGoalMl, addWater } = useDietStore()
  const router = useRouter()
  const pct = Math.min(1, waterGoalMl > 0 ? waterMl / waterGoalMl : 0)

  return (
    <View style={styles.waterCard}>
      <View style={styles.waterHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          <Ionicons name="water-outline" size={16} color={colors.water} />
          <Text style={styles.waterTitle}>Hydration</Text>
        </View>
        <Pressable onPress={() => router.push('/health/nutrition/water')} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Text style={styles.waterAmount}>
          {waterMl >= 1000 ? `${(waterMl / 1000).toFixed(1)}L` : `${waterMl}ml`}
          <Text style={styles.waterGoalText}> / {waterGoalMl >= 1000 ? `${(waterGoalMl / 1000).toFixed(1)}L` : `${waterGoalMl}ml`}</Text>
        </Text>
          <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
        </Pressable>
      </View>
      <View style={styles.waterTrack}>
        <View style={[styles.waterFill, { width: `${Math.round(pct * 100)}%` as any }]} />
      </View>
      <View style={styles.waterButtons}>
        {WATER_QUICK_ADD.map((ml) => (
          <Pressable key={ml} style={styles.waterAddBtn} onPress={() => addWater(ml)}>
            <Text style={styles.waterAddText}>+{ml}ml</Text>
          </Pressable>
        ))}
        <Pressable style={styles.waterAddBtn} onPress={() => addWater(-250)}>
          <Text style={styles.waterAddText}>-250ml</Text>
        </Pressable>
      </View>
    </View>
  )
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function NutritionIndex() {
  const router = useRouter()
  const { loadToday, totalCalories, totalProteinG, totalCarbsG, totalFatG, macroGoals } = useDietStore()

  useFocusEffect(useCallback(() => { loadToday() }, []))

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Nutrition</Text>
        <View style={styles.headerActions}>
          <Pressable onPress={() => router.push('/health/nutrition/history')} style={styles.headerIconBtn}>
            <Ionicons name="bar-chart-outline" size={22} color={colors.textMuted} />
          </Pressable>
          <Pressable onPress={() => router.push('/health/nutrition/templates')} style={styles.headerIconBtn}>
            <Ionicons name="copy-outline" size={22} color={colors.textMuted} />
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Calorie summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Today's Calories</Text>
          <CalorieRing eaten={Math.round(totalCalories)} goal={macroGoals.calorieGoal} />

          <View style={styles.macros}>
            <MacroRow label="Protein" value={totalProteinG} goal={macroGoals.proteinGoalG} color={MACRO_COLORS.protein} />
            <MacroRow label="Carbs"   value={totalCarbsG}   goal={macroGoals.carbsGoalG}   color={MACRO_COLORS.carbs} />
            <MacroRow label="Fat"     value={totalFatG}     goal={macroGoals.fatGoalG}      color={MACRO_COLORS.fat} />
          </View>
        </View>

        {/* Meals */}
        <Text style={styles.sectionHeader}>Meals</Text>
        {MEAL_TYPES.map((type) => (
          <MealCard key={type} mealType={type} router={router} />
        ))}

        {/* Water */}
        <Text style={styles.sectionHeader}>Water</Text>
        <WaterCard />

        {/* Quick links */}
        <View style={styles.quickRow}>
          <Pressable style={styles.quickBtn} onPress={() => router.push('/health/nutrition/food-create')}>
            <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
            <Text style={styles.quickText}>Custom food</Text>
          </Pressable>
          <Pressable style={styles.quickBtn} onPress={() => router.push('/health/nutrition/barcode-scanner')}>
            <Ionicons name="barcode-outline" size={20} color={colors.primary} />
            <Text style={styles.quickText}>Scan barcode</Text>
          </Pressable>
        </View>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
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
    flex: 1,
    fontFamily: `${fonts.ui}_700Bold`, fontSize: fontSize.screenTitle, color: colors.text,
  },
  headerActions: { flexDirection: 'row', gap: spacing.xs },
  headerIconBtn: { padding: spacing.xs },

  scroll: { paddingHorizontal: spacing.md, paddingTop: spacing.md },

  summaryCard: {
    backgroundColor: colors.surface, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.md, marginBottom: spacing.md,
  },
  summaryTitle: {
    fontFamily: `${fonts.ui}_600SemiBold`, fontSize: fontSize.label,
    color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1,
    marginBottom: spacing.md,
  },

  // Calorie ring
  ringContainer: { marginBottom: spacing.md },
  ringTrack: {
    height: 12, backgroundColor: colors.surface2, borderRadius: radius.full,
    overflow: 'hidden', marginBottom: spacing.sm,
  },
  ringFill: {
    height: '100%', backgroundColor: colors.diet, borderRadius: radius.full,
  },
  ringLabels: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.md,
  },
  ringLabelGroup: { alignItems: 'center' },
  ringValue: {
    fontFamily: `${fonts.mono}_600SemiBold`, fontSize: fontSize.sectionHeader, color: colors.text,
  },
  ringUnit: {
    fontFamily: `${fonts.ui}_400Regular`, fontSize: fontSize.micro, color: colors.textMuted,
  },
  ringSep: { width: 1, height: 32, backgroundColor: colors.border },

  // Macros
  macros: { gap: spacing.sm },
  macroRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  macroLabel: {
    fontFamily: `${fonts.ui}_400Regular`, fontSize: fontSize.label, color: colors.textMuted,
    width: 52,
  },
  macroTrack: {
    flex: 1, height: 6, backgroundColor: colors.surface2, borderRadius: radius.full, overflow: 'hidden',
  },
  macroFill: { height: '100%', borderRadius: radius.full },
  macroValue: {
    fontFamily: `${fonts.mono}_500Medium`, fontSize: fontSize.label, color: colors.text, width: 40, textAlign: 'right',
  },
  macroGoal: {
    fontFamily: `${fonts.mono}_400Regular`, fontSize: fontSize.micro, color: colors.textMuted, width: 44,
  },

  sectionHeader: {
    fontFamily: `${fonts.ui}_600SemiBold`, fontSize: fontSize.label,
    color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1,
    marginBottom: spacing.sm,
  },

  // Meal card
  mealCard: {
    backgroundColor: colors.surface, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.md, marginBottom: spacing.sm,
  },
  mealHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  mealTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  mealTitle: {
    fontFamily: `${fonts.ui}_600SemiBold`, fontSize: fontSize.cardTitle, color: colors.text,
  },
  mealCalories: {
    fontFamily: `${fonts.mono}_500Medium`, fontSize: fontSize.label, color: colors.diet,
  },
  entryRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 3,
  },
  entryName: {
    fontFamily: `${fonts.ui}_400Regular`, fontSize: fontSize.body, color: colors.text, flex: 1, marginRight: spacing.sm,
  },
  entryInfo: {
    fontFamily: `${fonts.mono}_400Regular`, fontSize: fontSize.label, color: colors.textMuted,
  },
  moreEntries: {
    fontFamily: `${fonts.ui}_400Regular`, fontSize: fontSize.label, color: colors.textMuted,
    marginTop: spacing.xs,
  },
  mealActions: {
    flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm,
  },
  mealActionBtn: {
    flex: 1, paddingVertical: spacing.xs, borderRadius: radius.sm,
    borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  mealActionBtnPrimary: {
    backgroundColor: colors.diet, borderColor: colors.diet,
    flexDirection: 'row', gap: 4,
  },
  mealActionText: {
    fontFamily: `${fonts.ui}_400Regular`, fontSize: fontSize.label, color: colors.textMuted,
  },
  mealActionTextPrimary: {
    fontFamily: `${fonts.ui}_600SemiBold`, fontSize: fontSize.label, color: colors.bg,
  },
  logMealBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.xs, paddingVertical: spacing.sm,
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm,
    borderStyle: 'dashed',
  },
  logMealText: {
    fontFamily: `${fonts.ui}_400Regular`, fontSize: fontSize.body, color: colors.textMuted,
  },

  // Water
  waterCard: {
    backgroundColor: colors.surface, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.md, marginBottom: spacing.md,
  },
  waterHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: spacing.sm,
  },
  waterTitle: {
    fontFamily: `${fonts.ui}_600SemiBold`, fontSize: fontSize.cardTitle, color: colors.text,
  },
  waterAmount: {
    fontFamily: `${fonts.mono}_600SemiBold`, fontSize: fontSize.cardTitle, color: colors.water,
  },
  waterGoalText: {
    fontFamily: `${fonts.mono}_400Regular`, fontSize: fontSize.body, color: colors.textMuted,
  },
  waterTrack: {
    height: 8, backgroundColor: colors.surface2, borderRadius: radius.full,
    overflow: 'hidden', marginBottom: spacing.sm,
  },
  waterFill: {
    height: '100%', backgroundColor: colors.water, borderRadius: radius.full,
  },
  waterButtons: { flexDirection: 'row', gap: spacing.sm },
  waterAddBtn: {
    flex: 1, paddingVertical: spacing.xs, borderRadius: radius.sm,
    borderWidth: 1, borderColor: colors.border, alignItems: 'center',
  },
  waterAddText: {
    fontFamily: `${fonts.mono}_500Medium`, fontSize: fontSize.label, color: colors.water,
  },

  // Quick links
  quickRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs, marginBottom: spacing.md },
  quickBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.xs, padding: spacing.sm,
    backgroundColor: colors.surface, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
  },
  quickText: {
    fontFamily: `${fonts.ui}_400Regular`, fontSize: fontSize.label, color: colors.primary,
  },
})
