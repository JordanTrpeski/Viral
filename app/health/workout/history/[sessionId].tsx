import { useCallback, useState } from 'react'
import { View, Text, ScrollView, Pressable } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useFocusEffect } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { colors, fontSize, spacing, radius, fonts } from '@core/theme'
import {
  getSessionDetailV2,
  getLastSessionByTemplateV2,
  type SessionDetailV2,
} from '@core/db/workoutQueriesV2'
import { useWorkoutStoreV2 } from '@modules/health/workout/workoutStoreV2'
import type { WorkoutSetV2 } from '@modules/health/shared/types'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDuration(s?: number): string {
  if (!s) return '—'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m`
  return `${Math.floor(m / 60)}h ${m % 60}m`
}

function fmtVolume(kg: number): string {
  return kg >= 1000 ? `${(kg / 1000).toFixed(1)}t` : `${Math.round(kg)} kg`
}

function fmtDate(d: string): string {
  return new Date(d).toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

function fmtTime(iso?: string): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <View style={{
      flex: 1, backgroundColor: colors.surface2,
      borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
      padding: spacing.sm, alignItems: 'center', gap: 2,
    }}>
      <Text style={{
        color: colors.textMuted, fontSize: fontSize.micro,
        textTransform: 'uppercase', letterSpacing: 0.5,
        fontFamily: `${fonts.ui}_400Regular`,
      }}>
        {label}
      </Text>
      <Text style={{
        color: colors.text, fontSize: fontSize.cardTitle,
        fontWeight: '700', fontFamily: `${fonts.mono}_700Bold`,
      }}>
        {value}
      </Text>
    </View>
  )
}

function SetRow({ set, vsSet, index }: {
  set: WorkoutSetV2
  vsSet?: WorkoutSetV2
  index: number
}) {
  const w = set.performedWeight ?? 0
  const r = set.performedReps ?? 0
  const vsW = vsSet?.performedWeight ?? 0
  const vsR = vsSet?.performedReps ?? 0
  const improved = (w > vsW) || (w === vsW && r > vsR)
  const regressed = (w < vsW) || (w === vsW && r < vsR)
  const compColor = vsSet
    ? improved ? colors.success : regressed ? '#c0533a' : colors.textMuted
    : colors.textMuted

  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center',
      paddingVertical: 6, gap: spacing.sm,
      borderBottomWidth: index > 0 ? 1 : 0, borderBottomColor: `${colors.border}`,
    }}>
      {/* Set number + warmup */}
      <View style={{
        width: 22, height: 22, borderRadius: radius.full,
        backgroundColor: set.isWarmup ? `${colors.warning}22` : `${colors.workout}18`,
        alignItems: 'center', justifyContent: 'center',
      }}>
        <Text style={{
          color: set.isWarmup ? colors.warning : colors.workout,
          fontSize: 10, fontWeight: '700', fontFamily: `${fonts.mono}_700Bold`,
        }}>
          {set.isWarmup ? 'W' : index + 1}
        </Text>
      </View>

      {/* Weight × reps */}
      <Text style={{
        flex: 1, color: set.isWarmup ? colors.textMuted : colors.text,
        fontSize: fontSize.body, fontWeight: '600',
        fontFamily: `${fonts.mono}_500Medium`,
      }}>
        {w > 0 ? `${w} kg` : '—'} × {r > 0 ? r : '—'}
      </Text>

      {/* RPE */}
      {set.rpe != null && (
        <Text style={{
          color: colors.textMuted, fontSize: fontSize.micro,
          fontFamily: `${fonts.ui}_400Regular`,
        }}>
          RPE {set.rpe}
        </Text>
      )}

      {/* vs last */}
      {vsSet && (
        <Text style={{
          color: compColor, fontSize: fontSize.micro,
          fontFamily: `${fonts.ui}_600SemiBold`,
        }}>
          {improved ? '▲' : regressed ? '▼' : '='} {vsW > 0 ? `${vsW}×${vsR}` : '—'}
        </Text>
      )}
    </View>
  )
}

function ExerciseBlock({ ex, vsEx }: {
  ex: SessionDetailV2['exercises'][number]
  vsEx?: SessionDetailV2['exercises'][number]
}) {
  const workSets = ex.sets.filter((s) => !s.isWarmup)
  const vsWorkSets = vsEx?.sets.filter((s) => !s.isWarmup) ?? []

  return (
    <View style={{
      backgroundColor: colors.surface,
      borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border,
      overflow: 'hidden', marginBottom: spacing.sm,
    }}>
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
        backgroundColor: `${colors.workout}0a`,
        borderBottomWidth: 1, borderBottomColor: colors.border, gap: spacing.sm,
      }}>
        <Ionicons name="barbell-outline" size={14} color={colors.workout} />
        <Text style={{
          flex: 1, color: colors.text, fontSize: fontSize.cardTitle,
          fontWeight: '700', fontFamily: `${fonts.ui}_700Bold`,
        }}>
          {ex.exercise.name}
        </Text>
        <Text style={{
          color: colors.textMuted, fontSize: fontSize.micro,
          fontFamily: `${fonts.ui}_400Regular`,
        }}>
          {ex.sets.length} set{ex.sets.length !== 1 ? 's' : ''}
        </Text>
      </View>

      <View style={{ padding: spacing.md }}>
        {ex.sets.map((s, i) => (
          <SetRow
            key={s.id}
            set={s}
            vsSet={vsWorkSets[i]}
            index={i}
          />
        ))}
      </View>
    </View>
  )
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function SessionDetailScreen() {
  const router = useRouter()
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>()
  const { startSession } = useWorkoutStoreV2()

  const [detail, setDetail] = useState<SessionDetailV2 | null>(null)
  const [vsDetail, setVsDetail] = useState<SessionDetailV2 | null>(null)
  const [showComparison, setShowComparison] = useState(false)

  useFocusEffect(
    useCallback(() => {
      if (!sessionId) return
      const d = getSessionDetailV2(sessionId)
      setDetail(d)
      if (d?.session.templateId) {
        setVsDetail(getLastSessionByTemplateV2(d.session.templateId, sessionId))
      }
    }, [sessionId]),
  )

  if (!detail) return null

  const { session, templateName, exercises, totalVolumeKg } = detail
  const workSets = exercises.flatMap((e) => e.sets.filter((s) => !s.isWarmup))

  function handleRepeat() {
    startSession(session.templateId)
    router.push('/health/workout/session/active' as never)
  }

  function vsExFor(ex: SessionDetailV2['exercises'][number]) {
    return vsDetail?.exercises.find((e) => e.exercise.id === ex.exercise.id)
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
        <View style={{ flex: 1 }}>
          <Text style={{
            color: colors.text, fontSize: fontSize.sectionHeader,
            fontWeight: '700', fontFamily: `${fonts.ui}_700Bold`,
          }} numberOfLines={1}>
            {templateName ?? 'Free Workout'}
          </Text>
          <Text style={{
            color: colors.textMuted, fontSize: fontSize.micro,
            fontFamily: `${fonts.ui}_400Regular`,
          }}>
            {fmtDate(session.date)}
          </Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
        {/* Stats */}
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <StatBox label="Duration" value={fmtDuration(session.durationSeconds)} />
          <StatBox label="Exercises" value={String(exercises.length)} />
          <StatBox label="Sets" value={String(workSets.length)} />
          <StatBox label="Volume" value={fmtVolume(totalVolumeKg)} />
        </View>

        {/* Time + notes */}
        <View style={{
          backgroundColor: colors.surface, borderRadius: radius.lg,
          borderWidth: 1, borderColor: colors.border, padding: spacing.md, gap: spacing.sm,
        }}>
          <View style={{ flexDirection: 'row', gap: spacing.xl }}>
            <View style={{ gap: 2 }}>
              <Text style={{ color: colors.textMuted, fontSize: fontSize.micro, fontFamily: `${fonts.ui}_400Regular` }}>
                Started
              </Text>
              <Text style={{ color: colors.text, fontSize: fontSize.body, fontFamily: `${fonts.mono}_500Medium` }}>
                {fmtTime(session.startedAt)}
              </Text>
            </View>
            <View style={{ gap: 2 }}>
              <Text style={{ color: colors.textMuted, fontSize: fontSize.micro, fontFamily: `${fonts.ui}_400Regular` }}>
                Finished
              </Text>
              <Text style={{ color: colors.text, fontSize: fontSize.body, fontFamily: `${fonts.mono}_500Medium` }}>
                {fmtTime(session.endedAt)}
              </Text>
            </View>
            {session.perceivedDifficulty != null && (
              <View style={{ gap: 2 }}>
                <Text style={{ color: colors.textMuted, fontSize: fontSize.micro, fontFamily: `${fonts.ui}_400Regular` }}>
                  Difficulty
                </Text>
                <Text style={{ color: colors.text, fontSize: fontSize.body, fontFamily: `${fonts.mono}_500Medium` }}>
                  {session.perceivedDifficulty} / 10
                </Text>
              </View>
            )}
          </View>
          {session.notes && (
            <Text style={{
              color: colors.textMuted, fontSize: fontSize.body,
              fontFamily: `${fonts.ui}_400Regular`, lineHeight: 20,
              borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm,
            }}>
              {session.notes}
            </Text>
          )}
        </View>

        {/* vs Last Time toggle */}
        {vsDetail && (
          <Pressable
            onPress={() => setShowComparison((v) => !v)}
            style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
          >
            <View style={{
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
              gap: spacing.xs, backgroundColor: `${colors.primary}18`,
              borderRadius: radius.md, borderWidth: 1, borderColor: `${colors.primary}44`,
              padding: spacing.sm,
            }}>
              <Ionicons name="git-compare-outline" size={14} color={colors.primary} />
              <Text style={{
                color: colors.primary, fontSize: fontSize.label,
                fontWeight: '600', fontFamily: `${fonts.ui}_600SemiBold`,
              }}>
                {showComparison ? 'Hide' : 'Show'} vs Last Time ({vsDetail.session.date})
              </Text>
            </View>
          </Pressable>
        )}

        {/* Exercise blocks */}
        <View style={{ gap: 0 }}>
          <Text style={{
            color: colors.textMuted, fontSize: fontSize.label,
            fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8,
            fontFamily: `${fonts.ui}_600SemiBold`, marginBottom: spacing.sm,
          }}>
            Exercises
          </Text>
          {exercises.map((ex) => (
            <ExerciseBlock
              key={ex.exercise.id}
              ex={ex}
              vsEx={showComparison ? vsExFor(ex) : undefined}
            />
          ))}
        </View>

        {/* Repeat button */}
        <Pressable onPress={handleRepeat} style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
          <View style={{
            backgroundColor: colors.workout, borderRadius: radius.lg, padding: spacing.md,
            flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
          }}>
            <Ionicons name="refresh-outline" size={20} color="#fff" />
            <Text style={{
              color: '#fff', fontSize: fontSize.cardTitle,
              fontWeight: '700', fontFamily: `${fonts.ui}_700Bold`,
            }}>
              Repeat This Workout
            </Text>
          </View>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  )
}
