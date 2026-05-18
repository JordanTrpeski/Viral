import { useState, useCallback, useRef } from 'react'
import { View, Text, ScrollView, TextInput, Pressable, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useFocusEffect } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import * as Crypto from 'expo-crypto'
import { colors, fontSize, spacing, radius, fonts } from '@core/theme'
import {
  getTemplateByIdV2,
  getTemplateExercisesV2,
  insertTemplateV2,
  updateTemplateV2,
  insertTemplateExerciseV2,
  deleteTemplateExercisesV2,
} from '@core/db/workoutQueriesV2'
import { useWorkoutStoreV2 } from '@modules/health/workout/workoutStoreV2'
import type { GoalType } from '@modules/health/shared/types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface BuilderExercise {
  localId: string
  exercise: ExerciseV2
  sets: number
  repMin: number
  repMax: number
  restSeconds: number
}

// ─── Constants ────────────────────────────────────────────────────────────────

const GOALS: { label: string; value: GoalType; color: string }[] = [
  { label: 'Strength',    value: 'strength',    color: colors.workout },
  { label: 'Hypertrophy', value: 'hypertrophy', color: colors.primary },
  { label: 'Endurance',   value: 'endurance',   color: colors.success },
  { label: 'Weight Loss', value: 'weight_loss', color: colors.warning },
  { label: 'General',     value: 'general',     color: colors.textMuted },
]

const REST_OPTIONS = [60, 90, 120, 150, 180]

