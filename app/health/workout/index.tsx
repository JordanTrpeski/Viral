import { useCallback, useState, useMemo } from 'react'
import { View, Text, ScrollView, Pressable } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useFocusEffect } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { colors, fontSize, spacing, radius, fonts } from '@core/theme'
import { useWorkoutStoreV2 } from '@modules/health/workout/workoutStoreV2'
import {
  getSessionPrimaryMusclesV2,
  getWorkoutStreakV2,
  getWeeklyVolumeByMuscleV2,
  type SessionSummaryRowV2,
  type WorkoutStreakV2,
  type WeeklyMuscleVolumeV2,
} from '@core/db/workoutQueriesV2'
import { localDateStr } from '@core/utils/units'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDuration(seconds: number | null): string {
  if (!seconds) return '—'
  const m = Math.floor(seconds / 60)
  if (m < 60) return `${m}m`
  return `${Math.floor(m / 60)}h ${m % 60}m`
}

function fmtDate(d: string): string {
  const dt = new Date(d)
  return dt.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

function greeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function NavButton({
  icon, label, onPress, accent,
}: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; onPress: () => void; accent?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1, flex: 1 })}
    >
      <View style={{
        backgroundColor: accent ? `${colors.workout}22` : colors.surface,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: accent ? `${colors.workout}55` : colors.border,
        padding: spacing.md,
        alignItems: 'center',
        gap: spacing.xs,
      }}>
        <Ionicons name={icon} size={22} color={accent ? colors.workout : colors.textMuted} />
        <Text style={{
          color: accent ? colors.workout : colors.textMuted,
          fontSize: fontSize.label,
          fontWeight: '600',
          fontFamily: `${fonts.ui}_600SemiBold`,
        }}>
          {label}
        </Text>
      </View>
    </Pressable>
  )
}

