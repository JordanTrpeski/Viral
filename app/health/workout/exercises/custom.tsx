import { useState, useEffect } from 'react'
import { View, Text, ScrollView, Pressable, TextInput, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import * as Crypto from 'expo-crypto'
import { colors, fontSize, spacing, radius, fonts } from '@core/theme'
import {
  insertCustomExercise, updateCustomExercise, getCustomExerciseById,
  type CustomExerciseParams,
} from '@core/db/workoutQueriesV2'
import type { ExerciseV2 } from '@modules/health/shared/types'

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES: { label: string; value: ExerciseV2['category'] }[] = [
  { label: 'Strength', value: 'strength' },
  { label: 'Cardio',   value: 'cardio' },
  { label: 'Mobility', value: 'mobility' },
]

const EQUIPMENT: { label: string; value: ExerciseV2['equipment'] }[] = [
  { label: 'Barbell',     value: 'barbell' },
  { label: 'Dumbbell',    value: 'dumbbell' },
  { label: 'Machine',     value: 'machine' },
  { label: 'Bodyweight',  value: 'bodyweight' },
  { label: 'Cable',       value: 'cable' },
  { label: 'Band',        value: 'band' },
  { label: 'Other',       value: 'other' },
]

const DIFFICULTY: { label: string; value: ExerciseV2['difficulty']; color: string }[] = [
  { label: 'Beginner',     value: 'beginner',     color: colors.success ?? '#4caf50' },
  { label: 'Intermediate', value: 'intermediate', color: colors.warning ?? '#ff9800' },
  { label: 'Advanced',     value: 'advanced',     color: '#c0533a' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseMuscles(raw: string): string[] {
  return raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length > 0)
}

// ─── Chip row ─────────────────────────────────────────────────────────────────

function ChipRow<T extends string>({
  label, options, selected, onSelect,
}: {
  label: string
  options: { label: string; value: T; color?: string }[]
  selected: T
  onSelect: (v: T) => void
}) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={{
        color: colors.textMuted,
        fontSize: fontSize.micro,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        fontFamily: `${fonts.ui}_600SemiBold`,
      }}>
        {label}
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
        {options.map((opt) => {
          const active = selected === opt.value
          const accent = opt.color ?? colors.primary
          return (
            <View key={opt.value} style={{
              borderRadius: radius.full,
              overflow: 'hidden',
              borderWidth: 1,
              borderColor: active ? accent : colors.border,
              backgroundColor: active ? `${accent}22` : colors.surface2,
            }}>
              <Pressable
                onPress={() => onSelect(opt.value)}
                style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1, paddingHorizontal: spacing.md, paddingVertical: 7 })}
              >
                <Text style={{
                  color: active ? accent : colors.textMuted,
                  fontSize: fontSize.label,
                  fontWeight: active ? '700' : '400',
                  fontFamily: active ? `${fonts.ui}_700Bold` : `${fonts.ui}_400Regular`,
                }}>
                  {opt.label}
                </Text>
              </Pressable>
            </View>
          )
        })}
      </View>
    </View>
  )
}

// ─── Field ────────────────────────────────────────────────────────────────────

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={{
        color: colors.textMuted,
        fontSize: fontSize.micro,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        fontFamily: `${fonts.ui}_600SemiBold`,
      }}>
        {label}{required ? ' *' : ''}
      </Text>
      {children}
    </View>
  )
}

