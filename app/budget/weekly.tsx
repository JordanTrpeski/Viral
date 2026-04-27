import { useEffect, useState } from 'react'
import { View, Text, ScrollView, Pressable, Dimensions } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import Svg, { Rect, Circle, Line, Text as SvgText } from 'react-native-svg'
import { colors, fontSize, spacing, radius } from '@core/theme'
import {
  dbGetDailyTotals,
  dbGetWeeklyCategoryBreakdown,
  DailyTotal,
  WeeklyCategoryTotal,
} from '@core/db/budgetQueries'

// ── Week helpers ───────────────────────────────────────────────────────────────

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function getWeekStart(date: Date): Date {
  const d   = new Date(date)
  const day = d.getDay()                   // 0=Sun … 6=Sat
  const diff = day === 0 ? -6 : 1 - day   // shift so week starts Monday
  d.setDate(d.getDate() + diff)
  d.setHours(12, 0, 0, 0)
  return d
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

function toISO(d: Date): string { return d.toISOString().slice(0, 10) }

function weekLabel(start: Date): string {
  const end  = addDays(start, 6)
  const sMon = start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  const eSun = end.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  return `${sMon} – ${eSun}`
}

// ── Spending bar chart ────────────────────────────────────────────────────────

const CHART_H = 180
const PAD     = { l: 44, r: 12, t: 20, b: 36 }

function SpendingBarChart({ data, today }: { data: DailyTotal[]; today: string }) {
  const screenW = Dimensions.get('window').width
  const chartW  = screenW - spacing.lg * 2 - spacing.md * 2
  const innerW  = chartW - PAD.l - PAD.r
  const innerH  = CHART_H - PAD.t - PAD.b

  const maxSpend = Math.max(1, ...data.map((d) => d.spending)) * 1.15
  const barW     = Math.max(8, (innerW / 7) * 0.55)
  const gap      = innerW / 7

  return (
    <Svg width={chartW} height={CHART_H}>
      {/* Y axis label */}
      <SvgText x={PAD.l - 4} y={PAD.t + 6} fill={colors.textMuted} fontSize={9} textAnchor="end">
        €{Math.round(maxSpend / 1.15)}
      </SvgText>
      <SvgText x={PAD.l - 4} y={CHART_H - PAD.b} fill={colors.textMuted} fontSize={9} textAnchor="end">0</SvgText>

      {data.map((d, i) => {
        const cx    = PAD.l + i * gap + gap / 2
        const x     = cx - barW / 2
        const barH  = d.spending > 0 ? (d.spending / maxSpend) * innerH : 2
        const y     = PAD.t + innerH - barH
        const isNow = d.date === today

        return (
          <Svg key={d.date}>
            {/* Spending bar */}
            <Rect
              x={x} y={y} width={barW} height={barH} rx={3}
              fill={isNow ? colors.budget : `${colors.budget}55`}
            />
            {/* Income dot above bar */}
            {d.income > 0 && (
              <Circle
                cx={cx}
                cy={Math.min(y - 6, PAD.t + 8)}
                r={4}
                fill={colors.success}
              />
            )}
            {/* Day label */}
            <SvgText
              x={cx} y={CHART_H - PAD.b + 14}
              fill={isNow ? colors.budget : colors.textMuted}
              fontSize={9} textAnchor="middle"
              fontWeight={isNow ? '700' : '400'}
            >
              {DAY_LABELS[i]}
            </SvgText>
          </Svg>
        )
      })}
    </Svg>
  )
}

// ── Day-by-day net bar ────────────────────────────────────────────────────────

const NET_H = 100
const NET_PAD = { l: 40, r: 8, t: 8, b: 24 }

function NetBarChart({ data, today }: { data: DailyTotal[]; today: string }) {
  const screenW = Dimensions.get('window').width
  const chartW  = screenW - spacing.lg * 2 - spacing.md * 2
  const innerW  = chartW - NET_PAD.l - NET_PAD.r
  const innerH  = NET_H - NET_PAD.t - NET_PAD.b

  const maxAbs = Math.max(1, ...data.map((d) => Math.abs(d.net)))
  const midY   = NET_PAD.t + innerH / 2
  const gap    = innerW / 7
  const barW   = Math.max(6, gap * 0.55)

  return (
    <Svg width={chartW} height={NET_H}>
      {/* Zero line */}
      <Line x1={NET_PAD.l} y1={midY} x2={chartW - NET_PAD.r} y2={midY}
        stroke={colors.border} strokeWidth={1} />

      {data.map((d, i) => {
        const cx    = NET_PAD.l + i * gap + gap / 2
        const pct   = d.net / maxAbs
        const barH  = Math.max(2, Math.abs(pct) * (innerH / 2))
        const y     = d.net >= 0 ? midY - barH : midY
        const fill  = d.net >= 0 ? colors.success : colors.danger
        const isNow = d.date === today

        return (
          <Svg key={d.date}>
            <Rect
              x={cx - barW / 2} y={y} width={barW} height={barH} rx={2}
              fill={isNow ? fill : `${fill}88`}
            />
            <SvgText
              x={cx} y={NET_H - NET_PAD.b + 14}
              fill={isNow ? colors.text : colors.textMuted}
              fontSize={8} textAnchor="middle"
              fontWeight={isNow ? '700' : '400'}
            >
              {DAY_LABELS[i]}
            </SvgText>
          </Svg>
        )
      })}
    </Svg>
  )
}

// ── Category row ──────────────────────────────────────────────────────────────

function CategoryRow({ cat, totalSpending }: { cat: WeeklyCategoryTotal; totalSpending: number }) {
  const pct = totalSpending > 0 ? cat.total / totalSpending : 0
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
      <Text style={{ fontSize: 18, width: 28 }}>{cat.categoryEmoji}</Text>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
          <Text style={{ color: colors.text, fontSize: fontSize.label, fontWeight: '500' }}>{cat.categoryName}</Text>
          <Text style={{ color: colors.text, fontSize: fontSize.label, fontWeight: '600' }}>€{cat.total.toFixed(2)}</Text>
        </View>
        <View style={{ height: 3, backgroundColor: colors.surface2, borderRadius: radius.full, overflow: 'hidden' }}>
          <View style={{
            width: `${pct * 100}%`, height: '100%',
            backgroundColor: cat.categoryColor, borderRadius: radius.full,
          }} />
        </View>
      </View>
      <Text style={{ color: colors.textMuted, fontSize: fontSize.micro, width: 32, textAlign: 'right' }}>
        {Math.round(pct * 100)}%
      </Text>
    </View>
  )
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function WeeklyScreen() {
  const router = useRouter()
  const today  = new Date().toISOString().slice(0, 10)

  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()))
  const [dailyData, setDailyData] = useState<DailyTotal[]>([])
  const [categories, setCategories] = useState<WeeklyCategoryTotal[]>([])

  const startStr = toISO(weekStart)
  const endStr   = toISO(addDays(weekStart, 6))
  const isCurrentWeek = startStr === toISO(getWeekStart(new Date()))

  useEffect(() => {
    setDailyData(dbGetDailyTotals(startStr, endStr))
    setCategories(dbGetWeeklyCategoryBreakdown(startStr, endStr))
  }, [startStr])

  function prevWeek() { setWeekStart((w) => addDays(w, -7)) }
  function nextWeek() {
    if (!isCurrentWeek) setWeekStart((w) => addDays(w, 7))
  }

  const totalIncome   = dailyData.reduce((s, d) => s + d.income, 0)
  const totalSpending = dailyData.reduce((s, d) => s + d.spending, 0)
  const netBalance    = totalIncome - totalSpending
  const top3          = categories.slice(0, 3)

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
          Weekly Summary
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>

        {/* Week nav */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.md }}>
          <Pressable onPress={prevWeek} hitSlop={8}>
            <Ionicons name="chevron-back" size={20} color={colors.textMuted} />
          </Pressable>
          <Text style={{ color: colors.text, fontSize: fontSize.body, fontWeight: '600', minWidth: 160, textAlign: 'center' }}>
            {isCurrentWeek ? 'This Week' : weekLabel(weekStart)}
          </Text>
          <Pressable onPress={nextWeek} hitSlop={8} disabled={isCurrentWeek}>
            <Ionicons name="chevron-forward" size={20} color={isCurrentWeek ? colors.surface2 : colors.textMuted} />
          </Pressable>
        </View>

        {/* Hero totals */}
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          {[
            { label: 'Income',  value: totalIncome,   color: colors.success },
            { label: 'Spent',   value: totalSpending, color: colors.text },
            { label: 'Net',     value: netBalance,    color: netBalance >= 0 ? colors.success : colors.danger },
          ].map(({ label, value, color }) => (
            <View key={label} style={{
              flex: 1, backgroundColor: colors.surface, borderRadius: radius.lg,
              borderWidth: 1, borderColor: colors.border, padding: spacing.md, alignItems: 'center',
            }}>
              <Text style={{ color, fontSize: fontSize.cardTitle, fontWeight: '700' }}>
                {label === 'Net' && value > 0 ? '+' : ''}€{Math.abs(value).toFixed(2)}
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: fontSize.micro, marginTop: 2 }}>{label}</Text>
            </View>
          ))}
        </View>

        {/* Spending bar chart */}
        <View style={{
          backgroundColor: colors.surface, borderRadius: radius.lg,
          borderWidth: 1, borderColor: colors.border, padding: spacing.md,
        }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
            <Text style={{ color: colors.text, fontSize: fontSize.cardTitle, fontWeight: '600' }}>Spending</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success }} />
              <Text style={{ color: colors.textMuted, fontSize: fontSize.micro }}>Income day</Text>
            </View>
          </View>
          {dailyData.length > 0
            ? <SpendingBarChart data={dailyData} today={today} />
            : <View style={{ height: 60, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: colors.textMuted, fontSize: fontSize.label }}>No spending this week</Text>
              </View>
          }
        </View>

        {/* Top 3 categories */}
        {top3.length > 0 && (
          <View style={{
            backgroundColor: colors.surface, borderRadius: radius.lg,
            borderWidth: 1, borderColor: colors.border, padding: spacing.md, gap: spacing.md,
          }}>
            <Text style={{ color: colors.text, fontSize: fontSize.cardTitle, fontWeight: '600' }}>Top Categories</Text>
            {top3.map((c) => (
              <CategoryRow key={c.categoryId} cat={c} totalSpending={totalSpending} />
            ))}
          </View>
        )}

        {/* Day-by-day net */}
        <View style={{
          backgroundColor: colors.surface, borderRadius: radius.lg,
          borderWidth: 1, borderColor: colors.border, padding: spacing.md,
        }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
            <Text style={{ color: colors.text, fontSize: fontSize.cardTitle, fontWeight: '600' }}>Daily Net</Text>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: colors.success }} />
                <Text style={{ color: colors.textMuted, fontSize: fontSize.micro }}>Saved</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: colors.danger }} />
                <Text style={{ color: colors.textMuted, fontSize: fontSize.micro }}>Over</Text>
              </View>
            </View>
          </View>
          {dailyData.length > 0
            ? <NetBarChart data={dailyData} today={today} />
            : <View style={{ height: 40, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: colors.textMuted, fontSize: fontSize.label }}>No data this week</Text>
              </View>
          }
        </View>

        {/* Tap a day to go to daily view */}
        <View style={{ gap: spacing.xs }}>
          <Text style={{ color: colors.textMuted, fontSize: fontSize.micro, fontWeight: '600' }}>DAILY BREAKDOWN</Text>
          {dailyData.filter((d) => d.spending > 0 || d.income > 0).map((d) => {
            const net = d.net
            return (
              <Pressable
                key={d.date}
                onPress={() => router.push(`/budget/daily?date=${d.date}` as never)}
                style={({ pressed }) => ({
                  flexDirection: 'row', alignItems: 'center',
                  backgroundColor: colors.surface, borderRadius: radius.md,
                  borderWidth: 1, borderColor: colors.border,
                  padding: spacing.md, gap: spacing.md,
                  opacity: pressed ? 0.85 : 1,
                })}
              >
                <Text style={{ color: colors.textMuted, fontSize: fontSize.label, width: 36 }}>
                  {DAY_LABELS[new Date(d.date + 'T12:00:00').getDay() === 0 ? 6 : new Date(d.date + 'T12:00:00').getDay() - 1]}
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: fontSize.label, width: 40 }}>
                  {d.date.slice(5).replace('-', '/')}
                </Text>
                <View style={{ flex: 1 }}>
                  {d.income > 0 && (
                    <Text style={{ color: colors.success, fontSize: fontSize.micro }}>+€{d.income.toFixed(2)} income</Text>
                  )}
                  {d.spending > 0 && (
                    <Text style={{ color: colors.textMuted, fontSize: fontSize.micro }}>−€{d.spending.toFixed(2)} spent</Text>
                  )}
                </View>
                <Text style={{ color: net >= 0 ? colors.success : colors.danger, fontSize: fontSize.label, fontWeight: '700' }}>
                  {net >= 0 ? '+' : ''}€{net.toFixed(2)}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </Pressable>
            )
          })}
          {dailyData.every((d) => d.spending === 0 && d.income === 0) && (
            <View style={{ alignItems: 'center', paddingVertical: spacing.lg }}>
              <Text style={{ color: colors.textMuted, fontSize: fontSize.body }}>No entries this week</Text>
            </View>
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  )
}
