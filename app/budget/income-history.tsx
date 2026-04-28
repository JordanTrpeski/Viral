import { useEffect, useState } from 'react'
import { View, Text, ScrollView, Pressable, Dimensions, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import Svg, { Rect, Text as SvgText, Line } from 'react-native-svg'
import { colors, fontSize, spacing, radius } from '@core/theme'
import { useBudgetStore } from '@modules/budget/budgetStore'
import {
  dbGetIncomeHistory,
  dbGetIncomeCategoryBreakdown,
  dbGetMonthlyIncomeTotals,
  IncomeEntryWithCategory,
} from '@core/db/budgetQueries'
import { localDateStr } from '@core/utils/units'

// ── Range helpers ─────────────────────────────────────────────────────────────

type Range = 'month' | '30d' | 'year' | 'all'

function fromDate(range: Range): string {
  const now = new Date()
  if (range === 'month') {
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  }
  if (range === '30d') {
    const d = new Date(now)
    d.setDate(d.getDate() - 30)
    return localDateStr(d)
  }
  if (range === 'year') {
    return `${now.getFullYear()}-01-01`
  }
  return '2000-01-01'
}

// ── Bar chart ─────────────────────────────────────────────────────────────────

const CHART_H = 160
const PAD = { l: 44, r: 12, t: 12, b: 32 }

function MonthlyBarChart({ data }: { data: { month: string; total: number }[] }) {
  const screenW = Dimensions.get('window').width
  const chartW  = screenW - spacing.lg * 2 - spacing.md * 2
  if (data.length === 0) return null

  const innerW  = chartW - PAD.l - PAD.r
  const innerH  = CHART_H - PAD.t - PAD.b
  const maxVal  = Math.max(...data.map((d) => d.total)) * 1.1 || 1
  const barW    = Math.max(6, (innerW / data.length) * 0.55)
  const gap     = innerW / data.length
  const curMon  = new Date().toISOString().slice(0, 7)

  return (
    <Svg width={chartW} height={CHART_H}>
      <SvgText x={PAD.l - 4} y={PAD.t + 6} fill={colors.textMuted} fontSize={9} textAnchor="end">
        €{Math.round(maxVal / 1.1)}
      </SvgText>
      <SvgText x={PAD.l - 4} y={CHART_H - PAD.b} fill={colors.textMuted} fontSize={9} textAnchor="end">0</SvgText>

      {data.map((d, i) => {
        const x    = PAD.l + i * gap + gap / 2 - barW / 2
        const barH = (d.total / maxVal) * innerH
        const y    = PAD.t + innerH - barH
        const isNow = d.month === curMon
        return (
          <Svg key={d.month}>
            <Rect x={x} y={y} width={barW} height={Math.max(2, barH)} rx={3}
              fill={isNow ? colors.success : `${colors.success}55`} />
            <SvgText
              x={x + barW / 2} y={CHART_H - PAD.b + 14}
              fill={isNow ? colors.success : colors.textMuted}
              fontSize={8} textAnchor="middle" fontWeight={isNow ? '700' : '400'}
            >
              {d.month.slice(5)}
            </SvgText>
          </Svg>
        )
      })}
    </Svg>
  )
}

// ── Category breakdown row ────────────────────────────────────────────────────

function BreakdownRow({ emoji, name, color, total, pct }: {
  emoji: string; name: string; color: string; total: number; pct: number
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xs }}>
      <Text style={{ fontSize: 16, width: 24 }}>{emoji}</Text>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
          <Text style={{ color: colors.text, fontSize: fontSize.label }}>{name}</Text>
          <Text style={{ color: colors.text, fontSize: fontSize.label, fontWeight: '600' }}>€{total.toFixed(2)}</Text>
        </View>
        <View style={{ height: 3, backgroundColor: colors.surface2, borderRadius: radius.full, overflow: 'hidden' }}>
          <View style={{ width: `${Math.min(100, pct * 100)}%`, height: '100%', backgroundColor: color, borderRadius: radius.full }} />
        </View>
      </View>
      <Text style={{ color: colors.textMuted, fontSize: fontSize.micro, width: 32, textAlign: 'right' }}>
        {Math.round(pct * 100)}%
      </Text>
    </View>
  )
}

// ── Entry row ─────────────────────────────────────────────────────────────────

