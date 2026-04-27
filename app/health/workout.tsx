import { useEffect } from 'react'
import { View, Text, ScrollView, Pressable } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { colors, fontSize, spacing, radius } from '@core/theme'
import { Button } from '@core/components'
import { useWorkoutStore } from '@modules/health/workout/workoutStore'
import WorkoutSessionCard from '@modules/health/workout/components/WorkoutSessionCard'
import { dbGetSessionMuscleGroups } from '@core/db/workoutQueries'
import { todayStr } from '@modules/health/workout/workoutUtils'

export default function WorkoutHomeScreen() {
  const router = useRouter()
  const { activeSession, recentSessions, loadRecentSessions, resumeTodaySession } = useWorkoutStore()

  const today = todayStr()
  const todaySession = recentSessions.find((s) => s.date === today && s.ended_at)
  const hasActive = !!activeSession

  useEffect(() => {
    loadRecentSessions()
    resumeTodaySession()
  }, [])

  function handleStart() {
    if (hasActive) {
      router.push('/health/workout-active')
    } else {
      router.push('/health/workout-start')
    }
  }

  const statusLabel = hasActive ? 'In Progress' : todaySession ? 'Done' : 'Not started'
  const statusColor = hasActive ? colors.warning : todaySession ? colors.success : colors.textMuted

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <Pressable onPress={() => router.back()} style={{ padding: spacing.sm }}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={{ flex: 1, color: colors.text, fontSize: fontSize.sectionHeader, fontWeight: '600', marginLeft: spacing.xs }}>
          Workout
        </Text>
        <Pressable onPress={() => router.push('/health/exercise-library')} style={{ padding: spacing.sm }}>
          <Ionicons name="library-outline" size={22} color={colors.textMuted} />
        </Pressable>
        <Pressable onPress={() => router.push('/health/workout-templates')} style={{ padding: spacing.sm }}>
          <Ionicons name="albums-outline" size={22} color={colors.textMuted} />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>

        {/* Today's status */}
        <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.lg }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: statusColor, marginRight: spacing.sm }} />
            <Text style={{ color: statusColor, fontSize: fontSize.label, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 }}>
              {statusLabel}
            </Text>
          </View>
          <Text style={{ color: colors.text, fontSize: 22, fontWeight: '700', marginBottom: spacing.lg }}>
            {hasActive
              ? `${activeSession.name} in progress`
              : todaySession
              ? todaySession.name ?? "Today's session"
              : "Ready to train?"}
          </Text>
          {todaySession && !hasActive ? (
            <WorkoutSessionCard
              name={todaySession.name ?? today}
              date={todaySession.date}
              exerciseCount={todaySession.exercise_count}
              totalSets={todaySession.total_sets}
              totalVolumeKg={todaySession.total_volume}
              durationMinutes={todaySession.duration_minutes ?? undefined}
              muscleGroups={dbGetSessionMuscleGroups(todaySession.id)}
            />
          ) : (
            <Button
              label={hasActive ? 'Resume Workout' : 'Start Workout'}
              onPress={handleStart}
              fullWidth
            />
          )}
        </View>

        {/* Recent sessions */}
        {recentSessions.filter((s) => s.ended_at && s.date !== today).length > 0 && (
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
              <Text style={{ color: colors.text, fontSize: fontSize.cardTitle, fontWeight: '600', flex: 1 }}>
                Recent Sessions
              </Text>
              <Pressable onPress={() => router.push('/health/workout-history')} style={{ padding: spacing.xs }}>
                <Text style={{ color: colors.primary, fontSize: fontSize.label }}>See all</Text>
              </Pressable>
            </View>
            <View style={{ gap: spacing.sm }}>
              {recentSessions
                .filter((s) => s.ended_at && s.date !== today)
                .slice(0, 5)
                .map((s) => (
                  <WorkoutSessionCard
                    key={s.id}
                    name={s.name ?? s.date}
                    date={s.date}
                    exerciseCount={s.exercise_count}
                    totalSets={s.total_sets}
                    totalVolumeKg={s.total_volume}
                    durationMinutes={s.duration_minutes ?? undefined}
                    muscleGroups={dbGetSessionMuscleGroups(s.id)}
                    onPress={() => router.push({ pathname: '/health/workout-history', params: { sessionId: s.id } } as never)}
                  />
                ))}
            </View>
          </View>
        )}

        {recentSessions.length === 0 && !hasActive && (
          <View style={{ alignItems: 'center', paddingVertical: spacing.xl }}>
            <Ionicons name="barbell-outline" size={48} color={colors.textMuted} style={{ marginBottom: spacing.md }} />
            <Text style={{ color: colors.textMuted, fontSize: fontSize.body, textAlign: 'center' }}>
              No sessions yet. Start your first workout!
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
