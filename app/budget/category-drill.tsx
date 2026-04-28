import React, { useEffect, useState, useCallback } from 'react'
import { View, Text, ScrollView, Pressable, Dimensions } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import Svg, { Rect, Text as SvgText, Line } from 'react-native-svg'
import { colors, fontSize, spacing, radius } from '@core/theme'
import { useBudgetStore } from '@modules/budget/budgetStore'
import {
  dbGetCategoryTransactions,
  dbGetCategoryMonthlyTrend,
  ExpenseEntryWithCategory,
} from '@core/db/budgetQueries'
import { localDateStr } from '@core/utils/units'

const { width: SCREEN_W } = Dimensions.get('window')

// ── Date helpers ───────────────────────────────────────────────────────────────

function toISO(d: Date): string { return localDateStr(d) }

function monthStart(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}-01`
}

function monthEnd(year: number, month: number): string {
  const d = new Date(year, month, 0)
  return toISO(d)
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-')
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${parseInt(d)} ${months[parseInt(m) - 1]} ${y}`
}

const PM_EMOJI: Record<string, string> = { cash: '💵', card: '💳', online: '🌐' }

// ── Range options ──────────────────────────────────────────────────────────────

type Range = 'month' | 'last30' | 'year'

const RANGE_LABELS: Record<Range, string> = {
  month: 'This Month',
  last30: 'Last 30 Days',
  year: 'This Year',
}

function getRangeDates(range: Range, year: number, month: number): { start: string; end: string } {
  const today = toISO(new Date())
  if (range === 'month') {
    return { start: monthStart(year, month), end: monthEnd(year, month) }
  }
  if (range === 'last30') {
    const d = new Date()
    d.setDate(d.getDate() - 29)
    return { start: toISO(d), end: today }
  }
  // year
  return { start: `${year}-01-01`, end: `${year}-12-31` }
}

// ── Trend chart ────────────────────────────────────────────────────────────────

const CHART_H = 100
const CHART_SIDE_PAD = spacing.md

function TrendChart({ data, color }: { data: { month: string; total: number }[]; color: string }) {
  if (data.length === 0) return null
  const chartW = SCREEN_W - spacing.md * 2 - CHART_SIDE_PAD * 2
  const maxVal = Math.max(...data.map(d => d.total), 1)
  const barW = Math.floor((chartW - (data.length - 1) * 6) / data.length)
  const avg = data.reduce((s, d) => s + d.total, 0) / data.length

  return (
    <Svg width={chartW + CHART_SIDE_PAD * 2} height={CHART_H + 28}>
      {/* avg line */}
      {data.length > 1 && (
        <Line
          x1={CHART_SIDE_PAD}
          y1={CHART_H - (avg / maxVal) * CHART_H + 4}
          x2={CHART_SIDE_PAD + chartW}
          y2={CHART_H - (avg / maxVal) * CHART_H + 4}
          stroke={colors.textMuted}
          strokeWidth={1}
          strokeDasharray="3,3"
        />
      )}
      {data.map((d, i) => {
        const barH = Math.max((d.total / maxVal) * CHART_H, 2)
        const x = CHART_SIDE_PAD + i * (barW + 6)
        const y = 4 + CHART_H - barH
        const label = d.month.slice(5) // MM
        const months = ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
        return (
          <React.Fragment key={d.month}>
            <Rect x={x} y={y} width={barW} height={barH} rx={3} fill={color} opacity={0.85} />
            <SvgText
              x={x + barW / 2}
              y={CHART_H + 18}
              fontSize={10}
              fill={colors.textMuted}
              textAnchor="middle"
            >
              {months[parseInt(label)]}
            </SvgText>
          </React.Fragment>
        )
      })}
    </Svg>
  )
}

// ── Main screen ────────────────────────────────────────────────────────────────

