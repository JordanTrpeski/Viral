import React, { useEffect, useRef, useState, useCallback } from 'react'
import { View, Text, ScrollView, Pressable, RefreshControl, TextInput, Alert, AppState } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import Svg, { Circle } from 'react-native-svg'
import GorhomBottomSheet from '@gorhom/bottom-sheet'
import { colors, fontSize, spacing, radius, fonts } from '@core/theme'
import { Button, BottomSheet, ProgressBar } from '@core/components'
import { useUserStore } from '@core/store/userStore'
import { useWorkoutStoreV2 } from '@modules/health/workout/workoutStoreV2'
import { useDietStore } from '@modules/health/diet/dietStore'
import { useStepsStore } from '@modules/health/steps/stepsStore'
import { formatSteps, estimateCalories, defaultGoal } from '@modules/health/steps/stepsUtils'
import { dbGetStepsStreak } from '@core/db/stepsQueries'
import { useChecklistStore } from '@modules/checklist/checklistStore'
import { dbGetChecklistItems, type ChecklistItem } from '@core/db/checklistQueries'
import {
  dbGetCurrentMonthSummary, dbGetCategoriesByType,
  dbInsertExpense, dbInsertExpenseItem,
  type BudgetCategory,
} from '@core/db/budgetQueries'
import { useOrganizerStore } from '@modules/organizer/organizerStore'
import { getPersonDaysUntilBirthday } from '@modules/organizer/shared/organizerUtils'
import { todayStr } from '@modules/health/workout/workoutUtils'
import { localDateStr } from '@core/utils/units'
import type { WorkoutSessionV2 } from '@modules/health/shared/types'
import type { SessionSummaryRowV2 } from '@core/db/workoutQueriesV2'

// ─── Day Overview card (rings + actual values) ───────────────────────────────

function DayOverviewCard({
  calProgress, workoutProgress, waterProgress, stepsProgress,
  totalCalories, calorieGoal, proteinG, carbsG, fatG,
  waterMl, waterGoalMl,
  stepCount, stepGoal,
  workoutDone, workoutInProgress,
  onPress,
}: {
  calProgress: number; workoutProgress: number; waterProgress: number; stepsProgress: number
  totalCalories: number; calorieGoal: number; proteinG: number; carbsG: number; fatG: number
  waterMl: number; waterGoalMl: number
  stepCount: number; stepGoal: number
  workoutDone: boolean; workoutInProgress: boolean
  onPress: () => void
}) {
  const SIZE = 130
  const cx = SIZE / 2
  const cy = SIZE / 2
  const STROKE = 9

  const rings = [
    { r: 52, progress: calProgress,     color: colors.primary },
    { r: 41, progress: workoutProgress, color: colors.success  },
    { r: 30, progress: waterProgress,   color: colors.water    },
    { r: 19, progress: stepsProgress,   color: colors.steps    },
  ]

  const pct = calorieGoal > 0 ? totalCalories / calorieGoal : 0
  const calDotColor = pct >= 1 ? colors.danger : pct >= 0.8 ? colors.warning : colors.primary
  const workoutLabel = workoutInProgress ? 'In Progress' : workoutDone ? 'Done ✓' : '—'
  const workoutColor = workoutInProgress ? colors.warning : workoutDone ? colors.success : colors.textMuted

  // Day score: average of 4 ring percentages, each capped at 100%
  const dayScore = Math.round(
    ([calProgress, workoutProgress, waterProgress, stepsProgress]
      .map((p) => Math.min(1, p))
      .reduce((s, v) => s + v, 0) / 4) * 100,
  )

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
    >
      <View style={{
        backgroundColor: colors.surface, borderRadius: radius.lg,
        borderWidth: 1, borderColor: colors.borderAccent, padding: spacing.md,
      }}>
      <Text style={{
        color: colors.textMuted, fontSize: fontSize.label, fontWeight: '600',
        fontFamily: `${fonts.ui}_600SemiBold`,
        textTransform: 'uppercase', letterSpacing: 1, marginBottom: spacing.md,
      }}>
        Today
      </Text>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.lg }}>
        {/* Activity rings + day score */}
        <View style={{ alignItems: 'center' }}>
          <Svg width={SIZE} height={SIZE}>
            {rings.map(({ r, progress, color }, i) => {
              const circ = 2 * Math.PI * r
              const offset = circ * (1 - Math.min(1, progress))
              return (
                <React.Fragment key={i}>
                  <Circle cx={cx} cy={cy} r={r} stroke={colors.surface2} strokeWidth={STROKE} fill="none" />
                  {progress > 0 && (
                    <Circle
                      cx={cx} cy={cy} r={r} stroke={color} strokeWidth={STROKE} fill="none"
                      strokeDasharray={`${circ}`} strokeDashoffset={offset}
                      strokeLinecap="round" rotation="-90" origin={`${cx},${cy}`}
                    />
                  )}
                </React.Fragment>
              )
            })}
          </Svg>
          <View style={{ alignItems: 'center', marginTop: 4 }}>
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700', fontFamily: `${fonts.mono}_700Bold`, lineHeight: 20 }}>
              {dayScore}%
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: fontSize.micro }}>Day score</Text>
          </View>
        </View>

        {/* Metrics */}
        <View style={{ flex: 1, gap: spacing.sm }}>
          {/* Calories */}
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: 2 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: calDotColor }} />
              <Text style={{ color: colors.textMuted, fontSize: fontSize.micro }}>Calories</Text>
            </View>
            <Text style={{ color: colors.text, fontSize: 20, fontWeight: '700', lineHeight: 24, fontFamily: `${fonts.mono}_700Bold` }}>
              {totalCalories.toLocaleString()}
              <Text style={{ color: colors.textMuted, fontSize: fontSize.micro, fontWeight: '400', fontFamily: `${fonts.mono}_400Regular` }}>
                {' '}/ {calorieGoal.toLocaleString()} kcal
              </Text>
            </Text>
            <View style={{ flexDirection: 'row', gap: spacing.xs, marginTop: 3, flexWrap: 'wrap' }}>
              {[
                { l: 'P', v: proteinG, c: '#64D2FF' },
                { l: 'C', v: carbsG,   c: '#FFD60A' },
                { l: 'F', v: fatG,     c: '#FF6B9D' },
              ].map(({ l, v, c }) => (
                <View key={l} style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                  <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: c }} />
                  <Text style={{ color: colors.textMuted, fontSize: fontSize.micro }}>{l} {v.toFixed(0)}g</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Workout */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success }} />
            <Text style={{ color: colors.textMuted, fontSize: fontSize.micro }}>Workout</Text>
            <Text style={{ color: workoutColor, fontSize: fontSize.micro, fontWeight: '600' }}>
              {workoutLabel}
            </Text>
          </View>

          {/* Water */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.water }} />
            <Text style={{ color: colors.textMuted, fontSize: fontSize.micro }}>Water</Text>
            <Text style={{ color: colors.text, fontSize: fontSize.micro, fontWeight: '600' }}>
              {(waterMl / 1000).toFixed(1)}
              <Text style={{ color: colors.textMuted, fontWeight: '400' }}> / {(waterGoalMl / 1000).toFixed(1)}L</Text>
            </Text>
          </View>

          {/* Steps */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.steps }} />
            <Text style={{ color: colors.textMuted, fontSize: fontSize.micro }}>Steps</Text>
            <Text style={{ color: colors.text, fontSize: fontSize.micro, fontWeight: '600' }}>
              {formatSteps(stepCount)}
              <Text style={{ color: colors.textMuted, fontWeight: '400' }}> / {formatSteps(stepGoal)}</Text>
            </Text>
          </View>

        </View>
      </View>
      </View>
    </Pressable>
  )
}

