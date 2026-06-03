import { useState, useMemo, useCallback } from 'react'
import {
  View, Text, TextInput, FlatList, Pressable, ScrollView, Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useFocusEffect } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { colors, fontSize, spacing, radius, fonts } from '@core/theme'
import {
  getAllExercises,
  searchExercises,
  deleteCustomExercise,
} from '@core/db/workoutQueriesV2'
import { useWorkoutStoreV2 } from '@modules/health/workout/workoutStoreV2'
import { SwipeableRow } from '@core/components'
import type { ExerciseV2, ExerciseCategory, ExerciseEquipmentV2 } from '@modules/health/shared/types'

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES: { label: string; value: ExerciseCategory | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Strength', value: 'strength' },
  { label: 'Cardio', value: 'cardio' },
  { label: 'Mobility', value: 'mobility' },
]

const EQUIPMENT: { label: string; value: ExerciseEquipmentV2 | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Barbell', value: 'barbell' },
  { label: 'Dumbbell', value: 'dumbbell' },
  { label: 'Machine', value: 'machine' },
  { label: 'Bodyweight', value: 'bodyweight' },
  { label: 'Cable', value: 'cable' },
  { label: 'Band', value: 'band' },
]

const DIFFICULTY_COLOR: Record<ExerciseV2['difficulty'], string> = {
  beginner: colors.success ?? '#4caf50',
  intermediate: colors.warning ?? '#ff9800',
  advanced: '#c0533a',
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function FilterChip({
  label, active, onPress,
}: { label: string; active: boolean; onPress: () => void }) {
  return (
    <View style={{ marginRight: spacing.xs }}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}
      >
        <View style={{
          backgroundColor: active ? colors.primary : colors.surface2,
          borderRadius: radius.full,
          paddingHorizontal: spacing.md,
          paddingVertical: 6,
          borderWidth: 1,
          borderColor: active ? colors.primary : colors.borderAccent,
        }}>
          <Text style={{
            color: active ? '#fff' : colors.text,
            fontSize: fontSize.label,
            fontWeight: '600',
            fontFamily: `${fonts.ui}_600SemiBold`,
            includeFontPadding: false,
          }}>
            {label}
          </Text>
        </View>
      </Pressable>
    </View>
  )
}

function MuscleTag({ label }: { label: string }) {
  return (
    <View style={{
      backgroundColor: `${colors.workout}22`,
      borderRadius: radius.sm,
      paddingHorizontal: 6,
      paddingVertical: 2,
    }}>
      <Text style={{
        color: colors.workout,
        fontSize: fontSize.micro,
        fontWeight: '600',
        textTransform: 'capitalize',
        fontFamily: `${fonts.ui}_600SemiBold`,
      }}>
        {label}
      </Text>
    </View>
  )
}

