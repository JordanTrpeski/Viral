import React, { useState } from 'react'
import {
  View, Text, TextInput, ScrollView, Pressable, StyleSheet,
  StatusBar, Alert, KeyboardAvoidingView, Platform,
} from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useDietStore } from '@modules/health/diet/dietStore'
import { colors, fonts, fontSize, spacing, radius } from '@core/theme'

interface FieldConfig {
  key: string
  label: string
  placeholder: string
  required: boolean
  unit: string
}

const FIELDS: FieldConfig[] = [
  { key: 'name',              label: 'Food name',           placeholder: 'e.g. Chicken breast',  required: true,  unit: '' },
  { key: 'brand',             label: 'Brand (optional)',    placeholder: 'e.g. Tesco',            required: false, unit: '' },
  { key: 'caloriesPer100g',   label: 'Calories per 100g',   placeholder: '0',                     required: true,  unit: 'kcal' },
  { key: 'proteinPer100g',    label: 'Protein per 100g',    placeholder: '0',                     required: true,  unit: 'g' },
  { key: 'carbsPer100g',      label: 'Carbs per 100g',      placeholder: '0',                     required: true,  unit: 'g' },
  { key: 'fatPer100g',        label: 'Fat per 100g',        placeholder: '0',                     required: true,  unit: 'g' },
  { key: 'fiberPer100g',      label: 'Fiber per 100g (opt)', placeholder: '0',                    required: false, unit: 'g' },
]

function FormField({
  config,
  value,
  onChange,
  isNumeric,
}: {
  config: FieldConfig
  value: string
  onChange: (v: string) => void
  isNumeric: boolean
}) {
  return (
    <View style={styles.field}>
      <View style={styles.fieldLabelRow}>
        <Text style={styles.fieldLabel}>{config.label}</Text>
        {config.required && <Text style={styles.required}>*</Text>}
      </View>
      <View style={styles.inputRow}>
        <TextInput
          style={[styles.input, isNumeric && styles.inputNumeric]}
          value={value}
          onChangeText={onChange}
          placeholder={config.placeholder}
          placeholderTextColor={colors.textMuted}
          keyboardType={isNumeric ? 'decimal-pad' : 'default'}
        />
        {config.unit !== '' && (
          <Text style={styles.unit}>{config.unit}</Text>
        )}
      </View>
    </View>
  )
}

