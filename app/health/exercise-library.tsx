import { useRef, useState, useEffect, useMemo } from 'react'
import {
  View, Text, TextInput, ScrollView, FlatList, Pressable,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import GorhomBottomSheet, { BottomSheetTextInput } from '@gorhom/bottom-sheet'
import { colors, fontSize, spacing, radius } from '@core/theme'
import { BottomSheet, Button } from '@core/components'
import { useWorkoutStore } from '@modules/health/workout/workoutStore'
import MuscleGroupBadge from '@modules/health/workout/components/MuscleGroupBadge'
import type { MuscleGroup, Equipment, Exercise } from '@modules/health/shared/types'

const MUSCLE_GROUPS: MuscleGroup[] = ['chest', 'back', 'legs', 'shoulders', 'arms', 'core', 'cardio']
const EQUIPMENT_OPTIONS: Equipment[] = ['barbell', 'dumbbell', 'machine', 'bodyweight', 'cable', 'other']

// ─── Filter chip ──────────────────────────────────────────────────────────────

function FilterChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: active ? colors.primary : colors.surface2,
        borderRadius: radius.full,
        paddingHorizontal: spacing.sm,
        paddingVertical: 4,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <Text style={{
        color: active ? '#fff' : colors.textMuted,
        fontSize: fontSize.label,
        fontWeight: '600',
        textTransform: 'capitalize',
      }}>
        {label}
      </Text>
    </Pressable>
  )
}

// ─── Exercise row ──────────────────────────────────────────────────────────────

