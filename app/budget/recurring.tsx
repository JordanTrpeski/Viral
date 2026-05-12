import { useCallback, useEffect, useState } from 'react'
import { View, Text, ScrollView, Pressable, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { colors, fontSize, spacing, radius } from '@core/theme'
import {
  dbGetRecurringIncomeSummaries, dbCancelRecurringIncome,
  type RecurringIncomeSummary,
} from '@core/db/budgetQueries'

// ── Helpers ────────────────────────────────────────────────────────────────────

const PERIOD_LABELS: Record<string, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
}

function nextDueDate(lastDate: string, period: 'daily' | 'weekly' | 'monthly'): string {
  const d = new Date(lastDate + 'T12:00:00')
  if (period === 'daily')   d.setDate(d.getDate() + 1)
  if (period === 'weekly')  d.setDate(d.getDate() + 7)
  if (period === 'monthly') d.setMonth(d.getMonth() + 1)
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function daysUntilDue(lastDate: string, period: 'daily' | 'weekly' | 'monthly'): number {
  const d = new Date(lastDate + 'T12:00:00')
  if (period === 'daily')   d.setDate(d.getDate() + 1)
  if (period === 'weekly')  d.setDate(d.getDate() + 7)
  if (period === 'monthly') d.setMonth(d.getMonth() + 1)
  const today = new Date()
  today.setHours(12, 0, 0, 0)
  return Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

// ── Recurring income row ───────────────────────────────────────────────────────

function RecurringIncomeRow({
  item, onCancel,
}: { item: RecurringIncomeSummary; onCancel: () => void }) {
  const due     = nextDueDate(item.lastDate, item.recurrencePeriod)
  const daysLeft = daysUntilDue(item.lastDate, item.recurrencePeriod)
  const overdue  = daysLeft < 0

  function confirmCancel() {
    Alert.alert(
      'Cancel recurring income?',
      `"${item.sourceName}" will no longer recur. Existing entries are kept.`,
      [
        { text: 'Keep it', style: 'cancel' },
        { text: 'Cancel recurring', style: 'destructive', onPress: onCancel },
      ],
    )
  }

  return (
    <View style={{
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1, borderColor: colors.border,
      padding: spacing.md, gap: spacing.sm,
    }}>
      {/* Top row: icon, name, amount */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <View style={{
          width: 40, height: 40, borderRadius: radius.md,
          backgroundColor: `${item.categoryColor}22`,
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Text style={{ fontSize: 20 }}>{item.categoryEmoji}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontSize: fontSize.body, fontWeight: '600' }} numberOfLines={1}>
            {item.sourceName}
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: fontSize.micro }}>
            {item.categoryName}
          </Text>
        </View>
        <Text style={{ color: colors.success, fontSize: fontSize.cardTitle, fontWeight: '700' }}>
          +€{item.amount.toFixed(2)}
        </Text>
      </View>

      {/* Frequency + next due */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <View style={{
          backgroundColor: `${colors.budget}22`,
          borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 3,
        }}>
          <Text style={{ color: colors.budget, fontSize: fontSize.micro, fontWeight: '700' }}>
            {PERIOD_LABELS[item.recurrencePeriod] ?? item.recurrencePeriod}
          </Text>
        </View>
        <Text style={{ color: colors.textMuted, fontSize: fontSize.micro }}>
          Next: {due}
        </Text>
        {overdue && (
          <View style={{ backgroundColor: `${colors.warning}22`, borderRadius: radius.full, paddingHorizontal: spacing.xs, paddingVertical: 2 }}>
            <Text style={{ color: colors.warning, fontSize: fontSize.micro, fontWeight: '600' }}>Overdue</Text>
          </View>
        )}
        {!overdue && daysLeft === 0 && (
          <View style={{ backgroundColor: `${colors.success}22`, borderRadius: radius.full, paddingHorizontal: spacing.xs, paddingVertical: 2 }}>
            <Text style={{ color: colors.success, fontSize: fontSize.micro, fontWeight: '600' }}>Due today</Text>
          </View>
        )}
      </View>

      {/* Cancel button */}
      <Pressable
        onPress={confirmCancel}
        style={({ pressed }) => ({
          flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
          gap: 6, paddingVertical: spacing.xs,
          borderRadius: radius.md, borderWidth: 1, borderColor: `${colors.danger}44`,
          backgroundColor: `${colors.danger}10`,
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <Ionicons name="close-circle-outline" size={16} color={colors.danger} />
        <Text style={{ color: colors.danger, fontSize: fontSize.label, fontWeight: '600' }}>
          Cancel recurring
        </Text>
      </Pressable>
    </View>
  )
}

// ── Main screen ────────────────────────────────────────────────────────────────

export default function RecurringScreen() {
  const router = useRouter()
  const [items, setItems] = useState<RecurringIncomeSummary[]>([])

  const load = useCallback(() => {
    setItems(dbGetRecurringIncomeSummaries())
  }, [])

  useEffect(() => { load() }, [load])

  function handleCancel(item: RecurringIncomeSummary) {
    dbCancelRecurringIncome(item.sourceName, item.categoryId, item.recurrencePeriod)
    load()
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
        <Text style={{
          flex: 1, color: colors.text,
          fontSize: fontSize.sectionHeader, fontWeight: '600', marginLeft: spacing.xs,
        }}>
          Recurring Income
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing.md, gap: spacing.md, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {items.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: spacing.xl * 2 }}>
            <Ionicons name="repeat-outline" size={48} color={colors.textMuted} style={{ marginBottom: spacing.md }} />
            <Text style={{ color: colors.text, fontSize: fontSize.body, fontWeight: '600', marginBottom: spacing.xs }}>
              No recurring income
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: fontSize.label, textAlign: 'center' }}>
              Mark an income entry as recurring{'\n'}when adding it to see it here.
            </Text>
          </View>
        ) : (
          <>
            <Text style={{ color: colors.textMuted, fontSize: fontSize.micro }}>
              {items.length} active recurring {items.length === 1 ? 'entry' : 'entries'}
            </Text>
            {items.map((item, idx) => (
              <RecurringIncomeRow
                key={`${item.sourceName}-${item.categoryId}-${item.recurrencePeriod}-${idx}`}
                item={item}
                onCancel={() => handleCancel(item)}
              />
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