export default function FoodCreate() {
  const router = useRouter()
  const { createCustomFood } = useDietStore()

  const [name, setName]                   = useState('')
  const [brand, setBrand]                 = useState('')
  const [calories, setCalories]           = useState('')
  const [protein, setProtein]             = useState('')
  const [carbs, setCarbs]                 = useState('')
  const [fat, setFat]                     = useState('')
  const [fiber, setFiber]                 = useState('')

  const canSave =
    name.trim().length > 0 &&
    parseFloat(calories) >= 0 &&
    parseFloat(protein) >= 0 &&
    parseFloat(carbs) >= 0 &&
    parseFloat(fat) >= 0

  const handleSave = () => {
    if (!canSave) return

    createCustomFood({
      name: name.trim(),
      brand: brand.trim() || undefined,
      caloriesPer100g: parseFloat(calories) || 0,
      proteinPer100g:  parseFloat(protein)  || 0,
      carbsPer100g:    parseFloat(carbs)    || 0,
      fatPer100g:      parseFloat(fat)      || 0,
      fiberPer100g:    fiber.trim() ? parseFloat(fiber) : undefined,
    })

    Alert.alert('Saved', `"${name.trim()}" added to your food database.`, [
      { text: 'OK', onPress: () => router.back() },
    ])
  }

  const fieldValues: Record<string, string> = {
    name, brand,
    caloriesPer100g: calories, proteinPer100g: protein,
    carbsPer100g: carbs, fatPer100g: fat, fiberPer100g: fiber,
  }

  const fieldSetters: Record<string, (v: string) => void> = {
    name: setName, brand: setBrand,
    caloriesPer100g: setCalories, proteinPer100g: setProtein,
    carbsPer100g: setCarbs, fatPer100g: setFat, fiberPer100g: setFiber,
  }

  // Live macro preview (when numeric fields filled)
  const previewCal = parseFloat(calories) || 0
  const previewP   = parseFloat(protein)  || 0
  const previewC   = parseFloat(carbs)    || 0
  const previewF   = parseFloat(fat)      || 0
  const macroKcal  = previewP * 4 + previewC * 4 + previewF * 9

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Create Food</Text>
        <Pressable
          style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={!canSave}
        >
          <Text style={styles.saveBtnText}>Save</Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          {/* Fields */}
          {FIELDS.map((cfg) => (
            <FormField
              key={cfg.key}
              config={cfg}
              value={fieldValues[cfg.key]}
              onChange={fieldSetters[cfg.key]}
              isNumeric={cfg.key !== 'name' && cfg.key !== 'brand'}
            />
          ))}

          {/* Macro check card */}
          {previewCal > 0 && (
            <View style={styles.previewCard}>
              <Text style={styles.previewTitle}>Macro check (per 100g)</Text>
              <View style={styles.previewRow}>
                <View style={styles.previewItem}>
                  <Text style={styles.previewVal}>{previewCal}</Text>
                  <Text style={styles.previewKey}>listed kcal</Text>
                </View>
                <View style={styles.previewItem}>
                  <Text style={[styles.previewVal, { color: Math.abs(previewCal - macroKcal) > 20 ? '#c0533a' : colors.success }]}>
                    {Math.round(macroKcal)}
                  </Text>
                  <Text style={styles.previewKey}>calc kcal</Text>
                </View>
                <View style={styles.previewItem}>
                  <Text style={styles.previewVal}>{previewP}g</Text>
                  <Text style={styles.previewKey}>protein</Text>
                </View>
                <View style={styles.previewItem}>
                  <Text style={styles.previewVal}>{previewC}g</Text>
                  <Text style={styles.previewKey}>carbs</Text>
                </View>
                <View style={styles.previewItem}>
                  <Text style={styles.previewVal}>{previewF}g</Text>
                  <Text style={styles.previewKey}>fat</Text>
                </View>
              </View>
              {Math.abs(previewCal - macroKcal) > 20 && (
                <Text style={styles.previewWarning}>
                  Calculated kcal differs from listed — double-check values.
                </Text>
              )}
            </View>
          )}

          <View style={{ height: spacing.xxl }} />
        </ScrollView>
      </KeyboardAvoidingView>
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
    flex: 1,
    fontFamily: `${fonts.ui}_700Bold`, fontSize: fontSize.sectionHeader, color: colors.text,
  },
  saveBtn: {
    backgroundColor: colors.diet, borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
  },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: {
    fontFamily: `${fonts.ui}_700Bold`, fontSize: fontSize.body, color: colors.bg,
  },

  scroll: { padding: spacing.md },

  field: { marginBottom: spacing.md },
  fieldLabelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs },
  fieldLabel: {
    fontFamily: `${fonts.ui}_400Regular`, fontSize: fontSize.label, color: colors.textMuted,
  },
  required: {
    fontFamily: `${fonts.ui}_700Bold`, fontSize: fontSize.label, color: '#c0533a',
    marginLeft: 4,
  },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
  },
  input: {
    flex: 1, padding: spacing.sm,
    fontFamily: `${fonts.ui}_400Regular`, fontSize: fontSize.body, color: colors.text,
  },
  inputNumeric: {
    fontFamily: `${fonts.mono}_500Medium`, textAlign: 'right',
  },
  unit: {
    fontFamily: `${fonts.mono}_400Regular`, fontSize: fontSize.label, color: colors.textMuted,
    paddingRight: spacing.sm,
  },

  previewCard: {
    backgroundColor: colors.surface, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.md, marginTop: spacing.sm,
  },
  previewTitle: {
    fontFamily: `${fonts.ui}_600SemiBold`, fontSize: fontSize.label,
    color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  previewRow: { flexDirection: 'row', justifyContent: 'space-between' },
  previewItem: { alignItems: 'center' },
  previewVal: {
    fontFamily: `${fonts.mono}_600SemiBold`, fontSize: fontSize.body, color: colors.text,
  },
  previewKey: {
    fontFamily: `${fonts.ui}_400Regular`, fontSize: fontSize.micro, color: colors.textMuted,
  },
  previewWarning: {
    fontFamily: `${fonts.ui}_400Regular`, fontSize: fontSize.label, color: '#c0533a',
    marginTop: spacing.sm, textAlign: 'center',
  },
})
