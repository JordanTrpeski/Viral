import { useState } from 'react'
import { View, Text, TextInput, ScrollView, Pressable, KeyboardAvoidingView, Platform, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { colors, fontSize, spacing, radius } from '@core/theme'
import { useBudgetStore } from '@modules/budget/budgetStore'
import { localDateStr } from '@core/utils/units'

type RecurrencePeriod = 'daily' | 'weekly' | 'monthly'

// ── Date nav ──────────────────────────────────────────────────────────────────

function DatePicker({ value, onChange }: { value: string; onChange: (d: string) => void }) {
  function shift(days: number) {
    const d = new Date(value + 'T12:00:00')
    d.setDate(d.getDate() + days)
    const next = localDateStr(d)
    if (next <= localDateStr()) onChange(next)
  }
  const today = localDateStr()
  const label = value === today ? 'Today' : value.slice(5).replace('-', '/')
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
      <Pressable onPress={() => shift(-1)} hitSlop={8}>
        <Ionicons name="chevron-back" size={20} color={colors.textMuted} />
      </Pressable>
      <Text style={{ color: colors.text, fontSize: fontSize.body, fontWeight: '600', minWidth: 72, textAlign: 'center' }}>
        {label}
      </Text>
      <Pressable onPress={() => shift(1)} hitSlop={8} disabled={value >= today}>
        <Ionicons name="chevron-forward" size={20} color={value >= today ? colors.surface2 : colors.textMuted} />
      </Pressable>
    </View>
  )
}

// ── Category chip ─────────────────────────────────────────────────────────────

function CategoryChip({ emoji, name, color, selected, onPress }: {
  emoji: string; name: string; color: string; selected: boolean; onPress: () => void
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
        backgroundColor: selected ? `${color}22` : colors.surface2,
        borderRadius: radius.full,
        borderWidth: 1.5,
        borderColor: selected ? color : 'transparent',
        paddingHorizontal: spacing.sm + 2,
        paddingVertical: spacing.xs,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <Text style={{ fontSize: 14 }}>{emoji}</Text>
      <Text style={{ color: selected ? color : colors.textMuted, fontSize: fontSize.label, fontWeight: '500' }}>{name}</Text>
    </Pressable>
  )
}

// ── Recurrence chip ───────────────────────────────────────────────────────────

