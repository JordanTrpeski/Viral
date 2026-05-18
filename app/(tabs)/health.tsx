import React, { useCallback } from 'react'
import {
  View, Text, ScrollView, Pressable, StyleSheet, StatusBar,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import Svg, { Circle } from 'react-native-svg'
import { useWorkoutStoreV2 } from '@modules/health/workout/workoutStoreV2'
import { useDietStore } from '@modules/health/diet/dietStore'
import { useStepsStore } from '@modules/health/steps/stepsStore'
import { useUserStore } from '@core/store/userStore'
import { defaultGoal, formatSteps, estimateCalories } from '@modules/health/steps/stepsUtils'
import { localDateStr } from '@core/utils/units'
import { colors, fonts, fontSize, spacing, radius } from '@core/theme'

// ─── Mini ring ────────────────────────────────────────────────────────────────

function MiniRing({ progress, color, size = 52 }: { progress: number; color: string; size?: number }) {
  const stroke = 6
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - Math.min(1, progress))
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={size / 2} cy={size / 2} r={r}
          stroke={colors.surface2} strokeWidth={stroke} fill="none" />
        <Circle cx={size / 2} cy={size / 2} r={r}
          stroke={color} strokeWidth={stroke} fill="none"
          strokeDasharray={`${circ}`} strokeDashoffset={offset}
          strokeLinecap="round" rotation="-90" origin={`${size / 2},${size / 2}`} />
      </Svg>
      <Text style={{ fontFamily: `${fonts.mono}_600SemiBold`, fontSize: 10, color }}>
        {Math.round(Math.min(1, progress) * 100)}%
      </Text>
    </View>
  )
}

// ─── Section card ─────────────────────────────────────────────────────────────

function SectionCard({
  icon, iconColor, title, children, onPress,
}: {
  icon: string; iconColor: string; title: string
  children: React.ReactNode; onPress: () => void
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconBadge, { backgroundColor: `${iconColor}18` }]}>
            <Ionicons name={icon as any} size={18} color={iconColor} />
          </View>
          <Text style={styles.cardTitle}>{title}</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        </View>
        {children}
      </View>
    </Pressable>
  )
}

// ─── Workout section card ─────────────────────────────────────────────────────

function WorkoutHubCard() {
  const router = useRouter()
  const { activeSession, recentSessions, loadRecentSessions } = useWorkoutStoreV2()
  const today = localDateStr()

  useFocusEffect(useCallback(() => { loadRecentSessions() }, []))

  const todaySession = recentSessions.find((s) => s.date === today && s.endedAt)
  const inProgress = !!activeSession
  const done = !!todaySession && !inProgress

  const statusColor = inProgress ? colors.warning : done ? colors.success : colors.textMuted
  const statusLabel = inProgress ? 'In Progress' : done ? 'Done ✓' : 'Rest Day'

  return (
    <SectionCard
      icon="barbell-outline"
      iconColor={colors.workout}
      title="Workout"
      onPress={() => router.push('/health/workout' as never)}
    >
      <View style={styles.workoutRow}>
        <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
        <Text style={[styles.workoutStatus, { color: statusColor }]}>{statusLabel}</Text>
      </View>

      {done && todaySession && (
        <View style={styles.workoutStats}>
          {todaySession.exerciseCount != null && (
            <View style={styles.statPill}>
              <Ionicons name="barbell-outline" size={11} color={colors.textMuted} />
              <Text style={styles.statPillText}>{todaySession.exerciseCount} ex</Text>
            </View>
          )}
          {todaySession.totalSets != null && (
            <View style={styles.statPill}>
              <Ionicons name="checkmark-circle-outline" size={11} color={colors.textMuted} />
              <Text style={styles.statPillText}>{todaySession.totalSets} sets</Text>
            </View>
          )}
          {todaySession.totalVolume != null && (
            <View style={styles.statPill}>
              <Ionicons name="stats-chart-outline" size={11} color={colors.textMuted} />
              <Text style={styles.statPillText}>{Math.round(todaySession.totalVolume)}kg vol</Text>
            </View>
          )}
        </View>
      )}

      {inProgress && (
        <View style={styles.workoutStats}>
          <View style={styles.statPill}>
            <View style={[styles.liveDot]} />
            <Text style={[styles.statPillText, { color: colors.warning }]}>Session active</Text>
          </View>
          <Pressable
            style={styles.resumeBtn}
            onPress={() => router.push('/health/workout/session/active' as never)}
          >
            <Text style={styles.resumeBtnText}>Resume →</Text>
          </Pressable>
        </View>
      )}

      {!done && !inProgress && (
        <Text style={styles.restDayText}>No workout logged today.</Text>
      )}
    </SectionCard>
  )
}

