import { useState, useCallback } from 'react'
import { View, Text, ScrollView, Pressable, FlatList } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useFocusEffect } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { colors, fontSize, spacing, radius, fonts } from '@core/theme'
import {
  getExerciseById,
  getPRsForExercise,
  getSessionSummariesForExercise,
} from '@core/db/workoutQueriesV2'
import type { ExerciseV2, ExercisePR } from '@modules/health/shared/types'
import type { SessionVolumeSummary } from '@core/db/workoutQueriesV2'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number, dec = 1): string {
  return n % 1 === 0 ? String(n) : n.toFixed(dec)
}

function formatDate(d: string): string {
  const dt = new Date(d)
  return dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })
}

// Compute a simple sparkline-style bar chart from volume history
function VolumeChart({ sessions }: { sessions: SessionVolumeSummary[] }) {
  if (sessions.length < 2) {
    return (
      <View style={{ alignItems: 'center', paddingVertical: spacing.md }}>
        <Text style={{
          color: colors.textMuted,
          fontSize: fontSize.label,
          fontFamily: `${fonts.ui}_400Regular`,
        }}>
          Log at least 2 sessions to see chart
        </Text>
      </View>
    )
  }

  const maxVol = Math.max(...sessions.map((s) => s.totalVolume), 1)
  const BAR_HEIGHT = 60
  const data = [...sessions].reverse().slice(-12) // oldest first, max 12

  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: BAR_HEIGHT + 20 }}>
        {data.map((s, i) => {
          const barH = Math.max(4, (s.totalVolume / maxVol) * BAR_HEIGHT)
          const isLast = i === data.length - 1
          return (
            <View key={s.sessionId} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: BAR_HEIGHT + 20 }}>
              <View style={{
                width: '100%',
                height: barH,
                backgroundColor: isLast ? colors.primary : `${colors.primary}55`,
                borderRadius: 3,
                borderTopLeftRadius: 3,
                borderTopRightRadius: 3,
              }} />
              {(i === 0 || i === data.length - 1) && (
                <Text style={{
                  color: colors.textMuted,
                  fontSize: 8,
                  marginTop: 3,
                  fontFamily: `${fonts.ui}_400Regular`,
                }}>
                  {formatDate(s.date).split(' ').slice(0, 2).join(' ')}
                </Text>
              )}
            </View>
          )
        })}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 }}>
        <Text style={{ color: colors.textMuted, fontSize: fontSize.micro, fontFamily: `${fonts.ui}_400Regular` }}>
          Volume (kg)
        </Text>
        <Text style={{ color: colors.textMuted, fontSize: fontSize.micro, fontFamily: `${fonts.ui}_400Regular` }}>
          max {fmt(maxVol)} kg
        </Text>
      </View>
    </View>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PRRow({ pr, rank }: { pr: ExercisePR; rank: number }) {
  const isBest = rank === 1
  return (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      gap: spacing.md,
    }}>
      {/* Rank badge */}
      <View style={{
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: isBest ? `${colors.primary}33` : colors.surface2,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {isBest
          ? <Ionicons name="trophy" size={14} color={colors.primary} />
          : <Text style={{ color: colors.textMuted, fontSize: fontSize.label, fontFamily: `${fonts.mono}_400Regular` }}>
              {rank}
            </Text>
        }
      </View>

      {/* Weight × reps */}
      <View style={{ flex: 1 }}>
        <Text style={{
          color: isBest ? colors.primary : colors.text,
          fontSize: fontSize.cardTitle,
          fontWeight: '600',
          fontFamily: `${fonts.ui}_600SemiBold`,
        }}>
          {fmt(pr.weightKg)} kg × {pr.reps} reps
        </Text>
        <Text style={{
          color: colors.textMuted,
          fontSize: fontSize.micro,
          fontFamily: `${fonts.ui}_400Regular`,
        }}>
          {formatDate(pr.date)}
        </Text>
      </View>

      {/* Est. 1RM */}
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={{
          color: colors.textMuted,
          fontSize: fontSize.micro,
          fontFamily: `${fonts.ui}_400Regular`,
        }}>
          1RM
        </Text>
        <Text style={{
          color: colors.text,
          fontSize: fontSize.label,
          fontWeight: '600',
          fontFamily: `${fonts.mono}_500Medium`,
        }}>
          {fmt(pr.estimatedOneRepMax)} kg
        </Text>
      </View>
    </View>
  )
}

