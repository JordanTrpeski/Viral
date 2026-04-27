import { useState, useEffect, useCallback } from 'react'
import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { colors, fontSize, spacing, radius } from '@core/theme'
import { dbGetRecentSessions, dbGetSessionExercisesWithSets, dbGetSessionMuscleGroups, type SessionSummaryRow, type SessionSetWithExercise } from '@core/db/workoutQueries'
import MuscleGroupBadge from '@modules/health/workout/components/MuscleGroupBadge'
import { formatDuration, formatVolume } from '@modules/health/workout/workoutUtils'
import type { MuscleGroup } from '@modules/health/shared/types'

// ─── Session detail ────────────────────────────────────────────────────────────

function SessionDetail({ sessionId }: { sessionId: string }) {
  const [detail, setDetail] = useState<SessionSetWithExercise[] | null>(null)

  useEffect(() => {
    setDetail(dbGetSessionExercisesWithSets(sessionId))
  }, [sessionId])

  if (!detail) {
    return (
      <View style={{ paddingVertical: spacing.md, alignItems: 'center' }}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    )
  }

  if (detail.length === 0) {
    return (
      <Text style={{ color: colors.textMuted, fontSize: fontSize.label, paddingVertical: spacing.sm }}>
        No sets logged
      </Text>
    )
  }

  return (
    <View style={{ gap: spacing.sm }}>
      {detail.map((ex) => (
        <View key={ex.exerciseId}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: 4 }}>
            <Text style={{ color: colors.text, fontSize: fontSize.body, fontWeight: '600', flex: 1 }}>
              {ex.exerciseName}
            </Text>
            <MuscleGroupBadge muscleGroup={ex.muscleGroup as MuscleGroup} small />
          </View>
          {ex.sets.map((s) => (
            <Text key={s.id} style={{ color: colors.textMuted, fontSize: fontSize.label, paddingLeft: spacing.sm }}>
              Set {s.setNumber}: {s.weightKg ?? 0} kg × {s.reps ?? 0} reps
            </Text>
          ))}
        </View>
      ))}
    </View>
  )
}

// ─── Session card ──────────────────────────────────────────────────────────────

function SessionCard({ session, isExpanded, onToggle }: {
  session: SessionSummaryRow
  isExpanded: boolean
  onToggle: () => void
}) {
  const muscleGroups = dbGetSessionMuscleGroups(session.id)

  return (
    <View style={{
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    }}>
      {/* Header row */}
      <Pressable
        onPress={onToggle}
        style={({ pressed }) => ({
          padding: spacing.md,
          opacity: pressed ? 0.85 : 1,
        })}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs }}>
          <Text style={{ color: colors.text, fontSize: fontSize.cardTitle, fontWeight: '600', flex: 1 }} numberOfLines={1}>
            {session.name ?? session.date}
          </Text>
          <Ionicons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={colors.textMuted}
          />
        </View>

        <Text style={{ color: colors.textMuted, fontSize: fontSize.label, marginBottom: spacing.sm }}>
          {session.date}
        </Text>

        {/* Stats row */}
        <View style={{ flexDirection: 'row', gap: spacing.md, marginBottom: muscleGroups.length > 0 ? spacing.sm : 0 }}>
          <StatItem icon="barbell-outline" value={`${session.exercise_count} exercises`} />
          <StatItem icon="checkmark-circle-outline" value={`${session.total_sets} sets`} />
          <StatItem icon="stats-chart-outline" value={formatVolume(session.total_volume)} />
          {session.duration_minutes != null && (
            <StatItem icon="time-outline" value={formatDuration(session.duration_minutes)} />
          )}
        </View>

        {muscleGroups.length > 0 && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
            {muscleGroups.map((mg) => (
              <MuscleGroupBadge key={mg} muscleGroup={mg as MuscleGroup} small />
            ))}
          </View>
        )}
      </Pressable>

      {/* Expanded detail */}
      {isExpanded && (
        <View style={{ borderTopWidth: 1, borderTopColor: colors.border, padding: spacing.md }}>
          <SessionDetail sessionId={session.id} />
        </View>
      )}
    </View>
  )
}

function StatItem({ icon, value }: { icon: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <Ionicons name={icon as never} size={12} color={colors.textMuted} />
      <Text style={{ color: colors.textMuted, fontSize: fontSize.label }}>{value}</Text>
    </View>
  )
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function WorkoutHistoryScreen() {
  const router = useRouter()
  const { sessionId } = useLocalSearchParams<{ sessionId?: string }>()

  const [sessions, setSessions] = useState<SessionSummaryRow[]>([])
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  useEffect(() => {
    const loaded = dbGetRecentSessions(200)
    setSessions(loaded)
    if (sessionId) {
      setExpanded(new Set([sessionId]))
    }
  }, [])

  const toggle = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }, [])

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Header */}
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
        borderBottomWidth: 1, borderBottomColor: colors.border,
      }}>
        <Pressable onPress={() => router.back()} style={{ padding: spacing.sm }}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={{ flex: 1, color: colors.text, fontSize: fontSize.sectionHeader, fontWeight: '600', marginLeft: spacing.xs }}>
          Workout History
        </Text>
        <Text style={{ color: colors.textMuted, fontSize: fontSize.label, paddingRight: spacing.sm }}>
          {sessions.length} sessions
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: spacing.md, gap: spacing.sm }}>
        {sessions.length === 0 && (
          <View style={{ alignItems: 'center', paddingVertical: spacing.xxl }}>
            <Ionicons name="calendar-outline" size={48} color={colors.textMuted} style={{ marginBottom: spacing.md }} />
            <Text style={{ color: colors.textMuted, fontSize: fontSize.body, textAlign: 'center' }}>
              No completed workouts yet.
            </Text>
          </View>
        )}

        {sessions.map((session) => (
          <SessionCard
            key={session.id}
            session={session}
            isExpanded={expanded.has(session.id)}
            onToggle={() => toggle(session.id)}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  )
}