export default function CategoryDrillScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{ categoryId: string; year: string; month: string }>()
  const categoryId = params.categoryId ?? ''
  const year  = parseInt(params.year  ?? String(new Date().getFullYear()))
  const month = parseInt(params.month ?? String(new Date().getMonth() + 1))

  const { allCategories } = useBudgetStore()
  const category = allCategories.find(c => c.id === categoryId)

  const [range, setRange]         = useState<Range>('month')
  const [transactions, setTxns]   = useState<ExpenseEntryWithCategory[]>([])
  const [trend, setTrend]         = useState<{ month: string; total: number }[]>([])
  const [totalSpent, setTotal]    = useState(0)
  const [avgMonthly, setAvg]      = useState(0)

  const load = useCallback(() => {
    if (!categoryId) return
    const { start, end } = getRangeDates(range, year, month)
    const txns = dbGetCategoryTransactions(categoryId, start, end)
    setTxns(txns)
    setTotal(txns.reduce((s, t) => s + t.total, 0))

    const trendData = dbGetCategoryMonthlyTrend(categoryId, 6)
    setTrend(trendData)
    const avg = trendData.length > 0
      ? trendData.reduce((s, d) => s + d.total, 0) / trendData.length
      : 0
    setAvg(avg)
  }, [categoryId, range, year, month])

  useEffect(() => { load() }, [load])

  const catColor = category?.color ?? colors.budget
  const catEmoji = category?.emoji ?? '📦'
  const catName  = category?.name  ?? 'Category'
  const limit    = category?.monthlyLimit ?? null

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      {/* Header */}
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
      }}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={{ marginRight: spacing.sm }}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <View style={{
          width: 36, height: 36, borderRadius: 18,
          backgroundColor: catColor + '22',
          alignItems: 'center', justifyContent: 'center',
          marginRight: spacing.sm,
        }}>
          <Text style={{ fontSize: 18 }}>{catEmoji}</Text>
        </View>
        <Text style={{ color: colors.text, fontSize: fontSize.sectionHeader, fontWeight: '700', flex: 1 }}>
          {catName}
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>

        {/* Hero */}
        <View style={{
          marginHorizontal: spacing.md, marginTop: spacing.sm,
          backgroundColor: colors.surface,
          borderRadius: radius.lg, padding: spacing.md,
          borderLeftWidth: 4, borderLeftColor: catColor,
        }}>
          <Text style={{ color: colors.textMuted, fontSize: fontSize.micro, marginBottom: 4 }}>
            Total spent
          </Text>
          <Text style={{ color: colors.text, fontSize: 32, fontWeight: '700' }}>
            €{totalSpent.toFixed(2)}
          </Text>
          {limit !== null && (
            <View style={{ marginTop: spacing.sm }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text style={{ color: colors.textMuted, fontSize: fontSize.micro }}>
                  {((totalSpent / limit) * 100).toFixed(0)}% of €{limit.toFixed(0)} limit
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: fontSize.micro }}>
                  €{Math.max(0, limit - totalSpent).toFixed(2)} left
                </Text>
              </View>
              <View style={{ height: 4, backgroundColor: colors.surface2, borderRadius: 2 }}>
                <View style={{
                  height: 4,
                  width: `${Math.min(100, (totalSpent / limit) * 100)}%`,
                  backgroundColor: totalSpent >= limit ? colors.error : catColor,
                  borderRadius: 2,
                }} />
              </View>
            </View>
          )}
          {avgMonthly > 0 && (
            <Text style={{ color: colors.textMuted, fontSize: fontSize.micro, marginTop: spacing.sm }}>
              Avg monthly: €{avgMonthly.toFixed(2)}
            </Text>
          )}
        </View>

        {/* Range filter */}
        <View style={{
          flexDirection: 'row', gap: spacing.xs,
          marginHorizontal: spacing.md, marginTop: spacing.md,
        }}>
          {(Object.keys(RANGE_LABELS) as Range[]).map(r => (
            <Pressable
              key={r}
              onPress={() => setRange(r)}
              style={{
                flex: 1, paddingVertical: 7,
                borderRadius: radius.full,
                backgroundColor: range === r ? catColor : colors.surface,
                alignItems: 'center',
              }}
            >
              <Text style={{
                color: range === r ? '#fff' : colors.textMuted,
                fontSize: fontSize.micro, fontWeight: '600',
              }}>
                {RANGE_LABELS[r]}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* 6-month trend */}
        {trend.length > 1 && (
          <View style={{
            marginHorizontal: spacing.md, marginTop: spacing.md,
            backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md,
          }}>
            <Text style={{ color: colors.text, fontSize: fontSize.body, fontWeight: '600', marginBottom: spacing.sm }}>
              6-Month Trend
            </Text>
            <TrendChart data={trend} color={catColor} />
          </View>
        )}

        {/* Transactions */}
        <View style={{ marginHorizontal: spacing.md, marginTop: spacing.md }}>
          <Text style={{ color: colors.text, fontSize: fontSize.body, fontWeight: '600', marginBottom: spacing.sm }}>
            {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
          </Text>

          {transactions.length === 0 ? (
            <View style={{
              backgroundColor: colors.surface, borderRadius: radius.lg,
              padding: spacing.lg, alignItems: 'center',
            }}>
              <Text style={{ fontSize: 32, marginBottom: spacing.sm }}>🔍</Text>
              <Text style={{ color: colors.textMuted, fontSize: fontSize.body, textAlign: 'center' }}>
                No transactions in this range
              </Text>
            </View>
          ) : (
            transactions.map((tx, idx) => (
              <View
                key={tx.id}
                style={{
                  backgroundColor: colors.surface,
                  borderRadius: radius.lg,
                  padding: spacing.md,
                  marginBottom: spacing.xs,
                  flexDirection: 'row',
                  alignItems: 'center',
                  borderTopWidth: idx === 0 ? 0 : 0,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontSize: fontSize.body, fontWeight: '600' }}>
                    {tx.merchantName ?? catName}
                  </Text>
                  <Text style={{ color: colors.textMuted, fontSize: fontSize.micro, marginTop: 2 }}>
                    {formatDate(tx.date)}
                    {tx.paymentMethod ? `  ${PM_EMOJI[tx.paymentMethod] ?? ''} ${tx.paymentMethod}` : ''}
                  </Text>
                  {tx.note ? (
                    <Text style={{ color: colors.textMuted, fontSize: fontSize.micro, marginTop: 2 }} numberOfLines={1}>
                      {tx.note}
                    </Text>
                  ) : null}
                </View>
                <Text style={{ color: colors.text, fontSize: fontSize.body, fontWeight: '700' }}>
                  €{tx.total.toFixed(2)}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
