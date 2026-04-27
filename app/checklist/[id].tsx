import { useEffect, useRef, useState } from 'react'
import { View, Text, TextInput, ScrollView, Pressable, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring } from 'react-native-reanimated'
import { colors, fontSize, spacing, radius } from '@core/theme'
import { useChecklistStore } from '@modules/checklist/checklistStore'
import type { ChecklistItem } from '@core/db/checklistQueries'

// ─── Animated item row ────────────────────────────────────────────────────────

function ItemRow({ item, isFirst, isLast, onToggle, onDelete, onMoveUp, onMoveDown }: {
  item: ChecklistItem
  isFirst: boolean
  isLast: boolean
  onToggle: () => void
  onDelete: () => void
  onMoveUp: () => void
  onMoveDown: () => void
}) {
  const opacity = useSharedValue(item.isChecked ? 0.45 : 1)
  const scale = useSharedValue(1)
  const textStyle = useAnimatedStyle(() => ({ opacity: opacity.value }))

  useEffect(() => {
    opacity.value = withTiming(item.isChecked ? 0.45 : 1, { duration: 200 })
  }, [item.isChecked])

  function handleToggle() {
    scale.value = withSpring(0.88, { damping: 10 }, () => {
      scale.value = withSpring(1, { damping: 8 })
    })
    onToggle()
  }

  return (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      gap: spacing.sm,
    }}>
      {/* Checkmark */}
      <Pressable onPress={handleToggle} hitSlop={8}>
        <Animated.View style={{ transform: [{ scale: scale.value }] }}>
          <Ionicons
            name={item.isChecked ? 'checkmark-circle' : 'ellipse-outline'}
            size={24}
            color={item.isChecked ? colors.success : colors.textMuted}
          />
        </Animated.View>
      </Pressable>

      {/* Title */}
      <Animated.View style={[{ flex: 1 }, textStyle]}>
        <Text style={{
          color: colors.text,
          fontSize: fontSize.body,
          textDecorationLine: item.isChecked ? 'line-through' : 'none',
        }}>
          {item.title}
        </Text>
      </Animated.View>

      {/* Reorder arrows */}
      <View style={{ flexDirection: 'row', gap: 2 }}>
        <Pressable onPress={onMoveUp} disabled={isFirst} hitSlop={8}>
          <Ionicons name="chevron-up" size={16} color={isFirst ? 'transparent' : colors.textMuted} />
        </Pressable>
        <Pressable onPress={onMoveDown} disabled={isLast} hitSlop={8}>
          <Ionicons name="chevron-down" size={16} color={isLast ? 'transparent' : colors.textMuted} />
        </Pressable>
      </View>

      {/* Delete */}
      <Pressable onPress={onDelete} hitSlop={8}>
        <Ionicons name="close" size={18} color={colors.textMuted} />
      </Pressable>
    </View>
  )
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function ChecklistDetailScreen() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()

  const { checklists, items, loadItems, addItem, deleteItem, toggleItem, moveItem, resetChecklist, renameChecklist, setTemplate } = useChecklistStore()

  const checklist = checklists.find((c) => c.id === id)
  const [newItemText, setNewItemText] = useState('')
  const [editingName, setEditingName] = useState(false)
  const [nameVal, setNameVal] = useState(checklist?.name ?? '')
  const inputRef = useRef<TextInput>(null)

  useEffect(() => {
    if (id) loadItems(id)
  }, [id])

  useEffect(() => {
    if (checklist) setNameVal(checklist.name)
  }, [checklist?.name])

  if (!id) return null

  const checkedCount = items.filter((i) => i.isChecked).length
  const totalCount = items.length
  const progress = totalCount > 0 ? checkedCount / totalCount : 0

  function handleAddItem() {
    if (!newItemText.trim()) return
    addItem(id, newItemText.trim())
    setNewItemText('')
  }

  function handleDeleteItem(itemId: string) {
    Alert.alert(
      'Delete Item',
      'Remove this item?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteItem(id, itemId) },
      ],
    )
  }

  function handleReset() {
    Alert.alert(
      'Reset Checklist',
      'Uncheck all items?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reset', onPress: () => resetChecklist(id) },
      ],
    )
  }

  function handleSaveName() {
    if (nameVal.trim()) renameChecklist(id, nameVal.trim())
    setEditingName(false)
  }

  function handleToggleTemplate() {
    setTemplate(id, !checklist?.isTemplate)
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Header */}
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
        borderBottomWidth: 1, borderBottomColor: colors.border, gap: spacing.sm,
      }}>
        <Pressable onPress={() => router.back()} style={{ padding: spacing.xs }}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>

        {editingName ? (
          <TextInput
            value={nameVal}
            onChangeText={setNameVal}
            autoFocus
            onBlur={handleSaveName}
            onSubmitEditing={handleSaveName}
            style={{
              flex: 1, color: colors.text, fontSize: fontSize.body,
              fontWeight: '600', borderBottomWidth: 1, borderBottomColor: colors.primary,
            }}
            selectionColor={colors.primary}
          />
        ) : (
          <Pressable onPress={() => setEditingName(true)} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text style={{ color: colors.text, fontSize: fontSize.body, fontWeight: '600' }} numberOfLines={1}>
              {checklist?.name ?? 'Checklist'}
            </Text>
            <Ionicons name="pencil" size={12} color={colors.textMuted} />
          </Pressable>
        )}

        {/* Template toggle */}
        <Pressable onPress={handleToggleTemplate} style={{ padding: spacing.xs }}>
          <Ionicons
            name={checklist?.isTemplate ? 'bookmark' : 'bookmark-outline'}
            size={20}
            color={checklist?.isTemplate ? colors.primary : colors.textMuted}
          />
        </Pressable>

        {/* Reset */}
        <Pressable onPress={handleReset} style={{ padding: spacing.xs }}>
          <Ionicons name="refresh" size={20} color={colors.textMuted} />
        </Pressable>
      </View>

      {/* Progress bar */}
      {totalCount > 0 && (
        <View style={{ paddingHorizontal: spacing.md, paddingVertical: spacing.xs, gap: 4 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: colors.textMuted, fontSize: fontSize.label }}>
              {checkedCount} of {totalCount} done
            </Text>
            {checkedCount === totalCount && totalCount > 0 && (
              <Text style={{ color: colors.success, fontSize: fontSize.label, fontWeight: '600' }}>
                All done!
              </Text>
            )}
          </View>
          <View style={{ height: 3, backgroundColor: colors.surface2, borderRadius: radius.full, overflow: 'hidden' }}>
            <Animated.View
              style={{
                height: '100%',
                width: `${progress * 100}%`,
                backgroundColor: checkedCount === totalCount ? colors.success : colors.primary,
                borderRadius: radius.full,
              }}
            />
          </View>
        </View>
      )}

      {/* Items list */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: spacing.md, paddingBottom: spacing.xxl }}
        keyboardShouldPersistTaps="handled"
      >
        {items.length === 0 && (
          <View style={{ alignItems: 'center', paddingVertical: spacing.xl }}>
            <Ionicons name="list-outline" size={40} color={colors.textMuted} style={{ marginBottom: spacing.sm }} />
            <Text style={{ color: colors.textMuted, fontSize: fontSize.body }}>Add your first item below</Text>
          </View>
        )}

        {items.map((item, idx) => (
          <ItemRow
            key={item.id}
            item={item}
            isFirst={idx === 0}
            isLast={idx === items.length - 1}
            onToggle={() => toggleItem(id, item.id)}
            onDelete={() => handleDeleteItem(item.id)}
            onMoveUp={() => moveItem(id, item.id, 'up')}
            onMoveDown={() => moveItem(id, item.id, 'down')}
          />
        ))}

        {/* Add item row */}
        <View style={{
          flexDirection: 'row', alignItems: 'center',
          paddingVertical: spacing.sm, gap: spacing.sm,
        }}>
          <Ionicons name="add-circle-outline" size={24} color={colors.primary} />
          <TextInput
            ref={inputRef}
            value={newItemText}
            onChangeText={setNewItemText}
            placeholder="Add item…"
            placeholderTextColor={colors.textMuted}
            returnKeyType="done"
            onSubmitEditing={handleAddItem}
            style={{
              flex: 1,
              color: colors.text,
              fontSize: fontSize.body,
              paddingVertical: spacing.xs,
            }}
            selectionColor={colors.primary}
          />
          {newItemText.length > 0 && (
            <Pressable onPress={handleAddItem}>
              <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
            </Pressable>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