// ─── Water card ───────────────────────────────────────────────────────────────

const WATER_QUICK = [150, 250, 330, 500]

function WaterCard({ waterMl, goalMl, onAdd, onPress }: {
  waterMl: number; goalMl: number; onAdd: (ml: number) => void; onPress: () => void
}) {
  const SIZE = 60
  const STROKE = 7
  const R = (SIZE - STROKE) / 2
  const CIRC = 2 * Math.PI * R
  const progress = Math.min(1, waterMl / goalMl)
  const offset = CIRC * (1 - progress)
  const liters = (waterMl / 1000).toFixed(1)
  const goalL  = (goalMl / 1000).toFixed(1)

  const [expanded, setExpanded] = useState(false)
  const [custom, setCustom] = useState('')

  function handleCustom() {
    const ml = parseInt(custom)
    if (!ml || ml <= 0) { Alert.alert('Enter a valid amount'); return }
    onAdd(ml)
    setCustom('')
    setExpanded(false)
  }

  return (
    <View style={{
      flex: 1, backgroundColor: colors.surface, borderRadius: radius.lg,
      borderWidth: 1, borderColor: colors.border, padding: spacing.md,
    }}>
      <Pressable
        onPress={() => setExpanded(e => !e)}
        style={{ alignItems: 'center' }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs, alignSelf: 'flex-start' }}>
          <Ionicons name="water-outline" size={14} color={colors.water} />
          <Text style={{ color: colors.textMuted, fontSize: fontSize.label, marginLeft: 4 }}>Water</Text>
        </View>

        <View style={{ alignItems: 'center', justifyContent: 'center', width: SIZE, height: SIZE, marginVertical: spacing.xs }}>
          <Svg width={SIZE} height={SIZE} style={{ position: 'absolute' }}>
            <Circle cx={SIZE / 2} cy={SIZE / 2} r={R} stroke={colors.surface2} strokeWidth={STROKE} fill="none" />
            <Circle cx={SIZE / 2} cy={SIZE / 2} r={R} stroke={colors.water} strokeWidth={STROKE} fill="none"
              strokeDasharray={`${CIRC}`} strokeDashoffset={offset}
              strokeLinecap="round" rotation="-90" origin={`${SIZE / 2}, ${SIZE / 2}`} />
          </Svg>
          <Text style={{ color: colors.text, fontSize: fontSize.micro, fontWeight: '700' }}>{liters}L</Text>
          <Text style={{ color: colors.textMuted, fontSize: 8 }}>/{goalL}</Text>
        </View>

        <View style={{
          backgroundColor: `${colors.water}22`, borderRadius: radius.full,
          paddingHorizontal: spacing.sm, paddingVertical: 2,
        }}>
          <Text style={{ color: colors.water, fontSize: fontSize.micro, fontWeight: '600' }}>
            {expanded ? '▲ Close' : '+ Add'}
          </Text>
        </View>
      </Pressable>

      {expanded && (
        <View style={{ marginTop: spacing.sm, gap: spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ color: colors.text, fontSize: fontSize.label, fontWeight: '700', flex: 1 }}>Quick Add</Text>
            <Pressable onPress={onPress} hitSlop={8}>
              <Text style={{ color: colors.water, fontSize: fontSize.label }}>Full view →</Text>
            </Pressable>
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
            {WATER_QUICK.map(ml => (
              <Pressable
                key={ml}
                onPress={() => { onAdd(ml) }}
                style={({ pressed }) => ({
                  backgroundColor: pressed ? colors.water : `${colors.water}22`,
                  borderRadius: radius.md, paddingVertical: 4, paddingHorizontal: spacing.sm,
                  alignItems: 'center',
                })}
              >
                {({ pressed }) => (
                  <Text style={{ color: pressed ? '#000' : colors.water, fontSize: fontSize.label, fontWeight: '600' }}>
                    +{ml}ml
                  </Text>
                )}
              </Pressable>
            ))}
          </View>

          <View style={{
            flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
            backgroundColor: colors.surface2, borderRadius: radius.md, paddingHorizontal: spacing.sm,
          }}>
            <TextInput
              value={custom}
              onChangeText={setCustom}
              placeholder="ml"
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
              style={{ flex: 1, color: colors.text, fontSize: fontSize.body, paddingVertical: 6 }}
            />
            <Pressable
              onPress={handleCustom}
              style={({ pressed }) => ({
                backgroundColor: colors.water, borderRadius: radius.sm,
                paddingVertical: 4, paddingHorizontal: spacing.sm, opacity: pressed ? 0.8 : 1,
              })}
            >
              <Text style={{ color: '#000', fontSize: fontSize.label, fontWeight: '700' }}>Add</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  )
}

// ─── Steps card ───────────────────────────────────────────────────────────────

function StepsCard({ stepCount, goal, low, high, streak, onPress }: {
  stepCount: number; goal: number; low: number; high: number; streak: number; onPress: () => void
}) {
  const SIZE = 60
  const STROKE = 7
  const R = (SIZE - STROKE) / 2
  const CIRC = 2 * Math.PI * R
  const progress = goal > 0 ? Math.min(1, stepCount / goal) : 0
  const offset = CIRC * (1 - progress)

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
    >
      <View style={{
        backgroundColor: colors.surface, borderRadius: radius.lg,
        borderWidth: 1, borderColor: colors.border, padding: spacing.md,
      }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs }}>
        <Ionicons name="footsteps-outline" size={14} color={colors.steps} />
        <Text style={{ color: colors.textMuted, fontSize: fontSize.label, marginLeft: 4 }}>Steps</Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <View style={{ alignItems: 'center', justifyContent: 'center', width: SIZE, height: SIZE }}>
          <Svg width={SIZE} height={SIZE} style={{ position: 'absolute' }}>
            <Circle cx={SIZE / 2} cy={SIZE / 2} r={R} stroke={colors.surface2} strokeWidth={STROKE} fill="none" />
            <Circle cx={SIZE / 2} cy={SIZE / 2} r={R} stroke={colors.steps} strokeWidth={STROKE} fill="none"
              strokeDasharray={`${CIRC}`} strokeDashoffset={offset}
              strokeLinecap="round" rotation="-90" origin={`${SIZE / 2},${SIZE / 2}`} />
          </Svg>
          <Text style={{ color: colors.text, fontSize: 10, fontWeight: '700' }}>
            {Math.round(progress * 100)}%
          </Text>
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={{ color: colors.text, fontSize: 22, fontWeight: '700', fontFamily: `${fonts.mono}_700Bold` }}>
            {formatSteps(stepCount)}
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: fontSize.micro, fontFamily: `${fonts.mono}_400Regular` }}>
            / {formatSteps(goal)} goal
          </Text>
          {high > 0 && (
            <Text style={{ color: colors.steps, fontSize: fontSize.micro, fontWeight: '600', fontFamily: `${fonts.mono}_500Medium` }}>
              {low === high ? `~${low}` : `${low}–${high}`} kcal
            </Text>
          )}
          {streak > 0 && (
            <Text style={{ color: colors.warning, fontSize: fontSize.micro, fontWeight: '600' }}>
              🔥 {streak}-day streak
            </Text>
          )}
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
      </View>
      </View>
    </Pressable>
  )
}