function SessionRow({ session }: { session: SessionVolumeSummary }) {
  return (
    <View style={{
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      marginBottom: spacing.sm,
    }}>
      {/* Date */}
      <View style={{ width: 50 }}>
        <Text style={{
          color: colors.text,
          fontSize: fontSize.label,
          fontWeight: '600',
          fontFamily: `${fonts.ui}_600SemiBold`,
          textAlign: 'center',
        }}>
          {formatDate(session.date).split(' ')[0]}
        </Text>
        <Text style={{
          color: colors.textMuted,
          fontSize: fontSize.micro,
          textAlign: 'center',
          fontFamily: `${fonts.ui}_400Regular`,
        }}>
          {formatDate(session.date).split(' ').slice(1).join(' ')}
        </Text>
      </View>

      <View style={{ width: 1, height: 32, backgroundColor: colors.border }} />

      {/* Top set */}
      <View style={{ flex: 1 }}>
        {session.topSet ? (
          <>
            <Text style={{
              color: colors.text,
              fontSize: fontSize.cardTitle,
              fontWeight: '600',
              fontFamily: `${fonts.ui}_600SemiBold`,
            }}>
              {fmt(session.topSet.weightKg)} kg × {session.topSet.reps}
            </Text>
            <Text style={{
              color: colors.textMuted,
              fontSize: fontSize.micro,
              fontFamily: `${fonts.ui}_400Regular`,
            }}>
              top set
            </Text>
          </>
        ) : (
          <Text style={{ color: colors.textMuted, fontSize: fontSize.label, fontFamily: `${fonts.ui}_400Regular` }}>
            Bodyweight
          </Text>
        )}
      </View>

      {/* Stats */}
      <View style={{ alignItems: 'flex-end', gap: 2 }}>
        <Text style={{
          color: colors.text,
          fontSize: fontSize.label,
          fontWeight: '600',
          fontFamily: `${fonts.mono}_500Medium`,
        }}>
          {fmt(session.totalVolume, 0)} kg
        </Text>
        <Text style={{
          color: colors.textMuted,
          fontSize: fontSize.micro,
          fontFamily: `${fonts.ui}_400Regular`,
        }}>
          {session.totalSets} sets
        </Text>
      </View>
    </View>
  )
}

// ─── Main screen ──────────────────────────────────────────────────────────────

type Tab = 'chart' | 'prs' | 'sessions'

