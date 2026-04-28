import { useEffect, useState } from 'react'
import { View, Text, ScrollView, Pressable, Dimensions } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import Svg, { Path, Rect, Text as SvgText, G } from 'react-native-svg'
import { colors, fontSize, spacing, radius } from '@core/theme'
import { useBudgetStore } from '@modules/budget/budgetStore'
import {
  dbGetMonthDailySpending,
  dbGetBiggestExpenseForMonth,
  dbGetAnnualOverview,
  dbGetMonthlyIncomeTotals,
  dbGetMonthlyExpenseTotals,
  ExpenseEntryWithCategory,
} from '@core/db/budgetQueries'
import { localDateStr } from '@core/utils/units'

// ── Month nav helpers ─────────────────────────────────────────────────────────

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

// ── Donut chart ───────────────────────────────────────────────────────────────

const SIZE   = 160
const CX     = SIZE / 2
const CY     = SIZE / 2
const R      = 62
const INNER  = 38

function polarToXY(angle: number, r: number) {
  const rad = (angle - 90) * (Math.PI / 180)
  return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) }
}

function arcPath(startAngle: number, endAngle: number): string {
  if (endAngle - startAngle >= 360) endAngle = startAngle + 359.9
  const large = endAngle - startAngle > 180 ? 1 : 0
  const s1    = polarToXY(startAngle, R)
  const e1    = polarToXY(endAngle,   R)
  const s2    = polarToXY(endAngle,   INNER)
  const e2    = polarToXY(startAngle, INNER)
  return [
    `M ${s1.x} ${s1.y}`,
    `A ${R} ${R} 0 ${large} 1 ${e1.x} ${e1.y}`,
    `L ${s2.x} ${s2.y}`,
    `A ${INNER} ${INNER} 0 ${large} 0 ${e2.x} ${e2.y}`,
    'Z',
  ].join(' ')
}

interface DonutSegment { color: string; pct: number; label: string }

function DonutChart({ segments, total }: { segments: DonutSegment[]; total: number }) {
  let angle = 0
  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={SIZE} height={SIZE}>
        {segments.length === 0 ? (
          <Path d={arcPath(0, 359.9)} fill={colors.surface2} />
        ) : (
          segments.map((s, i) => {
            const sweep = s.pct * 360
            const path  = arcPath(angle, angle + sweep)
            angle += sweep
            return <Path key={i} d={path} fill={s.color} />
          })
        )}
        {/* Center label */}
        <SvgText x={CX} y={CY - 6} fill={colors.text} fontSize={14} fontWeight="700" textAnchor="middle">
          €{total.toFixed(0)}
        </SvgText>
        <SvgText x={CX} y={CY + 10} fill={colors.textMuted} fontSize={9} textAnchor="middle">
          total spent
        </SvgText>
      </Svg>
    </View>
  )
}

// ── Day-by-day bar chart ──────────────────────────────────────────────────────

const BAR_H = 100
const BP    = { l: 32, r: 8, t: 8, b: 20 }

function DailySpendChart({ data, daysInMonth, today, year, month }: {
  data: { day: number; total: number }[]
  daysInMonth: number
  today: string
  year: number
  month: number
}) {
  const screenW = Dimensions.get('window').width
  const chartW  = screenW - spacing.lg * 2 - spacing.md * 2
  const innerW  = chartW - BP.l - BP.r
  const innerH  = BAR_H - BP.t - BP.b
  const maxVal  = Math.max(1, ...data.map((d) => d.total))
  const barW    = Math.max(3, (innerW / daysInMonth) * 0.7)
  const gap     = innerW / daysInMonth
  const todayDay = parseInt(today.slice(8), 10)
  const isCurrentMonth =
    year === parseInt(today.slice(0, 4), 10) &&
    month === parseInt(today.slice(5, 7), 10)

  const dataMap: Record<number, number> = {}
  data.forEach((d) => { dataMap[d.day] = d.total })

  return (
    <Svg width={chartW} height={BAR_H}>
      <SvgText x={BP.l - 2} y={BP.t + 6} fill={colors.textMuted} fontSize={8} textAnchor="end">
        €{Math.round(maxVal)}
      </SvgText>
      {Array.from({ length: daysInMonth }, (_, i) => {
        const day   = i + 1
        const total = dataMap[day] ?? 0
        const barH  = total > 0 ? Math.max(2, (total / maxVal) * innerH) : 2
        const x     = BP.l + i * gap + gap / 2 - barW / 2
        const y     = BP.t + innerH - barH
        const isToday = isCurrentMonth && day === todayDay
        return (
          <G key={day}>
            <Rect
              x={x} y={y} width={barW} height={barH} rx={2}
              fill={isToday ? colors.budget : total > 0 ? `${colors.budget}55` : colors.surface2}
            />
            {(day === 1 || day % 5 === 0 || day === daysInMonth) && (
              <SvgText
                x={x + barW / 2} y={BAR_H - BP.b + 12}
                fill={isToday ? colors.budget : colors.textMuted}
                fontSize={7} textAnchor="middle"
                fontWeight={isToday ? '700' : '400'}
              >
                {day}
              </SvgText>
            )}
          </G>
        )
      })}
    </Svg>
  )
}

