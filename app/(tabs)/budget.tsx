import { useEffect, useState } from 'react'
import { View, Text, ScrollView, Pressable, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { colors, fontSize, spacing, radius } from '@core/theme'
import { useBudgetStore } from '@modules/budget/budgetStore'
import { dbGetDailyTotals } from '@core/db/budgetQueries'
import type { RecurringIncomeSummary } from '@core/db/budgetQueries'

// ── Month header ───────────────────────────────────────────────────────────────

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function MonthNav({ year, month, onPrev, onNext }: {
  year: number; month: number; onPrev: () => void; onNext: () => void
}) {
  const now = new Date()
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
      <Pressable onPress={onPrev} hitSlop={8}>
        <Ionicons name="chevron-back" size={20} color={colors.textMuted} />
      </Pressable>
      <Text style={{ color: colors.text, fontSize: fontSize.sectionHeader, fontWeight: '600', minWidth: 96, textAlign: 'center' }}>
        {MONTHS[month - 1]} {year}
      </Text>
      <Pressable onPress={onNext} hitSlop={8} disabled={isCurrentMonth}>
        <Ionicons name="chevron-forward" size={20} color={isCurrentMonth ? colors.surface2 : colors.textMuted} />
      </Pressable>
    </View>
  )
}

// ── Hero numbers ───────────────────────────────────────────────────────────────

function HeroCard({ label, amount, color }: { label: string; amount: number; color: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md, alignItems: 'center' }}>
      <Text style={{ color, fontSize: fontSize.cardTitle, fontWeight: '700' }}>
        €{amount.toFixed(2)}
      </Text>
      <Text style={{ color: colors.textMuted, fontSize: fontSize.micro, marginTop: 2 }}>{label}</Text>
    </View>
  )
}

// ── Category spending row ──────────────────────────────────────────────────────

function CategoryRow({ emoji, name, color, spent, limit }: {
  emoji: string; name: string; color: string; spent: number; limit: number | null
}) {
  const pct = limit && limit > 0 ? Math.min(1, spent / limit) : null
  const barColor = pct == null ? color : pct >= 1 ? colors.danger : pct >= 0.75 ? colors.warning : colors.success

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xs }}>
      <Text style={{ fontSize: 18, width: 28 }}>{emoji}</Text>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
          <Text style={{ color: colors.text, fontSize: fontSize.label, fontWeight: '500' }}>{name}</Text>
          <Text style={{ color: colors.text, fontSize: fontSize.label, fontWeight: '600' }}>
            €{spent.toFixed(2)}{limit ? ` / €${limit.toFixed(0)}` : ''}
          </Text>
        </View>
        {pct != null && (
          <View style={{ height: 3, backgroundColor: colors.surface2, borderRadius: radius.full, overflow: 'hidden' }}>
            <View style={{ width: `${pct * 100}%`, height: '100%', backgroundColor: barColor, borderRadius: radius.full }} />
          </View>
        )}
      </View>
    </View>
  )
}

// ── Recent entry row ──────────────────────────────────────────────────────────

function RecentRow({ emoji, label, date, amount, isIncome }: {
  emoji: string; label: string; date: string; amount: number; isIncome: boolean
}) {
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
      backgroundColor: colors.surface, borderRadius: radius.md,
      borderWidth: 1, borderColor: colors.border,
      padding: spacing.sm,
    }}>
      <Text style={{ fontSize: 18 }}>{emoji}</Text>
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.text, fontSize: fontSize.label, fontWeight: '500' }} numberOfLines={1}>{label}</Text>
        <Text style={{ color: colors.textMuted, fontSize: fontSize.micro }}>{date.slice(5)}</Text>
      </View>
      <Text style={{ color: isIncome ? colors.success : colors.text, fontSize: fontSize.label, fontWeight: '700' }}>
        {isIncome ? '+' : '-'}€{amount.toFixed(2)}
      </Text>
    </View>
  )
}

// ── Main screen ────────────────────────────────────────────────────────────────

