import { useEffect, useRef, useState } from 'react'
import {
  View, Text, ScrollView, Pressable, Alert, Image,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Swipeable } from 'react-native-gesture-handler'
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet'
import { colors, fontSize, spacing, radius } from '@core/theme'
import { useBudgetStore } from '@modules/budget/budgetStore'
import {
  dbGetIncomeForDate,
  dbGetExpensesForDate,
  IncomeEntryWithCategory,
  ExpenseWithItems,
} from '@core/db/budgetQueries'
import { localDateStr } from '@core/utils/units'

// ── Date nav helpers ───────────────────────────────────────────────────────────

const DAYS   = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function formatDate(d: string): string {
  const dt    = new Date(d + 'T12:00:00')
  const today = localDateStr()
  if (d === today) return 'Today'
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  if (d === localDateStr(yesterday)) return 'Yesterday'
  return `${DAYS[dt.getDay()]} ${dt.getDate()} ${MONTHS[dt.getMonth()]}`
}

function shiftDate(date: string, days: number): string {
  const d = new Date(date + 'T12:00:00')
  d.setDate(d.getDate() + days)
  return localDateStr(d)
}

// ── Swipe-to-delete wrapper ───────────────────────────────────────────────────

function SwipeRow({ onDelete, children }: { onDelete: () => void; children: React.ReactNode }) {
  const swipeRef = useRef<Swipeable>(null)

  function renderRight() {
    return (
      <Pressable
        onPress={() => { swipeRef.current?.close(); onDelete() }}
        style={{
          backgroundColor: colors.danger,
          justifyContent: 'center', alignItems: 'center',
          width: 72, borderRadius: radius.md, marginLeft: spacing.xs,
        }}
      >
        <Ionicons name="trash-outline" size={20} color="#fff" />
      </Pressable>
    )
  }

  return (
    <Swipeable ref={swipeRef} renderRightActions={renderRight} overshootRight={false}>
      {children}
    </Swipeable>
  )
}

// ── Income entry row ──────────────────────────────────────────────────────────

function IncomeRow({ entry, onDelete }: { entry: IncomeEntryWithCategory; onDelete: () => void }) {
  function confirm() {
    Alert.alert('Delete income?', `${entry.sourceName} — €${entry.amount.toFixed(2)}`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: onDelete },
    ])
  }
  return (
    <SwipeRow onDelete={confirm}>
      <View style={{
        flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
        backgroundColor: colors.surface, borderRadius: radius.md,
        borderWidth: 1, borderColor: colors.border,
        padding: spacing.md,
      }}>
        <Text style={{ fontSize: 20 }}>{entry.categoryEmoji}</Text>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontSize: fontSize.body, fontWeight: '500' }}>{entry.sourceName}</Text>
          <Text style={{ color: colors.textMuted, fontSize: fontSize.micro }}>{entry.categoryName}</Text>
        </View>
        {entry.isRecurring && (
          <Ionicons name="repeat" size={14} color={colors.textMuted} style={{ marginRight: 2 }} />
        )}
        <Text style={{ color: colors.success, fontSize: fontSize.body, fontWeight: '700' }}>
          +€{entry.amount.toFixed(2)}
        </Text>
      </View>
    </SwipeRow>
  )
}

// ── Expense card ──────────────────────────────────────────────────────────────

const PAYMENT_ICONS: Record<string, string> = { cash: '💵', card: '💳', online: '🌐' }