function SessionCard({ session, onPress }: { session: SessionSummaryRowV2; onPress?: () => void }) {
  const muscles = getSessionPrimaryMusclesV2(session.id)

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
    >
      <View style={{
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        padding: spacing.md,
        gap: spacing.sm,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{
            flex: 1,
            color: colors.text,
            fontSize: fontSize.cardTitle,
            fontWeight: '600',
            fontFamily: `${fonts.ui}_600SemiBold`,
          }}>
            {fmtDate(session.date)}
          </Text>
          <Text style={{
            color: colors.textMuted,
            fontSize: fontSize.label,
            fontFamily: `${fonts.mono}_400Regular`,
          }}>
            {fmtDuration(session.durationSeconds)}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', gap: spacing.xl }}>
          <View>
            <Text style={{ color: colors.textMuted, fontSize: fontSize.micro, fontFamily: `${fonts.ui}_400Regular` }}>
              Exercises
            </Text>
            <Text style={{ color: colors.text, fontSize: fontSize.body, fontWeight: '600', fontFamily: `${fonts.mono}_500Medium` }}>
              {session.exerciseCount}
            </Text>
          </View>
          <View>
            <Text style={{ color: colors.textMuted, fontSize: fontSize.micro, fontFamily: `${fonts.ui}_400Regular` }}>
              Sets
            </Text>
            <Text style={{ color: colors.text, fontSize: fontSize.body, fontWeight: '600', fontFamily: `${fonts.mono}_500Medium` }}>
              {session.totalSets}
            </Text>
          </View>
          <View>
            <Text style={{ color: colors.textMuted, fontSize: fontSize.micro, fontFamily: `${fonts.ui}_400Regular` }}>
              Volume
            </Text>
            <Text style={{ color: colors.text, fontSize: fontSize.body, fontWeight: '600', fontFamily: `${fonts.mono}_500Medium` }}>
              {session.totalVolume >= 1000
                ? `${(session.totalVolume / 1000).toFixed(1)}t`
                : `${Math.round(session.totalVolume)} kg`}
            </Text>
          </View>
        </View>

        {muscles.length > 0 && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
            {muscles.map((m) => (
              <View key={m} style={{
                backgroundColor: `${colors.workout}22`,
                borderRadius: radius.sm,
                paddingHorizontal: 6,
                paddingVertical: 2,
              }}>
                <Text style={{
                  color: colors.workout,
                  fontSize: fontSize.micro,
                  textTransform: 'capitalize',
                  fontFamily: `${fonts.ui}_400Regular`,
                }}>
                  {m}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </Pressable>
  )
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function WorkoutTodayScreen() {
  const router = useRouter()
  const { activeSession, recentSessions, loadRecentSessions, resumeTodaySession, startSession } = useWorkoutStoreV2()
  const [streak, setStreak] = useState<WorkoutStreakV2 | null>(null)
  const [weekVolume, setWeekVolume] = useState<WeeklyMuscleVolumeV2[]>([])

  const today = localDateStr()

  useFocusEffect(
    useCallback(() => {
      loadRecentSessions()
      resumeTodaySession()
      setStreak(getWorkoutStreakV2())
      setWeekVolume(getWeeklyVolumeByMuscleV2(1))
    }, []),
  )

  const volumeWarnings = useMemo(() => {
    const high = weekVolume.filter((r) => r.sets > 25).map((r) => r.muscle)
    const low = weekVolume.filter((r) => r.sets > 0 && r.sets < 8).map((r) => r.muscle)
    return { high, low }
  }, [weekVolume])

  const showDeload = (streak?.currentStreakWeeks ?? 0) >= 4

  const todaySession = recentSessions.find((s) => s.date === today)
  const hasActive = !!activeSession

  function handleStart() {
    if (hasActive) {
      router.push('/health/workout/session/active')
    } else {
      startSession()
      router.push('/health/workout/session/active')
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
      }}>
        <Pressable onPress={() => router.back()} style={{ padding: spacing.xs }}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={{
          flex: 1,
          color: colors.text,
          fontSize: fontSize.sectionHeader,
          fontWeight: '700',
          marginLeft: spacing.xs,
          fontFamily: `${fonts.ui}_700Bold`,
        }}>
          Workout
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}
      >
        {/* Greeting */}
        <View>
          <Text style={{
            color: colors.textMuted,
            fontSize: fontSize.label,
            fontFamily: `${fonts.ui}_400Regular`,
          }}>
            {greeting()} · {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
          </Text>
          <Text style={{
            color: colors.text,
            fontSize: fontSize.screenTitle,
            fontWeight: '700',
            marginTop: 2,
            fontFamily: `${fonts.ui}_700Bold`,
          }}>
            {hasActive ? 'Session in progress' : todaySession ? 'Session complete' : 'Ready to train?'}
          </Text>
        </View>

        {/* Today status card */}
        <View style={{
          backgroundColor: colors.surface,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: hasActive ? `${colors.workout}55` : colors.border,
          padding: spacing.lg,
          gap: spacing.md,
        }}>
          {/* Status dot */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <View style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: hasActive ? colors.warning : todaySession ? colors.success : colors.textMuted,
            }} />
            <Text style={{
              color: hasActive ? colors.warning : todaySession ? colors.success : colors.textMuted,
              fontSize: fontSize.label,
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: 1,
              fontFamily: `${fonts.ui}_600SemiBold`,
            }}>
              {hasActive ? 'In Progress' : todaySession ? 'Done' : 'Not Started'}
            </Text>
          </View>

          {todaySession && !hasActive ? (
            <SessionCard session={todaySession} />
          ) : (
            <Pressable
              onPress={handleStart}
              style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
            >
              <View style={{
                backgroundColor: colors.workout,
                borderRadius: radius.lg,
                padding: spacing.md,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: spacing.sm,
              }}>
                <Ionicons name={hasActive ? 'play' : 'barbell-outline'} size={20} color="#fff" />
                <Text style={{
                  color: '#fff',
                  fontSize: fontSize.cardTitle,
                  fontWeight: '700',
                  fontFamily: `${fonts.ui}_700Bold`,
                }}>
                  {hasActive ? 'Resume Workout' : 'Start Workout'}
                </Text>
              </View>
            </Pressable>
          )}
        </View>

        {/* Streak widget */}
        {streak && (streak.currentStreakWeeks > 0 || streak.thisWeekCount > 0) && (
          <View style={{
            backgroundColor: colors.surface, borderRadius: radius.lg,
            borderWidth: 1, borderColor: `${colors.workout}44`,
            padding: spacing.md,
            flexDirection: 'row', alignItems: 'center', gap: spacing.md,
          }}>
            <View style={{
              width: 44, height: 44, borderRadius: radius.md,
              backgroundColor: `${colors.workout}18`,
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Ionicons name="flame-outline" size={22} color={colors.workout} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{
                color: colors.text, fontSize: fontSize.cardTitle,
                fontWeight: '700', fontFamily: `${fonts.ui}_700Bold`,
              }}>
                {streak.currentStreakWeeks > 0
                  ? `${streak.currentStreakWeeks} week streak`
                  : 'Keep going!'}
              </Text>
              <Text style={{
                color: colors.textMuted, fontSize: fontSize.micro,
                fontFamily: `${fonts.ui}_400Regular`,
              }}>
                {streak.thisWeekCount}/{streak.thisWeekTarget} workouts this week
                {streak.longestStreakWeeks > 1 ? ` · Best: ${streak.longestStreakWeeks}wk` : ''}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 2 }}>
              <Text style={{
                color: colors.workout, fontSize: 20,
                fontWeight: '700', fontFamily: `${fonts.mono}_700Bold`,
              }}>
                {streak.thisWeekCount}/{streak.thisWeekTarget}
              </Text>
            </View>
          </View>
        )}

        {/* Deload planner */}
        {showDeload && (
          <View style={{
            backgroundColor: `${colors.warning}18`,
            borderRadius: radius.lg, borderWidth: 1, borderColor: `${colors.warning}55`,
            padding: spacing.md, flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm,
          }}>
            <Ionicons name="battery-half-outline" size={20} color={colors.warning} style={{ marginTop: 2 }} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{
                color: colors.warning, fontSize: fontSize.body,
                fontWeight: '700', fontFamily: `${fonts.ui}_700Bold`,
              }}>
                Consider a deload week
              </Text>
              <Text style={{
                color: colors.textMuted, fontSize: fontSize.micro,
                fontFamily: `${fonts.ui}_400Regular`,
              }}>
                {streak!.currentStreakWeeks} consecutive weeks of training. Reducing weight 10% or volume 30% helps recovery.
              </Text>
            </View>
          </View>
        )}

        {/* Volume warnings */}
        {(volumeWarnings.high.length > 0 || volumeWarnings.low.length > 0) && (
          <View style={{
            backgroundColor: colors.surface, borderRadius: radius.lg,
            borderWidth: 1, borderColor: colors.border, padding: spacing.md, gap: spacing.xs,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: 2 }}>
              <Ionicons name="warning-outline" size={14} color={colors.textMuted} />
              <Text style={{
                color: colors.textMuted, fontSize: fontSize.label,
                fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8,
                fontFamily: `${fonts.ui}_600SemiBold`,
              }}>
                This week
              </Text>
            </View>
            {volumeWarnings.high.map((m) => (
              <Text key={m} style={{
                color: '#c0533a', fontSize: fontSize.micro,
                fontFamily: `${fonts.ui}_400Regular`, textTransform: 'capitalize',
              }}>
                ▲ High volume on {m} — consider reducing next week
              </Text>
            ))}
            {volumeWarnings.low.map((m) => (
              <Text key={m} style={{
                color: colors.warning, fontSize: fontSize.micro,
                fontFamily: `${fonts.ui}_400Regular`, textTransform: 'capitalize',
              }}>
                ▼ Low volume on {m} — consider adding more sets
              </Text>
            ))}
          </View>
        )}

        {/* Quick nav */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          <NavButton
            icon="barbell-outline"
            label="Start"
            onPress={handleStart}
            accent
          />
          <NavButton
            icon="library-outline"
            label="Exercises"
            onPress={() => router.push('/health/workout/exercises')}
          />
          <NavButton
            icon="document-text-outline"
            label="Templates"
            onPress={() => router.push('/health/workout/templates')}
          />
          <NavButton
            icon="time-outline"
            label="History"
            onPress={() => router.push('/health/workout/history')}
          />
          <NavButton
            icon="trophy-outline"
            label="PRs"
            onPress={() => router.push('/health/workout/progress/prs')}
          />
          <NavButton
            icon="bar-chart-outline"
            label="Volume"
            onPress={() => router.push('/health/workout/progress/volume')}
          />
          <NavButton
            icon="nutrition-outline"
            label="Nutrition"
            onPress={() => router.push('/health/nutrition')}
          />
        </View>

        {/* Recent sessions */}
        {recentSessions.filter((s) => s.date !== today).length > 0 && (
          <View style={{ gap: spacing.sm }}>
            <Text style={{
              color: colors.text,
              fontSize: fontSize.cardTitle,
              fontWeight: '600',
              fontFamily: `${fonts.ui}_600SemiBold`,
            }}>
              Recent Sessions
            </Text>
            {recentSessions
              .filter((s) => s.date !== today)
              .slice(0, 5)
              .map((s) => (
                <SessionCard key={s.id} session={s} />
              ))}
          </View>
        )}

        {recentSessions.length === 0 && !hasActive && (
          <View style={{ alignItems: 'center', paddingVertical: spacing.xl }}>
            <Ionicons name="barbell-outline" size={48} color={colors.textMuted} style={{ marginBottom: spacing.md }} />
            <Text style={{
              color: colors.textMuted,
              fontSize: fontSize.body,
              textAlign: 'center',
              fontFamily: `${fonts.ui}_400Regular`,
            }}>
              No sessions yet.{'\n'}Hit Start Workout to begin.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