// ─── Nutrition section card ───────────────────────────────────────────────────

function NutritionHubCard() {
  const router = useRouter()
  const { totalCalories, macroGoals, totalProteinG, totalCarbsG, totalFatG, loadToday } = useDietStore()

  useFocusEffect(useCallback(() => { loadToday() }, []))

  const calPct = macroGoals.calorieGoal > 0 ? totalCalories / macroGoals.calorieGoal : 0
  const barColor = calPct >= 1 ? '#c0533a' : calPct >= 0.8 ? colors.warning : colors.diet

  return (
    <SectionCard
      icon="nutrition-outline"
      iconColor={colors.diet}
      title="Nutrition"
      onPress={() => router.push('/health/nutrition' as never)}
    >
      <View style={styles.nutritionRow}>
        <View style={{ flex: 1 }}>
          <View style={styles.calRow}>
            <Text style={styles.calValue}>{Math.round(totalCalories)}</Text>
            <Text style={styles.calGoal}> / {macroGoals.calorieGoal} kcal</Text>
          </View>
          <View style={styles.calTrack}>
            <View style={[styles.calFill, { width: `${Math.min(100, Math.round(calPct * 100))}%` as any, backgroundColor: barColor }]} />
          </View>
          <View style={styles.macroRow}>
            <Text style={[styles.macroItem, { color: colors.workout }]}>P {Math.round(totalProteinG)}g</Text>
            <Text style={[styles.macroItem, { color: colors.diet }]}>C {Math.round(totalCarbsG)}g</Text>
            <Text style={[styles.macroItem, { color: colors.warning }]}>F {Math.round(totalFatG)}g</Text>
          </View>
        </View>
      </View>
    </SectionCard>
  )
}

// ─── Water section card ───────────────────────────────────────────────────────

function WaterHubCard() {
  const router = useRouter()
  const { waterMl, waterGoalMl, loadToday } = useDietStore()

  useFocusEffect(useCallback(() => { loadToday() }, []))

  const pct = waterGoalMl > 0 ? waterMl / waterGoalMl : 0

  return (
    <SectionCard
      icon="water-outline"
      iconColor={colors.water}
      title="Water"
      onPress={() => router.push('/health/nutrition/water' as never)}
    >
      <View style={styles.ringStatRow}>
        <MiniRing progress={pct} color={colors.water} />
        <View style={styles.ringStatText}>
          <Text style={styles.ringStatMain}>
            {waterMl >= 1000 ? `${(waterMl / 1000).toFixed(1)}L` : `${waterMl}ml`}
          </Text>
          <Text style={styles.ringStatSub}>
            of {waterGoalMl >= 1000 ? `${(waterGoalMl / 1000).toFixed(1)}L` : `${waterGoalMl}ml`} goal
          </Text>
        </View>
      </View>
    </SectionCard>
  )
}

// ─── Steps section card ───────────────────────────────────────────────────────