// ── Annual bar chart ──────────────────────────────────────────────────────────

const ANN_H = 100
const AP    = { l: 36, r: 8, t: 8, b: 20 }

function AnnualChart({ data, currentMonth }: {
  data: { month: number; income: number; spending: number }[]
  currentMonth: number
}) {
  const screenW = Dimensions.get('window').width
  const chartW  = screenW - spacing.lg * 2 - spacing.md * 2
  const innerW  = chartW - AP.l - AP.r
  const innerH  = ANN_H - AP.t - AP.b
  const maxVal  = Math.max(1, ...data.flatMap((d) => [d.income, d.spending]))
  const barW    = Math.max(4, (innerW / 12) * 0.4)
  const gap     = innerW / 12

  return (
    <Svg width={chartW} height={ANN_H}>
      <SvgText x={AP.l - 2} y={AP.t + 6} fill={colors.textMuted} fontSize={8} textAnchor="end">
        €{Math.round(maxVal)}
      </SvgText>
      {data.map((d, i) => {
        const cx    = AP.l + i * gap + gap / 2
        const isCur = d.month === currentMonth
        const incH  = Math.max(2, (d.income   / maxVal) * innerH)
        const spdH  = Math.max(2, (d.spending / maxVal) * innerH)
        return (
          <G key={d.month}>
            <Rect x={cx - barW - 1} y={AP.t + innerH - incH} width={barW} height={incH} rx={2}
              fill={isCur ? colors.success : `${colors.success}55`} />
            <Rect x={cx + 1} y={AP.t + innerH - spdH} width={barW} height={spdH} rx={2}
              fill={isCur ? colors.budget : `${colors.budget}55`} />
            <SvgText x={cx} y={ANN_H - AP.b + 12} fill={isCur ? colors.text : colors.textMuted}
              fontSize={7} textAnchor="middle" fontWeight={isCur ? '700' : '400'}>
              {MONTH_NAMES[d.month - 1]}
            </SvgText>
          </G>
        )
      })}
    </Svg>
  )
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function MonthlyScreen() {
  const router = useRouter()
  const {
    viewYear, viewMonth, setViewMonth,
    totalIncome, totalSpending, netBalance,
    expenseCategories, categorySpending,
    loadMonth, loadCategories,
  } = useBudgetStore()

  const today = localDateStr()
  const nowYear  = parseInt(today.slice(0, 4), 10)
  const nowMonth = parseInt(today.slice(5, 7), 10)

  const [dailySpend, setDailySpend]   = useState<{ day: number; total: number }[]>([])
  const [bigExpense, setBigExpense]   = useState<ExpenseEntryWithCategory | null>(null)
  const [annualData, setAnnualData]   = useState<{ month: number; income: number; spending: number }[]>([])
  const [prevIncome, setPrevIncome]   = useState(0)
  const [prevSpend, setPrevSpend]     = useState(0)

  const isCurrentMonth = viewYear === nowYear && viewMonth === nowMonth

  useEffect(() => {
    loadCategories()
    loadMonth()
  }, [])

  useEffect(() => {
    setDailySpend(dbGetMonthDailySpending(viewYear, viewMonth))
    setBigExpense(dbGetBiggestExpenseForMonth(viewYear, viewMonth))
    setAnnualData(dbGetAnnualOverview(viewYear))

    // Previous month for delta
    const prevM = viewMonth === 1 ? 12 : viewMonth - 1
    const prevY = viewMonth === 1 ? viewYear - 1 : viewYear
    const prevPrefix = `${prevY}-${String(prevM).padStart(2, '0')}`
    const pInc = db_getPrevIncome(prevPrefix)
    const pSpd = db_getPrevSpend(prevPrefix)
    setPrevIncome(pInc)
    setPrevSpend(pSpd)
  }, [viewYear, viewMonth])

  function db_getPrevIncome(prefix: string): number {
    const { dbGetMonthlyIncomeTotals: _ } = require('@core/db/budgetQueries')
    // Use inline query via the imported function family
    return 0 // placeholder — actual data from annualData
  }
  function db_getPrevSpend(prefix: string): number { return 0 }

  // Compute deltas from annualData
  const prevMNum = viewMonth === 1 ? 12 : viewMonth - 1
  const prevMData = annualData.find((d) => d.month === prevMNum)
  const incDelta  = prevMData && prevMData.income   > 0
    ? ((totalIncome   - prevMData.income)   / prevMData.income)   * 100 : null
  const spdDelta  = prevMData && prevMData.spending > 0
    ? ((totalSpending - prevMData.spending) / prevMData.spending) * 100 : null

  function prevMonth() {
    const m = viewMonth === 1 ? 12 : viewMonth - 1
    const y = viewMonth === 1 ? viewYear - 1 : viewYear
    setViewMonth(y, m)
    setDailySpend(dbGetMonthDailySpending(y, m))
    setBigExpense(dbGetBiggestExpenseForMonth(y, m))
  }
  function nextMonth() {
    if (isCurrentMonth) return
    const m = viewMonth === 12 ? 1 : viewMonth + 1
    const y = viewMonth === 12 ? viewYear + 1 : viewYear
    setViewMonth(y, m)
    setDailySpend(dbGetMonthDailySpending(y, m))
    setBigExpense(dbGetBiggestExpenseForMonth(y, m))
  }

  // Donut segments from categories
  const catsWithSpend = expenseCategories
    .map((c) => ({ ...c, total: categorySpending[c.id] ?? 0 }))
    .filter((c) => c.total > 0)
    .sort((a, b) => b.total - a.total)

  const donutSegments = totalSpending > 0
    ? catsWithSpend.map((c) => ({ color: c.color, pct: c.total / totalSpending, label: c.name }))
    : []

  const daysInMonth = new Date(viewYear, viewMonth, 0).getDate()

  // Best / worst months
  const nonZero = annualData.filter((d) => d.spending > 0)
  const bestMonth  = nonZero.reduce<typeof nonZero[0] | null>((b, d) => !b || d.spending < b.spending ? d : b, null)
  const worstMonth = nonZero.reduce<typeof nonZero[0] | null>((w, d) => !w || d.spending > w.spending ? d : w, null)
  const totalSaved = annualData.reduce((s, d) => s + (d.income - d.spending), 0)

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
          Monthly Summary
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>

        {/* Month nav */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.md }}>
          <Pressable onPress={prevMonth} hitSlop={8}>
            <Ionicons name="chevron-back" size={20} color={colors.textMuted} />
          </Pressable>
          <Text style={{ color: colors.text, fontSize: fontSize.body, fontWeight: '600', minWidth: 120, textAlign: 'center' }}>
            {isCurrentMonth ? 'This Month' : `${MONTH_NAMES[viewMonth - 1]} ${viewYear}`}
          </Text>
          <Pressable onPress={nextMonth} hitSlop={8} disabled={isCurrentMonth}>
            <Ionicons name="chevron-forward" size={20} color={isCurrentMonth ? colors.surface2 : colors.textMuted} />
          </Pressable>
        </View>

        {/* Hero numbers */}
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          {[
            { label: 'Income',  value: totalIncome,   color: colors.success, delta: incDelta },
            { label: 'Spent',   value: totalSpending, color: colors.text,    delta: spdDelta },
            { label: 'Net',     value: netBalance,    color: netBalance >= 0 ? colors.success : colors.danger, delta: null },
          ].map(({ label, value, color, delta }) => (
            <View key={label} style={{
              flex: 1, backgroundColor: colors.surface, borderRadius: radius.lg,
              borderWidth: 1, borderColor: colors.border, padding: spacing.md, alignItems: 'center',
            }}>
              <Text style={{ color, fontSize: fontSize.cardTitle, fontWeight: '700' }}>
                {label === 'Net' && value > 0 ? '+' : ''}€{Math.abs(value).toFixed(0)}
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: fontSize.micro, marginTop: 2 }}>{label}</Text>
              {delta != null && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 3 }}>
                  <Ionicons
                    name={delta >= 0 ? 'arrow-up' : 'arrow-down'} size={9}
                    color={label === 'Spent'
                      ? (delta >= 0 ? colors.danger : colors.success)
                      : (delta >= 0 ? colors.success : colors.danger)}
                  />
                  <Text style={{ color: colors.textMuted, fontSize: 9 }}>{Math.abs(delta).toFixed(0)}%</Text>
                </View>
              )}
            </View>
          ))}
        </View>

        {/* Donut + legend */}
        {totalSpending > 0 && (
          <View style={{
            backgroundColor: colors.surface, borderRadius: radius.lg,
            borderWidth: 1, borderColor: colors.border, padding: spacing.md,
            flexDirection: 'row', alignItems: 'center', gap: spacing.md,
          }}>
            <DonutChart segments={donutSegments} total={totalSpending} />
            <View style={{ flex: 1, gap: spacing.xs }}>
              {catsWithSpend.slice(0, 6).map((c) => (
                <View key={c.id} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c.color }} />
                  <Text style={{ flex: 1, color: colors.textMuted, fontSize: fontSize.micro }} numberOfLines={1}>{c.name}</Text>
                  <Text style={{ color: colors.text, fontSize: fontSize.micro, fontWeight: '600' }}>
                    {Math.round((c.total / totalSpending) * 100)}%
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Category list */}
        {catsWithSpend.length > 0 && (
          <View style={{ gap: spacing.xs }}>
            <Text style={{ color: colors.textMuted, fontSize: fontSize.micro, fontWeight: '700' }}>BY CATEGORY</Text>
            {catsWithSpend.map((c) => {
              const limit     = c.monthlyLimit
              const pct       = limit && limit > 0 ? c.total / limit : null
              const barColor  = pct == null ? c.color : pct >= 1 ? colors.danger : pct >= 0.75 ? colors.warning : colors.success
              const remaining = limit ? Math.max(0, limit - c.total) : null
              return (
                <Pressable
                  key={c.id}
                  onPress={() => router.push(`/budget/category-drill?categoryId=${c.id}&year=${viewYear}&month=${viewMonth}` as never)}
                  style={({ pressed }) => ({
                    backgroundColor: colors.surface, borderRadius: radius.md,
                    borderWidth: 1, borderColor: colors.border,
                    padding: spacing.md, opacity: pressed ? 0.85 : 1,
                  })}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: limit ? 8 : 0 }}>
                    <Text style={{ fontSize: 18 }}>{c.emoji}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.text, fontSize: fontSize.label, fontWeight: '500' }}>{c.name}</Text>
                      {limit != null && (
                        <Text style={{ color: colors.textMuted, fontSize: fontSize.micro }}>
                          €{c.total.toFixed(2)} / €{limit.toFixed(0)} — {remaining != null ? `€${remaining.toFixed(0)} left` : ''}
                        </Text>
                      )}
                    </View>
                    <Text style={{ color: colors.text, fontSize: fontSize.label, fontWeight: '700' }}>
                      €{c.total.toFixed(2)}
                    </Text>
                    <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
                  </View>
                  {limit != null && (
                    <View style={{ height: 3, backgroundColor: colors.surface2, borderRadius: radius.full, overflow: 'hidden' }}>
                      <View style={{ width: `${Math.min(100, (pct ?? 0) * 100)}%`, height: '100%', backgroundColor: barColor, borderRadius: radius.full }} />
                    </View>
                  )}
                </Pressable>
              )
            })}
          </View>
        )}

        {/* Biggest expense */}
        {bigExpense && (
          <View style={{
            backgroundColor: `${colors.budget}11`, borderRadius: radius.lg,
            borderWidth: 1, borderColor: `${colors.budget}33`, padding: spacing.md,
          }}>
            <Text style={{ color: colors.textMuted, fontSize: fontSize.micro, fontWeight: '700', marginBottom: spacing.sm }}>
              BIGGEST EXPENSE
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Text style={{ fontSize: 22 }}>{bigExpense.categoryEmoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontSize: fontSize.body, fontWeight: '600' }}>
                  {bigExpense.merchantName ?? bigExpense.categoryName}
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: fontSize.micro }}>
                  {bigExpense.date.slice(5).replace('-', '/')} · {bigExpense.categoryName}
                </Text>
              </View>
              <Text style={{ color: colors.budget, fontSize: fontSize.sectionHeader, fontWeight: '700' }}>
                €{bigExpense.total.toFixed(2)}
              </Text>
            </View>
          </View>
        )}

        {/* Day-by-day spending */}
        <View style={{
          backgroundColor: colors.surface, borderRadius: radius.lg,
          borderWidth: 1, borderColor: colors.border, padding: spacing.md,
        }}>
          <Text style={{ color: colors.text, fontSize: fontSize.cardTitle, fontWeight: '600', marginBottom: spacing.sm }}>
            Daily Spending — {MONTH_NAMES[viewMonth - 1]}
          </Text>
          <DailySpendChart
            data={dailySpend}
            daysInMonth={daysInMonth}
            today={today}
            year={viewYear}
            month={viewMonth}
          />
        </View>

        {/* Annual overview */}
        <View style={{
          backgroundColor: colors.surface, borderRadius: radius.lg,
          borderWidth: 1, borderColor: colors.border, padding: spacing.md, gap: spacing.md,
        }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ color: colors.text, fontSize: fontSize.cardTitle, fontWeight: '600' }}>{viewYear} Overview</Text>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: colors.success }} />
                <Text style={{ color: colors.textMuted, fontSize: fontSize.micro }}>Income</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: colors.budget }} />
                <Text style={{ color: colors.textMuted, fontSize: fontSize.micro }}>Spent</Text>
              </View>
            </View>
          </View>

          <AnnualChart data={annualData} currentMonth={viewMonth} />

          {/* Annual stats */}
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            {totalSaved !== 0 && (
              <View style={{ flex: 1, backgroundColor: colors.surface2, borderRadius: radius.md, padding: spacing.sm, alignItems: 'center' }}>
                <Text style={{ color: totalSaved >= 0 ? colors.success : colors.danger, fontSize: fontSize.cardTitle, fontWeight: '700' }}>
                  {totalSaved >= 0 ? '+' : ''}€{Math.abs(totalSaved).toFixed(0)}
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: fontSize.micro }}>Saved {viewYear}</Text>
              </View>
            )}
            {bestMonth && (
              <View style={{ flex: 1, backgroundColor: colors.surface2, borderRadius: radius.md, padding: spacing.sm, alignItems: 'center' }}>
                <Text style={{ color: colors.success, fontSize: fontSize.cardTitle, fontWeight: '700' }}>
                  {MONTH_NAMES[bestMonth.month - 1]}
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: fontSize.micro }}>Lowest spend</Text>
              </View>
            )}
            {worstMonth && (
              <View style={{ flex: 1, backgroundColor: colors.surface2, borderRadius: radius.md, padding: spacing.sm, alignItems: 'center' }}>
                <Text style={{ color: colors.danger, fontSize: fontSize.cardTitle, fontWeight: '700' }}>
                  {MONTH_NAMES[worstMonth.month - 1]}
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: fontSize.micro }}>Highest spend</Text>
              </View>
            )}
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  )
}