function ExerciseRow({
  exercise, onPress, selectMode, onEdit, onDelete,
}: {
  exercise: ExerciseV2
  onPress: () => void
  selectMode?: boolean
  onEdit?: () => void
  onDelete?: () => void
}) {
  const rightActions = exercise.isCustom
    ? [
        { label: 'Edit',   icon: 'pencil'        as const, color: colors.primary, onPress: onEdit!   },
        { label: 'Delete', icon: 'trash-outline'  as const, color: colors.danger,  onPress: onDelete! },
      ]
    : []

  return (
    <SwipeableRow rightActions={rightActions} style={{ marginBottom: spacing.sm }}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
      >
        <View style={{
          backgroundColor: colors.surface,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: exercise.isCustom ? `${colors.primary}44` : colors.border,
          padding: spacing.md,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
        }}>
          {/* Equipment icon */}
          <View style={{
            width: 44, height: 44, borderRadius: radius.md,
            backgroundColor: exercise.isCustom ? `${colors.primary}18` : `${colors.workout}18`,
            alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Ionicons
              name="barbell-outline" size={20}
              color={exercise.isCustom ? colors.primary : colors.workout}
            />
          </View>

          {/* Info */}
          <View style={{ flex: 1, gap: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              <Text style={{
                color: colors.text, fontSize: fontSize.cardTitle, fontWeight: '600',
                fontFamily: `${fonts.ui}_600SemiBold`, flexShrink: 1,
              }}>
                {exercise.name}
              </Text>
              {exercise.isCustom && (
                <View style={{
                  backgroundColor: `${colors.primary}22`, borderRadius: radius.full,
                  paddingHorizontal: 6, paddingVertical: 1,
                }}>
                  <Text style={{
                    color: colors.primary, fontSize: fontSize.micro, fontWeight: '700',
                    fontFamily: `${fonts.ui}_700Bold`,
                  }}>
                    custom
                  </Text>
                </View>
              )}
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
              {exercise.primaryMuscles.slice(0, 2).map((m) => (
                <MuscleTag key={m} label={m} />
              ))}
              <Text style={{ color: colors.textMuted, fontSize: fontSize.micro }}>
                · {exercise.equipment}
              </Text>
            </View>
          </View>

          {/* Difficulty dot + action icon */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{
              width: 8, height: 8, borderRadius: 4,
              backgroundColor: DIFFICULTY_COLOR[exercise.difficulty],
            }} />
            <Ionicons
              name={selectMode ? 'add-circle-outline' : 'chevron-forward'}
              size={selectMode ? 20 : 16}
              color={selectMode ? colors.primary : colors.textMuted}
            />
          </View>
        </View>
      </Pressable>
    </SwipeableRow>
  )
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function ExerciseLibraryScreen() {
  const router = useRouter()
  const { mode } = useLocalSearchParams<{ mode?: string }>()
  const isSelectMode = mode === 'select' || mode === 'template'
  const { addExercise, setPendingExercise } = useWorkoutStoreV2()

  const [exercises, setExercises] = useState<ExerciseV2[]>([])
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<ExerciseCategory | 'all'>('all')
  const [equipmentFilter, setEquipmentFilter] = useState<ExerciseEquipmentV2 | 'all'>('all')

  useFocusEffect(
    useCallback(() => {
      setExercises(getAllExercises())
    }, []),
  )

  const filtered = useMemo(() => {
    let list = search.trim() ? searchExercises(search.trim()) : exercises
    if (categoryFilter !== 'all') {
      list = list.filter((ex) => ex.category === categoryFilter)
    }
    if (equipmentFilter !== 'all') {
      list = list.filter((ex) => ex.equipment === equipmentFilter)
    }
    return list
  }, [exercises, search, categoryFilter, equipmentFilter])

  function handleDeleteCustom(ex: ExerciseV2) {
    Alert.alert(
      'Delete exercise',
      `Delete "${ex.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: () => {
            deleteCustomExercise(ex.id)
            setExercises(getAllExercises())
          },
        },
      ],
    )
  }

  function handleSelect(ex: ExerciseV2) {
    if (mode === 'template') {
      setPendingExercise(ex)
      router.back()
    } else if (mode === 'select') {
      addExercise(ex)
      router.back()
    } else {
      router.push(`/health/workout/exercises/${ex.id}` as never)
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Header */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        gap: spacing.sm,
      }}>
        <Pressable onPress={() => router.back()} style={{ padding: spacing.xs }}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={{
          flex: 1,
          color: colors.text,
          fontSize: fontSize.sectionHeader,
          fontWeight: '700',
          fontFamily: `${fonts.ui}_700Bold`,
        }}>
          {isSelectMode ? 'Add Exercise' : 'Exercise Library'}
        </Text>
        <Text style={{
          color: colors.textMuted,
          fontSize: fontSize.label,
          fontFamily: `${fonts.ui}_400Regular`,
        }}>
          {filtered.length}
        </Text>
        {!isSelectMode && (
          <Pressable
            onPress={() => router.push('/health/workout/exercises/custom' as never)}
            style={{ padding: spacing.xs }}
          >
            <Ionicons name="add" size={26} color={colors.primary} />
          </Pressable>
        )}
      </View>

      {/* Search */}
      <View style={{ paddingHorizontal: spacing.md, paddingTop: spacing.sm }}>
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.surface2,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: colors.border,
          paddingHorizontal: spacing.sm,
          gap: spacing.xs,
        }}>
          <Ionicons name="search" size={16} color={colors.textMuted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search exercises or muscles…"
            placeholderTextColor={colors.textMuted}
            style={{
              flex: 1,
              color: colors.text,
              fontSize: fontSize.body,
              paddingVertical: spacing.sm,
              fontFamily: `${fonts.ui}_400Regular`,
            }}
            selectionColor={colors.primary}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color={colors.textMuted} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Category filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexShrink: 0 }}
        contentContainerStyle={{
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          alignItems: 'center',
        }}
      >
        {CATEGORIES.map((c) => (
          <FilterChip
            key={c.value}
            label={c.label}
            active={categoryFilter === c.value}
            onPress={() => setCategoryFilter(categoryFilter === c.value && c.value !== 'all' ? 'all' : c.value)}
          />
        ))}
      </ScrollView>

      {/* Equipment filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexShrink: 0 }}
        contentContainerStyle={{
          paddingHorizontal: spacing.md,
          paddingBottom: spacing.sm,
          alignItems: 'center',
        }}
      >
        {EQUIPMENT.map((e) => (
          <FilterChip
            key={e.value}
            label={e.label}
            active={equipmentFilter === e.value}
            onPress={() => setEquipmentFilter(equipmentFilter === e.value && e.value !== 'all' ? 'all' : e.value)}
          />
        ))}
      </ScrollView>

      {/* Legend */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingBottom: spacing.xs,
        gap: spacing.md,
      }}>
        {(['beginner', 'intermediate', 'advanced'] as const).map((d) => (
          <View key={d} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: DIFFICULTY_COLOR[d] }} />
            <Text style={{
              color: colors.text,
              fontSize: fontSize.micro,
              textTransform: 'capitalize',
              fontFamily: `${fonts.ui}_400Regular`,
            }}>
              {d}
            </Text>
          </View>
        ))}
      </View>

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={(ex) => ex.id}
        contentContainerStyle={{ paddingHorizontal: spacing.md, paddingBottom: spacing.xl }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingVertical: spacing.xl, minHeight: 260 }}>
            <Ionicons name="barbell-outline" size={48} color={colors.textMuted} style={{ marginBottom: spacing.md }} />
            <Text style={{
              color: colors.textMuted,
              fontSize: fontSize.body,
              fontFamily: `${fonts.ui}_400Regular`,
            }}>
              No exercises found
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <ExerciseRow
            exercise={item}
            onPress={() => handleSelect(item)}
            selectMode={isSelectMode}
            onEdit={item.isCustom
              ? () => router.push(`/health/workout/exercises/custom?id=${item.id}` as never)
              : undefined}
            onDelete={item.isCustom
              ? () => handleDeleteCustom(item)
              : undefined}
          />
        )}
      />
    </SafeAreaView>
  )
}
