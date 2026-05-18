import React, { useState, useCallback } from 'react'
import {
  View, Text, FlatList, Pressable, StyleSheet, StatusBar,
  TextInput, Modal, Alert, KeyboardAvoidingView, Platform,
} from 'react-native'
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useDietStore } from '@modules/health/diet/dietStore'
import { MEAL_TYPE_LABELS, MEAL_TYPE_ICONS } from '@modules/health/diet/dietUtils'
import { colors, fonts, fontSize, spacing, radius } from '@core/theme'
import type { EntryWithFood } from '@core/db/dietQueries'

// ─── Edit grams modal ─────────────────────────────────────────────────────────

function EditGramsModal({
  entry,
  onConfirm,
  onClose,
}: {
  entry: EntryWithFood
  onConfirm: (grams: number) => void
  onClose: () => void
}) {
  const [grams, setGrams] = useState(String(entry.amountGrams))
  const parsed = parseFloat(grams)
  const valid = !isNaN(parsed) && parsed > 0

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.editOverlay}
    >
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      <View style={styles.editSheet}>
        <View style={styles.sheetHandle} />
        <Text style={styles.editTitle}>{entry.foodName}</Text>

        <Text style={styles.editLabel}>Amount (grams)</Text>
        <TextInput
          style={styles.editInput}
          value={grams}
          onChangeText={setGrams}
          keyboardType="decimal-pad"
          selectTextOnFocus
          autoFocus
        />

        <View style={styles.editActions}>
          <Pressable style={styles.editCancel} onPress={onClose}>
            <Text style={styles.editCancelText}>Cancel</Text>
          </Pressable>
          <Pressable
            style={[styles.editConfirm, !valid && styles.editConfirmDisabled]}
            onPress={() => valid && onConfirm(parsed)}
            disabled={!valid}
          >
            <Text style={styles.editConfirmText}>Update</Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  )
}

// ─── Save template modal ──────────────────────────────────────────────────────

function SaveTemplateModal({
  onConfirm,
  onClose,
}: {
  onConfirm: (name: string) => void
  onClose: () => void
}) {
  const [name, setName] = useState('')

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.editOverlay}
    >
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      <View style={styles.editSheet}>
        <View style={styles.sheetHandle} />
        <Text style={styles.editTitle}>Save as Template</Text>

        <Text style={styles.editLabel}>Template name</Text>
        <TextInput
          style={styles.editInput}
          value={name}
          onChangeText={setName}
          placeholder="e.g. Post-workout shake"
          placeholderTextColor={colors.textMuted}
          autoFocus
        />

        <View style={styles.editActions}>
          <Pressable style={styles.editCancel} onPress={onClose}>
            <Text style={styles.editCancelText}>Cancel</Text>
          </Pressable>
          <Pressable
            style={[styles.editConfirm, !name.trim() && styles.editConfirmDisabled]}
            onPress={() => name.trim() && onConfirm(name.trim())}
            disabled={!name.trim()}
          >
            <Text style={styles.editConfirmText}>Save</Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  )
}

// ─── Entry row ────────────────────────────────────────────────────────────────