function EntryRow({ entry, onDelete }: { entry: IncomeEntryWithCategory; onDelete: () => void }) {
  function confirmDelete() {
    Alert.alert('Delete entry?', `${entry.sourceName} — €${entry.amount.toFixed(2)}`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: onDelete },
    ])
  }
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
      backgroundColor: colors.surface, borderRadius: radius.md,
      borderWidth: 1, borderColor: colors.border, padding: spacing.sm,
    }}>
      <Text style={{ fontSize: 18 }}>{entry.categoryEmoji}</Text>
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.text, fontSize: fontSize.label, fontWeight: '500' }} numberOfLines={1}>
          {entry.sourceName}
        </Text>
        <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: 2 }}>
          <Text style={{ color: colors.textMuted, fontSize: fontSize.micro }}>{entry.date.slice(5).replace('-', '/')}</Text>
          {entry.isRecurring && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
              <Ionicons name="repeat" size={10} color={colors.textMuted} />
              <Text style={{ color: colors.textMuted, fontSize: fontSize.micro }}>{entry.recurrencePeriod}</Text>
            </View>
          )}
          {entry.note && <Text style={{ color: colors.textMuted, fontSize: fontSize.micro }} numberOfLines={1}>{entry.note}</Text>}
        </View>
      </View>
      <Text style={{ color: colors.success, fontSize: fontSize.label, fontWeight: '700' }}>+€{entry.amount.toFixed(2)}</Text>
      <Pressable onPress={confirmDelete} hitSlop={8} style={{ padding: spacing.xs }}>
        <Ionicons name="trash-outline" size={16} color={colors.textMuted} />
      </Pressable>
    </View>
  )
}

// ── Main screen ───────────────────────────────────────────────────────────────

const RANGE_LABELS: { value: Range; label: string }[] = [
  { value: 'month', label: 'This Month' },
  { value: '30d',   label: 'Last 30d' },
  { value: 'year',  label: 'This Year' },
  { value: 'all',   label: 'All Time' },
]

