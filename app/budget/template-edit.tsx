import { useEffect, useState } from 'react'
import { View, Text, TextInput, ScrollView, Pressable, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { colors, fontSize, spacing, radius } from '@core/theme'
import { useBudgetStore } from '@modules/budget/budgetStore'
import { dbGetTemplateHistory } from '@core/db/budgetQueries'
import type { TemplateUse } from '@core/db/budgetQueries'

interface ItemRow { name: string; amount: string }

export default function TemplateEditScreen() {
  const router = useRouter()
  const { id }  = useLocalSearchParams<{ id: string }>()
  const { templates, updateTemplate, removeTemplate, getTemplateItems } = useBudgetStore()

  const template = templates.find((t) => t.id === id)

  const [name, setName]   = useState(template?.name ?? '')
  const [items, setItems] = useState<ItemRow[]>([])
  const [history, setHistory] = useState<TemplateUse[]>([])

  useEffect(() => {
    if (!id) return
    const stored = getTemplateItems(id)
    setItems(stored.length > 0
      ? stored.map((i) => ({ name: i.itemName, amount: String(i.defaultAmount) }))
      : [{ name: '', amount: '' }],
    )
    setHistory(dbGetTemplateHistory(id))
  }, [id])

  if (!template) return null

  const total    = items.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0)
  const canSave  = name.trim().length > 0 && total > 0

  function updateItem(index: number, field: 'name' | 'amount', val: string) {
    setItems((prev) => prev.map((r, i) => i === index ? { ...r, [field]: val } : r))
  }

  function addItem() { setItems((prev) => [...prev, { name: '', amount: '' }]) }

  function removeItem(index: number) {
    if (items.length === 1) return
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  function handleSave() {
    if (!canSave) return
    updateTemplate(
      template.id,
      name.trim(),
      items
        .filter((r) => parseFloat(r.amount) > 0)
        .map((r) => ({ name: r.name.trim() || 'Item', amount: parseFloat(r.amount) })),
    )
    router.back()
  }

  function handleDelete() {
    Alert.alert('Delete template?', `"${template.name}" will be permanently removed.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { removeTemplate(template.id); router.back() } },
    ])
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
          Edit Template
        </Text>
        <Pressable
          onPress={handleSave}
          disabled={!canSave}
          style={{ paddingHorizontal: spacing.md, paddingVertical: spacing.xs }}
        >
          <Text style={{ color: canSave ? colors.budget : colors.textMuted, fontSize: fontSize.body, fontWeight: '700' }}>Save</Text>
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>

        {/* Template name */}
        <View style={{ gap: spacing.xs }}>
          <Text style={{ color: colors.textMuted, fontSize: fontSize.label }}>Template Name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g. Weekly Groceries"
            placeholderTextColor={colors.textMuted}
            style={{
              backgroundColor: colors.surface, borderRadius: radius.md,
              borderWidth: 1, borderColor: colors.border,
              color: colors.text, fontSize: fontSize.body,
              paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2,
            }}
            selectionColor={colors.budget}
          />
        </View>

        {/* Item rows */}
        <View style={{ gap: spacing.sm }}>
          <Text style={{ color: colors.textMuted, fontSize: fontSize.label }}>Items</Text>
          {items.map((item, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <TextInput
                value={item.name}
                onChangeText={(v) => updateItem(i, 'name', v)}
                placeholder={`Item ${i + 1}`}
                placeholderTextColor={colors.textMuted}
                style={{
                  flex: 1,
                  backgroundColor: colors.surface2, borderRadius: radius.sm,
                  color: colors.text, fontSize: fontSize.body,
                  paddingHorizontal: spacing.sm, paddingVertical: spacing.xs + 2,
                }}
                selectionColor={colors.budget}
              />
              <View style={{
                flexDirection: 'row', alignItems: 'center',
                backgroundColor: colors.surface2, borderRadius: radius.sm,
                paddingHorizontal: spacing.sm, width: 96,
              }}>
                <Text style={{ color: colors.textMuted, fontSize: fontSize.body }}>€</Text>
                <TextInput
                  value={item.amount}
                  onChangeText={(v) => updateItem(i, 'amount', v)}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor={colors.textMuted}
                  selectTextOnFocus
                  style={{
                    flex: 1, color: colors.text, fontSize: fontSize.body, fontWeight: '600',
                    paddingVertical: spacing.xs + 2,
                  }}
                  selectionColor={colors.budget}
                />
              </View>
              <Pressable onPress={() => removeItem(i)} hitSlop={8} disabled={items.length === 1}>
                <Ionicons name="remove-circle-outline" size={20} color={items.length === 1 ? colors.surface2 : colors.danger} />
              </Pressable>
            </View>
          ))}

          <Pressable
            onPress={addItem}
            style={({ pressed }) => ({
              flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
              paddingVertical: spacing.xs, opacity: pressed ? 0.7 : 1,
            })}
          >
            <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
            <Text style={{ color: colors.primary, fontSize: fontSize.label, fontWeight: '500' }}>Add item</Text>
          </Pressable>

          {/* Live total */}
          <View style={{
            flexDirection: 'row', justifyContent: 'space-between',
            backgroundColor: colors.surface, borderRadius: radius.md,
            borderWidth: 1, borderColor: colors.border, padding: spacing.md,
          }}>
            <Text style={{ color: colors.textMuted, fontSize: fontSize.body }}>Estimated Total</Text>
            <Text style={{ color: colors.text, fontSize: fontSize.body, fontWeight: '700' }}>€{total.toFixed(2)}</Text>
          </View>
        </View>

        {/* Usage history */}
        {history.length > 0 && (
          <View style={{ gap: spacing.sm }}>
            <Text style={{ color: colors.textMuted, fontSize: fontSize.label }}>RECENT USES</Text>
            <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }}>
              {history.map((use, i) => {
                const d = new Date(use.usedAt)
                const label = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })
                return (
                  <View key={use.id} style={{
                    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                    padding: spacing.md,
                    borderTopWidth: i > 0 ? 1 : 0, borderTopColor: colors.border,
                  }}>
                    <Text style={{ color: colors.textMuted, fontSize: fontSize.label }}>{label}</Text>
                    <Text style={{ color: colors.text, fontSize: fontSize.label, fontWeight: '600' }}>€{use.total.toFixed(2)}</Text>
                  </View>
                )
              })}
            </View>
          </View>
        )}

        {/* Delete */}
        <Pressable
          onPress={handleDelete}
          style={({ pressed }) => ({
            flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
            backgroundColor: colors.surface, borderRadius: radius.md,
            borderWidth: 1, borderColor: colors.border,
            paddingVertical: spacing.md,
            opacity: pressed ? 0.8 : 1,
          })}
        >
          <Ionicons name="trash-outline" size={18} color={colors.danger} />
          <Text style={{ color: colors.danger, fontSize: fontSize.body, fontWeight: '500' }}>Delete Template</Text>
        </Pressable>

      </ScrollView>
    </SafeAreaView>
  )
}