// ─── Workout card ──────────────────────────────────────────────────────────────

function StatPill({ icon, value }: { icon: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
      <Ionicons name={icon as never} size={12} color={colors.textMuted} />
      <Text style={{ color: colors.textMuted, fontSize: fontSize.label }}>{value}</Text>
    </View>
  )
}

function WorkoutCard({ activeSession, todaySession, onPress }: {
  activeSession: WorkoutSessionV2 | null
  todaySession?: SessionSummaryRowV2
  onPress: () => void
}) {
  const router = useRouter()
  const done = !!todaySession && !activeSession
  const inProgress = !!activeSession
  const statusLabel = inProgress ? 'In Progress' : done ? 'Done' : 'Not started'
  const statusColor = inProgress ? colors.warning : done ? colors.success : colors.textMuted

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
    >
      <View style={{
        backgroundColor: colors.surface, borderRadius: radius.lg,
        borderWidth: 1, borderColor: colors.border, padding: spacing.md,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs }}>
          <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: statusColor, marginRight: spacing.xs }} />
          <Text style={{ color: statusColor, fontSize: fontSize.label, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {statusLabel}
          </Text>
        </View>

        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: spacing.sm, fontFamily: `${fonts.ui}_700Bold` }}>
          {inProgress ? 'Active Workout'
            : done ? (todaySession.templateName ?? "Today's Session")
            : 'Ready to train?'}
        </Text>

        {done && todaySession && (
          <View style={{ flexDirection: 'row', gap: spacing.md, marginBottom: spacing.sm }}>
            <StatPill icon="barbell-outline" value={`${todaySession.exerciseCount} ex`} />
            <StatPill icon="checkmark-circle-outline" value={`${todaySession.totalSets} sets`} />
            <StatPill icon="stats-chart-outline" value={`${Math.round(todaySession.totalVolume)}kg`} />
          </View>
        )}

        {inProgress && (
          <Pressable
            onPress={() => router.push('/health/workout/session/active' as never)}
            style={{ alignSelf: 'flex-start', backgroundColor: `${colors.warning}22`, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 4 }}
          >
            <Text style={{ color: colors.warning, fontWeight: '600', fontSize: fontSize.label }}>Resume →</Text>
          </Pressable>
        )}

        {!done && !inProgress && (
          <Button label="Start Workout" onPress={() => router.push('/health/workout' as never)} fullWidth />
        )}
      </View>
    </Pressable>
  )
}