export default function BudgetScreen() {
  const router = useRouter()
  const {
    viewYear, viewMonth, setViewMonth,
    totalIncome, totalSpending, netBalance, projectedIncome,
    incomeEntries, expenseEntries, expenseCategories, categorySpending,
    pendingRecurring, confirmRecurring,
    loadCategories, loadMonth, loadPendingRecurring,
  } = useBudgetStore()

  const today = new Date().toISOString().slice(0, 10)

  // Week totals for "This Week" card
  const [weekIncome, setWeekIncome]     = useState(0)
  const [weekSpending, setWeekSpending] = useState(0)

  useEffect(() => {
    loadCategories()
    loadPendingRecurring()
    loadMonth()
    // Compute this week's range (Mon–today)
    const now  = new Date()
    const day  = now.getDay()
    const diff = day === 0 ? -6 : 1 - day
    const start = new Date(now)
    start.setDate(now.getDate() + diff)
    const startStr = start.toISOString().slice(0, 10)
    const daily = dbGetDailyTotals(startStr, today)
    setWeekIncome(daily.reduce((s, d) => s + d.income, 0))
    setWeekSpending(daily.reduce((s, d) => s + d.spending, 0))
  }, [])

  function handleConfirmRecurring(summary: RecurringIncomeSummary) {
    Alert.alert(
      `Confirm ${summary.recurrencePeriod} income`,
      `${summary.sourceName} — €${summary.amount.toFixed(2)}\nLog for today?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', onPress: () => confirmRecurring(summary, today) },
      ],
    )
  }

  function prevMonth() {
    let m = viewMonth - 1
    let y = viewYear
    if (m < 1) { m = 12; y -= 1 }
    setViewMonth(y, m)
  }

  function nextMonth() {
    const now = new Date()
    if (viewYear === now.getFullYear() && viewMonth === now.getMonth() + 1) return
    let m = viewMonth + 1
    let y = viewYear
    if (m > 12) { m = 1; y += 1 }
    setViewMonth(y, m)
  }

  // Merge recent entries, sort by date desc, take 5
  type RecentItem = { key: string; emoji: string; label: string; date: string; amount: number; isIncome: boolean }
  const recent: RecentItem[] = [
    ...incomeEntries.map((e) => ({
      key: e.id,
      emoji: e.categoryEmoji,
      label: e.sourceName,
      date: e.date,
      amount: e.amount,
      isIncome: true,
    })),
    ...expenseEntries.map((e) => ({
      key: e.id,
      emoji: e.categoryEmoji,
      label: e.merchantName ?? e.categoryName,
      date: e.date,
      amount: e.total,
      isIncome: false,
    })),
  ].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5)

  // Expense categories with spending > 0, or all if none yet
  const categoriesWithSpend = expenseCategories
    .map((c) => ({ ...c, spent: categorySpending[c.id] ?? 0 }))
    .filter((c) => c.spent > 0 || c.monthlyLimit != null)
    .sort((a, b) => b.spent - a.spent)
    .slice(0, 8)

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Header */}
      <View style={{
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.md,
      }}>
        <Text style={{ color: colors.text, fontSize: fontSize.screenTitle, fontWeight: '700' }}>Budget</Text>
        <Pressable onPress={() => router.push('/budget/categories' as never)} hitSlop={8}>
          <Ionicons name="settings-outline" size={22} color={colors.textMuted} />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>

        {/* Month navigation */}
        <View style={{ alignItems: 'center' }}>
          <MonthNav year={viewYear} month={viewMonth} onPrev={prevMonth} onNext={nextMonth} />
        </View>

        {/* Hero numbers */}
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <HeroCard label="Income" amount={totalIncome} color={colors.success} />
          <HeroCard label="Spent" amount={totalSpending} color={netBalance >= 0 ? colors.text : colors.danger} />
          <View style={{
            flex: 1, backgroundColor: colors.surface, borderRadius: radius.lg,
            borderWidth: 1, borderColor: colors.border, padding: spacing.md, alignItems: 'center',
          }}>
            <Text style={{
              color: netBalance >= 0 ? colors.success : colors.danger,
              fontSize: fontSize.cardTitle, fontWeight: '700',
            }}>
              {netBalance >= 0 ? '+' : '-'}€{Math.abs(netBalance).toFixed(2)}
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: fontSize.micro, marginTop: 2 }}>Net</Text>
          </View>
        </View>

        {/* Pending recurring banners */}
        {pendingRecurring.map((p) => (
          <Pressable
            key={`${p.sourceName}-${p.categoryId}`}
            onPress={() => handleConfirmRecurring(p)}
            style={({ pressed }) => ({
              flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
              backgroundColor: `${colors.success}18`,
              borderRadius: radius.md,
              borderWidth: 1, borderColor: `${colors.success}44`,
              padding: spacing.md,
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <Text style={{ fontSize: 20 }}>{p.categoryEmoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.success, fontSize: fontSize.label, fontWeight: '700' }}>
                {p.sourceName} is due today
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: fontSize.micro }}>
                €{p.amount.toFixed(2)} · {p.recurrencePeriod} — tap to confirm
              </Text>
            </View>
            <Ionicons name="checkmark-circle-outline" size={22} color={colors.success} />
          </Pressable>
        ))}

        {/* Projected income (only when pending items exist) */}
        {pendingRecurring.length > 0 && (
          <View style={{
            flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
            backgroundColor: colors.surface, borderRadius: radius.md,
            borderWidth: 1, borderColor: colors.border, padding: spacing.sm + 2,
          }}>
            <Text style={{ color: colors.textMuted, fontSize: fontSize.label }}>Projected income this month</Text>
            <Text style={{ color: colors.success, fontSize: fontSize.label, fontWeight: '700' }}>€{projectedIncome.toFixed(2)}</Text>
          </View>
        )}

        {/* Quick actions */}
        <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
          <Pressable
            onPress={() => router.push('/budget/add-expense' as never)}
            style={({ pressed }) => ({
              flex: 1, backgroundColor: colors.budget, borderRadius: radius.md,
              paddingVertical: spacing.sm + 2, alignItems: 'center', flexDirection: 'row',
              justifyContent: 'center', gap: spacing.xs,
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <Ionicons name="remove-circle-outline" size={18} color="#000" />
            <Text style={{ color: '#000', fontSize: fontSize.body, fontWeight: '700' }}>Add Expense</Text>
          </Pressable>
          <Pressable
            onPress={() => router.push('/budget/add-income' as never)}
            style={({ pressed }) => ({
              flex: 1, backgroundColor: colors.surface, borderRadius: radius.md,
              paddingVertical: spacing.sm + 2, alignItems: 'center', flexDirection: 'row',
              justifyContent: 'center', gap: spacing.xs,
              borderWidth: 1, borderColor: colors.border,
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <Ionicons name="add-circle-outline" size={18} color={colors.success} />
            <Text style={{ color: colors.success, fontSize: fontSize.body, fontWeight: '600' }}>Add Income</Text>
          </Pressable>
          <Pressable
            onPress={() => router.push('/budget/templates' as never)}
            style={({ pressed }) => ({
              backgroundColor: colors.surface, borderRadius: radius.md,
              paddingVertical: spacing.sm + 2, paddingHorizontal: spacing.md,
              alignItems: 'center', flexDirection: 'row',
              justifyContent: 'center', gap: spacing.xs,
              borderWidth: 1, borderColor: colors.border,
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <Ionicons name="copy-outline" size={18} color={colors.textMuted} />
            <Text style={{ color: colors.textMuted, fontSize: fontSize.body, fontWeight: '500' }}>Templates</Text>
          </Pressable>
          <Pressable
            onPress={() => router.push('/budget/balance' as never)}
            style={({ pressed }) => ({
              backgroundColor: colors.surface, borderRadius: radius.md,
              paddingVertical: spacing.sm + 2, paddingHorizontal: spacing.md,
              alignItems: 'center', flexDirection: 'row',
              justifyContent: 'center', gap: spacing.xs,
              borderWidth: 1, borderColor: colors.border,
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <Ionicons name="stats-chart-outline" size={18} color={colors.textMuted} />
            <Text style={{ color: colors.textMuted, fontSize: fontSize.body, fontWeight: '500' }}>Balance</Text>
          </Pressable>
        </View>

        {/* This Week card */}
        <Pressable
          onPress={() => router.push('/budget/weekly' as never)}
          style={({ pressed }) => ({
            backgroundColor: colors.surface, borderRadius: radius.lg,
            borderWidth: 1, borderColor: colors.border, padding: spacing.md,
            flexDirection: 'row', alignItems: 'center', gap: spacing.md,
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.textMuted, fontSize: fontSize.micro, fontWeight: '700', marginBottom: spacing.xs }}>
              THIS WEEK
            </Text>
            <View style={{ flexDirection: 'row', gap: spacing.lg }}>
              <View>
                <Text style={{ color: colors.success, fontSize: fontSize.cardTitle, fontWeight: '700' }}>
                  €{weekIncome.toFixed(2)}
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: fontSize.micro }}>income</Text>
              </View>
              <View>
                <Text style={{ color: colors.text, fontSize: fontSize.cardTitle, fontWeight: '700' }}>
                  €{weekSpending.toFixed(2)}
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: fontSize.micro }}>spent</Text>
              </View>
              <View>
                <Text style={{
                  color: weekIncome - weekSpending >= 0 ? colors.success : colors.danger,
                  fontSize: fontSize.cardTitle, fontWeight: '700',
                }}>
                  {weekIncome - weekSpending >= 0 ? '+' : ''}€{(weekIncome - weekSpending).toFixed(2)}
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: fontSize.micro }}>net</Text>
              </View>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </Pressable>

        {/* Category spending */}
        {categoriesWithSpend.length > 0 && (
          <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
              <Text style={{ color: colors.text, fontSize: fontSize.cardTitle, fontWeight: '600' }}>By Category</Text>
              <Pressable onPress={() => router.push('/budget/monthly' as never)} hitSlop={8}>
                <Text style={{ color: colors.primary, fontSize: fontSize.label }}>See all</Text>
              </Pressable>
            </View>
            {categoriesWithSpend.map((c) => (
              <CategoryRow
                key={c.id}
                emoji={c.emoji}
                name={c.name}
                color={c.color}
                spent={c.spent}
                limit={c.monthlyLimit}
              />
            ))}
          </View>
        )}

        {/* Recent entries */}
        {recent.length > 0 ? (
          <View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
              <Text style={{ color: colors.text, fontSize: fontSize.cardTitle, fontWeight: '600' }}>Recent</Text>
              <Pressable onPress={() => router.push('/budget/daily' as never)} hitSlop={8}>
                <Text style={{ color: colors.primary, fontSize: fontSize.label }}>Daily view</Text>
              </Pressable>
            </View>
            <View style={{ gap: spacing.xs }}>
              {recent.map((r) => (
                <RecentRow key={r.key} emoji={r.emoji} label={r.label} date={r.date} amount={r.amount} isIncome={r.isIncome} />
              ))}
            </View>
          </View>
        ) : (
          <View style={{
            backgroundColor: colors.surface, borderRadius: radius.lg,
            borderWidth: 1, borderColor: colors.border,
            padding: spacing.xl, alignItems: 'center', gap: spacing.md,
          }}>
            <Ionicons name="wallet-outline" size={40} color={colors.textMuted} />
            <Text style={{ color: colors.textMuted, fontSize: fontSize.body, textAlign: 'center' }}>
              No entries yet this month.{'\n'}Start by logging an expense or income.
            </Text>
            <Pressable
              onPress={() => router.push('/budget/add-expense' as never)}
              style={({ pressed }) => ({
                backgroundColor: colors.budget, borderRadius: radius.md,
                paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <Text style={{ color: '#000', fontSize: fontSize.body, fontWeight: '700' }}>Log First Expense</Text>
            </Pressable>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  )
}
