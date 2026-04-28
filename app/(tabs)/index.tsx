import React, { useEffect, useRef, useState } from 'react'
import { View, Text, ScrollView, Pressable, RefreshControl, TextInput, Alert } from 'react-native'
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import Svg, { Circle } from 'react-native-svg'
import { colors, fontSize, spacing, radius } from '@core/theme'
import { Button, SparklineGraph, ProgressBar } from '@core/components'
import { useUserStore } from '@core/store/userStore'
import { useBodyWeightStore } from '@modules/health/shared/bodyWeightStore'
import { useWorkoutStore } from '@modules/health/workout/workoutStore'
import { useDietStore } from '@modules/health/diet/dietStore'
import { useChecklistStore } from '@modules/checklist/checklistStore'
import { dbGetChecklistItems, type ChecklistItem } from '@core/db/checklistQueries'
import { useBudgetStore } from '@modules/budget/budgetStore'
import { useOrganizerStore } from '@modules/organizer/organizerStore'
import { getPersonDaysUntilBirthday } from '@modules/organizer/shared/organizerUtils'
import { formatVolume, formatDuration, todayStr } from '@modules/health/workout/workoutUtils'
import type { SessionSummaryRow } from '@core/db/workoutQueries'

// ─── Day Score rings ──────────────────────────────────────────────────────────

function DayScoreCard({
  calProgress, workoutProgress, waterProgress,
}: { calProgress: number; workoutProgress: number; waterProgress: number }) {
  const SIZE = 138
  const cx = SIZE / 2
  const cy = SIZE / 2
  const STROKE = 11

  const rings = [
    { r: 52, progress: calProgress,     color: colors.primary, label: 'Calories' },
    { r: 37, progress: workoutProgress, color: colors.success,  label: 'Workout'  },
    { r: 22, progress: waterProgress,   color: colors.water,    label: 'Water'    },
  ]

  return (
    <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md }}>
      <Text style={{ color: colors.textMuted, fontSize: fontSize.label, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, marginBottom: spacing.md }}>
        Day Score
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.lg }}>
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

        <View style={{ gap: spacing.md, flex: 1 }}>
          {rings.map(({ label, progress, color }) => (
            <View key={label} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }} />
              <Text style={{ color: colors.textMuted, fontSize: fontSize.label, flex: 1 }}>{label}</Text>
              <Text style={{ color: colors.text, fontSize: fontSize.label, fontWeight: '700' }}>
                {Math.round(Math.min(1, progress) * 100)}%
              </Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  )
}

// ─── Calories card ────────────────────────────────────────────────────────────