function ExerciseRow({ exercise, isSelectionMode, onPress }: {
  exercise: Exercise; isSelectionMode: boolean; onPress: () => void
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        padding: spacing.md,
        gap: spacing.md,
        opacity: pressed ? 0.85 : 1,
        marginBottom: spacing.sm,
      })}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.text, fontSize: fontSize.cardTitle, fontWeight: '600', marginBottom: 4 }}>
          {exercise.name}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          <MuscleGroupBadge muscleGroup={exercise.muscleGroup} small />
          {exercise.equipment && (
            <Text style={{ color: colors.textMuted, fontSize: fontSize.micro }}>· {exercise.equipment}</Text>
          )}
          {exercise.isCustom && (
            <Text style={{ color: colors.primary, fontSize: fontSize.micro }}>· custom</Text>
          )}
        </View>
      </View>
      {isSelectionMode
        ? <Ionicons name="add-circle-outline" size={22} color={colors.primary} />
        : <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
      }
    </Pressable>
  )
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function ExerciseLibraryScreen() {
  const router = useRouter()
  const { selectionMode } = useLocalSearchParams<{ selectionMode?: string }>()
  const isSelectionMode = selectionMode === '1'

  const { exercises, loadExercises, addExercise, addCustomExercise } = useWorkoutStore()
  const sheetRef = useRef<GorhomBottomSheet>(null)

  const [search, setSearch] = useState('')
  const [muscleFilter, setMuscleFilter] = useState<MuscleGroup | null>(null)

  const [customName, setCustomName] = useState('')
  const [customMuscle, setCustomMuscle] = useState<MuscleGroup | null>(null)
  const [customEquipment, setCustomEquipment] = useState<Equipment | null>(null)

  useEffect(() => { loadExercises() }, [])

  const filtered = useMemo(() => exercises.filter((ex) => {
    const matchSearch = !search || ex.name.toLowerCase().includes(search.toLowerCase())
    const matchMuscle = !muscleFilter || ex.muscleGroup === muscleFilter
    return matchSearch && matchMuscle
  }), [exercises, search, muscleFilter])

  function handleSelect(exercise: Exercise) {
    if (isSelectionMode) {
      addExercise(exercise)
      router.back()
    } else {
      router.push({ pathname: '/health/exercise-detail', params: { exerciseId: exercise.id } } as never)
    }
  }

  function handleSaveCustom() {
    if (!customName.trim() || !customMuscle) return
    addCustomExercise(customName.trim(), customMuscle, customEquipment ?? undefined)
    setCustomName('')
    setCustomMuscle(null)
    setCustomEquipment(null)
    sheetRef.current?.close()
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
        <Text style={{ flex: 1, color: colors.text, fontSize: fontSize.sectionHeader, fontWeight: '600' }}>
          {isSelectionMode ? 'Add Exercise' : 'Exercise Library'}
        </Text>
        <Pressable onPress={() => sheetRef.current?.expand()} style={{ padding: spacing.xs }}>
          <Ionicons name="add" size={24} color={colors.primary} />
        </Pressable>
      </View>

      {/* Search bar */}
      <View style={{ paddingHorizontal: spacing.md, paddingTop: spacing.sm }}>
        <View style={{
          flexDirection: 'row', alignItems: 'center',
          backgroundColor: colors.surface2, borderRadius: radius.md,
          paddingHorizontal: spacing.sm, gap: spacing.xs,
        }}>
          <Ionicons name="search" size={16} color={colors.textMuted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search exercises…"
            placeholderTextColor={colors.textMuted}
            style={{ flex: 1, color: colors.text, fontSize: fontSize.body, paddingVertical: spacing.sm }}
            selectionColor={colors.primary}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color={colors.textMuted} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Muscle group filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: spacing.xs }}
      >
        <FilterChip label="All" active={!muscleFilter} onPress={() => setMuscleFilter(null)} />
        {MUSCLE_GROUPS.map((mg) => (
          <FilterChip
            key={mg}
            label={mg}
            active={muscleFilter === mg}
            onPress={() => setMuscleFilter(muscleFilter === mg ? null : mg)}
          />
        ))}
      </ScrollView>

      {/* Count */}
      <Text style={{ color: colors.textMuted, fontSize: fontSize.label, paddingHorizontal: spacing.md, marginBottom: spacing.xs }}>
        {filtered.length} exercise{filtered.length !== 1 ? 's' : ''}
      </Text>

      {/* Exercise list */}
      <FlatList
        data={filtered}
        keyExtractor={(ex) => ex.id}
        contentContainerStyle={{ paddingHorizontal: spacing.md, paddingBottom: spacing.xl }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingVertical: spacing.xxl }}>
            <Ionicons name="barbell-outline" size={48} color={colors.textMuted} style={{ marginBottom: spacing.md }} />
            <Text style={{ color: colors.textMuted, fontSize: fontSize.body }}>No exercises found</Text>
          </View>
        }
        renderItem={({ item }) => (
          <ExerciseRow exercise={item} isSelectionMode={isSelectionMode} onPress={() => handleSelect(item)} />
        )}
      />

      {/* Add custom exercise bottom sheet */}
      <BottomSheet ref={sheetRef} snapPoints={['60%']}>
        <ScrollView
          contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={{ color: colors.text, fontSize: fontSize.sectionHeader, fontWeight: '600', marginBottom: spacing.xs }}>
            Add Custom Exercise
          </Text>

          <BottomSheetTextInput
            value={customName}
            onChangeText={setCustomName}
            placeholder="Exercise name"
            placeholderTextColor={colors.textMuted}
            style={{
              backgroundColor: colors.surface2,
              borderRadius: radius.sm,
              borderWidth: 1,
              borderColor: colors.border,
              color: colors.text,
              fontSize: fontSize.body,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm,
            }}
            selectionColor={colors.primary}
          />

          <Text style={{ color: colors.textMuted, fontSize: fontSize.label, fontWeight: '600' }}>Muscle Group *</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
            {MUSCLE_GROUPS.map((mg) => (
              <Pressable
                key={mg}
                onPress={() => setCustomMuscle(mg)}
                style={{
                  backgroundColor: customMuscle === mg ? colors.primary : colors.surface2,
                  borderRadius: radius.full,
                  paddingHorizontal: spacing.sm,
                  paddingVertical: 4,
                }}
              >
                <Text style={{
                  color: customMuscle === mg ? '#fff' : colors.textMuted,
                  fontSize: fontSize.label,
                  textTransform: 'capitalize',
                }}>
                  {mg}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={{ color: colors.textMuted, fontSize: fontSize.label, fontWeight: '600' }}>Equipment (optional)</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
            {EQUIPMENT_OPTIONS.map((eq) => (
              <Pressable
                key={eq}
                onPress={() => setCustomEquipment(customEquipment === eq ? null : eq)}
                style={{
                  backgroundColor: customEquipment === eq ? colors.primary : colors.surface2,
                  borderRadius: radius.full,
                  paddingHorizontal: spacing.sm,
                  paddingVertical: 4,
                }}
              >
                <Text style={{
                  color: customEquipment === eq ? '#fff' : colors.textMuted,
                  fontSize: fontSize.label,
                  textTransform: 'capitalize',
                }}>
                  {eq}
                </Text>
              </Pressable>
            ))}
          </View>

          <Button
            label="Save Exercise"
            onPress={handleSaveCustom}
            disabled={!customName.trim() || !customMuscle}
            fullWidth
          />
        </ScrollView>
      </BottomSheet>
    </SafeAreaView>
  )
}