// ─── Checklist preview card ───────────────────────────────────────────────────

function ChecklistPreviewCard({ name, checkedCount, totalCount, previewItems, onToggle, onPress }: {
  name: string; checkedCount: number; totalCount: number
  previewItems: ChecklistItem[]; onToggle: (id: string) => void; onPress: () => void
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
    >
      <View style={{
        backgroundColor: colors.surface, borderRadius: radius.lg,
        borderWidth: 1, borderColor: colors.border, padding: spacing.md,
      }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
        <Ionicons name="checkmark-circle-outline" size={14} color={colors.organizer} style={{ marginRight: 4 }} />
        <Text style={{ color: colors.textMuted, fontSize: fontSize.label, flex: 1 }}>Checklist</Text>
        <Text style={{ color: colors.textMuted, fontSize: fontSize.label }}>
          {checkedCount} / {totalCount}
        </Text>
      </View>
      <Text style={{ color: colors.text, fontSize: fontSize.cardTitle, fontWeight: '600', marginBottom: spacing.sm }}>
        {name}
      </Text>

      {previewItems.map((item) => (
        <Pressable
          key={item.id}
          onPress={(e) => { e.stopPropagation?.(); onToggle(item.id) }}
          style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.xs, gap: spacing.sm }}
        >
          <Ionicons
            name={item.isChecked ? 'checkmark-circle' : 'ellipse-outline'}
            size={18}
            color={item.isChecked ? colors.success : colors.textMuted}
          />
          <Text style={{
            color: item.isChecked ? colors.textMuted : colors.text,
            fontSize: fontSize.label,
            textDecorationLine: item.isChecked ? 'line-through' : 'none',
          }}>
            {item.title}
          </Text>
        </Pressable>
      ))}

      {totalCount > previewItems.length && (
        <Text style={{ color: colors.textMuted, fontSize: fontSize.label, marginTop: spacing.xs, paddingLeft: 26 }}>
          +{totalCount - previewItems.length} more
        </Text>
      )}
      </View>
    </Pressable>
  )
}

// ─── Budget card ──────────────────────────────────────────────────────────────

function BudgetCard({ spent, income, month, onPress }: {
  spent: number; income: number; month: string; onPress: () => void
}) {
  const pct = income > 0 ? Math.min(1, spent / income) : 0
  const left = income - spent
  const barColor = pct >= 0.85 ? colors.danger : pct >= 0.60 ? colors.warning : colors.success

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
    >
      <View style={{
        backgroundColor: colors.surface, borderRadius: radius.lg,
        borderWidth: 1, borderColor: colors.border, padding: spacing.md,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs }}>
          <Ionicons name="wallet-outline" size={14} color={colors.budget} />
          <Text style={{ color: colors.textMuted, fontSize: fontSize.label, marginLeft: 4, flex: 1 }}>Budget</Text>
          <Text style={{ color: colors.textMuted, fontSize: fontSize.label }}>{month}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs, marginBottom: spacing.sm }}>
          <Text style={{ color: colors.text, fontSize: 22, fontWeight: '700', fontFamily: `${fonts.mono}_700Bold` }}>€{spent.toFixed(0)}</Text>
          <Text style={{ color: colors.textMuted, fontSize: fontSize.label, fontFamily: `${fonts.mono}_400Regular` }}>/ €{income.toFixed(0)} income</Text>
        </View>
        <ProgressBar progress={pct} color={barColor} height={4} />
        <Text style={{ color: colors.textMuted, fontSize: fontSize.micro, marginTop: spacing.xs }}>
          Left this month: €{Math.max(0, left).toFixed(2)}
        </Text>
      </View>
    </Pressable>
  )
}

// ─── Weekly strip ──────────────────────────────────────────────────────────────