function CaloriesCard({
  totalCalories, goal, proteinG, carbsG, fatG, onPress,
}: { totalCalories: number; goal: number; proteinG: number; carbsG: number; fatG: number; onPress: () => void }) {
  const pct = goal > 0 ? totalCalories / goal : 0
  const barColor = pct >= 1 ? colors.danger : pct >= 0.8 ? colors.warning : colors.success

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1, backgroundColor: colors.surface, borderRadius: radius.lg,
        borderWidth: 1, borderColor: colors.border, padding: spacing.md, opacity: pressed ? 0.85 : 1,
      })}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs }}>
        <Ionicons name="nutrition-outline" size={14} color={colors.diet} />
        <Text style={{ color: colors.textMuted, fontSize: fontSize.label, marginLeft: 4 }}>Calories</Text>
      </View>
      <Text style={{ color: colors.text, fontSize: 22, fontWeight: '700' }}>{totalCalories}</Text>
      <Text style={{ color: colors.textMuted, fontSize: fontSize.micro, marginBottom: spacing.sm }}>/ {goal} kcal</Text>
      <ProgressBar progress={Math.min(1, pct)} color={barColor} height={4} />
      <View style={{ flexDirection: 'row', gap: spacing.xs, marginTop: spacing.sm, flexWrap: 'wrap' }}>
        {[{ l: 'P', v: proteinG, c: '#64D2FF' }, { l: 'C', v: carbsG, c: '#FFD60A' }, { l: 'F', v: fatG, c: '#FF6B9D' }]
          .map(({ l, v, c }) => (
            <View key={l} style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: c }} />
              <Text style={{ color: colors.textMuted, fontSize: fontSize.micro }}>{l} {v.toFixed(0)}g</Text>
            </View>
          ))}
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

  const sheetRef = useRef<BottomSheet>(null)
  const [custom, setCustom] = useState('')

  function handleCustom() {
    const ml = parseInt(custom)
    if (!ml || ml <= 0) { Alert.alert('Enter a valid amount'); return }
    onAdd(ml)
    setCustom('')
    sheetRef.current?.close()
  }

  return (
    <>
      <Pressable
        onPress={() => sheetRef.current?.expand()}
        style={({ pressed }) => ({
          flex: 1, backgroundColor: colors.surface, borderRadius: radius.lg,
          borderWidth: 1, borderColor: colors.border, padding: spacing.md,
          alignItems: 'center', opacity: pressed ? 0.85 : 1,
        })}
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
          <Text style={{ color: colors.water, fontSize: fontSize.micro, fontWeight: '600' }}>+ Add</Text>
        </View>
      </Pressable>

      <BottomSheet
        ref={sheetRef}
        index={-1}
        snapPoints={['45%']}
        enablePanDownToClose
        backgroundStyle={{ backgroundColor: colors.surface }}
        handleIndicatorStyle={{ backgroundColor: colors.textMuted }}
      >
        <BottomSheetView style={{ padding: spacing.md, gap: spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs }}>
            <Ionicons name="water-outline" size={16} color={colors.water} style={{ marginRight: spacing.xs }} />
            <Text style={{ color: colors.text, fontSize: fontSize.body, fontWeight: '700', flex: 1 }}>Add Water</Text>
            <Pressable onPress={onPress} hitSlop={8}>
              <Text style={{ color: colors.water, fontSize: fontSize.label }}>Full view</Text>
            </Pressable>
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {WATER_QUICK.map(ml => (
              <Pressable
                key={ml}
                onPress={() => { onAdd(ml); sheetRef.current?.close() }}
                style={({ pressed }) => ({
                  backgroundColor: pressed ? colors.water : `${colors.water}22`,
                  borderRadius: radius.md, paddingVertical: spacing.sm, paddingHorizontal: spacing.md,
                  minWidth: 70, alignItems: 'center',
                })}
              >
                {({ pressed }) => (
                  <Text style={{ color: pressed ? '#000' : colors.water, fontSize: fontSize.body, fontWeight: '600' }}>
                    +{ml}ml
                  </Text>
                )}
              </Pressable>
            ))}
          </View>

          <View style={{
            flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
            backgroundColor: colors.surface2, borderRadius: radius.md, paddingHorizontal: spacing.sm,
          }}>
            <TextInput
              value={custom}
              onChangeText={setCustom}
              placeholder="Custom amount"
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
              style={{ flex: 1, color: colors.text, fontSize: fontSize.body, paddingVertical: spacing.sm }}
            />
            <Text style={{ color: colors.textMuted, fontSize: fontSize.label }}>ml</Text>
          </View>

          <Pressable
            onPress={handleCustom}
            style={({ pressed }) => ({
              backgroundColor: colors.water, borderRadius: radius.md,
              paddingVertical: spacing.sm + 2, alignItems: 'center', opacity: pressed ? 0.8 : 1,
            })}
          >
            <Text style={{ color: '#000', fontSize: fontSize.body, fontWeight: '700' }}>Add</Text>
          </Pressable>
        </BottomSheetView>
      </BottomSheet>
    </>
  )
}

// ─── Workout card ──────────────────────────────────────────────────────────────

