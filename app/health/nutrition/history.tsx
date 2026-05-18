import React, { useCallback, useMemo } from 'react'
import {
  View, Text, ScrollView, Pressable, StyleSheet, StatusBar,
} from 'react-native'
import { useFocusEffect, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useDietStore } from '@modules/health/diet/dietStore'
import { dbGetMacroHistory } from '@core/db/dietQueries'
import { localDateStr } from '@core/utils/units'
import { colors, fonts, fontSize, spacing, radius } from '@core/theme'

const RANGE_OPTIONS: Array<7 | 30> = [7, 30]

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function fromDate(daysBack: number): string {
  const d = new Date()
  d.setDate(d.getDate() - daysBack + 1)
  return d.toISOString().slice(0, 10)
}

// ─── Calorie bar ──────────────────────────────────────────────────────────────

function CalorieBar({
  date, calories, goal, maxCalories, isToday,
}: {
  date: string
  calories: number
  goal: number
  maxCalories: number
  isToday: boolean
}) {
  const pct = maxCalories > 0 ? Math.min(1, calories / maxCalories) : 0
  const overGoal = calories > goal
  const barColor = isToday ? colors.diet : overGoal ? '#c0533a' : colors.diet

  return (
    <View style={styles.barRow}>
      <Text style={[styles.barDate, isToday && styles.barDateToday]}>{formatDate(date)}</Text>
      <View style={styles.barTrack}>
        {goal > 0 && (
          <View
            style={[
              styles.barGoalLine,
              { left: `${Math.min(100, (goal / maxCalories) * 100)}%` as any },
            ]}
          />
        )}
        <View style={[styles.barFill, { width: `${Math.round(pct * 100)}%` as any, backgroundColor: barColor }]} />
      </View>
      <Text style={[styles.barValue, overGoal && { color: '#c0533a' }]}>{calories}</Text>
    </View>
  )
}

// ─── Macro summary card ───────────────────────────────────────────────────────

