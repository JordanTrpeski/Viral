import React, { useEffect, useState, useCallback } from 'react'
import {
  View, Text, ScrollView, Pressable, TextInput, Dimensions, Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { MMKV } from 'react-native-mmkv'
import Svg, { Rect, Line, Text as SvgText } from 'react-native-svg'
import { colors, fontSize, spacing, radius } from '@core/theme'
import { useBudgetStore } from '@modules/budget/budgetStore'
import {
  dbGetAllTimeBalance,
  dbGetMonthlyNetHistory,
} from '@core/db/budgetQueries'

const mmkv = new MMKV({ id: 'budget-balance' })
const KEY_GOAL_AMOUNT = 'savings_goal_amount'
const KEY_GOAL_TYPE   = 'savings_goal_type'   // 'fixed' | 'percent'

const { width: SCREEN_W } = Dimensions.get('window')
const CHART_W = SCREEN_W - spacing.md * 4
const CHART_H = 110
const BAR_GAP = 6

const MONTH_LABELS = ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

// ── Net bar chart ──────────────────────────────────────────────────────────────

function NetBarChart({ data }: { data: { month: string; net: number }[] }) {
  if (data.length === 0) return null

  const maxAbs = Math.max(...data.map(d => Math.abs(d.net)), 1)
  const barW   = Math.floor((CHART_W - (data.length - 1) * BAR_GAP) / data.length)
  const midY   = CHART_H / 2

  return (
    <Svg width={CHART_W} height={CHART_H + 24}>
      {/* zero line */}
      <Line
        x1={0} y1={midY}
        x2={CHART_W} y2={midY}
        stroke={colors.border} strokeWidth={1}
      />
      {data.map((d, i) => {
        const x       = i * (barW + BAR_GAP)
        const pct     = Math.abs(d.net) / maxAbs
        const barH    = Math.max(pct * (CHART_H / 2 - 4), 2)
        const isPos   = d.net >= 0
        const y       = isPos ? midY - barH : midY
        const fill    = isPos ? colors.success : colors.danger
        const [, mm]  = d.month.split('-')
        return (
          <React.Fragment key={d.month}>
            <Rect x={x} y={y} width={barW} height={barH} rx={2} fill={fill} opacity={0.85} />
            <SvgText
              x={x + barW / 2} y={CHART_H + 16}
              fontSize={9} fill={colors.textMuted} textAnchor="middle"
            >
              {MONTH_LABELS[parseInt(mm)]}
            </SvgText>
          </React.Fragment>
        )
      })}
    </Svg>
  )
}

// ── Savings goal editor ────────────────────────────────────────────────────────

function GoalEditor({
  goalType, goalAmount, onSave, onClose,
}: {
  goalType: 'fixed' | 'percent'
  goalAmount: number
  onSave: (type: 'fixed' | 'percent', amount: number) => void
  onClose: () => void
}) {
  const [type,   setType]   = useState<'fixed' | 'percent'>(goalType)
  const [amount, setAmount] = useState(goalAmount > 0 ? String(goalAmount) : '')

  function save() {
    const val = parseFloat(amount)
    if (!val || val <= 0) { Alert.alert('Enter a valid amount'); return }
    if (type === 'percent' && val > 100) { Alert.alert('Percentage must be ≤ 100'); return }
    onSave(type, val)
    onClose()
  }

  return (
    <View style={{
      backgroundColor: colors.surface, borderRadius: radius.lg,
      padding: spacing.md, gap: spacing.sm,
      marginHorizontal: spacing.md, marginTop: spacing.md,
    }}>
      <Text style={{ color: colors.text, fontSize: fontSize.body, fontWeight: '700' }}>
        Set Savings Goal
      </Text>

      {/* Type toggle */}
      <View style={{ flexDirection: 'row', gap: spacing.xs }}>
        {(['fixed', 'percent'] as const).map(t => (
          <Pressable
            key={t}
            onPress={() => setType(t)}
            style={{
              flex: 1, paddingVertical: 8,
              borderRadius: radius.full,
              backgroundColor: type === t ? colors.budget : colors.surface2,
              alignItems: 'center',
            }}
          >
            <Text style={{
              color: type === t ? '#000' : colors.textMuted,
              fontSize: fontSize.label, fontWeight: '600',
            }}>
              {t === 'fixed' ? '€ Fixed Amount' : '% of Income'}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Amount input */}
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: colors.surface2, borderRadius: radius.md, paddingHorizontal: spacing.sm,
      }}>
        <Text style={{ color: colors.textMuted, fontSize: fontSize.body, marginRight: 4 }}>
          {type === 'fixed' ? '€' : '%'}
        </Text>
        <TextInput
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          placeholder={type === 'fixed' ? '500' : '20'}
          placeholderTextColor={colors.textMuted}
          style={{ flex: 1, color: colors.text, fontSize: fontSize.body, paddingVertical: spacing.sm }}
        />
      </View>

      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <Pressable
          onPress={onClose}
          style={{
            flex: 1, paddingVertical: spacing.sm,
            borderRadius: radius.md, backgroundColor: colors.surface2, alignItems: 'center',
          }}
        >
          <Text style={{ color: colors.textMuted, fontSize: fontSize.body }}>Cancel</Text>
        </Pressable>
        <Pressable
          onPress={save}
          style={{
            flex: 1, paddingVertical: spacing.sm,
            borderRadius: radius.md, backgroundColor: colors.budget, alignItems: 'center',
          }}
        >
          <Text style={{ color: '#000', fontSize: fontSize.body, fontWeight: '700' }}>Save Goal</Text>
        </Pressable>
      </View>
    </View>
  )
}

// ── Main screen ────────────────────────────────────────────────────────────────

export default function BalanceScreen() {
  const router = useRouter()
  const { viewYear, viewMonth, totalIncome, totalSpending, projectedIncome } = useBudgetStore()

  const [allTimeIncome,   setAllTimeIncome]   = useState(0)
  const [allTimeSpending, setAllTimeSpending] = useState(0)
  const [netHistory,      setNetHistory]      = useState<{ month: string; net: number }[]>([])
  const [showGoalEditor,  setShowGoalEditor]  = useState(false)

  // Savings goal from MMKV
  const [goalType,   setGoalType]   = useState<'fixed' | 'percent'>(
    (mmkv.getString(KEY_GOAL_TYPE) as 'fixed' | 'percent') ?? 'fixed',
  )
  const [goalAmount, setGoalAmount] = useState(
    parseFloat(mmkv.getString(KEY_GOAL_AMOUNT) ?? '0') || 0,
  )

  const load = useCallback(() => {
    const bal = dbGetAllTimeBalance()
    setAllTimeIncome(bal.totalIncome)
    setAllTimeSpending(bal.totalSpending)
    const hist = dbGetMonthlyNetHistory(6)
    setNetHistory(hist.map(h => ({ month: h.month, net: h.net })))
  }, [])

  useEffect(() => { load() }, [load])

  function saveGoal(type: 'fixed' | 'percent', amount: number) {
    mmkv.set(KEY_GOAL_TYPE, type)
    mmkv.set(KEY_GOAL_AMOUNT, String(amount))
    setGoalType(type)
    setGoalAmount(amount)
  }

  function clearGoal() {
    Alert.alert('Remove goal?', 'This will delete your savings goal.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          mmkv.delete(KEY_GOAL_TYPE)
          mmkv.delete(KEY_GOAL_AMOUNT)
          setGoalAmount(0)
        },
      },
    ])
  }

  // Derived values
  const runningBalance = allTimeIncome - allTimeSpending
  const moneyLeft      = totalIncome - totalSpending
  const savingsRate    = totalIncome > 0
    ? Math.max(0, ((totalIncome - totalSpending) / totalIncome) * 100)
    : 0

  // Projected end-of-month: current income + pending recurring − spending
  const projected = projectedIncome - totalSpending

  // Goal progress
  const goalTarget = goalAmount > 0
    ? (goalType === 'fixed' ? goalAmount : totalIncome * (goalAmount / 100))
    : 0
  const goalPct    = goalTarget > 0 ? Math.min(1, moneyLeft / goalTarget) : 0
  const goalMet    = goalTarget > 0 && moneyLeft >= goalTarget

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
        <Text style={{ color: colors.text, fontSize: fontSize.sectionHeader, fontWeight: '700', flex: 1 }}>
          Balance Overview
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 48 }}>

        {/* Running balance hero */}
        <View style={{
          marginHorizontal: spacing.md, marginTop: spacing.sm,
          backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md,
          borderLeftWidth: 4,
          borderLeftColor: runningBalance >= 0 ? colors.success : colors.danger,
        }}>
          <Text style={{ color: colors.textMuted, fontSize: fontSize.micro, marginBottom: 4 }}>
            Running Balance (all time)
          </Text>
          <Text style={{
            color: runningBalance >= 0 ? colors.success : colors.danger,
            fontSize: 36, fontWeight: '700',
          }}>
            {runningBalance >= 0 ? '+' : '-'}€{Math.abs(runningBalance).toFixed(2)}
          </Text>
          <View style={{ flexDirection: 'row', gap: spacing.lg, marginTop: spacing.sm }}>
            <View>
              <Text style={{ color: colors.textMuted, fontSize: fontSize.micro }}>Total earned</Text>
              <Text style={{ color: colors.success, fontSize: fontSize.label, fontWeight: '600' }}>
                €{allTimeIncome.toFixed(2)}
              </Text>
            </View>
            <View>
              <Text style={{ color: colors.textMuted, fontSize: fontSize.micro }}>Total spent</Text>
              <Text style={{ color: colors.text, fontSize: fontSize.label, fontWeight: '600' }}>
                €{allTimeSpending.toFixed(2)}
              </Text>
            </View>
          </View>
        </View>

        {/* This month stats */}
        <View style={{
          marginHorizontal: spacing.md, marginTop: spacing.sm,
          flexDirection: 'row', gap: spacing.sm,
        }}>
          {/* Money left */}
          <View style={{
            flex: 1, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md,
          }}>
            <Text style={{ color: colors.textMuted, fontSize: fontSize.micro, marginBottom: 4 }}>
              Left this month
            </Text>
            <Text style={{
              color: moneyLeft >= 0 ? colors.success : colors.danger,
              fontSize: fontSize.cardTitle, fontWeight: '700',
            }}>
              {moneyLeft >= 0 ? '' : '-'}€{Math.abs(moneyLeft).toFixed(2)}
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: fontSize.micro, marginTop: 2 }}>
              of €{totalIncome.toFixed(2)} income
            </Text>
          </View>

          {/* Savings rate */}
          <View style={{
            flex: 1, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md,
          }}>
            <Text style={{ color: colors.textMuted, fontSize: fontSize.micro, marginBottom: 4 }}>
              Savings rate
            </Text>
            <Text style={{
              color: savingsRate >= 20 ? colors.success : savingsRate >= 5 ? colors.warning : colors.danger,
              fontSize: fontSize.cardTitle, fontWeight: '700',
            }}>
              {savingsRate.toFixed(1)}%
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: fontSize.micro, marginTop: 2 }}>
              of income saved
            </Text>
          </View>
        </View>

        {/* Projected end-of-month */}
        <View style={{
          marginHorizontal: spacing.md, marginTop: spacing.sm,
          backgroundColor: colors.surface, borderRadius: radius.lg,
          padding: spacing.md, flexDirection: 'row', alignItems: 'center',
        }}>
          <Ionicons name="trending-up-outline" size={22} color={colors.textMuted} style={{ marginRight: spacing.sm }} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.textMuted, fontSize: fontSize.micro }}>
              Projected end-of-month
            </Text>
            <Text style={{
              color: projected >= 0 ? colors.success : colors.danger,
              fontSize: fontSize.body, fontWeight: '700', marginTop: 2,
            }}>
              {projected >= 0 ? '+' : '-'}€{Math.abs(projected).toFixed(2)}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ color: colors.textMuted, fontSize: fontSize.micro }}>Projected income</Text>
            <Text style={{ color: colors.text, fontSize: fontSize.label, fontWeight: '600' }}>
              €{projectedIncome.toFixed(2)}
            </Text>
          </View>
        </View>

        {/* 6-month net chart */}
        {netHistory.length > 0 && (
          <View style={{
            marginHorizontal: spacing.md, marginTop: spacing.sm,
            backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md,
          }}>
            <Text style={{ color: colors.text, fontSize: fontSize.body, fontWeight: '600', marginBottom: spacing.sm }}>
              Monthly Net (last 6 months)
            </Text>
            <View style={{ alignItems: 'center' }}>
              <NetBarChart data={netHistory} />
            </View>
            <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: colors.success }} />
                <Text style={{ color: colors.textMuted, fontSize: fontSize.micro }}>Saved</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: colors.danger }} />
                <Text style={{ color: colors.textMuted, fontSize: fontSize.micro }}>Over budget</Text>
              </View>
            </View>
          </View>
        )}

        {/* Savings goal */}
        <View style={{
          marginHorizontal: spacing.md, marginTop: spacing.sm,
          backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
            <Text style={{ color: colors.text, fontSize: fontSize.body, fontWeight: '600', flex: 1 }}>
              Savings Goal
            </Text>
            {goalAmount > 0 ? (
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <Pressable onPress={() => setShowGoalEditor(true)} hitSlop={8}>
                  <Ionicons name="pencil-outline" size={18} color={colors.textMuted} />
                </Pressable>
                <Pressable onPress={clearGoal} hitSlop={8}>
                  <Ionicons name="trash-outline" size={18} color={colors.danger} />
                </Pressable>
              </View>
            ) : (
              <Pressable
                onPress={() => setShowGoalEditor(true)}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 4,
                  backgroundColor: colors.budget, borderRadius: radius.full,
                  paddingHorizontal: spacing.sm, paddingVertical: 4,
                }}
              >
                <Ionicons name="add" size={14} color="#000" />
                <Text style={{ color: '#000', fontSize: fontSize.micro, fontWeight: '700' }}>Set Goal</Text>
              </Pressable>
            )}
          </View>

          {goalAmount > 0 ? (
            <>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text style={{ color: colors.textMuted, fontSize: fontSize.micro }}>
                  {goalType === 'fixed'
                    ? `€${moneyLeft.toFixed(2)} of €${goalTarget.toFixed(0)}`
                    : `€${moneyLeft.toFixed(2)} of €${goalTarget.toFixed(0)} (${goalAmount}% of income)`
                  }
                </Text>
                <Text style={{
                  color: goalMet ? colors.success : colors.textMuted,
                  fontSize: fontSize.micro, fontWeight: '600',
                }}>
                  {goalMet ? '✓ Goal met!' : `${(goalPct * 100).toFixed(0)}%`}
                </Text>
              </View>
              <View style={{ height: 8, backgroundColor: colors.surface2, borderRadius: 4 }}>
                <View style={{
                  height: 8,
                  width: `${Math.min(100, goalPct * 100)}%`,
                  backgroundColor: goalMet ? colors.success : colors.budget,
                  borderRadius: 4,
                }} />
              </View>
              {!goalMet && goalTarget > moneyLeft && (
                <Text style={{ color: colors.textMuted, fontSize: fontSize.micro, marginTop: 6 }}>
                  €{(goalTarget - moneyLeft).toFixed(2)} still needed to reach goal
                </Text>
              )}
            </>
          ) : (
            <Text style={{ color: colors.textMuted, fontSize: fontSize.micro }}>
              Set a monthly savings target to track your progress here.
            </Text>
          )}
        </View>

        {/* Goal editor inline */}
        {showGoalEditor && (
          <GoalEditor
            goalType={goalType}
            goalAmount={goalAmount}
            onSave={saveGoal}
            onClose={() => setShowGoalEditor(false)}
          />
        )}

      </ScrollView>
    </SafeAreaView>
  )
}