const INPUT_STYLE = {
  backgroundColor: colors.surface,
  borderRadius: radius.md,
  borderWidth: 1,
  borderColor: colors.border,
  color: colors.text,
  fontSize: fontSize.body,
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
  fontFamily: `${(fonts as any).ui}_400Regular`,
} as const

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function CustomExerciseScreen() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id?: string }>()
  const isEditing = !!id

  const [name,            setName]            = useState('')
  const [category,        setCategory]        = useState<ExerciseV2['category']>('strength')
  const [equipment,       setEquipment]       = useState<ExerciseV2['equipment']>('barbell')
  const [difficulty,      setDifficulty]      = useState<ExerciseV2['difficulty']>('intermediate')
  const [primaryRaw,      setPrimaryRaw]      = useState('')
  const [secondaryRaw,    setSecondaryRaw]    = useState('')
  const [notes,           setNotes]           = useState('')

  // Prefill when editing
  useEffect(() => {
    if (!id) return
    const ex = getCustomExerciseById(id)
    if (!ex) return
    setName(ex.name)
    setCategory(ex.category)
    setEquipment(ex.equipment)
    setDifficulty(ex.difficulty)
    setPrimaryRaw(ex.primaryMuscles.join(', '))
    setSecondaryRaw(ex.secondaryMuscles.join(', '))
    setNotes(ex.customNotes ?? '')
  }, [id])

  function handleSave() {
    const trimmedName = name.trim()
    if (!trimmedName) {
      Alert.alert('Name required', 'Please enter an exercise name.')
      return
    }
    const primary = parseMuscles(primaryRaw)
    if (primary.length === 0) {
      Alert.alert('Muscles required', 'Add at least one primary muscle.')
      return
    }

    const params: CustomExerciseParams = {
      id: id ?? Crypto.randomUUID(),
      name: trimmedName,
      category,
      equipment,
      difficulty,
      primaryMuscles: primary,
      secondaryMuscles: parseMuscles(secondaryRaw),
      notes: notes.trim() || null,
    }

    if (isEditing) {
      updateCustomExercise(params)
    } else {
      insertCustomExercise(params)
    }
    router.back()
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Header */}
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
        borderBottomWidth: 1, borderBottomColor: colors.border,
        gap: spacing.sm,
      }}>
        <Pressable onPress={() => router.back()} style={{ padding: spacing.xs }}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={{
          flex: 1, color: colors.text,
          fontSize: fontSize.sectionHeader, fontWeight: '700',
          fontFamily: `${fonts.ui}_700Bold`,
        }}>
          {isEditing ? 'Edit Exercise' : 'New Exercise'}
        </Text>
        <Pressable onPress={handleSave} style={{ padding: spacing.xs }}>
          <Text style={{ color: colors.primary, fontSize: fontSize.body, fontWeight: '700', fontFamily: `${fonts.ui}_700Bold` }}>
            {isEditing ? 'Update' : 'Save'}
          </Text>
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, paddingBottom: 60 }}
      >
        {/* Name */}
        <Field label="Name" required>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g. Hack Squat (Bodyweight)"
            placeholderTextColor={colors.textMuted}
            autoFocus={!isEditing}
            style={INPUT_STYLE}
          />
        </Field>

        {/* Category */}
        <ChipRow
          label="Category"
          options={CATEGORIES}
          selected={category}
          onSelect={setCategory}
        />

        {/* Equipment */}
        <ChipRow
          label="Equipment"
          options={EQUIPMENT}
          selected={equipment}
          onSelect={setEquipment}
        />

        {/* Difficulty */}
        <ChipRow
          label="Difficulty"
          options={DIFFICULTY}
          selected={difficulty}
          onSelect={setDifficulty}
        />

        {/* Primary muscles */}
        <Field label="Primary Muscles" required>
          <TextInput
            value={primaryRaw}
            onChangeText={setPrimaryRaw}
            placeholder="quads, glutes, hamstrings"
            placeholderTextColor={colors.textMuted}
            style={INPUT_STYLE}
          />
          <Text style={{ color: colors.textMuted, fontSize: fontSize.micro, fontFamily: `${fonts.ui}_400Regular` }}>
            Comma-separated muscle names
          </Text>
        </Field>

        {/* Secondary muscles */}
        <Field label="Secondary Muscles">
          <TextInput
            value={secondaryRaw}
            onChangeText={setSecondaryRaw}
            placeholder="core, calves (optional)"
            placeholderTextColor={colors.textMuted}
            style={INPUT_STYLE}
          />
        </Field>

        {/* Notes */}
        <Field label="Notes">
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Any cues, setup tips, or reminders…"
            placeholderTextColor={colors.textMuted}
            multiline
            style={[INPUT_STYLE, { minHeight: 88, textAlignVertical: 'top' }]}
          />
        </Field>
      </ScrollView>
    </SafeAreaView>
  )
}