function WorkoutCard({ activeSession, todaySession, onPress, onStart }: {
  activeSession: ReturnType<typeof useWorkoutStore>['activeSession']
  todaySession?: SessionSummaryRow
  onPress: () => void
  onStart: () => void
}) {
  const done = !!todaySession && !activeSession
  const inProgress = !!activeSession
  const statusLabel = inProgress ? 'In Progress' : done ? 'Done' : 'Not started'
  const statusColor = inProgress ? colors.warning : done ? colors.success : colors.textMuted

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: colors.surface, borderRadius: radius.lg,
        borderWidth: 1, borderColor: colors.border, padding: spacing.md, opacity: pressed ? 0.85 : 1,
      })}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs }}>
        <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: statusColor, marginRight: spacing.xs }} />
        <Text style={{ color: statusColor, fontSize: fontSize.label, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          {statusLabel}
        </Text>
      </View>

      <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: spacing.sm }}>
        {inProgress ? (activeSession?.name ?? 'Active Workout')
          : done ? (todaySession?.name ?? 'Today\'s Session')
          : 'Ready to train?'}
      </Text>

      {done && todaySession && (
        <View style={{ flexDirection: 'row', gap: spacing.md, marginBottom: spacing.sm }}>
          <StatPill icon="barbell-outline" value={`${todaySession.exercise_count} ex`} />
          <StatPill icon="checkmark-circle-outline" value={`${todaySession.total_sets} sets`} />
          <StatPill icon="stats-chart-outline" value={formatVolume(todaySession.total_volume)} />
          {todaySession.duration_minutes != null && (
            <StatPill icon="time-outline" value={formatDuration(todaySession.duration_minutes)} />
          )}
        </View>
      )}

      {!done && (
        <Button
          label={inProgress ? 'Resume Workout' : 'Start Workout'}
          onPress={onStart}
          fullWidth
        />
      )}
    </Pressable>
  )
}

function StatPill({ icon, value }: { icon: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
      <Ionicons name={icon as never} size={12} color={colors.textMuted} />
      <Text style={{ color: colors.textMuted, fontSize: fontSize.label }}>{value}</Text>
    </View>
  )
}

// ─── Weight card ──────────────────────────────────────────────────────────────

function WeightCard({ weightKg, delta, sparklineData, onPress }: {
  weightKg?: number; delta: number | null; sparklineData: number[]; onPress: () => void
}) {
  const deltaColor = delta === null ? colors.textMuted : delta <= 0 ? colors.success : colors.danger

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: colors.surface, borderRadius: radius.lg,
        borderWidth: 1, borderColor: colors.border, padding: spacing.md,
        flexDirection: 'row', alignItems: 'center', opacity: pressed ? 0.85 : 1,
      })}
    >
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs }}>
          <Ionicons name="scale-outline" size={14} color={colors.primary} />
          <Text style={{ color: colors.textMuted, fontSize: fontSize.label, marginLeft: 4 }}>Body Weight</Text>
        </View>
        {weightKg != null ? (
          <Text style={{ color: colors.text, fontSize: 22, fontWeight: '700' }}>{weightKg} kg</Text>
        ) : (
          <Text style={{ color: colors.textMuted, fontSize: fontSize.body }}>Log today's weight</Text>
        )}
        {delta !== null && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 }}>
            <Ionicons name={delta <= 0 ? 'arrow-down' : 'arrow-up'} size={12} color={deltaColor} />
            <Text style={{ color: deltaColor, fontSize: fontSize.label, fontWeight: '600' }}>
              {Math.abs(delta).toFixed(1)} kg vs yesterday
            </Text>
          </View>
        )}
      </View>
      {sparklineData.length >= 2 && (
        <SparklineGraph data={sparklineData} width={88} height={44} color={colors.primary} />
      )}
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
      style={({ pressed }) => ({
        backgroundColor: colors.surface, borderRadius: radius.lg,
        borderWidth: 1, borderColor: colors.border, padding: spacing.md, opacity: pressed ? 0.85 : 1,
      })}
    >
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
    </Pressable>
  )
}

// ─── Budget card ──────────────────────────────────────────────────────────────

