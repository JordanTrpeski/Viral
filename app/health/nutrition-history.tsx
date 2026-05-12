import { useEffect, useState, useMemo } from 'react'
import { View, Text, ScrollView, Pressable, Dimensions } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import Svg, { Rect, Line, Text as SvgText } from 'react-native-svg'
import { colors, fontSize, spacing, radius } from '@core/theme'
import { useDietStore } from '@modules/health/diet/dietStore'
import { dbGetMacroHistory } from '@core/db/dietQueries'
import { localDateStr } from '@core/utils/units'

// ─── Bar chart ────────────────────────────────────────────────────────────────

const CHART_H = 200
const PAD = { l: 44, r: 12, t: 16, b: 36 }

function CalorieBarChart({ data, goal }: {
  data: { date: string; calories: number }[]
  goal: number
}) {
  const screenW = Dimensions.get('window').width
  const chartW = screenW - spacing.lg * 2

  if (data.length === 0) {
    return (
      <View style={{ height: CHART_H, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: colors.textMuted, fontSize: fontSize.label }}>No data yet — log some meals!</Text>
      </View>
    )
  }

  const innerW = chartW - PAD.l - PAD.r
  const innerH = CHART_H - PAD.t - PAD.b
  const maxCal = Math.max(goal, ...data.map((d) => d.calories)) * 1.1
  const today = localDateStr()

  const barW = Math.max(6, (innerW / data.length) * 0.6)
  const gap  = innerW / data.length

  const goalY = PAD.t + innerH - (goal / maxCal) * innerH

  return (
    <Svg width={chartW} height={CHART_H}>
      {/* Y-axis labels */}
      <SvgText x={PAD.l - 4} y={PAD.t + 6} fill={colors.textMuted} fontSize={9} textAnchor="end">
        {Math.round(maxCal / 1.1)}
      </SvgText>
      <SvgText x={PAD.l - 4} y={CHART_H - PAD.b} fill={colors.textMuted} fontSize={9} textAnchor="end">
        0
      </SvgText>

      {/* Goal line */}
      <Line x1={PAD.l} y1={goalY} x2={chartW - PAD.r} y2={goalY}
        stroke={colors.warning} strokeWidth={1} strokeDasharray="4 3" />
      <SvgText x={PAD.l + 2} y={goalY - 3} fill={colors.warning} fontSize={8}>Goal</SvgText>

      {/* Bars */}
      {data.map((d, i) => {
        const x = PAD.l + i * gap + gap / 2 - barW / 2
        const barH = (d.calories / maxCal) * innerH
        const y = PAD.t + innerH - barH
        const isToday = d.date === today
        const isOver = d.calories > goal
        const barColor = isOver ? colors.danger : isToday ? colors.primary : `${colors.primary}66`

        // X label: show every label if ≤7 days, else show first/last/today
        const showLabel = data.length <= 7 || i === 0 || i === data.length - 1 || isToday
        const labelText = d.date.slice(5) // MM-DD

        return (
          <React.Fragment key={d.date}>
            <Rect
              x={x} y={y} width={barW} height={Math.max(2, barH)}
              rx={3} fill={barColor}
            />
            {showLabel && (
              <SvgText
                x={x + barW / 2} y={CHART_H - PAD.b + 14}
                fill={isToday ? colors.primary : colors.textMuted}
                fontSize={8} textAnchor="middle"
                fontWeight={isToday ? '700' : '400'}
              >
                {isToday ? 'Today' : labelText}
              </SvgText>
            )}
          </React.Fragment>
        )
      })}
    </Svg>
  )
}

// Need React import for Fragment
import React from 'react'

// ─── Weekly Averages helpers ──────────────────────────────────────────────────

function getMondayOf(d: Date): Date {
  const copy = new Date(d)
  const day = copy.getDay()
  copy.setDate(copy.getDate() - (day === 0 ? 6 : day - 1))
  copy.setHours(0, 0, 0, 0)
  return copy
}

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function avg(vals: number[]): number {
  if (vals.length === 0) return 0
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
}