function defaultForGoal(goal: GoalType): { repMin: number; repMax: number; sets: number; rest: number } {
  switch (goal) {
    case 'strength':    return { repMin: 3, repMax: 5, sets: 4, rest: 180 }
    case 'hypertrophy': return { repMin: 8, repMax: 12, sets: 3, rest: 90 }
    case 'endurance':   return { repMin: 15, repMax: 20, sets: 3, rest: 60 }
    case 'weight_loss': return { repMin: 12, repMax: 15, sets: 3, rest: 60 }
    default:            return { repMin: 8, repMax: 12, sets: 3, rest: 90 }
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function GoalChip({ label, color, active, onPress }: {
  label: string; color: string; active: boolean; onPress: () => void
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: active ? `${color}33` : colors.surface2,
        borderRadius: radius.full,
        borderWidth: 1,
        borderColor: active ? color : colors.border,
        paddingHorizontal: spacing.md,
        paddingVertical: 6,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <Text style={{
        color: active ? color : colors.textMuted,
        fontSize: fontSize.label,
        fontWeight: active ? '600' : '400',
        fontFamily: active ? `${fonts.ui}_600SemiBold` : `${fonts.ui}_400Regular`,
      }}>
        {label}
      </Text>
    </Pressable>
  )
}

function NumericStepper({ value, min, max, step, onChange }: {
  value: number; min: number; max: number; step: number
  onChange: (v: number) => void
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
      <Pressable
        onPress={() => onChange(Math.max(min, value - step))}
        style={({ pressed }) => ({
          width: 28, height: 28, borderRadius: radius.sm,
          backgroundColor: colors.surface2,
          borderWidth: 1, borderColor: colors.border,
          alignItems: 'center', justifyContent: 'center',
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <Ionicons name="remove" size={14} color={colors.text} />
      </Pressable>
      <Text style={{
        color: colors.text,
        fontSize: fontSize.body,
        fontWeight: '700',
        fontFamily: `${fonts.mono}_700Bold`,
        minWidth: 30,
        textAlign: 'center',
      }}>
        {value}
      </Text>
      <Pressable
        onPress={() => onChange(Math.min(max, value + step))}
        style={({ pressed }) => ({
          width: 28, height: 28, borderRadius: radius.sm,
          backgroundColor: colors.surface2,
          borderWidth: 1, borderColor: colors.border,
          alignItems: 'center', justifyContent: 'center',
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <Ionicons name="add" size={14} color={colors.text} />
      </Pressable>
    </View>
  )
}

function ExerciseCard({
  item,
  index,
  onRemove,
  onChange,
}: {
  item: BuilderExercise
  index: number
  onRemove: () => void
  onChange: (patch: Partial<BuilderExercise>) => void
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <View style={{
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
      marginBottom: spacing.sm,
    }}>
      {/* Header row */}
      <Pressable
        onPress={() => setExpanded((e) => !e)}
        style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
      >
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          padding: spacing.md,
          gap: spacing.sm,
        }}>
          <View style={{
            width: 28, height: 28, borderRadius: radius.full,
            backgroundColor: `${colors.workout}18`,
            alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Text style={{
              color: colors.workout, fontSize: 11,
              fontWeight: '700', fontFamily: `${fonts.mono}_700Bold`,
            }}>
              {index + 1}
            </Text>
          </View>

          <View style={{ flex: 1 }}>
            <Text style={{
              color: colors.text, fontSize: fontSize.cardTitle,
              fontWeight: '600', fontFamily: `${fonts.ui}_600SemiBold`,
            }}>
              {item.exercise.name}
            </Text>
            <Text style={{
              color: colors.textMuted, fontSize: fontSize.micro,
              fontFamily: `${fonts.ui}_400Regular`,
            }}>
              {item.sets} × {item.repMin}–{item.repMax} · {item.restSeconds}s rest
            </Text>
          </View>

          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={colors.textMuted}
          />
        </View>
      </Pressable>

      {/* Expanded controls */}
      {expanded && (
        <View style={{
          borderTopWidth: 1,
          borderTopColor: colors.border,
          padding: spacing.md,
          gap: spacing.md,
        }}>
          {/* Sets */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ color: colors.textMuted, fontSize: fontSize.label, fontFamily: `${fonts.ui}_400Regular` }}>
              Sets
            </Text>
            <NumericStepper value={item.sets} min={1} max={10} step={1} onChange={(v) => onChange({ sets: v })} />
          </View>

          {/* Rep min */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ color: colors.textMuted, fontSize: fontSize.label, fontFamily: `${fonts.ui}_400Regular` }}>
              Rep Min
            </Text>
            <NumericStepper value={item.repMin} min={1} max={item.repMax} step={1} onChange={(v) => onChange({ repMin: v })} />
          </View>

          {/* Rep max */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ color: colors.textMuted, fontSize: fontSize.label, fontFamily: `${fonts.ui}_400Regular` }}>
              Rep Max
            </Text>
            <NumericStepper value={item.repMax} min={item.repMin} max={50} step={1} onChange={(v) => onChange({ repMax: v })} />
          </View>

          {/* Rest */}
          <View style={{ gap: spacing.xs }}>
            <Text style={{ color: colors.textMuted, fontSize: fontSize.label, fontFamily: `${fonts.ui}_400Regular` }}>
              Rest
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
              {REST_OPTIONS.map((r) => (
                <Pressable
                  key={r}
                  onPress={() => onChange({ restSeconds: r })}
                  style={({ pressed }) => ({
                    backgroundColor: item.restSeconds === r ? `${colors.primary}33` : colors.surface2,
                    borderRadius: radius.full,
                    borderWidth: 1,
                    borderColor: item.restSeconds === r ? colors.primary : colors.border,
                    paddingHorizontal: spacing.sm,
                    paddingVertical: 4,
                    opacity: pressed ? 0.8 : 1,
                  })}
                >
                  <Text style={{
                    color: item.restSeconds === r ? colors.primary : colors.textMuted,
                    fontSize: fontSize.micro,
                    fontFamily: `${fonts.ui}_600SemiBold`,
                  }}>
                    {r < 60 ? `${r}s` : `${r / 60}m`}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Remove */}
          <Pressable
            onPress={onRemove}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              paddingVertical: spacing.xs,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Ionicons name="trash-outline" size={14} color="#c0533a" />
            <Text style={{
              color: '#c0533a', fontSize: fontSize.label,
              fontFamily: `${fonts.ui}_600SemiBold`,
            }}>
              Remove
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  )
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function TemplateBuilderScreen() {
  const router = useRouter()
  const { templateId } = useLocalSearchParams<{ templateId?: string }>()
  const isEdit = Boolean(templateId)

  const [name, setName] = useState('')
  const [goal, setGoal] = useState<GoalType>('general')
  const [exercises, setExercises] = useState<BuilderExercise[]>([])
  const [saving, setSaving] = useState(false)

  const { pendingExercise, setPendingExercise } = useWorkoutStoreV2()
  const initialLoadDone = useRef(false)

  useFocusEffect(
    useCallback(() => {
      // Pick up exercise selected via the library picker
      if (pendingExercise) {
        const def = defaultForGoal(goal)
        setExercises((prev) => [
          ...prev,
          {
            localId: Crypto.randomUUID(),
            exercise: pendingExercise,
            sets: def.sets,
            repMin: def.repMin,
            repMax: def.repMax,
            restSeconds: def.rest,
          },
        ])
        setPendingExercise(null)
        return
      }

      // Initial load for edit mode — only once
      if (initialLoadDone.current) return
      initialLoadDone.current = true
      if (!templateId) return
      const t = getTemplateByIdV2(templateId)
      if (!t) return
      setName(t.name)
      setGoal(t.goalType ?? 'general')
      const exs = getTemplateExercisesV2(templateId)
      setExercises(exs.map((e) => ({
        localId: e.id,
        exercise: e.exercise,
        sets: e.sets,
        repMin: e.repMin ?? 8,
        repMax: e.repMax ?? 12,
        restSeconds: e.restSeconds ?? 90,
      })))
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pendingExercise, templateId]),
  )

  function handleSave() {
    if (!name.trim()) {
      Alert.alert('Name required', 'Give your template a name before saving.')
      return
    }
    if (exercises.length === 0) {
      Alert.alert('No exercises', 'Add at least one exercise to your template.')
      return
    }

    setSaving(true)
    try {
      const now = new Date().toISOString()
      const id = isEdit ? templateId! : Crypto.randomUUID()

      if (isEdit) {
        updateTemplateV2(id, { name: name.trim(), goalType: goal })
        deleteTemplateExercisesV2(id)
      } else {
        insertTemplateV2({
          id,
          name: name.trim(),
          goalType: goal,
          createdAt: now,
        })
      }

      exercises.forEach((ex, i) => {
        insertTemplateExerciseV2({
          id: isEdit ? Crypto.randomUUID() : ex.localId,
          templateId: id,
          exerciseId: ex.exercise.id,
          dayNumber: 1,
          orderIndex: i,
          sets: ex.sets,
          repMin: ex.repMin,
          repMax: ex.repMax,
          restSeconds: ex.restSeconds,
          createdAt: now,
        })
      })

      router.back()
    } finally {
      setSaving(false)
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
          {isEdit ? 'Edit Template' : 'New Template'}
        </Text>
        <Pressable
          onPress={handleSave}
          disabled={saving}
          style={({ pressed }) => ({
            backgroundColor: colors.workout,
            borderRadius: radius.md,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.xs,
            opacity: pressed || saving ? 0.7 : 1,
          })}
        >
          <Text style={{
            color: '#fff',
            fontSize: fontSize.label,
            fontWeight: '700',
            fontFamily: `${fonts.ui}_700Bold`,
          }}>
            Save
          </Text>
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}
      >
        {/* Template name */}
        <View style={{ gap: spacing.sm }}>
          <Text style={{
            color: colors.textMuted,
            fontSize: fontSize.label,
            fontWeight: '600',
            textTransform: 'uppercase',
            letterSpacing: 0.8,
            fontFamily: `${fonts.ui}_600SemiBold`,
          }}>
            Template Name
          </Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g. Push Day, Full Body…"
            placeholderTextColor={colors.textMuted}
            style={{
              backgroundColor: colors.surface,
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: colors.border,
              color: colors.text,
              fontSize: fontSize.cardTitle,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm,
              fontFamily: `${fonts.ui}_600SemiBold`,
            }}
            selectionColor={colors.primary}
          />
        </View>

        {/* Goal picker */}
        <View style={{ gap: spacing.sm }}>
          <Text style={{
            color: colors.textMuted,
            fontSize: fontSize.label,
            fontWeight: '600',
            textTransform: 'uppercase',
            letterSpacing: 0.8,
            fontFamily: `${fonts.ui}_600SemiBold`,
          }}>
            Training Goal
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
            {GOALS.map((g) => (
              <GoalChip
                key={g.value}
                label={g.label}
                color={g.color}
                active={goal === g.value}
                onPress={() => setGoal(g.value)}
              />
            ))}
          </View>
        </View>

        {/* Exercises */}
        <View style={{ gap: spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{
              flex: 1,
              color: colors.textMuted,
              fontSize: fontSize.label,
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: 0.8,
              fontFamily: `${fonts.ui}_600SemiBold`,
            }}>
              Exercises ({exercises.length})
            </Text>
          </View>

          {exercises.map((ex, i) => (
            <ExerciseCard
              key={ex.localId}
              item={ex}
              index={i}
              onRemove={() => setExercises((prev) => prev.filter((e) => e.localId !== ex.localId))}
              onChange={(patch) =>
                setExercises((prev) =>
                  prev.map((e) => (e.localId === ex.localId ? { ...e, ...patch } : e)),
                )
              }
            />
          ))}

          {/* Add exercise button */}
          <Pressable
            onPress={() => router.push('/health/workout/exercises?mode=template' as never)}
            style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
          >
            <View style={{
              backgroundColor: colors.surface,
              borderRadius: radius.lg,
              borderWidth: 1,
              borderColor: colors.border,
              borderStyle: 'dashed',
              padding: spacing.md,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: spacing.sm,
            }}>
              <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
              <Text style={{
                color: colors.primary,
                fontSize: fontSize.body,
                fontWeight: '600',
                fontFamily: `${fonts.ui}_600SemiBold`,
              }}>
                Add Exercise
              </Text>
            </View>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