function EntryRow({
  entry,
  onEdit,
  onDelete,
}: {
  entry: EntryWithFood
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <View style={styles.entryRow}>
      <View style={styles.entryInfo}>
        <Text style={styles.entryName} numberOfLines={1}>{entry.foodName}</Text>
        {entry.brand && <Text style={styles.entryBrand}>{entry.brand}</Text>}
        <View style={styles.entryMacroRow}>
          <Text style={styles.entryGrams}>{entry.amountGrams}g</Text>
          <Text style={styles.entryDot}>·</Text>
          <Text style={styles.entryCalories}>{Math.round(entry.calories)} kcal</Text>
          <Text style={styles.entryDot}>·</Text>
          <Text style={styles.entryMacro}>P {entry.proteinG}g</Text>
          <Text style={styles.entryDot}>·</Text>
          <Text style={styles.entryMacro}>C {entry.carbsG}g</Text>
          <Text style={styles.entryDot}>·</Text>
          <Text style={styles.entryMacro}>F {entry.fatG}g</Text>
        </View>
      </View>
      <View style={styles.entryActions}>
        <Pressable onPress={onEdit} style={styles.entryActionBtn}>
          <Ionicons name="pencil-outline" size={18} color={colors.textMuted} />
        </Pressable>
        <Pressable onPress={onDelete} style={styles.entryActionBtn}>
          <Ionicons name="trash-outline" size={18} color="#c0533a" />
        </Pressable>
      </View>
    </View>
  )
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function MealDetail() {
  const router = useRouter()
  const { mealId } = useLocalSearchParams<{ mealId: string }>()
  const { meals, loadToday, updateEntry, deleteEntry, deleteMeal, saveMealAsTemplate } = useDietStore()

  const [editingEntry, setEditingEntry] = useState<EntryWithFood | null>(null)
  const [showSaveTemplate, setShowSaveTemplate] = useState(false)

  useFocusEffect(useCallback(() => { loadToday() }, []))

  const mealData = meals.find((m) => m.meal.id === mealId)
  if (!mealData) {
    return (
      <View style={styles.screen}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Meal not found</Text>
        </View>
      </View>
    )
  }

  const { meal, entries, totalCalories, totalProteinG, totalCarbsG, totalFatG } = mealData
  const mealLabel = MEAL_TYPE_LABELS[meal.mealType] ?? meal.mealType
  const mealIcon = MEAL_TYPE_ICONS[meal.mealType] as any

  const handleDeleteEntry = (entry: EntryWithFood) => {
    Alert.alert('Remove food', `Remove ${entry.foodName}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => deleteEntry(entry.entryId, mealId) },
    ])
  }

  const handleDeleteMeal = () => {
    Alert.alert('Delete meal', `Delete this ${mealLabel}? All entries will be removed.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { deleteMeal(mealId); router.back() } },
    ])
  }

  const handleSaveTemplate = (name: string) => {
    saveMealAsTemplate(mealId, name)
    setShowSaveTemplate(false)
    Alert.alert('Saved', `"${name}" saved as a meal template.`)
  }

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flex: 1 }}>
          <Ionicons name={mealIcon} size={18} color={colors.diet} />
          <Text style={styles.headerTitle}>{mealLabel}</Text>
        </View>
        <Pressable onPress={() => setShowSaveTemplate(true)} style={styles.headerIconBtn}>
          <Ionicons name="bookmark-outline" size={22} color={colors.textMuted} />
        </Pressable>
        <Pressable onPress={handleDeleteMeal} style={styles.headerIconBtn}>
          <Ionicons name="trash-outline" size={22} color="#c0533a" />
        </Pressable>
      </View>

      {/* Totals card */}
      <View style={styles.totalsCard}>
        <View style={styles.totalItem}>
          <Text style={styles.totalVal}>{Math.round(totalCalories)}</Text>
          <Text style={styles.totalKey}>kcal</Text>
        </View>
        <View style={styles.totalSep} />
        <View style={styles.totalItem}>
          <Text style={styles.totalVal}>{totalProteinG}g</Text>
          <Text style={styles.totalKey}>protein</Text>
        </View>
        <View style={styles.totalSep} />
        <View style={styles.totalItem}>
          <Text style={styles.totalVal}>{totalCarbsG}g</Text>
          <Text style={styles.totalKey}>carbs</Text>
        </View>
        <View style={styles.totalSep} />
        <View style={styles.totalItem}>
          <Text style={styles.totalVal}>{totalFatG}g</Text>
          <Text style={styles.totalKey}>fat</Text>
        </View>
      </View>

      {/* Entries list */}
      <FlatList
        data={entries}
        keyExtractor={(item) => item.entryId}
        renderItem={({ item }) => (
          <EntryRow
            entry={item}
            onEdit={() => setEditingEntry(item)}
            onDelete={() => handleDeleteEntry(item)}
          />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="nutrition-outline" size={40} color={colors.textMuted} />
            <Text style={styles.emptyText}>No foods logged yet</Text>
          </View>
        }
      />

      {/* Add food FAB */}
      <View style={styles.fabContainer}>
        <Pressable
          style={styles.fab}
          onPress={() => router.push({ pathname: '/health/nutrition/food-search', params: { mealId, mealType: meal.mealType } })}
        >
          <Ionicons name="add" size={24} color={colors.bg} />
          <Text style={styles.fabText}>Add food</Text>
        </Pressable>
      </View>

      {/* Edit grams modal */}
      <Modal
        visible={editingEntry !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setEditingEntry(null)}
      >
        {editingEntry && (
          <EditGramsModal
            entry={editingEntry}
            onConfirm={(grams) => {
              updateEntry(editingEntry.entryId, mealId, grams, {
                id: editingEntry.foodId,
                name: editingEntry.foodName,
                caloriesPer100g: 0, proteinPer100g: 0, carbsPer100g: 0, fatPer100g: 0,
                isCustom: false, createdAt: '',
              })
              setEditingEntry(null)
            }}
            onClose={() => setEditingEntry(null)}
          />
        )}
      </Modal>

      {/* Save template modal */}
      <Modal
        visible={showSaveTemplate}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSaveTemplate(false)}
      >
        <SaveTemplateModal
          onConfirm={handleSaveTemplate}
          onClose={() => setShowSaveTemplate(false)}
        />
      </Modal>
    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingTop: 56, paddingBottom: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backBtn: { padding: spacing.xs, marginRight: spacing.xs },
  headerTitle: {
    fontFamily: `${fonts.ui}_700Bold`, fontSize: fontSize.sectionHeader, color: colors.text,
  },
  headerIconBtn: { padding: spacing.xs, marginLeft: spacing.xs },

  totalsCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border,
    paddingVertical: spacing.md,
  },
  totalItem: { alignItems: 'center' },
  totalVal: {
    fontFamily: `${fonts.mono}_600SemiBold`, fontSize: fontSize.sectionHeader, color: colors.text,
  },
  totalKey: {
    fontFamily: `${fonts.ui}_400Regular`, fontSize: fontSize.label, color: colors.textMuted,
  },
  totalSep: { width: 1, height: 32, backgroundColor: colors.border },

  list: { paddingHorizontal: spacing.md, paddingBottom: 100 },
  separator: { height: 1, backgroundColor: colors.border },

  entryRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  entryInfo: { flex: 1 },
  entryName: {
    fontFamily: `${fonts.ui}_600SemiBold`, fontSize: fontSize.body, color: colors.text,
  },
  entryBrand: {
    fontFamily: `${fonts.ui}_400Regular`, fontSize: fontSize.label, color: colors.textMuted,
  },
  entryMacroRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4, marginTop: 2 },
  entryGrams: {
    fontFamily: `${fonts.mono}_500Medium`, fontSize: fontSize.label, color: colors.diet,
  },
  entryCalories: {
    fontFamily: `${fonts.mono}_500Medium`, fontSize: fontSize.label, color: colors.text,
  },
  entryMacro: {
    fontFamily: `${fonts.mono}_400Regular`, fontSize: fontSize.label, color: colors.textMuted,
  },
  entryDot: { color: colors.border, fontSize: fontSize.label },
  entryActions: { flexDirection: 'row', gap: spacing.xs },
  entryActionBtn: { padding: spacing.xs },

  emptyState: { alignItems: 'center', paddingTop: spacing.xxl, gap: spacing.sm },
  emptyText: {
    fontFamily: `${fonts.ui}_400Regular`, fontSize: fontSize.body, color: colors.textMuted,
  },

  fabContainer: {
    position: 'absolute', bottom: spacing.xl, left: spacing.md, right: spacing.md,
  },
  fab: {
    backgroundColor: colors.diet, borderRadius: radius.md,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.xs, padding: spacing.md,
  },
  fabText: {
    fontFamily: `${fonts.ui}_700Bold`, fontSize: fontSize.body, color: colors.bg,
  },

  // Edit / save modals
  editOverlay: {
    flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)',
  },
  editSheet: {
    backgroundColor: colors.surface, borderTopLeftRadius: radius.lg * 2,
    borderTopRightRadius: radius.lg * 2,
    padding: spacing.md, paddingBottom: spacing.xxl,
    borderTopWidth: 1, borderColor: colors.border,
  },
  sheetHandle: {
    width: 36, height: 4, backgroundColor: colors.border,
    borderRadius: radius.full, alignSelf: 'center', marginBottom: spacing.md,
  },
  editTitle: {
    fontFamily: `${fonts.ui}_700Bold`, fontSize: fontSize.sectionHeader, color: colors.text,
    marginBottom: spacing.md,
  },
  editLabel: {
    fontFamily: `${fonts.ui}_400Regular`, fontSize: fontSize.label, color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  editInput: {
    backgroundColor: colors.surface2, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.borderAccent,
    padding: spacing.sm,
    fontFamily: `${fonts.mono}_600SemiBold`, fontSize: fontSize.sectionHeader, color: colors.text,
    textAlign: 'center', marginBottom: spacing.md,
  },
  editActions: { flexDirection: 'row', gap: spacing.sm },
  editCancel: {
    flex: 1, padding: spacing.md, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border, alignItems: 'center',
  },
  editCancelText: {
    fontFamily: `${fonts.ui}_600SemiBold`, fontSize: fontSize.body, color: colors.textMuted,
  },
  editConfirm: {
    flex: 1, padding: spacing.md, borderRadius: radius.md,
    backgroundColor: colors.diet, alignItems: 'center',
  },
  editConfirmDisabled: { opacity: 0.4 },
  editConfirmText: {
    fontFamily: `${fonts.ui}_700Bold`, fontSize: fontSize.body, color: colors.bg,
  },
})
