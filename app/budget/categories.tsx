import { useEffect, useState, useRef } from 'react'
import { View, Text, ScrollView, Pressable, TextInput, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import BottomSheet, { BottomSheetTextInput, BottomSheetView } from '@gorhom/bottom-sheet'
import { colors, fontSize, spacing, radius } from '@core/theme'
import { useBudgetStore } from '@modules/budget/budgetStore'
import type { BudgetCategory } from '@core/db/budgetQueries'

// ── Predefined color palette ───────────────────────────────────────────────────

const COLOR_PALETTE = [
  '#FF453A', '#FF9F0A', '#FFD60A', '#30D158', '#34C759',
  '#64D2FF', '#0A84FF', '#5E5CE6', '#6C63FF', '#BF5AF2',
  '#FF6B9D', '#FF6B00', '#FF2D55', '#5AC8FA', '#4CD964',
  '#8E8E93', '#636366', '#48484A', '#007AFF', '#FF9500',
]

// ── Category row ──────────────────────────────────────────────────────────────

function CategoryRow({ cat, spending, onEdit, onMoveUp, onMoveDown, isFirst, isLast }: {
  cat: BudgetCategory
  spending: number
  onEdit: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  isFirst: boolean
  isLast: boolean
}) {
  const pct = cat.monthlyLimit && cat.monthlyLimit > 0 ? spending / cat.monthlyLimit : null
  const barColor = pct == null
    ? cat.color
    : pct >= 1 ? colors.danger : pct >= 0.75 ? colors.warning : colors.success

  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: colors.surface, borderRadius: radius.md,
      borderWidth: 1, borderColor: colors.border,
      padding: spacing.sm, gap: spacing.sm,
      opacity: cat.isArchived ? 0.45 : 1,
    }}>
      {/* Reorder */}
      <View style={{ alignItems: 'center', gap: 2 }}>
        <Pressable onPress={onMoveUp} disabled={isFirst} hitSlop={4}>
          <Ionicons name="chevron-up" size={16} color={isFirst ? colors.surface2 : colors.textMuted} />
        </Pressable>
        <Pressable onPress={onMoveDown} disabled={isLast} hitSlop={4}>
          <Ionicons name="chevron-down" size={16} color={isLast ? colors.surface2 : colors.textMuted} />
        </Pressable>
      </View>

      {/* Color + emoji */}
      <View style={{
        width: 36, height: 36, borderRadius: radius.sm,
        backgroundColor: `${cat.color}22`, alignItems: 'center', justifyContent: 'center',
      }}>
        <Text style={{ fontSize: 18 }}>{cat.emoji}</Text>
      </View>

      {/* Name + progress */}
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.text, fontSize: fontSize.body, fontWeight: '500' }}>{cat.name}</Text>
        {cat.monthlyLimit != null && (
          <View style={{ marginTop: 4 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
              <Text style={{ color: colors.textMuted, fontSize: fontSize.micro }}>
                €{spending.toFixed(0)} / €{cat.monthlyLimit.toFixed(0)}
              </Text>
              {pct != null && (
                <Text style={{ color: barColor, fontSize: fontSize.micro, fontWeight: '600' }}>
                  {Math.round(pct * 100)}%
                </Text>
              )}
            </View>
            <View style={{ height: 3, backgroundColor: colors.surface2, borderRadius: radius.full, overflow: 'hidden' }}>
              <View style={{ width: `${Math.min(100, (pct ?? 0) * 100)}%`, height: '100%', backgroundColor: barColor, borderRadius: radius.full }} />
            </View>
          </View>
        )}
        {cat.isArchived && (
          <Text style={{ color: colors.textMuted, fontSize: fontSize.micro, marginTop: 2 }}>Archived</Text>
        )}
      </View>

      {/* Edit */}
      <Pressable onPress={onEdit} hitSlop={8} style={{ padding: spacing.xs }}>
        <Ionicons name="pencil" size={16} color={colors.textMuted} />
      </Pressable>
    </View>
  )
}

// ── Main screen ───────────────────────────────────────────────────────────────

type TabType = 'expense' | 'income'