function StepsHubCard() {
  const router = useRouter()
  const { profile } = useUserStore()
  const { todayEntry, todaySessions, loadToday, loadSessions } = useStepsStore()

  const dob = profile?.dateOfBirth ?? '1990-01-01'
  const weightKg = profile?.weightKg ?? 75
  const heightCm = profile?.heightCm ?? 175
  const today = localDateStr()

  useFocusEffect(useCallback(() => {
    loadToday(today, dob)
    loadSessions(today)
  }, [today, dob]))

  const stepCount = todayEntry?.stepCount ?? 0
  const goal = todayEntry?.goal ?? defaultGoal(dob)
  const pct = goal > 0 ? stepCount / goal : 0
  const { low, high } = estimateCalories(stepCount, weightKg, heightCm, todaySessions)

  return (
    <SectionCard
      icon="footsteps-outline"
      iconColor={colors.steps}
      title="Steps"
      onPress={() => router.push('/health/steps' as never)}
    >
      <View style={styles.ringStatRow}>
        <MiniRing progress={pct} color={colors.steps} />
        <View style={styles.ringStatText}>
          <Text style={styles.ringStatMain}>{formatSteps(stepCount)}</Text>
          <Text style={styles.ringStatSub}>of {formatSteps(goal)} goal</Text>
          {high > 0 && (
            <Text style={[styles.ringStatSub, { color: colors.steps, marginTop: 2 }]}>
              {low === high ? `~${low}` : `${low}–${high}`} kcal
            </Text>
          )}
        </View>
      </View>
    </SectionCard>
  )
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function HealthScreen() {
  const router = useRouter()
  const today = localDateStr()
  const dateLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  })

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Health</Text>
          <Text style={styles.headerDate}>{dateLabel}</Text>
        </View>
        <Pressable
          onPress={() => router.push('/health/settings' as never)}
          hitSlop={12}
          style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
        >
          <Ionicons name="settings-outline" size={20} color={colors.textMuted} />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        <WorkoutHubCard />
        <NutritionHubCard />
        <WaterHubCard />
        <StepsHubCard />
        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },

  header: {
    paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerTitle: {
    fontFamily: `${fonts.ui}_700Bold`, fontSize: fontSize.screenTitle, color: colors.text,
  },
  headerDate: {
    fontFamily: `${fonts.ui}_400Regular`, fontSize: fontSize.label, color: colors.textMuted, marginTop: 2,
  },

  scroll: { padding: spacing.md, gap: spacing.sm },

  card: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm,
  },
  iconBadge: {
    width: 36, height: 36, borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  cardTitle: {
    flex: 1,
    fontFamily: `${fonts.ui}_600SemiBold`, fontSize: fontSize.cardTitle, color: colors.text,
  },

  // Workout card
  workoutRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.xs },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  workoutStatus: {
    fontFamily: `${fonts.ui}_600SemiBold`, fontSize: fontSize.label, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  workoutStats: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center', flexWrap: 'wrap' },
  statPill: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  statPillText: {
    fontFamily: `${fonts.mono}_400Regular`, fontSize: fontSize.label, color: colors.textMuted,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.warning },
  resumeBtn: {
    backgroundColor: `${colors.warning}22`, borderRadius: radius.sm,
    paddingHorizontal: spacing.sm, paddingVertical: 3,
  },
  resumeBtnText: {
    fontFamily: `${fonts.ui}_600SemiBold`, fontSize: fontSize.label, color: colors.warning,
  },
  restDayText: {
    fontFamily: `${fonts.ui}_400Regular`, fontSize: fontSize.label, color: colors.textMuted,
  },

  // Nutrition card
  nutritionRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  calRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 6 },
  calValue: {
    fontFamily: `${fonts.mono}_700Bold`, fontSize: 22, color: colors.text,
  },
  calGoal: {
    fontFamily: `${fonts.mono}_400Regular`, fontSize: fontSize.label, color: colors.textMuted,
  },
  calTrack: {
    height: 6, backgroundColor: colors.surface2, borderRadius: radius.full,
    overflow: 'hidden', marginBottom: spacing.xs,
  },
  calFill: { height: '100%', borderRadius: radius.full },
  macroRow: { flexDirection: 'row', gap: spacing.md },
  macroItem: {
    fontFamily: `${fonts.mono}_500Medium`, fontSize: fontSize.label,
  },

  // Ring stat
  ringStatRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  ringStatText: { flex: 1 },
  ringStatMain: {
    fontFamily: `${fonts.mono}_700Bold`, fontSize: 22, color: colors.text,
  },
  ringStatSub: {
    fontFamily: `${fonts.mono}_400Regular`, fontSize: fontSize.label, color: colors.textMuted,
  },
})