function WeeklyStrip({ days, calorieHistory, recentSessions, calorieGoal, today, onPressDay }: {
  days: string[]
  calorieHistory: { date: string; calories: number }[]
  recentSessions: SessionSummaryRowV2[]
  calorieGoal: number
  today: string
  onPressDay: (date: string) => void
}) {
  const BAR_MAX = 64

  return (
    <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md }}>
      <Text style={{ color: colors.textMuted, fontSize: fontSize.label, fontWeight: '600', fontFamily: `${fonts.ui}_600SemiBold`, textTransform: 'uppercase', letterSpacing: 1, marginBottom: spacing.md }}>
        This Week
      </Text>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        {days.map((date) => {
          const isToday = date === today
          const isPast  = date < today
          const cal = calorieHistory.find((h) => h.date === date)?.calories ?? 0
          const hasWorkout = recentSessions.some((s) => s.date === date && s.endedAt)
          const barH = calorieGoal > 0 ? Math.round(Math.min(BAR_MAX, (cal / calorieGoal) * BAR_MAX)) : 0
          const isOver = cal > calorieGoal && cal > 0
          const barColor = isOver ? colors.danger : isToday ? colors.primary : `${colors.primary}44`
          const dayLabel = new Date(date + 'T12:00:00').toLocaleDateString('en', { weekday: 'short' }).slice(0, 1)

          return (
            <Pressable
              key={date}
              onPress={() => (isToday || isPast) ? onPressDay(date) : undefined}
              style={({ pressed }) => ({
                alignItems: 'center', flex: 1,
                opacity: pressed && (isToday || isPast) ? 0.7 : 1,
              })}
            >
              {/* Bar area */}
              <View style={{ height: BAR_MAX, justifyContent: 'flex-end', marginBottom: 4 }}>
                <View style={{ width: 18, height: Math.max(2, barH), backgroundColor: barColor, borderRadius: 3 }} />
              </View>
              {/* Workout dot */}
              <View style={{
                width: 5, height: 5, borderRadius: 2.5, marginBottom: 5,
                backgroundColor: hasWorkout ? colors.success : 'transparent',
              }} />
              <Text style={{
                color: isToday ? colors.primary : colors.textMuted,
                fontSize: fontSize.micro,
                fontWeight: isToday ? '700' : '400',
              }}>
                {dayLabel}
              </Text>
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}

// ─── Organizer card ───────────────────────────────────────────────────────────

function OrganizerCard({ onPress }: { onPress: () => void }) {
  const reminders = useOrganizerStore((s) => s.reminders)
  const people    = useOrganizerStore((s) => s.people)
  const notes     = useOrganizerStore((s) => s.notes)

  const today     = todayStr()
  const overdue   = reminders.filter((r) => !r.isCompleted && r.dueDate < today).length
  const todayDue  = reminders.filter((r) => !r.isCompleted && r.dueDate === today).length

  const upcomingBirthdays = people
    .map((p) => ({ person: p, days: getPersonDaysUntilBirthday(p) }))
    .filter(({ days }) => days !== null && days <= 14)
    .sort((a, b) => (a.days ?? 99) - (b.days ?? 99))
    .slice(0, 5)

  const pinnedNotes = notes.filter((n) => n.isPinned && !n.isArchived)

  const hasAnything = overdue > 0 || todayDue > 0 || upcomingBirthdays.length > 0 || pinnedNotes.length > 0

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
    >
      <View style={{
        backgroundColor: colors.surface, borderRadius: radius.lg,
        borderWidth: 1, borderColor: colors.border, padding: spacing.md,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
          <Ionicons name="calendar-outline" size={14} color={colors.organizer} />
          <Text style={{ color: colors.textMuted, fontSize: fontSize.label, marginLeft: 4, flex: 1 }}>Organizer</Text>
          <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
        </View>

        {!hasAnything ? (
          <Text style={{ color: colors.textMuted, fontSize: fontSize.body }}>All clear ✓</Text>
        ) : (
          <View style={{ gap: spacing.xs }}>
            {overdue > 0 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.danger }} />
                <Text style={{ color: colors.danger, fontSize: fontSize.body, fontWeight: '600' }}>
                  {overdue} overdue reminder{overdue > 1 ? 's' : ''}
                </Text>
              </View>
            )}
            {todayDue > 0 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.reminders }} />
                <Text style={{ color: colors.text, fontSize: fontSize.body }}>
                  {todayDue} due today
                </Text>
              </View>
            )}
            {upcomingBirthdays.map(({ person, days }) => (
              <View key={person.id} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                <Text style={{ fontSize: 12 }}>🎂</Text>
                <Text style={{ color: colors.text, fontSize: fontSize.body }}>
                  {person.name.split(' ')[0]}
                  {days === 0 ? ' — Today!' : ` in ${days}d`}
                </Text>
              </View>
            ))}
            {pinnedNotes.length > 0 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                <Ionicons name="bookmark" size={12} color={colors.organizer} />
                <Text style={{ color: colors.textMuted, fontSize: fontSize.body }}>
                  {pinnedNotes.length} pinned note{pinnedNotes.length > 1 ? 's' : ''}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
    </Pressable>
  )
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const router = useRouter()

  const { profile } = useUserStore()
  const { activeSession, recentSessions, loadRecentSessions } = useWorkoutStoreV2()
  const {
    totalCalories, macroGoals, totalProteinG, totalCarbsG, totalFatG,
    waterMl, waterGoalMl, loadToday: loadDiet, calorieHistory, loadHistory: loadDietHistory, addWater,
  } = useDietStore()
  const { checklists, loadChecklists, toggleItem } = useChecklistStore()
  const [currentMonthBudget, setCurrentMonthBudget] = useState({ totalIncome: 0, totalSpending: 0, year: new Date().getFullYear(), month: new Date().getMonth() + 1 })
  const { loadReminders: loadOrgReminders, loadPeople: loadOrgPeople, loadNotes: loadOrgNotes } = useOrganizerStore()
  const { todayEntry: stepsEntry, todaySessions, loadToday: loadSteps, loadSessions: loadStepSessions } = useStepsStore()

  const [refreshing, setRefreshing] = useState(false)
  const [previewItems, setPreviewItems] = useState<ChecklistItem[]>([])

  // Quick log sheet
  const quickLogSheetRef = useRef<GorhomBottomSheet>(null)
  const [quickTab, setQuickTab] = useState<'expense' | 'water'>('expense')
  const [quickExpenseAmt, setQuickExpenseAmt] = useState('')
  const [quickExpenseCatId, setQuickExpenseCatId] = useState<string | null>(null)
  const [quickExpenseCategories, setQuickExpenseCategories] = useState<BudgetCategory[]>([])
  const [quickWaterMl, setQuickWaterMl] = useState('')

  const today = todayStr()
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  const firstChecklist = checklists[0] ?? null

  const dob = profile?.dateOfBirth ?? '1990-01-01'
  const weightKg = profile?.weightKg ?? 75
  const heightCm = profile?.heightCm ?? 175

  function loadAll() {
    loadRecentSessions()
    loadDiet()
    loadDietHistory(7)
    loadSteps(today, dob)
    loadStepSessions(today)
    setStepsStreak(dbGetStepsStreak())
    loadChecklists()
    setCurrentMonthBudget(dbGetCurrentMonthSummary())
    loadOrgReminders()
    loadOrgPeople()
    loadOrgNotes()
  }

  // Re-run loadAll every time this screen comes into focus (covers returning
  // from settings, switching tabs, and the initial mount).
  useFocusEffect(
    useCallback(() => { loadAll() }, [])
  )

  // Secondary guard for the launch race: _layout calls loadProfile() async,
  // so profile may be null the first time useFocusEffect fires. When profile
  // arrives (or changes after a settings save), reload diet + steps so the
  // calorie goal and calorie estimates reflect the new values immediately.
  useEffect(() => {
    if (profile) {
      loadDiet()
      loadSteps(today, dob)
      loadStepSessions(today)
    }
  }, [
    profile?.weightKg,
    profile?.heightCm,
    profile?.calorieGoalKcal,
    profile?.activityLevel,
    profile?.dateOfBirth,
  ])

  useEffect(() => {
    if (firstChecklist) {
      setPreviewItems(dbGetChecklistItems(firstChecklist.id).slice(0, 3))
    }
  }, [firstChecklist?.id])

  // Refresh budget month (and full loadAll) when app returns to foreground —
  // covers the midnight month-rollover case where the user leaves the app open.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') {
        setCurrentMonthBudget(dbGetCurrentMonthSummary())
      }
    })
    return () => sub.remove()
  }, [])

  async function handleRefresh() {
    setRefreshing(true)
    loadAll()
    if (firstChecklist) setPreviewItems(dbGetChecklistItems(firstChecklist.id).slice(0, 3))
    setCurrentMonthBudget(dbGetCurrentMonthSummary())
    setRefreshing(false)
  }

  function handleChecklistToggle(itemId: string) {
    if (!firstChecklist) return
    toggleItem(firstChecklist.id, itemId)
    setPreviewItems((prev) => prev.map((i) => i.id === itemId ? { ...i, isChecked: !i.isChecked } : i))
  }

  // Computed values
  const todaySession = recentSessions.find((s) => s.date === today && s.endedAt)
  const workoutProgress = activeSession ? 0.5 : todaySession ? 1 : 0
  const calProgress = macroGoals.calorieGoal > 0 ? totalCalories / macroGoals.calorieGoal : 0
  const waterProgress = waterGoalMl > 0 ? waterMl / waterGoalMl : 0
  const stepCount = stepsEntry?.stepCount ?? 0
  const stepGoal = stepsEntry?.goal ?? defaultGoal(dob)
  const stepsProgress = stepGoal > 0 ? stepCount / stepGoal : 0
  const { low: stepsLow, high: stepsHigh } = estimateCalories(stepCount, weightKg, heightCm, todaySessions)
  const [stepsStreak, setStepsStreak] = useState(0)

  // Last 7 days for weekly strip
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return localDateStr(d)
  })

  const dateLabel = new Date().toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric' })
  const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const budgetMonthLabel = `${MONTH_NAMES[currentMonthBudget.month - 1]} ${currentMonthBudget.year}`

  // Empty state check — no data at all yet
  const hasAnyData = totalCalories > 0 || waterMl > 0 || stepCount > 0
    || recentSessions.length > 0
    || currentMonthBudget.totalIncome > 0 || currentMonthBudget.totalSpending > 0

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
      >
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.textMuted, fontSize: fontSize.label, fontFamily: `${fonts.ui}_400Regular` }}>{greeting}</Text>
            <Text style={{ color: colors.text, fontSize: fontSize.sectionHeader, fontWeight: '700', fontFamily: `${fonts.ui}_700Bold` }}>
              {profile?.name ?? 'Welcome'}
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: fontSize.micro, marginTop: 2, fontFamily: `${fonts.ui}_400Regular` }}>{dateLabel}</Text>
          </View>
          <Pressable
            onPress={() => router.push('/settings')}
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          >
            <View style={{
              width: 40, height: 40, borderRadius: 20,
              backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Ionicons name="person-outline" size={18} color={colors.text} />
            </View>
          </Pressable>
        </View>

        {/* Empty state — shown to brand-new users before any data */}
        {!hasAnyData && (
          <View style={{
            backgroundColor: colors.surface, borderRadius: radius.lg,
            borderWidth: 1, borderColor: colors.borderAccent,
            padding: spacing.lg, gap: spacing.md,
          }}>
            <Text style={{ color: colors.text, fontSize: fontSize.sectionHeader, fontWeight: '700' }}>
              Welcome, {profile?.name?.split(' ')[0] ?? 'there'}! 👋
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: fontSize.body, lineHeight: 22 }}>
              You're all set. Here are a few things to get started:
            </Text>
            {[
              { icon: 'barbell-outline', label: 'Log your first workout', route: '/health/workout', color: colors.success },
              { icon: 'wallet-outline', label: 'Set your budget', route: '/(tabs)/budget', color: colors.budget },
              { icon: 'people-outline', label: 'Add someone\'s birthday', route: '/organizer/person-add', color: colors.organizer },
            ].map(({ icon, label, route, color }) => (
              <Pressable
                key={label}
                onPress={() => router.push(route as never)}
                style={({ pressed }) => ({
                  flexDirection: 'row', alignItems: 'center', gap: spacing.md,
                  backgroundColor: colors.surface2, borderRadius: radius.md,
                  borderWidth: 1, borderColor: colors.border,
                  padding: spacing.md, opacity: pressed ? 0.8 : 1,
                })}
              >
                <View style={{ width: 36, height: 36, borderRadius: radius.md, backgroundColor: `${color}22`, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name={icon as never} size={18} color={color} />
                </View>
                <Text style={{ color: colors.text, fontSize: fontSize.body, fontWeight: '500', flex: 1 }}>{label}</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </Pressable>
            ))}
          </View>
        )}

        {/* Day Overview — rings + actual values */}
        <DayOverviewCard
          calProgress={calProgress}
          workoutProgress={workoutProgress}
          waterProgress={waterProgress}
          stepsProgress={stepsProgress}
          totalCalories={totalCalories}
          calorieGoal={macroGoals.calorieGoal}
          proteinG={totalProteinG}
          carbsG={totalCarbsG}
          fatG={totalFatG}
          waterMl={waterMl}
          waterGoalMl={waterGoalMl}
          stepCount={stepCount}
          stepGoal={stepGoal}
          workoutDone={!!todaySession && !activeSession}
          workoutInProgress={!!activeSession}
          onPress={() => router.push('/health/nutrition' as never)}
        />

        {/* Water */}
        <WaterCard
          waterMl={waterMl}
          goalMl={waterGoalMl}
          onAdd={(ml) => addWater(ml)}
          onPress={() => router.push('/health/nutrition/water' as never)}
        />

        {/* Steps */}
        <StepsCard
          stepCount={stepCount}
          goal={stepGoal}
          low={stepsLow}
          high={stepsHigh}
          streak={stepsStreak}
          onPress={() => router.push('/health/steps' as never)}
        />

        {/* Workout */}
        <WorkoutCard
          activeSession={activeSession}
          todaySession={todaySession}
          onPress={() => router.push((activeSession ? '/health/workout/session/active' : '/health/workout') as never)}
        />

        {/* Checklist */}
        {firstChecklist && (
          <ChecklistPreviewCard
            name={firstChecklist.name}
            checkedCount={firstChecklist.checkedItems}
            totalCount={firstChecklist.totalItems}
            previewItems={previewItems}
            onToggle={handleChecklistToggle}
            onPress={() => router.push({ pathname: '/checklist/[id]', params: { id: firstChecklist.id } } as never)}
          />
        )}

        {/* Weekly strip */}
        <WeeklyStrip
          days={weekDays}
          calorieHistory={calorieHistory}
          recentSessions={recentSessions}
          calorieGoal={macroGoals.calorieGoal}
          today={today}
          onPressDay={(date) => router.push({ pathname: '/daily-summary', params: { date } } as never)}
        />

        {/* Budget card */}
        <BudgetCard
          spent={currentMonthBudget.totalSpending}
          income={currentMonthBudget.totalIncome}
          month={budgetMonthLabel}
          onPress={() => router.push('/(tabs)/budget' as never)}
        />

        {/* Organizer card */}
        <OrganizerCard onPress={() => router.push('/(tabs)/organizer' as never)} />

      </ScrollView>

      {/* Quick log FAB */}
      <Pressable
        onPress={() => {
          setQuickExpenseCategories(dbGetCategoriesByType('expense'))
          quickLogSheetRef.current?.expand()
        }}
        style={({ pressed }) => ({
          position: 'absolute', bottom: 24, right: spacing.lg,
          width: 52, height: 52, borderRadius: 26,
          backgroundColor: colors.primary,
          alignItems: 'center', justifyContent: 'center',
          opacity: pressed ? 0.85 : 1,
          shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.4, shadowRadius: 8, elevation: 8,
        })}
      >
        <Ionicons name="add" size={26} color="#fff" />
      </Pressable>

      {/* Quick log sheet */}
      <BottomSheet ref={quickLogSheetRef} snapPoints={['55%']}>
        <View style={{ padding: spacing.lg, flex: 1 }}>
          <Text style={{ color: colors.text, fontSize: fontSize.sectionHeader, fontWeight: '600', marginBottom: spacing.md }}>
            Quick Log
          </Text>

          {/* Tab selector */}
          <View style={{ flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.md }}>
            {(['expense', 'water'] as const).map((tab) => (
              <Pressable
                key={tab}
                onPress={() => setQuickTab(tab)}
                style={{
                  flex: 1, paddingVertical: 8, borderRadius: radius.full, alignItems: 'center',
                  backgroundColor: quickTab === tab ? colors.primary : colors.surface2,
                }}
              >
                <Text style={{
                  color: quickTab === tab ? '#fff' : colors.textMuted,
                  fontSize: fontSize.label, fontWeight: '600', textTransform: 'capitalize',
                }}>
                  {tab === 'expense' ? 'Expense' : 'Water'}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Expense tab */}
          {quickTab === 'expense' && (
            <View style={{ gap: spacing.sm }}>
              <View style={{
                flexDirection: 'row', alignItems: 'center',
                backgroundColor: colors.surface2, borderRadius: radius.md,
                borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md,
              }}>
                <Text style={{ color: colors.textMuted, fontSize: fontSize.body, marginRight: 4 }}>€</Text>
                <TextInput
                  value={quickExpenseAmt}
                  onChangeText={setQuickExpenseAmt}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor={colors.textMuted}
                  style={{ flex: 1, color: colors.text, fontSize: 24, fontWeight: '700', paddingVertical: spacing.sm }}
                  selectionColor={colors.primary}
                />
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.xs }}>
                <View style={{ flexDirection: 'row', gap: spacing.xs }}>
                  {quickExpenseCategories.map((cat) => (
                    <Pressable
                      key={cat.id}
                      onPress={() => setQuickExpenseCatId(cat.id)}
                      style={{
                        flexDirection: 'row', alignItems: 'center', gap: 4,
                        paddingHorizontal: spacing.sm, paddingVertical: 6,
                        borderRadius: radius.full,
                        backgroundColor: quickExpenseCatId === cat.id ? cat.color : colors.surface2,
                        borderWidth: 1, borderColor: quickExpenseCatId === cat.id ? cat.color : colors.border,
                      }}
                    >
                      <Text style={{ fontSize: 14 }}>{cat.emoji}</Text>
                      <Text style={{
                        color: quickExpenseCatId === cat.id ? '#fff' : colors.textMuted,
                        fontSize: fontSize.label, fontWeight: '500',
                      }}>
                        {cat.name}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
              <Button
                label="Save Expense"
                onPress={() => {
                  const amt = parseFloat(quickExpenseAmt)
                  if (amt > 0 && quickExpenseCatId) {
                    const expId = dbInsertExpense(null, today, quickExpenseCatId, null, null, null)
                    dbInsertExpenseItem(expId, 'Quick expense', amt)
                    setQuickExpenseAmt('')
                    setQuickExpenseCatId(null)
                    quickLogSheetRef.current?.close()
                    setCurrentMonthBudget(dbGetCurrentMonthSummary())
                  }
                }}
                fullWidth
              />
            </View>
          )}

          {/* Water tab */}
          {quickTab === 'water' && (
            <View style={{ gap: spacing.sm }}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                {[150, 250, 330, 500, 750, 1000].map((ml) => (
                  <Pressable
                    key={ml}
                    onPress={() => {
                      addWater(ml)
                      quickLogSheetRef.current?.close()
                    }}
                    style={({ pressed }) => ({
                      flex: 1, minWidth: '28%',
                      backgroundColor: pressed ? colors.water : `${colors.water}22`,
                      borderRadius: radius.md, paddingVertical: spacing.sm, alignItems: 'center',
                    })}
                  >
                    {({ pressed }) => (
                      <Text style={{ color: pressed ? '#fff' : colors.water, fontSize: fontSize.body, fontWeight: '700' }}>
                        +{ml}ml
                      </Text>
                    )}
                  </Pressable>
                ))}
              </View>
              <View style={{
                flexDirection: 'row', alignItems: 'center',
                backgroundColor: colors.surface2, borderRadius: radius.md,
                borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md, gap: spacing.sm,
              }}>
                <TextInput
                  value={quickWaterMl}
                  onChangeText={setQuickWaterMl}
                  keyboardType="number-pad"
                  placeholder="Custom ml"
                  placeholderTextColor={colors.textMuted}
                  style={{ flex: 1, color: colors.text, fontSize: fontSize.body, paddingVertical: spacing.sm }}
                  selectionColor={colors.primary}
                />
                <Pressable
                  onPress={() => {
                    const ml = parseInt(quickWaterMl)
                    if (ml > 0) {
                      addWater(ml)
                      setQuickWaterMl('')
                      quickLogSheetRef.current?.close()
                    }
                  }}
                  style={({ pressed }) => ({
                    backgroundColor: colors.water, borderRadius: radius.sm,
                    paddingHorizontal: spacing.md, paddingVertical: 6, opacity: pressed ? 0.8 : 1,
                  })}
                >
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: fontSize.label }}>Add</Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>
      </BottomSheet>
    </SafeAreaView>
  )
}
