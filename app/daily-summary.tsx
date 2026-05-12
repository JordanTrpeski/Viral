import { useEffect, useState } from 'react'
import { View, Text, ScrollView, Pressable } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { colors, fontSize, spacing, radius } from '@core/theme'
import { dbGetEntriesForDate, dbGetMealsForDate, dbGetWaterForDate } from '@core/db/dietQueries'
import { dbGetSessionsForDate as dbGetStepSessionsForDate, dbGetStepsForDate } from '@core/db/stepsQueries'
import { useUserStore } from '@core/store/userStore'
import { defaultGoal, estimateCalories, formatSteps } from '@modules/health/steps/stepsUtils'
import { useWorkoutStore } from '@modules/health/workout/workoutStore'
import { formatDuration, formatVolume } from '@modules/health/workout/workoutUtils'
import type { SessionSummaryRow } from '@core/db/workoutQueries'

// ─── Stat row ──────────────────────────────────────────────────────────────────

function StatRow({ icon, label, value, color }: {
  icon: string; label: string; value: string; color?: string
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xs }}>
      <Ionicons name={icon as never} size={18} color={color ?? colors.textMuted} />
      <Text style={{ color: colors.textMuted, fontSize: fontSize.label, flex: 1 }}>{label}</Text>
      <Text style={{ color: colors.text, fontSize: fontSize.label, fontWeight: '600' }}>{value}</Text>
    </View>
  )
}

// ─── Main screen ───────────────────────────────────────────────────────────────

export default function DailySummaryScreen() {
  const router = useRouter()
  const { date } = useLocalSearchParams<{ date: string }>()
  const { profile } = useUserStore()
  const { recentSessions, loadRecentSessions } = useWorkoutStore()

  const [calories, setCalories] = useState(0)
  const [waterMl, setWaterMl] = useState(0)
  const [stepCount, setStepCount] = useState(0)
  const [stepGoal, setStepGoal] = useState(8000)
  const [workoutSession, setWorkoutSession] = useState<SessionSummaryRow | null>(null)

  const dob = profile?.dateOfBirth ?? '1990-01-01'
  const weightKg = profile?.weightKg ?? 75
  const heightCm = profile?.heightCm ?? 175

  useEffect(() => {
    if (!date) return

    // Calories from meal entries
    const entries = dbGetEntriesForDate(date)
    const totalKcal = entries.reduce((s, e) => s + e.calories, 0)
    setCalories(totalKcal)

    // Water
    setWaterMl(dbGetWaterForDate(date))

    // Steps
    const stepsEntry = dbGetStepsForDate(date)
    setStepCount(stepsEntry?.stepCount ?? 0)
    setStepGoal(stepsEntry?.goal ?? defaultGoal(dob))

    // Workout
    loadRecentSessions()
  }, [date])

  useEffect(() => {
    if (!date) return
    const session = recentSessions.find((s) => s.date === date && s.ended_at) ?? null
    setWorkoutSession(session)
  }, [recentSessions, date])

  const stepSessions = date ? dbGetStepSessionsForDate(date) : []
  const { low: calLow, high: calHigh } = estimateCalories(stepCount, weightKg, heightCm, stepSessions)

  const dateLabel = date
    ? new Date(date + 'T12:00:00').toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric' })
    : ''

  if (!date) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        <Text style={{ color: colors.text, padding: spacing.lg }}>No date provided</Text>
      </SafeAreaView>
    )
  }

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
        <Text style={{
          flex: 1, color: colors.text,
          fontSize: fontSize.sectionHeader, fontWeight: '600', marginLeft: spacing.xs,
        }}>
          {dateLabel}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing.md, gap: spacing.md, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Nutrition */}
        <View style={{
          backgroundColor: colors.surface, borderRadius: radius.lg,
          borderWidth: 1, borderColor: colors.border, padding: spacing.md,
        }}>
          <Text style={{ color: colors.textMuted, fontSize: fontSize.label, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: spacing.sm }}>
            Nutrition
          </Text>
          {calories > 0 ? (
            <StatRow icon="flame-outline" label="Calories" value={`${calories} kcal`} color={colors.primary} />
          ) : (
            <Text style={{ color: colors.textMuted, fontSize: fontSize.label }}>No meals logged</Text>
          )}
        </View>

        {/* Workout */}
        <View style={{
          backgroundColor: colors.surface, borderRadius: radius.lg,
          borderWidth: 1, borderColor: colors.border, padding: spacing.md,
        }}>
          <Text style={{ color: colors.textMuted, fontSize: fontSize.label, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: spacing.sm }}>
            Workout
          </Text>
          {workoutSession ? (
            <>
              <StatRow icon="barbell-outline" label="Exercises" value={`${workoutSession.exercise_count}`} color={colors.success} />
              <StatRow icon="checkmark-circle-outline" label="Total sets" value={`${workoutSession.total_sets}`} color={colors.success} />
              <StatRow icon="stats-chart-outline" label="Volume" value={formatVolume(workoutSession.total_volume)} color={colors.success} />
              {workoutSession.duration_minutes != null && (
                <StatRow icon="time-outline" label="Duration" value={formatDuration(workoutSession.duration_minutes)} color={colors.success} />
              )}
            </>
          ) : (
            <Text style={{ color: colors.textMuted, fontSize: fontSize.label }}>No workout logged</Text>
          )}
        </View>

        {/* Water */}
        <View style={{
          backgroundColor: colors.surface, borderRadius: radius.lg,
          borderWidth: 1, borderColor: colors.border, padding: spacing.md,
        }}>
          <Text style={{ color: colors.textMuted, fontSize: fontSize.label, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: spacing.sm }}>
            Hydration
          </Text>
          {waterMl > 0 ? (
            <StatRow icon="water-outline" label="Water intake" value={`${(waterMl / 1000).toFixed(1)} L`} color={colors.water} />
          ) : (
            <Text style={{ color: colors.textMuted, fontSize: fontSize.label }}>No water logged</Text>
          )}
        </View>

        {/* Steps */}
        <View style={{
          backgroundColor: colors.surface, borderRadius: radius.lg,
          borderWidth: 1, borderColor: colors.border, padding: spacing.md,
        }}>
          <Text style={{ color: colors.textMuted, fontSize: fontSize.label, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: spacing.sm }}>
            Steps
          </Text>
          {stepCount > 0 ? (
            <>
              <StatRow icon="footsteps-outline" label="Steps" value={formatSteps(stepCount)} color={colors.steps} />
              <StatRow icon="flag-outline" label="Goal" value={formatSteps(stepGoal)} />
              {calHigh > 0 && (
                <StatRow icon="flame-outline" label="Est. calories burned" value={calLow === calHigh ? `~${calLow} kcal` : `${calLow}–${calHigh} kcal`} color={colors.steps} />
              )}
            </>
          ) : (
            <Text style={{ color: colors.textMuted, fontSize: fontSize.label }}>No steps logged</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