export default function CategoriesScreen() {
  const router   = useRouter()
  const { allCategories, categorySpending, loadCategories, createCategory, reorderCategories } = useBudgetStore()

  const [tab, setTab]           = useState<TabType>('expense')
  const [newName, setNewName]   = useState('')
  const [newEmoji, setNewEmoji] = useState('📦')
  const [newColor, setNewColor] = useState(COLOR_PALETTE[0])

  const sheetRef   = useRef<BottomSheet>(null)
  const snapPoints = ['60%']

  useEffect(() => { loadCategories() }, [])

  const visible = allCategories
    .filter((c) => c.type === tab)
    .sort((a, b) => a.orderIndex - b.orderIndex)

  function move(cat: BudgetCategory, dir: 'up' | 'down') {
    const list = [...visible]
    const idx  = list.findIndex((c) => c.id === cat.id)
    const swap = dir === 'up' ? idx - 1 : idx + 1
    if (swap < 0 || swap >= list.length) return
    ;[list[idx], list[swap]] = [list[swap], list[idx]]
    reorderCategories(tab, list.map((c) => c.id))
  }

  function handleCreate() {
    if (!newName.trim()) return
    createCategory(newName.trim(), tab, newEmoji, newColor)
    setNewName('')
    setNewEmoji('📦')
    setNewColor(COLOR_PALETTE[0])
    sheetRef.current?.close()
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
          Categories
        </Text>
        <Pressable onPress={() => sheetRef.current?.expand()} style={{ padding: spacing.sm }}>
          <Ionicons name="add" size={24} color={colors.budget} />
        </Pressable>
      </View>

      {/* Tab switcher */}
      <View style={{
        flexDirection: 'row', backgroundColor: colors.surface2,
        margin: spacing.md, borderRadius: radius.sm, padding: 2,
      }}>
        {(['expense', 'income'] as TabType[]).map((t) => (
          <Pressable
            key={t}
            onPress={() => setTab(t)}
            style={{
              flex: 1, paddingVertical: spacing.xs + 2,
              borderRadius: radius.sm - 2,
              backgroundColor: tab === t ? colors.surface : 'transparent',
              alignItems: 'center',
            }}
          >
            <Text style={{ color: tab === t ? colors.text : colors.textMuted, fontSize: fontSize.label, fontWeight: '600' }}>
              {t === 'expense' ? 'Expense' : 'Income'}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.md, paddingBottom: spacing.xl, gap: spacing.xs }}>
        {visible.map((cat, i) => (
          <CategoryRow
            key={cat.id}
            cat={cat}
            spending={categorySpending[cat.id] ?? 0}
            onEdit={() => router.push(`/budget/category-edit?id=${cat.id}` as never)}
            onMoveUp={() => move(cat, 'up')}
            onMoveDown={() => move(cat, 'down')}
            isFirst={i === 0}
            isLast={i === visible.length - 1}
          />
        ))}

        {visible.length === 0 && (
          <View style={{ alignItems: 'center', paddingVertical: spacing.xxl, gap: spacing.md }}>
            <Ionicons name="albums-outline" size={40} color={colors.textMuted} />
            <Text style={{ color: colors.textMuted, fontSize: fontSize.body }}>No {tab} categories yet</Text>
          </View>
        )}
      </ScrollView>

      {/* Add category bottom sheet */}
      <BottomSheet
        ref={sheetRef}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        backgroundStyle={{ backgroundColor: colors.surface }}
        handleIndicatorStyle={{ backgroundColor: colors.textMuted }}
      >
        <BottomSheetView style={{ padding: spacing.lg, gap: spacing.lg }}>
          <Text style={{ color: colors.text, fontSize: fontSize.sectionHeader, fontWeight: '600' }}>
            New {tab === 'expense' ? 'Expense' : 'Income'} Category
          </Text>

          {/* Emoji + name row */}
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <BottomSheetTextInput
              value={newEmoji}
              onChangeText={setNewEmoji}
              style={{
                width: 52, height: 52, textAlign: 'center', fontSize: 24,
                backgroundColor: colors.surface2, borderRadius: radius.md,
                color: colors.text,
              }}
            />
            <BottomSheetTextInput
              value={newName}
              onChangeText={setNewName}
              placeholder="Category name"
              placeholderTextColor={colors.textMuted}
              style={{
                flex: 1, backgroundColor: colors.surface2, borderRadius: radius.md,
                color: colors.text, fontSize: fontSize.body,
                paddingHorizontal: spacing.md,
              }}
            />
          </View>

          {/* Color palette */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {COLOR_PALETTE.map((c) => (
              <Pressable
                key={c}
                onPress={() => setNewColor(c)}
                style={{
                  width: 32, height: 32, borderRadius: 16,
                  backgroundColor: c,
                  borderWidth: newColor === c ? 3 : 0,
                  borderColor: '#fff',
                }}
              />
            ))}
          </View>

          {/* Save */}
          <Pressable
            onPress={handleCreate}
            disabled={!newName.trim()}
            style={({ pressed }) => ({
              backgroundColor: newName.trim() ? colors.budget : colors.surface2,
              borderRadius: radius.md,
              paddingVertical: spacing.md,
              alignItems: 'center',
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <Text style={{ color: newName.trim() ? '#000' : colors.textMuted, fontSize: fontSize.body, fontWeight: '700' }}>
              Create Category
            </Text>
          </Pressable>
        </BottomSheetView>
      </BottomSheet>
    </SafeAreaView>
  )
}
