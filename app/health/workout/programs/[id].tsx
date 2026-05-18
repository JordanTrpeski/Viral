import { useCallback, useState } from 'react'
import { View, Text, ScrollView, Pressable } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useFocusEffect } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { colors, fontSize, spacing, radius, fonts } from '@core/theme'
import {
  getTemplateByIdV2,
  getTemplateExercisesV2,
  type TemplateExerciseWithDetails,
} from '@core/db/workoutQueriesV2'
import { useWorkoutStoreV2 } from '@modules/health/workout/workoutStoreV2'
import type { WorkoutTemplateV2 } from '@modules/health/shared/types'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function goalLabel(g?: string): string {
  switch (g) {
    case 'strength':    return 'Strength'
    case 'hypertrophy': return 'Hypertrophy'
    case 'endurance':   return 'Endurance'
    case 'weight_loss': return 'Weight Loss'
    default:            return 'General'
  }
}

function goalColor(g?: string): string {
  switch (g) {
    case 'strength':    return colors.workout
    case 'hypertrophy': return colors.primary
    case 'endurance':   return colors.success
    case 'weight_loss': return colors.warning
    default:            return colors.textMuted
  }
}

function fmtRest(s?: number): string {
  if (!s) return ''
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  const rem = s % 60
  return rem ? `${m}m ${rem}s` : `${m}m`
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatPill({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  return (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: colors.surface2,
      borderRadius: radius.full,
      paddingHorizontal: spacing.sm,
      paddingVertical: 5,
      borderWidth: 1,
      borderColor: colors.border,
    }}>
      <Ionicons name={icon} size={13} color={colors.textMuted} />
      <Text style={{
        color: colors.textMuted,
        fontSize: fontSize.micro,
        fontFamily: `${fonts.ui}_400Regular`,
      }}>
        {label}
      </Text>
    </View>
  )
}

function ExerciseRow({ ex, index }: { ex: TemplateExerciseWithDetails; index: number }) {
  const repRange = ex.repMin && ex.repMax
    ? `${ex.repMin}–${ex.repMax} reps`
    : ex.repMax ? `${ex.repMax} reps` : ''

  return (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.sm,
      borderBottomWidth: index > 0 ? 1 : 0,
      borderBottomColor: colors.border,
    }}>
      <View style={{
        width: 28,
        height: 28,
        borderRadius: radius.full,
        backgroundColor: `${colors.workout}18`,
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Text style={{
          color: colors.workout,
          fontSize: 11,
          fontWeight: '700',
          fontFamily: `${fonts.mono}_700Bold`,
        }}>
          {index + 1}
        </Text>
      </View>

      <View style={{ flex: 1 }}>
        <Text style={{
          color: colors.text,
          fontSize: fontSize.body,
          fontWeight: '600',
          fontFamily: `${fonts.ui}_600SemiBold`,
        }}>
          {ex.exercise.name}
        </Text>
        <Text style={{
          color: colors.textMuted,
          fontSize: fontSize.micro,
          fontFamily: `${fonts.ui}_400Regular`,
        }}>
          {ex.sets} sets{repRange ? ` · ${repRange}` : ''}{ex.restSeconds ? ` · ${fmtRest(ex.restSeconds)} rest` : ''}
        </Text>
      </View>

      <Text style={{
        color: colors.textMuted,
        fontSize: fontSize.micro,
        textTransform: 'capitalize',
        fontFamily: `${fonts.ui}_400Regular`,
      }}>
        {ex.exercise.equipment}
      </Text>
    </View>
  )
}

