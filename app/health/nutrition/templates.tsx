import React, { useCallback, useState } from 'react'
import {
  View, Text, FlatList, Pressable, StyleSheet, StatusBar,
  Modal, Alert, KeyboardAvoidingView, Platform,
} from 'react-native'
import { useFocusEffect, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useDietStore } from '@modules/health/diet/dietStore'
import { MEAL_TYPE_LABELS, MEAL_TYPE_ICONS } from '@modules/health/diet/dietUtils'
import { colors, fonts, fontSize, spacing, radius } from '@core/theme'
import type { MealTemplateRow } from '@core/db/dietQueries'
import type { MealType } from '@modules/health/shared/types'

// ─── Meal picker sheet ────────────────────────────────────────────────────────

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack']

function MealPickerSheet({
  template,
  onPick,
  onClose,
}: {
  template: MealTemplateRow
  onPick: (mealType: MealType) => void
  onClose: () => void
}) {
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.sheetOverlay}
    >
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.sheetHandle} />
        <Text style={styles.sheetTitle}>Load "{template.name}"</Text>
        <Text style={styles.sheetSub}>Which meal should it be added to?</Text>

        {MEAL_TYPES.map((type) => (
          <Pressable key={type} style={styles.mealTypeRow} onPress={() => onPick(type)}>
            <Ionicons name={MEAL_TYPE_ICONS[type] as any} size={18} color={colors.diet} />
            <Text style={styles.mealTypeLabel}>{MEAL_TYPE_LABELS[type]}</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </Pressable>
        ))}
      </View>
    </KeyboardAvoidingView>
  )
}

// ─── Template card ────────────────────────────────────────────────────────────

function TemplateCard({
  template,
  onLoad,
  onDelete,
}: {
  template: MealTemplateRow
  onLoad: () => void
  onDelete: () => void
}) {
  const mealIcon = MEAL_TYPE_ICONS[template.mealType] as any
  const mealLabel = MEAL_TYPE_LABELS[template.mealType] ?? template.mealType

  return (
    <View style={styles.templateCard}>
      <View style={styles.templateInfo}>
        <View style={styles.templateTitleRow}>
          <Ionicons name={mealIcon} size={14} color={colors.diet} />
          <Text style={styles.templateMealType}>{mealLabel}</Text>
        </View>
        <Text style={styles.templateName}>{template.name}</Text>
        <Text style={styles.templateStats}>
          {template.entryCount} item{template.entryCount !== 1 ? 's' : ''} · {Math.round(template.totalCalories)} kcal
        </Text>
      </View>
      <View style={styles.templateActions}>
        <Pressable style={styles.templateDeleteBtn} onPress={onDelete}>
          <Ionicons name="trash-outline" size={18} color="#c0533a" />
        </Pressable>
        <Pressable style={styles.templateLoadBtn} onPress={onLoad}>
          <Text style={styles.templateLoadText}>Load</Text>
        </Pressable>
      </View>
    </View>
  )
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function MealTemplates() {
  const router = useRouter()
  const { meals, mealTemplates, loadMealTemplates, loadMealTemplate, createMeal, deleteMealTemplate } = useDietStore()

  const [selectedTemplate, setSelectedTemplate] = useState<MealTemplateRow | null>(null)

  useFocusEffect(useCallback(() => { loadMealTemplates() }, []))

  const handlePick = (mealType: MealType) => {
    if (!selectedTemplate) return

    const existing = meals.find((m) => m.meal.mealType === mealType)
    const mealId = existing?.meal.id ?? createMeal(mealType)

    loadMealTemplate(selectedTemplate.id, mealId)
    setSelectedTemplate(null)
    Alert.alert('Loaded', `"${selectedTemplate.name}" added to ${MEAL_TYPE_LABELS[mealType]}.`)
  }

  const handleDelete = (template: MealTemplateRow) => {
    Alert.alert('Delete template', `Delete "${template.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteMealTemplate(template.id) },
    ])
  }

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Meal Templates</Text>
      </View>

      <FlatList
        data={mealTemplates}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TemplateCard
            template={item}
            onLoad={() => setSelectedTemplate(item)}
            onDelete={() => handleDelete(item)}
          />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="copy-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No templates yet</Text>
            <Text style={styles.emptyBody}>
              Open a meal and tap the bookmark icon to save it as a template.
            </Text>
          </View>
        }
      />

      {/* Meal picker sheet */}
      <Modal
        visible={selectedTemplate !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedTemplate(null)}
      >
        {selectedTemplate && (
          <MealPickerSheet
            template={selectedTemplate}
            onPick={handlePick}
            onClose={() => setSelectedTemplate(null)}
          />
        )}
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

  list: { paddingHorizontal: spacing.md, paddingBottom: spacing.xxl, paddingTop: spacing.sm },
  separator: { height: 1, backgroundColor: colors.border },

  templateCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  templateInfo: { flex: 1 },
  templateTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
  templateMealType: {
    fontFamily: `${fonts.ui}_400Regular`, fontSize: fontSize.label, color: colors.diet,
  },
  templateName: {
    fontFamily: `${fonts.ui}_600SemiBold`, fontSize: fontSize.body, color: colors.text,
    marginBottom: 2,
  },
  templateStats: {
    fontFamily: `${fonts.mono}_400Regular`, fontSize: fontSize.label, color: colors.textMuted,
  },
  templateActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  templateDeleteBtn: { padding: spacing.xs },
  templateLoadBtn: {
    backgroundColor: colors.diet, borderRadius: radius.sm,
    paddingHorizontal: spacing.sm, paddingVertical: spacing.xs,
  },
  templateLoadText: {
    fontFamily: `${fonts.ui}_600SemiBold`, fontSize: fontSize.label, color: colors.bg,
  },

  emptyState: { alignItems: 'center', paddingTop: spacing.xxl, paddingHorizontal: spacing.xl, gap: spacing.sm },
  emptyTitle: {
    fontFamily: `${fonts.ui}_700Bold`, fontSize: fontSize.sectionHeader, color: colors.text,
  },
  emptyBody: {
    fontFamily: `${fonts.ui}_400Regular`, fontSize: fontSize.body, color: colors.textMuted,
    textAlign: 'center', lineHeight: 22,
  },

  // Sheet
  sheetOverlay: {
    flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    backgroundColor: colors.surface, borderTopLeftRadius: radius.lg * 2,
    borderTopRightRadius: radius.lg * 2,
    padding: spacing.md, paddingBottom: spacing.xxl,
    borderTopWidth: 1, borderColor: colors.border,
  },
  sheetHandle: {
    width: 36, height: 4, backgroundColor: colors.border,
    borderRadius: radius.full, alignSelf: 'center', marginBottom: spacing.md,
  },
  sheetTitle: {
    fontFamily: `${fonts.ui}_700Bold`, fontSize: fontSize.sectionHeader, color: colors.text,
    marginBottom: 4,
  },
  sheetSub: {
    fontFamily: `${fonts.ui}_400Regular`, fontSize: fontSize.body, color: colors.textMuted,
    marginBottom: spacing.md,
  },
  mealTypeRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  mealTypeLabel: {
    flex: 1,
    fontFamily: `${fonts.ui}_600SemiBold`, fontSize: fontSize.body, color: colors.text,
  },
})