export default function IncomeHistoryScreen() {
  const router = useRouter()
  const { incomeCategories, removeIncome, viewYear, viewMonth } = useBudgetStore()

  const [range, setRange]         = useState<Range>('month')
  const [catFilter, setCatFilter] = useState<string | null>(null)
  const [entries, setEntries]     = useState<IncomeEntryWithCategory[]>([])
  const [breakdown, setBreakdown] = useState<{ categoryId: string; categoryName: string; categoryEmoji: string; categoryColor: string; total: number }[]>([])
  const [monthlyTotals, setMonthlyTotals] = useState<{ month: string; total: number }[]>([])

  useEffect(() => {
    const from = fromDate(range)
    setEntries(dbGetIncomeHistory(catFilter, from))
  }, [range, catFilter])

  useEffect(() => {
    setBreakdown(dbGetIncomeCategoryBreakdown(viewYear, viewMonth))
    const raw = dbGetMonthlyIncomeTotals(6)
    setMonthlyTotals([...raw].reverse())
  }, [])

  const totalFiltered = entries.reduce((s, e) => s + e.amount, 0)
  const breakdownTotal = breakdown.reduce((s, r) => s + r.total, 0)

  const now = new Date()
  const curMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const prevMonth = (() => {
    const d = new Date(now)
    d.setMonth(d.getMonth() - 1)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })()
  const curTotal  = monthlyTotals.find((m) => m.month === curMonth)?.total ?? 0
  const prevTotal = monthlyTotals.find((m) => m.month === prevMonth)?.total ?? 0
  const delta     = prevTotal > 0 ? ((curTotal - prevTotal) / prevTotal) * 100 : null

  function handleDelete(entry: IncomeEntryWithCategory) {
    removeIncome(entry.id)
    const from = fromDate(range)
    setEntries(dbGetIncomeHistory(catFilter, from))
    setBreakdown(dbGetIncomeCategoryBreakdown(viewYear, viewMonth))
  }

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
          Income History
        </Text>
        <Pressable
          onPress={() => router.push('/budget/add-income' as never)}
          style={{ padding: spacing.sm }}
        >
          <Ionicons name="add" size={24} color={colors.success} />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>

        {/* Summary card */}
        <View style={{
          backgroundColor: colors.surface, borderRadius: radius.lg,
          borderWidth: 1, borderColor: colors.border, padding: spacing.md, gap: spacing.sm,
        }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View>
              <Text style={{ color: colors.textMuted, fontSize: fontSize.label }}>This Month</Text>
              <Text style={{ color: colors.success, fontSize: 28, fontWeight: '700' }}>€{curTotal.toFixed(2)}</Text>
            </View>
            {delta != null && (
              <View style={{
                flexDirection: 'row', alignItems: 'center', gap: 4,
                backgroundColor: delta >= 0 ? `${colors.success}22` : `${colors.danger}22`,
                borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 4,
              }}>
                <Ionicons
                  name={delta >= 0 ? 'arrow-up' : 'arrow-down'}
                  size={12}
                  color={delta >= 0 ? colors.success : colors.danger}
                />
                <Text style={{ color: delta >= 0 ? colors.success : colors.danger, fontSize: fontSize.label, fontWeight: '600' }}>
                  {Math.abs(delta).toFixed(1)}% vs last month
                </Text>
              </View>
            )}
          </View>

          {/* 6-month bar chart */}
          {monthlyTotals.length > 0 && <MonthlyBarChart data={monthlyTotals} />}

          {/* Category breakdown */}
          {breakdown.length > 0 && (
            <View style={{ gap: 2, marginTop: spacing.xs }}>
              <Text style={{ color: colors.textMuted, fontSize: fontSize.micro, marginBottom: spacing.xs }}>BY CATEGORY</Text>
              {breakdown.map((b) => (
                <BreakdownRow
                  key={b.categoryId}
                  emoji={b.categoryEmoji}
                  name={b.categoryName}
                  color={b.categoryColor}
                  total={b.total}
                  pct={breakdownTotal > 0 ? b.total / breakdownTotal : 0}
                />
              ))}
            </View>
          )}
        </View>

        {/* Range filter */}
        <View style={{ flexDirection: 'row', backgroundColor: colors.surface2, borderRadius: radius.sm, padding: 2, alignSelf: 'stretch' }}>
          {RANGE_LABELS.map((r) => (
            <Pressable
              key={r.value}
              onPress={() => setRange(r.value)}
              style={{
                flex: 1, paddingVertical: spacing.xs,
                borderRadius: radius.sm - 2,
                backgroundColor: range === r.value ? colors.surface : 'transparent',
                alignItems: 'center',
              }}
            >
              <Text style={{ color: range === r.value ? colors.text : colors.textMuted, fontSize: fontSize.micro, fontWeight: '600' }}>
                {r.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Category filter chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.xs }}>
          <Pressable
            onPress={() => setCatFilter(null)}
            style={{
              paddingHorizontal: spacing.sm + 2, paddingVertical: spacing.xs,
              borderRadius: radius.full,
              backgroundColor: catFilter === null ? colors.success : colors.surface2,
            }}
          >
            <Text style={{ color: catFilter === null ? '#fff' : colors.textMuted, fontSize: fontSize.label, fontWeight: '600' }}>All</Text>
          </Pressable>
          {incomeCategories.map((c) => (
            <Pressable
              key={c.id}
              onPress={() => setCatFilter(catFilter === c.id ? null : c.id)}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 4,
                paddingHorizontal: spacing.sm + 2, paddingVertical: spacing.xs,
                borderRadius: radius.full,
                backgroundColor: catFilter === c.id ? `${c.color}22` : colors.surface2,
                borderWidth: 1,
                borderColor: catFilter === c.id ? c.color : 'transparent',
              }}
            >
              <Text style={{ fontSize: 12 }}>{c.emoji}</Text>
              <Text style={{ color: catFilter === c.id ? c.color : colors.textMuted, fontSize: fontSize.label, fontWeight: '500' }}>
                {c.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Total for filter */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ color: colors.textMuted, fontSize: fontSize.label }}>{entries.length} entries</Text>
          <Text style={{ color: colors.success, fontSize: fontSize.body, fontWeight: '700' }}>€{totalFiltered.toFixed(2)}</Text>
        </View>

        {/* Entry list */}
        {entries.length > 0 ? (
          <View style={{ gap: spacing.xs }}>
            {entries.map((e) => (
              <EntryRow key={e.id} entry={e} onDelete={() => handleDelete(e)} />
            ))}
          </View>
        ) : (
          <View style={{ alignItems: 'center', paddingVertical: spacing.xxl, gap: spacing.md }}>
            <Ionicons name="cash-outline" size={40} color={colors.textMuted} />
            <Text style={{ color: colors.textMuted, fontSize: fontSize.body }}>No income entries found</Text>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  )
}