function MacroSummaryCard({
  avgCalories, avgProtein, avgCarbs, avgFat, calorieGoal,
}: {
  avgCalories: number; avgProtein: number; avgCarbs: number; avgFat: number; calorieGoal: number
}) {
  const diff = avgCalories - calorieGoal
  return (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryTitle}>Daily Average</Text>
      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryVal}>{Math.round(avgCalories)}</Text>
          <Text style={styles.summaryKey}>kcal</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryVal, { color: Math.abs(diff) < 50 ? colors.success : diff > 0 ? '#c0533a' : colors.warning }]}>
            {diff > 0 ? `+${Math.round(diff)}` : Math.round(diff)}
          </Text>
          <Text style={styles.summaryKey}>vs goal</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryVal, { color: colors.workout }]}>{Math.round(avgProtein)}g</Text>
          <Text style={styles.summaryKey}>protein</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryVal, { color: colors.diet }]}>{Math.round(avgCarbs)}g</Text>
          <Text style={styles.summaryKey}>carbs</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryVal, { color: colors.warning }]}>{Math.round(avgFat)}g</Text>
          <Text style={styles.summaryKey}>fat</Text>
        </View>
      </View>
    </View>
  )
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function NutritionHistory() {
  const router = useRouter()
  const { historyRange, calorieHistory, macroGoals, loadHistory } = useDietStore()

  useFocusEffect(useCallback(() => { loadHistory(historyRange) }, [historyRange]))

  const today = localDateStr()
  const macroHistory = useMemo(() => {
    const from = fromDate(historyRange)
    return dbGetMacroHistory(from, today)
  }, [historyRange, today])

  const maxCalories = useMemo(
    () => Math.max(...calorieHistory.map((d) => d.calories), macroGoals.calorieGoal, 1),
    [calorieHistory, macroGoals.calorieGoal],
  )

  const avg = useMemo(() => {
    if (macroHistory.length === 0) return null
    const n = macroHistory.length
    return {
      calories: macroHistory.reduce((s, d) => s + d.calories, 0) / n,
      protein:  macroHistory.reduce((s, d) => s + d.proteinG, 0) / n,
      carbs:    macroHistory.reduce((s, d) => s + d.carbsG, 0) / n,
      fat:      macroHistory.reduce((s, d) => s + d.fatG, 0) / n,
    }
  }, [macroHistory])

  // Build full date range (fill gaps with 0)
  const chartData = useMemo(() => {
    const map = new Map(calorieHistory.map((d) => [d.date, d.calories]))
    const days: { date: string; calories: number }[] = []
    for (let i = historyRange - 1; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().slice(0, 10)
      days.push({ date: dateStr, calories: map.get(dateStr) ?? 0 })
    }
    return days
  }, [calorieHistory, historyRange])

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Nutrition History</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Range selector */}
        <View style={styles.rangeRow}>
          {RANGE_OPTIONS.map((r) => (
            <Pressable
              key={r}
              style={[styles.rangeChip, historyRange === r && styles.rangeChipActive]}
              onPress={() => loadHistory(r)}
            >
              <Text style={[styles.rangeChipText, historyRange === r && styles.rangeChipTextActive]}>
                {r} days
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Average card */}
        {avg && (
          <MacroSummaryCard
            avgCalories={avg.calories}
            avgProtein={avg.protein}
            avgCarbs={avg.carbs}
            avgFat={avg.fat}
            calorieGoal={macroGoals.calorieGoal}
          />
        )}

        {/* Calorie bar chart */}
        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <Text style={styles.chartTitle}>Calories</Text>
            <View style={styles.chartLegend}>
              <View style={[styles.legendDot, { backgroundColor: colors.diet }]} />
              <Text style={styles.legendText}>Eaten</Text>
              <View style={[styles.legendDot, { backgroundColor: colors.border }]} />
              <Text style={styles.legendText}>Goal</Text>
            </View>
          </View>

          {chartData.map((day) => (
            <CalorieBar
              key={day.date}
              date={day.date}
              calories={day.calories}
              goal={macroGoals.calorieGoal}
              maxCalories={maxCalories}
              isToday={day.date === today}
            />
          ))}

          {chartData.every((d) => d.calories === 0) && (
            <View style={styles.emptyChart}>
              <Text style={styles.emptyChartText}>No data logged yet</Text>
            </View>
          )}
        </View>

        {/* Per-day macro breakdown */}
        {macroHistory.length > 0 && (
          <View style={styles.macroTableCard}>
            <Text style={styles.chartTitle}>Daily Breakdown</Text>
            <View style={styles.macroTableHeader}>
              <Text style={[styles.macroTableCell, styles.macroTableDate]}>Date</Text>
              <Text style={styles.macroTableCell}>kcal</Text>
              <Text style={styles.macroTableCell}>P</Text>
              <Text style={styles.macroTableCell}>C</Text>
              <Text style={styles.macroTableCell}>F</Text>
            </View>
            {macroHistory.slice().reverse().map((d) => (
              <View key={d.date} style={[styles.macroTableRow, d.date === today && styles.macroTableRowToday]}>
                <Text style={[styles.macroTableCell, styles.macroTableDate, d.date === today && styles.todayText]}>
                  {d.date === today ? 'Today' : formatDate(d.date)}
                </Text>
                <Text style={[styles.macroTableCell, { color: d.calories > macroGoals.calorieGoal ? '#c0533a' : colors.text }]}>
                  {Math.round(d.calories)}
                </Text>
                <Text style={[styles.macroTableCell, { color: colors.workout }]}>{Math.round(d.proteinG)}g</Text>
                <Text style={[styles.macroTableCell, { color: colors.diet }]}>{Math.round(d.carbsG)}g</Text>
                <Text style={[styles.macroTableCell, { color: colors.warning }]}>{Math.round(d.fatG)}g</Text>
              </View>
            ))}
          </View>
        )}

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
    fontFamily: `${fonts.ui}_700Bold`, fontSize: fontSize.sectionHeader, color: colors.text,
  },

  scroll: { paddingHorizontal: spacing.md, paddingTop: spacing.md },

  rangeRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  rangeChip: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
    borderRadius: radius.full, borderWidth: 1, borderColor: colors.border,
  },
  rangeChipActive: { backgroundColor: colors.diet, borderColor: colors.diet },
  rangeChipText: {
    fontFamily: `${fonts.ui}_400Regular`, fontSize: fontSize.label, color: colors.textMuted,
  },
  rangeChipTextActive: { color: colors.bg, fontFamily: `${fonts.ui}_600SemiBold` },

  summaryCard: {
    backgroundColor: colors.surface, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.md, marginBottom: spacing.md,
  },
  summaryTitle: {
    fontFamily: `${fonts.ui}_600SemiBold`, fontSize: fontSize.label,
    color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryItem: { alignItems: 'center' },
  summaryVal: {
    fontFamily: `${fonts.mono}_600SemiBold`, fontSize: fontSize.body, color: colors.text,
  },
  summaryKey: {
    fontFamily: `${fonts.ui}_400Regular`, fontSize: fontSize.micro, color: colors.textMuted,
  },

  chartCard: {
    backgroundColor: colors.surface, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.md, marginBottom: spacing.md,
  },
  chartHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: spacing.sm,
  },
  chartTitle: {
    fontFamily: `${fonts.ui}_600SemiBold`, fontSize: fontSize.cardTitle, color: colors.text,
  },
  chartLegend: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  legendDot: { width: 8, height: 8, borderRadius: radius.full },
  legendText: {
    fontFamily: `${fonts.ui}_400Regular`, fontSize: fontSize.micro, color: colors.textMuted,
  },

  barRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 6 },
  barDate: {
    fontFamily: `${fonts.mono}_400Regular`, fontSize: fontSize.micro, color: colors.textMuted, width: 48,
  },
  barDateToday: { color: colors.diet, fontFamily: `${fonts.mono}_600SemiBold` },
  barTrack: {
    flex: 1, height: 10, backgroundColor: colors.surface2, borderRadius: radius.full,
    overflow: 'visible', position: 'relative',
  },
  barFill: { height: '100%', borderRadius: radius.full, position: 'absolute', left: 0, top: 0 },
  barGoalLine: {
    position: 'absolute', top: -3, width: 2, height: 16,
    backgroundColor: colors.borderHero, zIndex: 1,
  },
  barValue: {
    fontFamily: `${fonts.mono}_400Regular`, fontSize: fontSize.micro, color: colors.textMuted, width: 36, textAlign: 'right',
  },

  emptyChart: { alignItems: 'center', paddingVertical: spacing.lg },
  emptyChartText: {
    fontFamily: `${fonts.ui}_400Regular`, fontSize: fontSize.body, color: colors.textMuted,
  },

  macroTableCard: {
    backgroundColor: colors.surface, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.md, marginBottom: spacing.md,
  },
  macroTableHeader: {
    flexDirection: 'row', paddingBottom: spacing.xs,
    borderBottomWidth: 1, borderBottomColor: colors.border,
    marginTop: spacing.sm, marginBottom: spacing.xs,
  },
  macroTableRow: {
    flexDirection: 'row', paddingVertical: 6,
    borderBottomWidth: 1, borderBottomColor: colors.surface2,
  },
  macroTableRowToday: { backgroundColor: colors.surface2 },
  macroTableCell: {
    flex: 1, textAlign: 'right',
    fontFamily: `${fonts.mono}_400Regular`, fontSize: fontSize.label, color: colors.text,
  },
  macroTableDate: { flex: 1.5, textAlign: 'left', color: colors.textMuted },
  todayText: { color: colors.diet, fontFamily: `${fonts.mono}_600SemiBold` },
})
