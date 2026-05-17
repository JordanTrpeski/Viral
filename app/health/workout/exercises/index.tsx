import { useState, useMemo, useCallback } from 'react'
import {
  View, Text, TextInput, FlatList, Pressable, ScrollView,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useFocusEffect } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { colors, fontSize, spacing, radius, fonts } from '@core/theme'
import {
  getAllExercises,
  searchExercises,
} from '@core/db/workoutQueriesV2'
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
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: active ? colors.primary : colors.surface2,
        borderRadius: radius.full,
        paddingHorizontal: spacing.md,
        paddingVertical: 5,
        opacity: pressed ? 0.75 : 1,
        borderWidth: 1,
        borderColor: active ? colors.primary : colors.border,
      })}
    >
      <Text style={{
        color: active ? '#fff' : colors.textMuted,
        fontSize: fontSize.label,
        fontWeight: '600',
        fontFamily: `${fonts.ui}_600SemiBold`,
      }}>
        {label}
      </Text>
    </Pressable>
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

function ExerciseRow({ exercise, onPress }: { exercise: ExerciseV2; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1, marginBottom: spacing.sm })}
    >
      <View style={{
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        padding: spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
      }}>
        {/* Equipment icon */}
        <View style={{
          width: 44,
          height: 44,
          borderRadius: radius.md,
          backgroundColor: `${colors.workout}18`,
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Ionicons name="barbell-outline" size={20} color={colors.workout} />
        </View>

        {/* Info */}
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={{
            color: colors.text,
            fontSize: fontSize.cardTitle,
            fontWeight: '600',
            fontFamily: `${fonts.ui}_600SemiBold`,
          }}>
            {exercise.name}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
            {exercise.primaryMuscles.slice(0, 2).map((m) => (
              <MuscleTag key={m} label={m} />
            ))}
            <Text style={{ color: colors.textMuted, fontSize: fontSize.micro }}>
              · {exercise.equipment}
            </Text>
          </View>
        </View>

        {/* Difficulty dot + chevron */}
        <View style={{ alignItems: 'center', gap: 4 }}>
          <View style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: DIFFICULTY_COLOR[exercise.difficulty],
          }} />
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        </View>
      </View>
    </Pressable>
  )
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function ExerciseLibraryScreen() {
  const router = useRouter()

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
          Exercise Library
        </Text>
        <Text style={{
          color: colors.textMuted,
          fontSize: fontSize.label,
          fontFamily: `${fonts.ui}_400Regular`,
        }}>
          {filtered.length}
        </Text>
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
        contentContainerStyle={{
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          gap: spacing.xs,
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
        contentContainerStyle={{
          paddingHorizontal: spacing.md,
          paddingBottom: spacing.sm,
          gap: spacing.xs,
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
              color: colors.textMuted,
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
          <View style={{ alignItems: 'center', paddingVertical: spacing.xl }}>
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
            onPress={() => router.push(`/health/workout/exercises/${item.id}` as never)}
          />
        )}
      />
    </SafeAreaView>
  )
}
