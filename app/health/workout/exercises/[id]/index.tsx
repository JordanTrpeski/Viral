import { useState, useCallback } from 'react'
import { View, Text, ScrollView, Pressable } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useFocusEffect } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { colors, fontSize, spacing, radius, fonts } from '@core/theme'
import {
  getExerciseById,
  getExercisesByIds,
  getLatestPRForExercise,
} from '@core/db/workoutQueriesV2'
import type { ExerciseV2, ExercisePR } from '@modules/health/shared/types'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const CATEGORY_COLOR: Record<ExerciseV2['category'], string> = {
  strength: colors.workout,
  cardio: colors.steps ?? '#4db6ac',
  mobility: colors.success ?? '#66bb6a',
}

const DIFFICULTY_LABEL: Record<ExerciseV2['difficulty'], { label: string; color: string }> = {
  beginner: { label: 'Beginner', color: colors.success ?? '#4caf50' },
  intermediate: { label: 'Intermediate', color: colors.warning ?? '#ff9800' },
  advanced: { label: 'Advanced', color: '#c0533a' },
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function InfoBadge({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={{
      backgroundColor: colors.surface2,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      alignItems: 'center',
      flex: 1,
    }}>
      <Text style={{
        color: colors.textMuted,
        fontSize: fontSize.micro,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        marginBottom: 2,
        fontFamily: `${fonts.ui}_400Regular`,
      }}>
        {label}
      </Text>
      <Text style={{
        color: color ?? colors.text,
        fontSize: fontSize.label,
        fontWeight: '600',
        textTransform: 'capitalize',
        fontFamily: `${fonts.ui}_600SemiBold`,
      }}>
        {value}
      </Text>
    </View>
  )
}

function ExpandableSection({
  title, icon, items, accentColor,
}: { title: string; icon: React.ComponentProps<typeof Ionicons>['name']; items: string[]; accentColor: string }) {
  const [open, setOpen] = useState(true)
  return (
    <View style={{
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    }}>
      <Pressable
        onPress={() => setOpen((v) => !v)}
        style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
      >
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          padding: spacing.md,
          gap: spacing.sm,
        }}>
          <View style={{
            width: 30,
            height: 30,
            borderRadius: radius.sm,
            backgroundColor: `${accentColor}22`,
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Ionicons name={icon} size={16} color={accentColor} />
          </View>
          <Text style={{
            flex: 1,
            color: colors.text,
            fontSize: fontSize.cardTitle,
            fontWeight: '600',
            fontFamily: `${fonts.ui}_600SemiBold`,
          }}>
            {title}
          </Text>
          <Ionicons
            name={open ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={colors.textMuted}
          />
        </View>
      </Pressable>
      {open && (
        <View style={{ paddingHorizontal: spacing.md, paddingBottom: spacing.md, gap: spacing.xs }}>
          {items.map((item, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' }}>
              <View style={{
                width: 20,
                height: 20,
                borderRadius: 10,
                backgroundColor: `${accentColor}33`,
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: 1,
                flexShrink: 0,
              }}>
                <Text style={{
                  color: accentColor,
                  fontSize: 10,
                  fontWeight: '700',
                  fontFamily: `${fonts.ui}_700Bold`,
                }}>
                  {i + 1}
                </Text>
              </View>
              <Text style={{
                flex: 1,
                color: colors.textMuted,
                fontSize: fontSize.body,
                lineHeight: 20,
                fontFamily: `${fonts.ui}_400Regular`,
              }}>
                {item}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  )
}

function PRCard({ pr }: { pr: ExercisePR }) {
  return (
    <View style={{
      backgroundColor: `${colors.primary}18`,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: `${colors.primary}44`,
      padding: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    }}>
      <View style={{
        width: 40,
        height: 40,
        borderRadius: radius.md,
        backgroundColor: `${colors.primary}33`,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <Ionicons name="trophy-outline" size={20} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{
          color: colors.textMuted,
          fontSize: fontSize.micro,
          textTransform: 'uppercase',
          letterSpacing: 0.8,
          marginBottom: 2,
          fontFamily: `${fonts.ui}_400Regular`,
        }}>
          Personal Record
        </Text>
        <Text style={{
          color: colors.primary,
          fontSize: fontSize.cardTitle,
          fontWeight: '700',
          fontFamily: `${fonts.ui}_700Bold`,
        }}>
          {pr.weightKg} kg × {pr.reps} reps
        </Text>
        <Text style={{
          color: colors.textMuted,
          fontSize: fontSize.micro,
          fontFamily: `${fonts.ui}_400Regular`,
        }}>
          Est. 1RM: {pr.estimatedOneRepMax.toFixed(1)} kg · {pr.date}
        </Text>
      </View>
    </View>
  )
}

function SubstituteCard({ exercise, onPress }: { exercise: ExerciseV2; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
    >
      <View style={{
        backgroundColor: colors.surface2,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.border,
        padding: spacing.sm,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        width: 160,
      }}>
        <View style={{
          width: 32,
          height: 32,
          borderRadius: radius.sm,
          backgroundColor: `${colors.workout}18`,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Ionicons name="barbell-outline" size={16} color={colors.workout} />
        </View>
        <View style={{ flex: 1 }}>
          <Text
            numberOfLines={2}
            style={{
              color: colors.text,
              fontSize: fontSize.label,
              fontWeight: '600',
              fontFamily: `${fonts.ui}_600SemiBold`,
            }}
          >
            {exercise.name}
          </Text>
          <Text style={{
            color: colors.textMuted,
            fontSize: fontSize.micro,
            textTransform: 'capitalize',
            fontFamily: `${fonts.ui}_400Regular`,
          }}>
            {exercise.equipment}
          </Text>
        </View>
      </View>
    </Pressable>
  )
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function ExerciseDetailScreen() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()

  const [exercise, setExercise] = useState<ExerciseV2 | null>(null)
  const [pr, setPr] = useState<ExercisePR | null>(null)
  const [substitutes, setSubstitutes] = useState<ExerciseV2[]>([])

  useFocusEffect(
    useCallback(() => {
      if (!id) return
      const ex = getExerciseById(id)
      setExercise(ex)
      if (ex) {
        setPr(getLatestPRForExercise(id))
        setSubstitutes(getExercisesByIds(ex.substituteIds))
      }
    }, [id]),
  )

  if (!exercise) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: colors.textMuted, fontFamily: `${fonts.ui}_400Regular` }}>
            Exercise not found
          </Text>
        </View>
      </SafeAreaView>
    )
  }

  const diffInfo = DIFFICULTY_LABEL[exercise.difficulty]
  const catColor = CATEGORY_COLOR[exercise.category]

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
        <Text
          numberOfLines={1}
          style={{
            flex: 1,
            color: colors.text,
            fontSize: fontSize.sectionHeader,
            fontWeight: '700',
            fontFamily: `${fonts.ui}_700Bold`,
          }}
        >
          {exercise.name}
        </Text>
        <Pressable
          onPress={() => router.push(`/health/workout/exercises/${id}/history` as never)}
          style={{ padding: spacing.xs }}
        >
          <Ionicons name="stats-chart-outline" size={22} color={colors.primary} />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
      >
        {/* Info badges row */}
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <InfoBadge label="Category" value={exercise.category} color={catColor} />
          <InfoBadge label="Equipment" value={exercise.equipment} />
          <InfoBadge label="Difficulty" value={diffInfo.label} color={diffInfo.color} />
        </View>

        {/* Movement + unilateral */}
        {(exercise.movementPattern || exercise.isUnilateral) && (
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            {exercise.movementPattern && (
              <InfoBadge label="Pattern" value={exercise.movementPattern} />
            )}
            {exercise.isUnilateral && (
              <InfoBadge label="Type" value="Unilateral" color={colors.primary} />
            )}
          </View>
        )}

        {/* Muscles */}
        <View style={{
          backgroundColor: colors.surface,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: colors.border,
          padding: spacing.md,
          gap: spacing.sm,
        }}>
          <Text style={{
            color: colors.textMuted,
            fontSize: fontSize.label,
            fontWeight: '600',
            textTransform: 'uppercase',
            letterSpacing: 0.8,
            fontFamily: `${fonts.ui}_600SemiBold`,
          }}>
            Muscles Worked
          </Text>
          <View>
            <Text style={{
              color: colors.textMuted,
              fontSize: fontSize.micro,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
              marginBottom: 4,
              fontFamily: `${fonts.ui}_400Regular`,
            }}>
              Primary
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
              {exercise.primaryMuscles.map((m) => (
                <View key={m} style={{
                  backgroundColor: `${colors.workout}22`,
                  borderRadius: radius.sm,
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                }}>
                  <Text style={{
                    color: colors.workout,
                    fontSize: fontSize.label,
                    textTransform: 'capitalize',
                    fontFamily: `${fonts.ui}_400Regular`,
                  }}>
                    {m}
                  </Text>
                </View>
              ))}
            </View>
          </View>
          {exercise.secondaryMuscles.length > 0 && (
            <View>
              <Text style={{
                color: colors.textMuted,
                fontSize: fontSize.micro,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                marginBottom: 4,
                fontFamily: `${fonts.ui}_400Regular`,
              }}>
                Secondary
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
                {exercise.secondaryMuscles.map((m) => (
                  <View key={m} style={{
                    backgroundColor: colors.surface2,
                    borderRadius: radius.sm,
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}>
                    <Text style={{
                      color: colors.textMuted,
                      fontSize: fontSize.label,
                      textTransform: 'capitalize',
                      fontFamily: `${fonts.ui}_400Regular`,
                    }}>
                      {m}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Description */}
        {exercise.description && (
          <View style={{
            backgroundColor: colors.surface,
            borderRadius: radius.lg,
            borderWidth: 1,
            borderColor: colors.border,
            padding: spacing.md,
          }}>
            <Text style={{
              color: colors.text,
              fontSize: fontSize.body,
              lineHeight: 22,
              fontFamily: `${fonts.ui}_400Regular`,
            }}>
              {exercise.description}
            </Text>
          </View>
        )}

        {/* PR card */}
        {pr && <PRCard pr={pr} />}

        {/* Form cues */}
        {exercise.formCues.length > 0 && (
          <ExpandableSection
            title="Form Cues"
            icon="checkmark-circle-outline"
            items={exercise.formCues}
            accentColor={colors.success ?? '#66bb6a'}
          />
        )}

        {/* Common mistakes */}
        {exercise.commonMistakes.length > 0 && (
          <ExpandableSection
            title="Common Mistakes"
            icon="warning-outline"
            items={exercise.commonMistakes}
            accentColor={colors.warning ?? '#ff9800'}
          />
        )}

        {/* Substitutes */}
        {substitutes.length > 0 && (
          <View style={{ gap: spacing.sm }}>
            <Text style={{
              color: colors.text,
              fontSize: fontSize.cardTitle,
              fontWeight: '600',
              fontFamily: `${fonts.ui}_600SemiBold`,
            }}>
              Substitutes
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: spacing.sm }}
            >
              {substitutes.map((s) => (
                <SubstituteCard
                  key={s.id}
                  exercise={s}
                  onPress={() => router.push(`/health/workout/exercises/${s.id}` as never)}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* View history CTA */}
        <Pressable
          onPress={() => router.push(`/health/workout/exercises/${id}/history` as never)}
          style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
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
            <View style={{
              width: 40,
              height: 40,
              borderRadius: radius.md,
              backgroundColor: `${colors.primary}22`,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Ionicons name="stats-chart-outline" size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{
                color: colors.text,
                fontSize: fontSize.cardTitle,
                fontWeight: '600',
                fontFamily: `${fonts.ui}_600SemiBold`,
              }}>
                View Progress
              </Text>
              <Text style={{
                color: colors.textMuted,
                fontSize: fontSize.label,
                fontFamily: `${fonts.ui}_400Regular`,
              }}>
                PRs, weight history, sessions
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </View>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  )
}