function BudgetCard({ spent, income, month, onPress }: {
  spent: number; income: number; month: string; onPress: () => void
}) {
  const pct = income > 0 ? Math.min(1, spent / income) : 0
  const left = income - spent
  const barColor = pct >= 1 ? colors.danger : pct >= 0.75 ? colors.warning : colors.success

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: colors.surface, borderRadius: radius.lg,
        borderWidth: 1, borderColor: colors.border, padding: spacing.md,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs }}>
        <Ionicons name="wallet-outline" size={14} color={colors.budget} />
        <Text style={{ color: colors.textMuted, fontSize: fontSize.label, marginLeft: 4, flex: 1 }}>Budget</Text>
        <Text style={{ color: colors.textMuted, fontSize: fontSize.label }}>{month}</Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs, marginBottom: spacing.sm }}>
        <Text style={{ color: colors.text, fontSize: 22, fontWeight: '700' }}>€{spent.toFixed(0)}</Text>
        <Text style={{ color: colors.textMuted, fontSize: fontSize.label }}>/ €{income.toFixed(0)} income</Text>
      </View>
      <ProgressBar progress={pct} color={barColor} height={4} />
      <Text style={{ color: colors.textMuted, fontSize: fontSize.micro, marginTop: spacing.xs }}>
        Left this month: €{Math.max(0, left).toFixed(2)}
      </Text>
    </Pressable>
  )
}

// ─── Weekly strip ──────────────────────────────────────────────────────────────