function RecurrenceChip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: radius.full,
        backgroundColor: selected ? colors.success : colors.surface2,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <Text style={{ color: selected ? '#fff' : colors.textMuted, fontSize: fontSize.label, fontWeight: '600' }}>{label}</Text>
    </Pressable>
  )
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function AddIncomeScreen() {
  const router = useRouter()
  const { date: dateParam } = useLocalSearchParams<{ date?: string }>()
  const { incomeCategories, addIncome } = useBudgetStore()

  const today = localDateStr()
  const [sourceName, setSourceName] = useState('')
  const [amountText, setAmountText] = useState('')
  const [date, setDate] = useState(dateParam ?? today)
  const [categoryId, setCategoryId] = useState(incomeCategories[0]?.id ?? '')
  const [note, setNote] = useState('')
  const [isRecurring, setIsRecurring] = useState(false)
  const [recurrencePeriod, setRecurrencePeriod] = useState<RecurrencePeriod>('monthly')

  const amount = parseFloat(amountText) || 0
  const canSave = sourceName.trim().length > 0 && amount > 0 && categoryId

  function handleSave() {
    if (!canSave) return
    addIncome(
      sourceName.trim(),
      amount,
      date,
      categoryId,
      note.trim() || null,
      isRecurring,
      isRecurring ? recurrencePeriod : null,
    )
    router.back()
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {/* Header */}
        <View style={{
          flexDirection: 'row', alignItems: 'center',
          paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
          borderBottomWidth: 1, borderBottomColor: colors.border,
        }}>
          <Pressable onPress={() => router.back()} style={{ padding: spacing.xs }}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </Pressable>
          <Text style={{ flex: 1, color: colors.text, fontSize: fontSize.sectionHeader, fontWeight: '600', marginLeft: spacing.xs }}>
            Add Income
          </Text>
          <Pressable
            onPress={handleSave}
            disabled={!canSave}
            style={{ paddingHorizontal: spacing.md, paddingVertical: spacing.xs }}
          >
            <Text style={{ color: canSave ? colors.success : colors.textMuted, fontSize: fontSize.body, fontWeight: '700' }}>
              Save
            </Text>
          </Pressable>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>

          {/* Amount */}
          <View style={{ alignItems: 'center', gap: spacing.xs }}>
            <Text style={{ color: colors.textMuted, fontSize: fontSize.label }}>Amount</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Text style={{ color: colors.textMuted, fontSize: 32, fontWeight: '300' }}>€</Text>
              <TextInput
                value={amountText}
                onChangeText={setAmountText}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor={colors.surface2}
                selectTextOnFocus
                style={{
                  color: colors.text,
                  fontSize: 48,
                  fontWeight: '700',
                  minWidth: 120,
                  textAlign: 'center',
                }}
                selectionColor={colors.success}
              />
            </View>
          </View>

          {/* Source name */}
          <View style={{ gap: spacing.xs }}>
            <Text style={{ color: colors.textMuted, fontSize: fontSize.label }}>Source</Text>
            <TextInput
              value={sourceName}
              onChangeText={setSourceName}
              placeholder="e.g. Monthly Salary"
              placeholderTextColor={colors.textMuted}
              style={{
                backgroundColor: colors.surface,
                borderRadius: radius.md,
                borderWidth: 1,
                borderColor: colors.border,
                color: colors.text,
                fontSize: fontSize.body,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm + 2,
              }}
              selectionColor={colors.success}
            />
          </View>

          {/* Date */}
          <View style={{ gap: spacing.xs }}>
            <Text style={{ color: colors.textMuted, fontSize: fontSize.label }}>Date</Text>
            <View style={{
              backgroundColor: colors.surface, borderRadius: radius.md,
              borderWidth: 1, borderColor: colors.border,
              padding: spacing.md, alignItems: 'center',
            }}>
              <DatePicker value={date} onChange={setDate} />
            </View>
          </View>

          {/* Category */}
          <View style={{ gap: spacing.sm }}>
            <Text style={{ color: colors.textMuted, fontSize: fontSize.label }}>Category</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
              {incomeCategories.map((c) => (
                <CategoryChip
                  key={c.id}
                  emoji={c.emoji}
                  name={c.name}
                  color={c.color}
                  selected={c.id === categoryId}
                  onPress={() => setCategoryId(c.id)}
                />
              ))}
            </View>
          </View>

          {/* Recurring toggle */}
          <View style={{
            backgroundColor: colors.surface, borderRadius: radius.lg,
            borderWidth: 1, borderColor: colors.border, padding: spacing.md, gap: spacing.md,
          }}>
            <Pressable
              onPress={() => setIsRecurring((v) => !v)}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <Ionicons name="repeat" size={20} color={isRecurring ? colors.success : colors.textMuted} />
                <Text style={{ color: colors.text, fontSize: fontSize.body, fontWeight: '500' }}>Recurring</Text>
              </View>
              <View style={{
                width: 44, height: 26, borderRadius: 13,
                backgroundColor: isRecurring ? colors.success : colors.surface2,
                justifyContent: 'center',
                paddingHorizontal: 2,
              }}>
                <View style={{
                  width: 22, height: 22, borderRadius: 11,
                  backgroundColor: '#fff',
                  transform: [{ translateX: isRecurring ? 18 : 0 }],
                }} />
              </View>
            </Pressable>

            {isRecurring && (
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                {(['daily', 'weekly', 'monthly'] as RecurrencePeriod[]).map((p) => (
                  <RecurrenceChip
                    key={p}
                    label={p.charAt(0).toUpperCase() + p.slice(1)}
                    selected={recurrencePeriod === p}
                    onPress={() => setRecurrencePeriod(p)}
                  />
                ))}
              </View>
            )}
          </View>

          {/* Note */}
          <View style={{ gap: spacing.xs }}>
            <Text style={{ color: colors.textMuted, fontSize: fontSize.label }}>Note (optional)</Text>
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder="Add a note…"
              placeholderTextColor={colors.textMuted}
              multiline
              style={{
                backgroundColor: colors.surface,
                borderRadius: radius.md,
                borderWidth: 1,
                borderColor: colors.border,
                color: colors.text,
                fontSize: fontSize.body,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm + 2,
                minHeight: 72,
                textAlignVertical: 'top',
              }}
              selectionColor={colors.success}
            />
          </View>

          {/* Save button */}
          <Pressable
            onPress={handleSave}
            disabled={!canSave}
            style={({ pressed }) => ({
              backgroundColor: canSave ? colors.success : colors.surface2,
              borderRadius: radius.md,
              paddingVertical: spacing.md,
              alignItems: 'center',
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <Text style={{ color: canSave ? '#fff' : colors.textMuted, fontSize: fontSize.body, fontWeight: '700' }}>
              Save Income
            </Text>
          </Pressable>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