function DayCard({ dayNumber, exercises }: { dayNumber: number; exercises: TemplateExerciseWithDetails[] }) {
  return (
    <View style={{
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    }}>
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        backgroundColor: `${colors.workout}12`,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        gap: spacing.sm,
      }}>
        <View style={{
          width: 24,
          height: 24,
          borderRadius: radius.full,
          backgroundColor: colors.workout,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Text style={{
            color: '#fff',
            fontSize: 11,
            fontWeight: '700',
            fontFamily: `${fonts.mono}_700Bold`,
          }}>
            {dayNumber}
          </Text>
        </View>
        <Text style={{
          color: colors.text,
          fontSize: fontSize.cardTitle,
          fontWeight: '700',
          fontFamily: `${fonts.ui}_700Bold`,
        }}>
          Day {dayNumber}
        </Text>
        <Text style={{
          color: colors.textMuted,
          fontSize: fontSize.micro,
          fontFamily: `${fonts.ui}_400Regular`,
          marginLeft: 'auto',
        }}>
          {exercises.length} exercise{exercises.length !== 1 ? 's' : ''}
        </Text>
      </View>

      <View style={{ padding: spacing.md }}>
        {exercises.map((ex, i) => (
          <ExerciseRow key={ex.id} ex={ex} index={i} />
        ))}
      </View>
    </View>
  )
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function ProgramDetailScreen() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { startSession } = useWorkoutStoreV2()

  const [template, setTemplate] = useState<WorkoutTemplateV2 | null>(null)
  const [exercises, setExercises] = useState<TemplateExerciseWithDetails[]>([])

  useFocusEffect(
    useCallback(() => {
      if (!id) return
      setTemplate(getTemplateByIdV2(id))
      setExercises(getTemplateExercisesV2(id))
    }, [id]),
  )

  if (!template) return null

  const color = goalColor(template.goalType)

  const days = [...new Set(exercises.map((e) => e.dayNumber))].sort((a, b) => a - b)

  function handleStart() {
    startSession(template!.id)
    router.push('/health/workout/session/active' as never)
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
        }} numberOfLines={1}>
          {template.name}
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}
      >
        {/* Hero card */}
        <View style={{
          backgroundColor: colors.surface,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: `${color}44`,
          padding: spacing.lg,
          gap: spacing.md,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <View style={{
              width: 48,
              height: 48,
              borderRadius: radius.md,
              backgroundColor: `${color}18`,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Ionicons name="calendar-outline" size={22} color={color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{
                color: colors.text,
                fontSize: fontSize.sectionHeader,
                fontWeight: '700',
                fontFamily: `${fonts.ui}_700Bold`,
              }}>
                {template.name}
              </Text>
              <Text style={{
                color: `${color}cc`,
                fontSize: fontSize.label,
                fontWeight: '600',
                fontFamily: `${fonts.ui}_600SemiBold`,
                textTransform: 'uppercase',
                letterSpacing: 0.6,
              }}>
                {goalLabel(template.goalType)}
              </Text>
            </View>
          </View>

          {template.description && (
            <Text style={{
              color: colors.textMuted,
              fontSize: fontSize.body,
              fontFamily: `${fonts.ui}_400Regular`,
              lineHeight: 20,
            }}>
              {template.description}
            </Text>
          )}

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
            {template.durationWeeks && (
              <StatPill icon="time-outline" label={`${template.durationWeeks} weeks`} />
            )}
            {template.daysPerWeek && (
              <StatPill icon="calendar-outline" label={`${template.daysPerWeek} days/week`} />
            )}
            <StatPill icon="barbell-outline" label={`${exercises.length} exercises`} />
            <StatPill icon="layers-outline" label={`${days.length} days`} />
          </View>
        </View>

        {/* Day breakdown */}
        <View style={{ gap: spacing.md }}>
          <Text style={{
            color: colors.textMuted,
            fontSize: fontSize.label,
            fontWeight: '600',
            textTransform: 'uppercase',
            letterSpacing: 0.8,
            fontFamily: `${fonts.ui}_600SemiBold`,
          }}>
            Program Structure
          </Text>
          {days.map((day) => (
            <DayCard
              key={day}
              dayNumber={day}
              exercises={exercises.filter((e) => e.dayNumber === day)}
            />
          ))}
        </View>

        {/* CTA */}
        <Pressable onPress={handleStart} style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
          <View style={{
            backgroundColor: colors.workout,
            borderRadius: radius.lg,
            padding: spacing.md,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: spacing.sm,
          }}>
            <Ionicons name="play-circle-outline" size={22} color="#fff" />
            <Text style={{
              color: '#fff',
              fontSize: fontSize.cardTitle,
              fontWeight: '700',
              fontFamily: `${fonts.ui}_700Bold`,
            }}>
              Start This Program
            </Text>
          </View>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  )
}
