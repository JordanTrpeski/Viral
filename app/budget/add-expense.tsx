import { useState, useEffect } from 'react'
import {
  View, Text, TextInput, ScrollView, Pressable,
  KeyboardAvoidingView, Platform, Alert, Image,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import { colors, fontSize, spacing, radius } from '@core/theme'
import { useBudgetStore } from '@modules/budget/budgetStore'
import { localDateStr } from '@core/utils/units'

type Mode = 'quick' | 'full'
type PaymentMethod = 'cash' | 'card' | 'online'

// ── Date picker ───────────────────────────────────────────────────────────────

function DatePicker({ value, onChange }: { value: string; onChange: (d: string) => void }) {
  const today = localDateStr()
  function shift(days: number) {
    const d = new Date(value + 'T12:00:00')
    d.setDate(d.getDate() + days)
    const next = localDateStr(d)
    if (next <= today) onChange(next)
  }
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

// ── Payment chip ──────────────────────────────────────────────────────────────

const PAYMENT_ICONS: Record<PaymentMethod, string> = { cash: '💵', card: '💳', online: '🌐' }

function PaymentChip({ method, selected, onPress }: { method: PaymentMethod; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row', alignItems: 'center', gap: 4,
        paddingHorizontal: spacing.sm + 2, paddingVertical: spacing.xs,
        borderRadius: radius.full,
        backgroundColor: selected ? `${colors.budget}22` : colors.surface2,
        borderWidth: 1.5,
        borderColor: selected ? colors.budget : 'transparent',
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <Text style={{ fontSize: 13 }}>{PAYMENT_ICONS[method]}</Text>
      <Text style={{ color: selected ? colors.budget : colors.textMuted, fontSize: fontSize.label, fontWeight: '500' }}>
        {method.charAt(0).toUpperCase() + method.slice(1)}
      </Text>
    </Pressable>
  )
}

// ── Full mode: item row ───────────────────────────────────────────────────────

interface ItemRow { name: string; price: string }

function FullItemRow({ item, index, onChange, onRemove, isLast }: {
  item: ItemRow
  index: number
  onChange: (field: 'name' | 'price', val: string) => void
  onRemove: () => void
  isLast: boolean
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
      <TextInput
        value={item.name}
        onChangeText={(v) => onChange('name', v)}
        placeholder={`Item ${index + 1}`}
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
          value={item.price}
          onChangeText={(v) => onChange('price', v)}
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
      <Pressable onPress={onRemove} hitSlop={8} disabled={isLast}>
        <Ionicons name="remove-circle-outline" size={20} color={isLast ? colors.surface2 : colors.danger} />
      </Pressable>
    </View>
  )
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function AddExpenseScreen() {
  const router = useRouter()
  const { templateId, date: dateParam } = useLocalSearchParams<{ templateId?: string; date?: string }>()
  const { expenseCategories, addExpense, saveAsTemplate, recordUse, getTemplateItems, templates, loadTemplates } = useBudgetStore()
  const today      = localDateStr()
  const firstCatId = expenseCategories[0]?.id ?? ''

  const [mode, setMode]                 = useState<Mode>(templateId ? 'full' : 'quick')
  const [quickAmount, setQuickAmount]   = useState('')
  const [merchantName, setMerchantName] = useState('')
  const [items, setItems]               = useState<ItemRow[]>([{ name: '', price: '' }])
  const [categoryId, setCategoryId]     = useState(firstCatId)
  const [date, setDate]                 = useState(dateParam ?? today)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null)
  const [receiptPhoto, setReceiptPhoto] = useState<string | null>(null)
  const [saveTemplate, setSaveTemplate] = useState(false)
  const [templateName, setTemplateName] = useState('')

  // Pre-fill from template when templateId param is present
  useEffect(() => {
    if (!templateId) return
    loadTemplates()
  }, [templateId])

  useEffect(() => {
    if (!templateId) return
    const tpl = templates.find((t) => t.id === templateId)
    if (!tpl) return
    const tplItems = getTemplateItems(templateId)
    setMerchantName(tpl.name)
    setItems(tplItems.length > 0
      ? tplItems.map((i) => ({ name: i.itemName, price: String(i.defaultAmount) }))
      : [{ name: '', price: '' }],
    )
  }, [templates, templateId])

  const quickAmt = parseFloat(quickAmount) || 0
  const fullTotal = items.reduce((s, r) => s + (parseFloat(r.price) || 0), 0)
  const total     = mode === 'quick' ? quickAmt : fullTotal

  const canSave = total > 0 && categoryId.length > 0

  function updateItem(index: number, field: 'name' | 'price', val: string) {
    setItems((prev) => prev.map((r, i) => i === index ? { ...r, [field]: val } : r))
  }

  function addItem() {
    setItems((prev) => [...prev, { name: '', price: '' }])
  }

  function removeItem(index: number) {
    if (items.length === 1) return
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  async function pickPhoto() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow photo access to attach a receipt.')
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: true,
    })
    if (!result.canceled) setReceiptPhoto(result.assets[0].uri)
  }

  async function takePhoto() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow camera access to take a receipt photo.')
      return
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: true,
    })
    if (!result.canceled) setReceiptPhoto(result.assets[0].uri)
  }

  function showPhotoOptions() {
    Alert.alert('Receipt Photo', 'Choose source', [
      { text: 'Camera', onPress: takePhoto },
      { text: 'Photo Library', onPress: pickPhoto },
      { text: 'Cancel', style: 'cancel' },
    ])
  }

  function handleSave() {
    if (!canSave) return
    const expenseItems = mode === 'quick'
      ? [{ name: expenseCategories.find((c) => c.id === categoryId)?.name ?? 'Expense', amount: quickAmt }]
      : items
          .filter((r) => parseFloat(r.price) > 0)
          .map((r) => ({ name: r.name.trim() || 'Item', amount: parseFloat(r.price) }))

    addExpense(
      mode === 'full' && merchantName.trim() ? merchantName.trim() : null,
      date,
      categoryId,
      paymentMethod,
      null,
      expenseItems,
      receiptPhoto,
    )

    // Record template use if loaded from a template
    if (templateId) {
      recordUse(templateId, null, total)
    }

    // Save as new template if toggled
    if (saveTemplate && templateName.trim() && mode === 'full') {
      saveAsTemplate(templateName.trim(), categoryId, expenseItems)
    }

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
            Add Expense
          </Text>
          <Pressable onPress={handleSave} disabled={!canSave} style={{ paddingHorizontal: spacing.md, paddingVertical: spacing.xs }}>
            <Text style={{ color: canSave ? colors.budget : colors.textMuted, fontSize: fontSize.body, fontWeight: '700' }}>Save</Text>
          </Pressable>
        </View>

        {/* Mode toggle */}
        <View style={{
          flexDirection: 'row', backgroundColor: colors.surface2,
          margin: spacing.md, borderRadius: radius.sm, padding: 2,
        }}>
          {(['quick', 'full'] as Mode[]).map((m) => (
            <Pressable
              key={m}
              onPress={() => setMode(m)}
              style={{
                flex: 1, paddingVertical: spacing.xs + 2,
                borderRadius: radius.sm - 2,
                backgroundColor: mode === m ? colors.surface : 'transparent',
                alignItems: 'center',
              }}
            >
              <Text style={{ color: mode === m ? colors.text : colors.textMuted, fontSize: fontSize.label, fontWeight: '600' }}>
                {m === 'quick' ? 'Quick' : 'Full Entry'}
              </Text>
            </Pressable>
          ))}
        </View>

        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, gap: spacing.lg }}>

          {mode === 'quick' ? (
            /* ── Quick mode ─────────────────────────────────────── */
            <View style={{ alignItems: 'center', gap: spacing.xs }}>
              <Text style={{ color: colors.textMuted, fontSize: fontSize.label }}>Amount</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <Text style={{ color: colors.textMuted, fontSize: 32, fontWeight: '300' }}>€</Text>
                <TextInput
                  value={quickAmount}
                  onChangeText={setQuickAmount}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor={colors.surface2}
                  selectTextOnFocus
                  autoFocus
                  style={{
                    color: colors.text, fontSize: 48, fontWeight: '700',
                    minWidth: 120, textAlign: 'center',
                  }}
                  selectionColor={colors.budget}
                />
              </View>
            </View>
          ) : (
            /* ── Full mode ──────────────────────────────────────── */
            <View style={{ gap: spacing.md }}>
              {/* Merchant */}
              <View style={{ gap: spacing.xs }}>
                <Text style={{ color: colors.textMuted, fontSize: fontSize.label }}>Merchant (optional)</Text>
                <TextInput
                  value={merchantName}
                  onChangeText={setMerchantName}
                  placeholder="e.g. Lidl, Amazon…"
                  placeholderTextColor={colors.textMuted}
                  autoFocus
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
              <View style={{ gap: spacing.xs }}>
                <Text style={{ color: colors.textMuted, fontSize: fontSize.label }}>Items</Text>
                {items.map((item, i) => (
                  <FullItemRow
                    key={i}
                    item={item}
                    index={i}
                    onChange={(f, v) => updateItem(i, f, v)}
                    onRemove={() => removeItem(i)}
                    isLast={items.length === 1}
                  />
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
              </View>

              {/* Live total */}
              <View style={{
                flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                backgroundColor: colors.surface, borderRadius: radius.md,
                borderWidth: 1, borderColor: colors.border, padding: spacing.md,
              }}>
                <Text style={{ color: colors.textMuted, fontSize: fontSize.body }}>Total</Text>
                <Text style={{ color: colors.text, fontSize: fontSize.sectionHeader, fontWeight: '700' }}>
                  €{fullTotal.toFixed(2)}
                </Text>
              </View>

              {/* Receipt photo */}
              <View style={{ gap: spacing.sm }}>
                <Text style={{ color: colors.textMuted, fontSize: fontSize.label }}>Receipt (optional)</Text>
                {receiptPhoto ? (
                  <View style={{ gap: spacing.sm }}>
                    <Image
                      source={{ uri: receiptPhoto }}
                      style={{ width: '100%', height: 160, borderRadius: radius.md, resizeMode: 'cover' }}
                    />
                    <Pressable
                      onPress={() => setReceiptPhoto(null)}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}
                    >
                      <Ionicons name="trash-outline" size={16} color={colors.danger} />
                      <Text style={{ color: colors.danger, fontSize: fontSize.label }}>Remove photo</Text>
                    </Pressable>
                  </View>
                ) : (
                  <Pressable
                    onPress={showPhotoOptions}
                    style={({ pressed }) => ({
                      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                      gap: spacing.sm, backgroundColor: colors.surface2, borderRadius: radius.md,
                      borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed',
                      paddingVertical: spacing.md, opacity: pressed ? 0.8 : 1,
                    })}
                  >
                    <Ionicons name="camera-outline" size={20} color={colors.textMuted} />
                    <Text style={{ color: colors.textMuted, fontSize: fontSize.label }}>Attach receipt photo</Text>
                  </Pressable>
                )}
              </View>
            </View>
          )}

          {/* Category */}
          <View style={{ gap: spacing.sm }}>
            <Text style={{ color: colors.textMuted, fontSize: fontSize.label }}>Category</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
              {expenseCategories.map((c) => (
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

          {/* Payment method */}
          <View style={{ gap: spacing.sm }}>
            <Text style={{ color: colors.textMuted, fontSize: fontSize.label }}>Payment method (optional)</Text>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              {(['cash', 'card', 'online'] as PaymentMethod[]).map((m) => (
                <PaymentChip
                  key={m}
                  method={m}
                  selected={paymentMethod === m}
                  onPress={() => setPaymentMethod(paymentMethod === m ? null : m)}
                />
              ))}
            </View>
          </View>

          {/* Save as template (full mode only) */}
          {mode === 'full' && (
            <View style={{
              backgroundColor: colors.surface, borderRadius: radius.lg,
              borderWidth: 1, borderColor: colors.border, padding: spacing.md, gap: spacing.md,
            }}>
              <Pressable
                onPress={() => setSaveTemplate((v) => !v)}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                  <Ionicons name="copy-outline" size={18} color={saveTemplate ? colors.budget : colors.textMuted} />
                  <Text style={{ color: colors.text, fontSize: fontSize.body, fontWeight: '500' }}>Save as Template</Text>
                </View>
                <View style={{
                  width: 44, height: 26, borderRadius: 13,
                  backgroundColor: saveTemplate ? colors.budget : colors.surface2,
                  justifyContent: 'center', paddingHorizontal: 2,
                }}>
                  <View style={{
                    width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff',
                    transform: [{ translateX: saveTemplate ? 18 : 0 }],
                  }} />
                </View>
              </Pressable>
              {saveTemplate && (
                <TextInput
                  value={templateName}
                  onChangeText={setTemplateName}
                  placeholder="Template name"
                  placeholderTextColor={colors.textMuted}
                  style={{
                    backgroundColor: colors.surface2, borderRadius: radius.sm,
                    color: colors.text, fontSize: fontSize.body,
                    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
                  }}
                  selectionColor={colors.budget}
                />
              )}
            </View>
          )}

          {/* Save button */}
          <Pressable
            onPress={handleSave}
            disabled={!canSave}
            style={({ pressed }) => ({
              backgroundColor: canSave ? colors.budget : colors.surface2,
              borderRadius: radius.md,
              paddingVertical: spacing.md,
              alignItems: 'center',
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <Text style={{ color: canSave ? '#000' : colors.textMuted, fontSize: fontSize.body, fontWeight: '700' }}>
              Save Expense {canSave ? `· €${total.toFixed(2)}` : ''}
            </Text>
          </Pressable>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