function ExpenseCard({ expense, expanded, onToggle, onDelete }: {
  expense: ExpenseWithItems
  expanded: boolean
  onToggle: () => void
  onDelete: () => void
}) {
  function confirm() {
    Alert.alert(
      'Delete expense?',
      `${expense.merchantName ?? expense.categoryName} — €${expense.total.toFixed(2)}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: onDelete },
      ],
    )
  }

  return (
    <SwipeRow onDelete={confirm}>
      <View style={{
        backgroundColor: colors.surface, borderRadius: radius.md,
        borderWidth: 1, borderColor: colors.border, overflow: 'hidden',
      }}>
        {/* Header row */}
        <Pressable
          onPress={onToggle}
          style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md }}
        >
          <Text style={{ fontSize: 20 }}>{expense.categoryEmoji}</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontSize: fontSize.body, fontWeight: '500' }}>
              {expense.merchantName ?? expense.categoryName}
            </Text>
            <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: 2 }}>
              <Text style={{ color: colors.textMuted, fontSize: fontSize.micro }}>{expense.categoryName}</Text>
              {expense.paymentMethod && (
                <Text style={{ fontSize: fontSize.micro }}>{PAYMENT_ICONS[expense.paymentMethod]}</Text>
              )}
              <Text style={{ color: colors.textMuted, fontSize: fontSize.micro }}>
                {expense.items.length} {expense.items.length === 1 ? 'item' : 'items'}
              </Text>
            </View>
          </View>
          <Text style={{ color: colors.text, fontSize: fontSize.body, fontWeight: '700' }}>
            €{expense.total.toFixed(2)}
          </Text>
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={colors.textMuted}
          />
        </Pressable>

        {/* Expanded item list */}
        {expanded && (
          <View style={{ borderTopWidth: 1, borderTopColor: colors.border }}>
            {expense.items.map((item, i) => (
              <View key={item.id} style={{
                flexDirection: 'row', justifyContent: 'space-between',
                paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 2,
                borderTopWidth: i > 0 ? 1 : 0, borderTopColor: colors.border,
              }}>
                <Text style={{ color: colors.textMuted, fontSize: fontSize.label }}>{item.itemName}</Text>
                <Text style={{ color: colors.text, fontSize: fontSize.label, fontWeight: '500' }}>
                  €{item.amount.toFixed(2)}
                </Text>
              </View>
            ))}
            {expense.receiptPhoto && (
              <View style={{ padding: spacing.sm }}>
                <Image
                  source={{ uri: expense.receiptPhoto }}
                  style={{ width: '100%', height: 120, borderRadius: radius.sm, resizeMode: 'cover' }}
                />
              </View>
            )}
          </View>
        )}
      </View>
    </SwipeRow>
  )
}

// ── Section header ────────────────────────────────────────────────────────────

function SectionHeader({ label, total, color }: { label: string; total: number; color: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs }}>
      <Text style={{ color: colors.textMuted, fontSize: fontSize.micro, fontWeight: '700', letterSpacing: 0.5 }}>
        {label}
      </Text>
      <Text style={{ color, fontSize: fontSize.label, fontWeight: '700' }}>€{total.toFixed(2)}</Text>
    </View>
  )
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function DailyScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{ date?: string }>()
  const { removeIncome, removeExpense } = useBudgetStore()

  const today = localDateStr()
  const [date, setDate]         = useState(params.date ?? today)
  const [income, setIncome]     = useState<IncomeEntryWithCategory[]>([])
  const [expenses, setExpenses] = useState<ExpenseWithItems[]>([])
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const fabSheetRef   = useRef<BottomSheet>(null)
  const fabSnapPoints = ['25%']

  function reload() {
    setIncome(dbGetIncomeForDate(date))
    setExpenses(dbGetExpensesForDate(date))
  }

  useEffect(() => { reload() }, [date])

  function navigate(days: number) {
    const next = shiftDate(date, days)
    if (next <= today) setDate(next)
  }

  function toggleExpanded(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function handleDeleteIncome(id: string) {
    removeIncome(id)
    reload()
  }

  function handleDeleteExpense(id: string) {
    removeExpense(id)
    reload()
  }

  const totalIncome   = income.reduce((s, e) => s + e.amount, 0)
  const totalSpending = expenses.reduce((s, e) => s + e.total, 0)
  const net           = totalIncome - totalSpending

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

        {/* Date navigation */}
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm }}>
          <Pressable onPress={() => navigate(-1)} hitSlop={8}>
            <Ionicons name="chevron-back" size={20} color={colors.textMuted} />
          </Pressable>
          <Text style={{ color: colors.text, fontSize: fontSize.sectionHeader, fontWeight: '600', minWidth: 130, textAlign: 'center' }}>
            {formatDate(date)}
          </Text>
          <Pressable onPress={() => navigate(1)} hitSlop={8} disabled={date >= today}>
            <Ionicons name="chevron-forward" size={20} color={date >= today ? colors.surface2 : colors.textMuted} />
          </Pressable>
        </View>

        {/* Jump to today */}
        {date !== today ? (
          <Pressable onPress={() => setDate(today)} style={{ paddingHorizontal: spacing.sm }}>
            <Text style={{ color: colors.primary, fontSize: fontSize.label, fontWeight: '600' }}>Today</Text>
          </Pressable>
        ) : (
          <View style={{ width: 52 }} />
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, paddingBottom: 100 }}>

        {/* Income section */}
        {income.length > 0 && (
          <View>
            <SectionHeader label="INCOME" total={totalIncome} color={colors.success} />
            <View style={{ gap: spacing.xs }}>
              {income.map((e) => (
                <IncomeRow key={e.id} entry={e} onDelete={() => handleDeleteIncome(e.id)} />
              ))}
            </View>
          </View>
        )}

        {/* Spending section */}
        {expenses.length > 0 && (
          <View>
            <SectionHeader label="SPENDING" total={totalSpending} color={colors.text} />
            <View style={{ gap: spacing.xs }}>
              {expenses.map((e) => (
                <ExpenseCard
                  key={e.id}
                  expense={e}
                  expanded={expanded.has(e.id)}
                  onToggle={() => toggleExpanded(e.id)}
                  onDelete={() => handleDeleteExpense(e.id)}
                />
              ))}
            </View>
          </View>
        )}

        {/* Empty state */}
        {income.length === 0 && expenses.length === 0 && (
          <View style={{
            backgroundColor: colors.surface, borderRadius: radius.lg,
            borderWidth: 1, borderColor: colors.border,
            padding: spacing.xl, alignItems: 'center', gap: spacing.md,
          }}>
            <Ionicons name="calendar-outline" size={40} color={colors.textMuted} />
            <Text style={{ color: colors.textMuted, fontSize: fontSize.body, textAlign: 'center' }}>
              Nothing logged{date === today ? ' today' : ` on ${formatDate(date)}`}.
            </Text>
            {date === today && (
              <Pressable
                onPress={() => fabSheetRef.current?.expand()}
                style={({ pressed }) => ({
                  backgroundColor: colors.budget, borderRadius: radius.md,
                  paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
                  opacity: pressed ? 0.85 : 1,
                })}
              >
                <Text style={{ color: '#000', fontSize: fontSize.body, fontWeight: '700' }}>Add Entry</Text>
              </Pressable>
            )}
          </View>
        )}

        {/* Day total */}
        {(income.length > 0 || expenses.length > 0) && (
          <View style={{
            backgroundColor: colors.surface, borderRadius: radius.lg,
            borderWidth: 1, borderColor: colors.border, padding: spacing.md,
            flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <Text style={{ color: colors.textMuted, fontSize: fontSize.body }}>Day Net</Text>
            <Text style={{
              fontSize: fontSize.sectionHeader, fontWeight: '700',
              color: net >= 0 ? colors.success : colors.danger,
            }}>
              {net >= 0 ? '+' : ''}€{net.toFixed(2)}
            </Text>
          </View>
        )}

      </ScrollView>

      {/* FAB */}
      <Pressable
        onPress={() => fabSheetRef.current?.expand()}
        style={({ pressed }) => ({
          position: 'absolute', bottom: 32, right: spacing.lg,
          width: 56, height: 56, borderRadius: 28,
          backgroundColor: colors.budget,
          alignItems: 'center', justifyContent: 'center',
          shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3, shadowRadius: 6, elevation: 6,
          opacity: pressed ? 0.85 : 1,
        })}
      >
        <Ionicons name="add" size={28} color="#000" />
      </Pressable>

      {/* Quick-add bottom sheet */}
      <BottomSheet
        ref={fabSheetRef}
        index={-1}
        snapPoints={fabSnapPoints}
        enablePanDownToClose
        backgroundStyle={{ backgroundColor: colors.surface }}
        handleIndicatorStyle={{ backgroundColor: colors.textMuted }}
      >
        <BottomSheetView style={{ padding: spacing.lg, gap: spacing.md }}>
          <Text style={{ color: colors.text, fontSize: fontSize.cardTitle, fontWeight: '600' }}>Add to {formatDate(date)}</Text>
          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            <Pressable
              onPress={() => { fabSheetRef.current?.close(); router.push(`/budget/add-expense?date=${date}` as never) }}
              style={({ pressed }) => ({
                flex: 1, backgroundColor: colors.budget, borderRadius: radius.md,
                paddingVertical: spacing.md, alignItems: 'center', flexDirection: 'row',
                justifyContent: 'center', gap: spacing.xs,
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <Ionicons name="remove-circle-outline" size={18} color="#000" />
              <Text style={{ color: '#000', fontSize: fontSize.body, fontWeight: '700' }}>Add Expense</Text>
            </Pressable>
            <Pressable
              onPress={() => { fabSheetRef.current?.close(); router.push(`/budget/add-income?date=${date}` as never) }}
              style={({ pressed }) => ({
                flex: 1, backgroundColor: colors.surface2, borderRadius: radius.md,
                paddingVertical: spacing.md, alignItems: 'center', flexDirection: 'row',
                justifyContent: 'center', gap: spacing.xs, borderWidth: 1, borderColor: colors.border,
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <Ionicons name="add-circle-outline" size={18} color={colors.success} />
              <Text style={{ color: colors.success, fontSize: fontSize.body, fontWeight: '600' }}>Add Income</Text>
            </Pressable>
          </View>
        </BottomSheetView>
      </BottomSheet>
    </SafeAreaView>
  )
}