function WeeklyStrip({ days, calorieHistory, recentSessions, calorieGoal, today }: {
  days: string[]
  calorieHistory: { date: string; calories: number }[]
  recentSessions: SessionSummaryRow[]
  calorieGoal: number
  today: string
}) {
  const BAR_MAX = 64

  return (
    <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md }}>
      <Text style={{ color: colors.textMuted, fontSize: fontSize.label, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, marginBottom: spacing.md }}>
        This Week
      </Text>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        {days.map((date) => {
          const isToday = date === today
          const cal = calorieHistory.find((h) => h.date === date)?.calories ?? 0
          const hasWorkout = recentSessions.some((s) => s.date === date && s.ended_at)
          const barH = calorieGoal > 0 ? Math.round(Math.min(BAR_MAX, (cal / calorieGoal) * BAR_MAX)) : 0
          const isOver = cal > calorieGoal && cal > 0
          const barColor = isOver ? colors.danger : isToday ? colors.primary : `${colors.primary}44`
          const dayLabel = new Date(date + 'T12:00:00').toLocaleDateString('en', { weekday: 'short' }).slice(0, 1)

          return (
            <View key={date} style={{ alignItems: 'center', flex: 1 }}>
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
            </View>
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
    .filter(({ days }) => days !== null && days <= 7)
    .sort((a, b) => (a.days ?? 99) - (b.days ?? 99))
    .slice(0, 3)

  const pinnedNotes = notes.filter((n) => n.isPinned && !n.isArchived)

  const hasAnything = overdue > 0 || todayDue > 0 || upcomingBirthdays.length > 0 || pinnedNotes.length > 0

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: colors.surface, borderRadius: radius.lg,
        borderWidth: 1, borderColor: colors.border, padding: spacing.md,
        opacity: pressed ? 0.85 : 1,
      })}
    >
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
    </Pressable>
  )
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const router = useRouter()

  const { profile } = useUserStore()
  const { todayEntry, history: weightHistory, loadToday: loadWeight, loadHistory: loadWeightHistory } = useBodyWeightStore()
  const { activeSession, recentSessions, loadRecentSessions } = useWorkoutStore()
  const {
    totalCalories, macroGoals, totalProteinG, totalCarbsG, totalFatG,
    waterMl, waterGoalMl, loadToday: loadDiet, calorieHistory, loadHistory: loadDietHistory, addWater,
  } = useDietStore()
  const { checklists, loadChecklists, toggleItem } = useChecklistStore()
  const { totalIncome, totalSpending, viewMonth, viewYear, loadMonth: loadBudgetMonth, loadCategories: loadBudgetCategories } = useBudgetStore()
  const { loadReminders: loadOrgReminders, loadPeople: loadOrgPeople, loadNotes: loadOrgNotes } = useOrganizerStore()

  const [refreshing, setRefreshing] = useState(false)
  const [previewItems, setPreviewItems] = useState<ChecklistItem[]>([])

  const today = todayStr()
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  const firstChecklist = checklists[0] ?? null

  function loadAll() {
    loadWeight(today)
    loadWeightHistory('7d')
    loadRecentSessions()
    loadDiet()
    loadDietHistory(7)
    loadChecklists()
    loadBudgetCategories()
    loadBudgetMonth()
    loadOrgReminders()
    loadOrgPeople()
    loadOrgNotes()
  }

  useEffect(() => { loadAll() }, [])

  useEffect(() => {
    if (firstChecklist) {
      setPreviewItems(dbGetChecklistItems(firstChecklist.id).slice(0, 3))
    }
  }, [firstChecklist?.id])

  async function handleRefresh() {
    setRefreshing(true)
    loadAll()
    if (firstChecklist) setPreviewItems(dbGetChecklistItems(firstChecklist.id).slice(0, 3))
    setRefreshing(false)
  }

  function handleChecklistToggle(itemId: string) {
    if (!firstChecklist) return
    toggleItem(firstChecklist.id, itemId)
    setPreviewItems((prev) => prev.map((i) => i.id === itemId ? { ...i, isChecked: !i.isChecked } : i))
  }

  // Computed values
  const todaySession = recentSessions.find((s) => s.date === today && s.ended_at)
  const workoutProgress = activeSession ? 0.5 : todaySession ? 1 : 0
  const calProgress = macroGoals.calorieGoal > 0 ? totalCalories / macroGoals.calorieGoal : 0
  const waterProgress = waterGoalMl > 0 ? waterMl / waterGoalMl : 0

  // Weight delta from 7-day history (sorted desc: [0]=most recent, [1]=second most recent)
  const weightDelta = weightHistory.length >= 2
    ? weightHistory[0].weightKg - weightHistory[1].weightKg
    : null
  const sparklineData = [...weightHistory].reverse().map((e) => e.weightKg)

  // Last 7 days for weekly strip
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return d.toISOString().slice(0, 10)
  })

  const dateLabel = new Date().toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric' })
  const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const budgetMonthLabel = `${MONTH_NAMES[viewMonth - 1]} ${viewYear}`

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
            <Text style={{ color: colors.textMuted, fontSize: fontSize.label }}>{greeting}</Text>
            <Text style={{ color: colors.text, fontSize: fontSize.sectionHeader, fontWeight: '700' }}>
              {profile?.name ?? 'Welcome'}
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: fontSize.micro, marginTop: 2 }}>{dateLabel}</Text>
          </View>
          <Pressable
            onPress={() => router.push('/settings')}
            style={({ pressed }) => ({
              width: 40, height: 40, borderRadius: 20,
              backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
              alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.7 : 1,
            })}
          >
            <Ionicons name="person-outline" size={18} color={colors.text} />
          </Pressable>
        </View>

        {/* Day Score */}
        <DayScoreCard
          calProgress={calProgress}
          workoutProgress={workoutProgress}
          waterProgress={waterProgress}
        />

        {/* Calories + Water */}
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <CaloriesCard
            totalCalories={totalCalories}
            goal={macroGoals.calorieGoal}
            proteinG={totalProteinG}
            carbsG={totalCarbsG}
            fatG={totalFatG}
            onPress={() => router.push('/health/diet')}
          />
          <WaterCard
            waterMl={waterMl}
            goalMl={waterGoalMl}
            onAdd={(ml) => addWater(ml)}
            onPress={() => router.push('/health/water')}
          />
        </View>

        {/* Workout */}
        <WorkoutCard
          activeSession={activeSession}
          todaySession={todaySession}
          onPress={() => router.push(activeSession ? '/health/workout-active' : '/health/workout')}
          onStart={() => router.push(activeSession ? '/health/workout-active' : '/health/workout-start')}
        />

        {/* Body Weight */}
        <WeightCard
          weightKg={todayEntry?.weightKg}
          delta={weightDelta}
          sparklineData={sparklineData}
          onPress={() => router.push('/health/body-weight')}
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
        />

        {/* Budget card */}
        <BudgetCard
          spent={totalSpending}
          income={totalIncome}
          month={budgetMonthLabel}
          onPress={() => router.push('/(tabs)/budget' as never)}
        />

        {/* Organizer card */}
        <OrganizerCard onPress={() => router.push('/(tabs)/organizer' as never)} />

      </ScrollView>
    </SafeAreaView>
  )
}