export default function ExerciseHistoryScreen() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()

  const [exercise, setExercise] = useState<ExerciseV2 | null>(null)
  const [prs, setPrs] = useState<ExercisePR[]>([])
  const [sessions, setSessions] = useState<SessionVolumeSummary[]>([])
  const [tab, setTab] = useState<Tab>('chart')

  useFocusEffect(
    useCallback(() => {
      if (!id) return
      const ex = getExerciseById(id)
      setExercise(ex)
      if (ex) {
        setPrs(getPRsForExercise(id))
        setSessions(getSessionSummariesForExercise(id, 20))
      }
    }, [id]),
  )

  const TABS: { key: Tab; label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
    { key: 'chart', label: 'Volume', icon: 'bar-chart-outline' },
    { key: 'prs', label: `PRs (${prs.length})`, icon: 'trophy-outline' },
    { key: 'sessions', label: `History (${sessions.length})`, icon: 'list-outline' },
  ]

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
        <View style={{ flex: 1 }}>
          <Text style={{
            color: colors.text,
            fontSize: fontSize.sectionHeader,
            fontWeight: '700',
            fontFamily: `${fonts.ui}_700Bold`,
          }}>
            {exercise?.name ?? 'Exercise History'}
          </Text>
          {sessions.length > 0 && (
            <Text style={{
              color: colors.textMuted,
              fontSize: fontSize.micro,
              fontFamily: `${fonts.ui}_400Regular`,
            }}>
              {sessions.length} sessions logged
            </Text>
          )}
        </View>
      </View>

      {/* Tab bar */}
      <View style={{
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        backgroundColor: colors.surface,
      }}>
        {TABS.map((t) => {
          const active = tab === t.key
          return (
            <Pressable
              key={t.key}
              onPress={() => setTab(t.key)}
              style={({ pressed }) => ({ flex: 1, opacity: pressed ? 0.7 : 1 })}
            >
              <View style={{
                flex: 1,
                alignItems: 'center',
                paddingVertical: spacing.sm,
                borderBottomWidth: 2,
                borderBottomColor: active ? colors.primary : 'transparent',
                gap: 3,
              }}>
                <Ionicons
                  name={t.icon}
                  size={16}
                  color={active ? colors.primary : colors.textMuted}
                />
                <Text style={{
                  color: active ? colors.primary : colors.textMuted,
                  fontSize: fontSize.micro,
                  fontWeight: active ? '600' : '400',
                  fontFamily: active ? `${fonts.ui}_600SemiBold` : `${fonts.ui}_400Regular`,
                }}>
                  {t.label}
                </Text>
              </View>
            </Pressable>
          )
        })}
      </View>

      {/* Content */}
      {tab === 'chart' && (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}
        >
          {/* Volume chart card */}
          <View style={{
            backgroundColor: colors.surface,
            borderRadius: radius.lg,
            borderWidth: 1,
            borderColor: colors.border,
            padding: spacing.md,
            gap: spacing.sm,
          }}>
            <Text style={{
              color: colors.text,
              fontSize: fontSize.cardTitle,
              fontWeight: '600',
              fontFamily: `${fonts.ui}_600SemiBold`,
            }}>
              Total Volume per Session
            </Text>
            <VolumeChart sessions={sessions} />
          </View>

          {/* Summary stats */}
          {sessions.length > 0 && (
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              {[
                {
                  label: 'Best Session',
                  value: `${fmt(Math.max(...sessions.map((s) => s.totalVolume), 0), 0)} kg`,
                },
                {
                  label: 'Avg Volume',
                  value: `${fmt(sessions.reduce((a, s) => a + s.totalVolume, 0) / sessions.length, 0)} kg`,
                },
                {
                  label: 'Total Sessions',
                  value: String(sessions.length),
                },
              ].map((stat) => (
                <View key={stat.label} style={{
                  flex: 1,
                  backgroundColor: colors.surface,
                  borderRadius: radius.md,
                  borderWidth: 1,
                  borderColor: colors.border,
                  padding: spacing.sm,
                  alignItems: 'center',
                }}>
                  <Text style={{
                    color: colors.textMuted,
                    fontSize: fontSize.micro,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                    marginBottom: 2,
                    fontFamily: `${fonts.ui}_400Regular`,
                  }}>
                    {stat.label}
                  </Text>
                  <Text style={{
                    color: colors.text,
                    fontSize: fontSize.cardTitle,
                    fontWeight: '700',
                    fontFamily: `${fonts.mono}_700Bold`,
                  }}>
                    {stat.value}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {sessions.length === 0 && (
            <View style={{ alignItems: 'center', paddingVertical: spacing.xl }}>
              <Ionicons name="bar-chart-outline" size={48} color={colors.textMuted} style={{ marginBottom: spacing.md }} />
              <Text style={{
                color: colors.textMuted,
                fontSize: fontSize.body,
                textAlign: 'center',
                fontFamily: `${fonts.ui}_400Regular`,
              }}>
                No sessions logged yet.{'\n'}Start working out to see your progress!
              </Text>
            </View>
          )}
        </ScrollView>
      )}

      {tab === 'prs' && (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: spacing.lg }}
        >
          {prs.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: spacing.xl }}>
              <Ionicons name="trophy-outline" size={48} color={colors.textMuted} style={{ marginBottom: spacing.md }} />
              <Text style={{
                color: colors.textMuted,
                fontSize: fontSize.body,
                textAlign: 'center',
                fontFamily: `${fonts.ui}_400Regular`,
              }}>
                No PRs recorded yet.
              </Text>
            </View>
          ) : (
            <View style={{
              backgroundColor: colors.surface,
              borderRadius: radius.lg,
              borderWidth: 1,
              borderColor: colors.border,
              padding: spacing.md,
            }}>
              {prs.map((pr, i) => (
                <PRRow key={pr.id} pr={pr} rank={i + 1} />
              ))}
            </View>
          )}
        </ScrollView>
      )}

      {tab === 'sessions' && (
        <FlatList
          data={sessions}
          keyExtractor={(s) => s.sessionId}
          contentContainerStyle={{ padding: spacing.lg }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingVertical: spacing.xl }}>
              <Ionicons name="list-outline" size={48} color={colors.textMuted} style={{ marginBottom: spacing.md }} />
              <Text style={{
                color: colors.textMuted,
                fontSize: fontSize.body,
                textAlign: 'center',
                fontFamily: `${fonts.ui}_400Regular`,
              }}>
                No sessions logged yet.
              </Text>
            </View>
          }
          renderItem={({ item }) => <SessionRow session={item} />}
        />
      )}
    </SafeAreaView>
  )
}