function WeeklyAverages({ proteinGoalG }: { proteinGoalG: number }) {
  const today    = new Date()
  const thisMon  = getMondayOf(today)
  const lastMon  = new Date(thisMon); lastMon.setDate(lastMon.getDate() - 7)
  const lastSun  = new Date(thisMon); lastSun.setDate(lastSun.getDate() - 1)

  const thisWeek = dbGetMacroHistory(toDateStr(thisMon), toDateStr(today))
  const lastWeek = dbGetMacroHistory(toDateStr(lastMon), toDateStr(lastSun))

  const thisAvgCal  = avg(thisWeek.map((d) => d.calories))
  const lastAvgCal  = avg(lastWeek.map((d) => d.calories))
  const thisAvgProt = avg(thisWeek.map((d) => d.proteinG))
  const thisAvgCarb = avg(thisWeek.map((d) => d.carbsG))
  const thisAvgFat  = avg(thisWeek.map((d) => d.fatG))

  const missedDays = thisWeek.filter((d) => d.proteinG < proteinGoalG)

  const calDiff = thisAvgCal - lastAvgCal
  const calDiffColor = calDiff > 0 ? colors.danger : calDiff < 0 ? colors.success : colors.textMuted
  const calDiffLabel = calDiff === 0
    ? 'Same as last week'
    : `${calDiff > 0 ? '+' : ''}${calDiff} vs last week`

  if (thisWeek.length === 0 && lastWeek.length === 0) return null

  return (
    <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md }}>
      <Text style={{ color: colors.text, fontSize: fontSize.cardTitle, fontWeight: '600', marginBottom: spacing.md }}>
        Weekly Averages
      </Text>

      {/* Calorie comparison */}
      <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md }}>
        <View style={{ flex: 1, backgroundColor: colors.surface2, borderRadius: radius.md, padding: spacing.sm, alignItems: 'center' }}>
          <Text style={{ color: colors.text, fontSize: fontSize.cardTitle, fontWeight: '700' }}>{thisAvgCal}</Text>
          <Text style={{ color: colors.textMuted, fontSize: fontSize.micro }}>This week avg</Text>
          <Text style={{ color: colors.textMuted, fontSize: fontSize.micro }}>kcal/day</Text>
        </View>
        <View style={{ flex: 1, backgroundColor: colors.surface2, borderRadius: radius.md, padding: spacing.sm, alignItems: 'center' }}>
          <Text style={{ color: colors.textMuted, fontSize: fontSize.cardTitle, fontWeight: '700' }}>{lastAvgCal}</Text>
          <Text style={{ color: colors.textMuted, fontSize: fontSize.micro }}>Last week avg</Text>
          <Text style={{ color: colors.textMuted, fontSize: fontSize.micro }}>kcal/day</Text>
        </View>
      </View>
      {lastAvgCal > 0 && (
        <Text style={{ color: calDiffColor, fontSize: fontSize.label, fontWeight: '600', textAlign: 'center', marginBottom: spacing.md }}>
          {calDiffLabel}
        </Text>
      )}

      {/* Macro averages this week */}
      {thisWeek.length > 0 && (
        <>
          <Text style={{ color: colors.textMuted, fontSize: fontSize.micro, fontWeight: '600', marginBottom: spacing.xs }}>
            THIS WEEK DAILY AVERAGE
          </Text>
          <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md }}>
            {[
              { label: 'Protein', val: thisAvgProt, color: colors.primary },
              { label: 'Carbs', val: thisAvgCarb, color: colors.warning },
              { label: 'Fat', val: thisAvgFat, color: colors.danger },
            ].map(({ label, val, color }) => (
              <View key={label} style={{ flex: 1, backgroundColor: colors.surface2, borderRadius: radius.md, padding: spacing.sm, alignItems: 'center' }}>
                <Text style={{ color, fontSize: fontSize.body, fontWeight: '700' }}>{val}g</Text>
                <Text style={{ color: colors.textMuted, fontSize: fontSize.micro }}>{label}</Text>
              </View>
            ))}
          </View>
        </>
      )}

      {/* Protein goal missed */}
      {proteinGoalG > 0 && thisWeek.length > 0 && (
        <View style={{ backgroundColor: missedDays.length > 0 ? `${colors.warning}11` : `${colors.success}11`, borderRadius: radius.md, padding: spacing.sm, borderWidth: 1, borderColor: missedDays.length > 0 ? `${colors.warning}33` : `${colors.success}33` }}>
          {missedDays.length === 0 ? (
            <Text style={{ color: colors.success, fontSize: fontSize.label, fontWeight: '600' }}>
              ✓ Protein goal met every day this week
            </Text>
          ) : (
            <>
              <Text style={{ color: colors.warning, fontSize: fontSize.label, fontWeight: '600', marginBottom: 4 }}>
                Protein goal missed: {missedDays.length} {missedDays.length === 1 ? 'day' : 'days'}
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: fontSize.micro }}>
                {missedDays.map((d) => d.date.slice(5)).join(', ')}
              </Text>
            </>
          )}
        </View>
      )}
    </View>
  )
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function NutritionHistoryScreen() {
  const router = useRouter()
  const { calorieHistory, historyRange, loadHistory, macroGoals } = useDietStore()

  useEffect(() => { loadHistory(historyRange) }, [])

  function setRange(r: 7 | 30) { loadHistory(r) }

  const totalDays = calorieHistory.length
  const avgCalories = totalDays > 0
    ? Math.round(calorieHistory.reduce((s, d) => s + d.calories, 0) / totalDays)
    : 0
  const bestDay = calorieHistory.reduce<{ date: string; calories: number } | null>(
    (best, d) => !best || d.calories > best.calories ? d : best, null,
  )

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Header */}
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
        borderBottomWidth: 1, borderBottomColor: colors.border,
      }}>
        <Pressable onPress={() => router.back()} style={{ padding: spacing.sm }}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={{ flex: 1, color: colors.text, fontSize: fontSize.sectionHeader, fontWeight: '600', marginLeft: spacing.xs }}>
          Nutrition History
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>

        {/* Range toggle */}
        <View style={{ flexDirection: 'row', backgroundColor: colors.surface2, borderRadius: radius.sm, padding: 2, alignSelf: 'flex-start' }}>
          {([7, 30] as const).map((r) => (
            <Pressable
              key={r}
              onPress={() => setRange(r)}
              style={{
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.xs,
                borderRadius: radius.sm - 2,
                backgroundColor: historyRange === r ? colors.primary : 'transparent',
              }}
            >
              <Text style={{ color: historyRange === r ? '#fff' : colors.textMuted, fontSize: fontSize.label, fontWeight: '600' }}>
                {r}d
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Stats */}
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <View style={{ flex: 1, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md, alignItems: 'center' }}>
            <Text style={{ color: colors.text, fontSize: fontSize.cardTitle, fontWeight: '700' }}>{avgCalories}</Text>
            <Text style={{ color: colors.textMuted, fontSize: fontSize.micro }}>Avg kcal/day</Text>
          </View>
          <View style={{ flex: 1, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md, alignItems: 'center' }}>
            <Text style={{ color: colors.text, fontSize: fontSize.cardTitle, fontWeight: '700' }}>{macroGoals.calorieGoal}</Text>
            <Text style={{ color: colors.textMuted, fontSize: fontSize.micro }}>Goal kcal/day</Text>
          </View>
          <View style={{ flex: 1, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md, alignItems: 'center' }}>
            <Text style={{ color: colors.text, fontSize: fontSize.cardTitle, fontWeight: '700' }}>{totalDays}</Text>
            <Text style={{ color: colors.textMuted, fontSize: fontSize.micro }}>Days logged</Text>
          </View>
        </View>

        {/* Bar chart */}
        <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md }}>
          <Text style={{ color: colors.text, fontSize: fontSize.cardTitle, fontWeight: '600', marginBottom: spacing.md }}>
            Calories — Last {historyRange} Days
          </Text>
          <CalorieBarChart data={calorieHistory} goal={macroGoals.calorieGoal} />
        </View>

        {/* Weekly averages */}
        <WeeklyAverages proteinGoalG={macroGoals.proteinGoalG} />

        {/* Day list */}
        {calorieHistory.length > 0 && (
          <View>
            <Text style={{ color: colors.text, fontSize: fontSize.cardTitle, fontWeight: '600', marginBottom: spacing.sm }}>
              Daily Log
            </Text>
            <View style={{ gap: spacing.xs }}>
              {[...calorieHistory].reverse().map((d) => {
                const pct = d.calories / macroGoals.calorieGoal
                const barColor = pct >= 1 ? colors.danger : pct >= 0.8 ? colors.warning : colors.success
                return (
                  <View key={d.date} style={{
                    backgroundColor: colors.surface, borderRadius: radius.md,
                    borderWidth: 1, borderColor: colors.border,
                    padding: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
                  }}>
                    <Text style={{ color: colors.textMuted, fontSize: fontSize.label, width: 56 }}>{d.date.slice(5)}</Text>
                    <View style={{ flex: 1, height: 4, backgroundColor: colors.surface2, borderRadius: radius.full, overflow: 'hidden' }}>
                      <View style={{ width: `${Math.min(100, pct * 100)}%`, height: '100%', backgroundColor: barColor, borderRadius: radius.full }} />
                    </View>
                    <Text style={{ color: colors.text, fontSize: fontSize.label, fontWeight: '600', width: 56, textAlign: 'right' }}>
                      {d.calories} kcal
                    </Text>
                  </View>
                )
              })}
            </View>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  )
}
