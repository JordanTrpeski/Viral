import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  View, Text, ScrollView, Pressable, StyleSheet, StatusBar,
  TextInput, Alert, Modal, KeyboardAvoidingView, Platform,
} from 'react-native'
import { useFocusEffect, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import Svg, { Circle } from 'react-native-svg'
import { useStepsStore } from '@modules/health/steps/stepsStore'
import { useUserStore } from '@core/store/userStore'
import {
  estimateCalories, formatSteps, formatDistance, defaultGoal,
  ACTIVITY_LABELS, INCLINE_LABELS,
} from '@modules/health/steps/stepsUtils'
import { dbGetStepsStreak } from '@core/db/stepsQueries'
import { localDateStr } from '@core/utils/units'
import { colors, fonts, fontSize, spacing, radius } from '@core/theme'
import type { ActivityType, InclineLevel } from '@modules/health/shared/types'

// ─── Constants ────────────────────────────────────────────────────────────────

const QUICK_STEPS = [500, 1000, 2000, 3000, 5000, 10000]
const GOAL_PRESETS = [5000, 7500, 10000, 12000]
const RING_SIZE = 200
const STROKE = 16
const R = (RING_SIZE - STROKE) / 2
const CIRC = 2 * Math.PI * R
const ACTIVITY_TYPES: ActivityType[] = ['walk', 'hike', 'jog', 'run']
const INCLINE_LEVELS: InclineLevel[] = [0, 1, 2, 3]

// ─── Log Session Modal ────────────────────────────────────────────────────────

function LogSessionModal({
  onConfirm,
  onClose,
}: {
  onConfirm: (type: ActivityType, steps: number, duration: number | null, incline: InclineLevel) => void
  onClose: () => void
}) {
  const [sessionType, setSessionType] = useState<ActivityType>('walk')
  const [sessionSteps, setSessionSteps] = useState('')
  const [sessionDuration, setSessionDuration] = useState('')
  const [sessionIncline, setSessionIncline] = useState<InclineLevel>(0)

  const handleConfirm = () => {
    const steps = parseInt(sessionSteps)
    if (!steps || steps <= 0) { Alert.alert('Enter a valid step count'); return }
    const duration = sessionDuration.trim() ? parseFloat(sessionDuration) : null
    onConfirm(sessionType, steps, duration, sessionIncline)
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.modalOverlay}
    >
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      <View style={styles.modalSheet}>
        <View style={styles.sheetHandle} />
        <Text style={styles.modalTitle}>Log Activity Session</Text>

        {/* Activity type */}
        <Text style={styles.modalLabel}>Activity type</Text>
        <View style={styles.typeRow}>
          {ACTIVITY_TYPES.map((t) => (
            <Pressable
              key={t}
              style={[styles.typeChip, sessionType === t && styles.typeChipActive]}
              onPress={() => setSessionType(t)}
            >
              <Text style={[styles.typeChipText, sessionType === t && styles.typeChipTextActive]}>
                {ACTIVITY_LABELS[t]}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Steps */}
        <Text style={styles.modalLabel}>Steps</Text>
        <TextInput
          style={styles.modalInput}
          value={sessionSteps}
          onChangeText={setSessionSteps}
          placeholder="e.g. 3000"
          placeholderTextColor={colors.textMuted}
          keyboardType="number-pad"
          autoFocus
        />

        {/* Duration */}
        <Text style={styles.modalLabel}>Duration (min) — optional</Text>
        <View style={styles.durationRow}>
          <TextInput
            style={[styles.modalInput, { flex: 1 }]}
            value={sessionDuration}
            onChangeText={setSessionDuration}
            placeholder="e.g. 30"
            placeholderTextColor={colors.textMuted}
            keyboardType="decimal-pad"
          />
          <Text style={styles.durationUnit}>min</Text>
        </View>

        {/* Incline */}
        <Text style={styles.modalLabel}>Incline</Text>
        <View style={styles.inclineList}>
          {INCLINE_LEVELS.map((level) => (
            <Pressable
              key={level}
              style={[styles.inclineRow, sessionIncline === level && styles.inclineRowActive]}
              onPress={() => setSessionIncline(level)}
            >
              <View style={[styles.radio, sessionIncline === level && styles.radioActive]}>
                {sessionIncline === level && <View style={styles.radioDot} />}
              </View>
              <Text style={[styles.inclineText, sessionIncline === level && { color: colors.steps }]}>
                {INCLINE_LABELS[level]}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.modalActions}>
          <Pressable style={styles.modalCancel} onPress={onClose}>
            <Text style={styles.modalCancelText}>Cancel</Text>
          </Pressable>
          <Pressable
            style={[styles.modalConfirm, !sessionSteps.trim() && styles.modalConfirmDisabled]}
            onPress={handleConfirm}
            disabled={!sessionSteps.trim()}
          >
            <Text style={styles.modalConfirmText}>Log Session</Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  )
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function StepsScreen() {
  const router = useRouter()
  const { profile } = useUserStore()
  const {
    todayEntry, todaySessions, history, pedometerStatus,
    loadToday, loadSessions, loadHistory,
    addSteps, setGoal, addSession, deleteSession, syncPedometer,
  } = useStepsStore()

  const today = localDateStr()
  const dob = profile?.dateOfBirth ?? '1990-01-01'
  const weightKg = profile?.weightKg ?? 75
  const heightCm = profile?.heightCm ?? 175

  const [goalExpanded, setGoalExpanded] = useState(false)
  const [goalInput, setGoalInput] = useState(String(todayEntry?.goal ?? defaultGoal(dob)))
  const [customAmount, setCustomAmount] = useState('')
  const [streak, setStreak] = useState(0)
  const [showSessionModal, setShowSessionModal] = useState(false)

  useFocusEffect(useCallback(() => {
    loadToday(today, dob)
    loadSessions(today)
    loadHistory()
    syncPedometer(today, dob)
    setStreak(dbGetStepsStreak())
  }, [today, dob]))

  useEffect(() => {
    if (todayEntry) setGoalInput(String(todayEntry.goal))
  }, [todayEntry?.goal])

  const stepCount = todayEntry?.stepCount ?? 0
  const goal = todayEntry?.goal ?? defaultGoal(dob)
  const progress = goal > 0 ? Math.min(1, stepCount / goal) : 0
  const offset = CIRC * (1 - progress)
  const pct = Math.round(progress * 100)
  const remaining = Math.max(0, goal - stepCount)
  const ringColor = progress >= 1 ? colors.success : progress >= 0.5 ? colors.steps : colors.primary
  const { low: calLow, high: calHigh } = estimateCalories(stepCount, weightKg, heightCm, todaySessions)

  const last7 = history.slice().reverse().slice(-7)
  const maxSteps = Math.max(...last7.map((e) => e.stepCount), goal, 1)

  const handleSaveGoal = () => {
    const g = parseInt(goalInput)
    if (!g || g < 1000 || g > 100000) {
      Alert.alert('Enter a goal between 1,000 and 100,000')
      return
    }
    setGoal(today, g, dob)
    setGoalExpanded(false)
  }

  const handleCustomAdd = () => {
    const n = parseInt(customAmount)
    if (!n || n <= 0) { Alert.alert('Enter a valid step count'); return }
    addSteps(today, n, dob)
    setCustomAmount('')
  }

  const handleReset = () => {
    Alert.alert('Reset today\'s steps', 'Set step count back to 0?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', style: 'destructive', onPress: () => addSteps(today, -stepCount, dob) },
    ])
  }

  const handleAddSession = (
    type: ActivityType, steps: number, duration: number | null, incline: InclineLevel,
  ) => {
    addSession(today, { activityType: type, stepCount: steps, durationMinutes: duration, incline })
    addSteps(today, steps, dob)
    setShowSessionModal(false)
  }

  const handleDeleteSession = (id: string) => {
    Alert.alert('Delete session', 'Remove this activity session?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteSession(id, today) },
    ])
  }

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flex: 1 }}>
          <Ionicons name="footsteps-outline" size={18} color={colors.steps} />
          <Text style={styles.headerTitle}>Steps</Text>
        </View>
        <Pressable onPress={() => setGoalExpanded((e) => !e)} style={styles.headerIconBtn}>
          <Ionicons name="settings-outline" size={22} color={goalExpanded ? colors.steps : colors.textMuted} />
        </Pressable>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          {/* Goal editor */}
          {goalExpanded && (
            <View style={styles.goalCard}>
              <Text style={styles.goalCardTitle}>Daily Step Goal</Text>
              <Text style={styles.goalCardSub}>
                Recommended for your age: {formatSteps(defaultGoal(dob))} steps/day
              </Text>
              <View style={styles.goalPresets}>
                {GOAL_PRESETS.map((g) => (
                  <Pressable
                    key={g}
                    style={[styles.presetChip, goalInput === String(g) && styles.presetChipActive]}
                    onPress={() => setGoalInput(String(g))}
                  >
                    <Text style={[styles.presetText, goalInput === String(g) && styles.presetTextActive]}>
                      {g >= 1000 ? `${(g / 1000).toFixed(g % 1000 === 0 ? 0 : 1)}k` : g}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <View style={styles.goalInputRow}>
                <TextInput
                  style={styles.goalInput}
                  value={goalInput}
                  onChangeText={setGoalInput}
                  keyboardType="number-pad"
                  selectTextOnFocus
                />
                <Text style={styles.goalUnit}>steps</Text>
              </View>
              <Pressable style={styles.goalSaveBtn} onPress={handleSaveGoal}>
                <Text style={styles.goalSaveBtnText}>Save Goal</Text>
              </Pressable>
            </View>
          )}

          {/* Pedometer denied banner */}
          {pedometerStatus === 'denied' && (
            <View style={styles.pedometerBanner}>
              <Ionicons name="footsteps-outline" size={18} color={colors.warning} />
              <View style={{ flex: 1 }}>
                <Text style={styles.pedometerTitle}>Automatic tracking is off</Text>
                <Text style={styles.pedometerBody}>
                  Step counter permission was denied. Log steps manually or enable access in Settings → Privacy → Motion & Fitness.
                </Text>
              </View>
            </View>
          )}

          {/* Ring */}
          <View style={styles.ringContainer}>
            <View style={styles.ringWrapper}>
              <Svg width={RING_SIZE} height={RING_SIZE} style={StyleSheet.absoluteFill}>
                <Circle
                  cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={R}
                  stroke={colors.surface2} strokeWidth={STROKE} fill="none"
                />
                <Circle
                  cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={R}
                  stroke={ringColor} strokeWidth={STROKE} fill="none"
                  strokeDasharray={`${CIRC}`} strokeDashoffset={offset}
                  strokeLinecap="round" rotation="-90"
                  origin={`${RING_SIZE / 2},${RING_SIZE / 2}`}
                />
              </Svg>
              <View style={styles.ringCenter}>
                <Text style={[styles.ringSteps, { color: ringColor }]}>{formatSteps(stepCount)}</Text>
                <Text style={styles.ringGoal}>of {formatSteps(goal)}</Text>
                <Text style={[styles.ringPct, { color: ringColor }]}>{pct}%</Text>
              </View>
            </View>

            {/* Stat pills */}
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statVal}>{formatSteps(stepCount)}</Text>
                <Text style={styles.statKey}>steps</Text>
              </View>
              <View style={styles.statSep} />
              <View style={styles.statItem}>
                <Text style={styles.statVal}>{formatDistance(stepCount, heightCm)}</Text>
                <Text style={styles.statKey}>distance</Text>
              </View>
              <View style={styles.statSep} />
              <View style={styles.statItem}>
                <Text style={[styles.statVal, { color: colors.steps }]}>
                  {calLow === calHigh ? calLow : `${calLow}–${calHigh}`}
                </Text>
                <Text style={styles.statKey}>kcal</Text>
              </View>
              <View style={styles.statSep} />
              <View style={styles.statItem}>
                <Text style={styles.statVal}>{formatSteps(remaining)}</Text>
                <Text style={styles.statKey}>left</Text>
              </View>
            </View>
          </View>

          {/* Streak */}
          {streak > 0 && (
            <View style={styles.streakCard}>
              <Ionicons name="flame-outline" size={22} color={colors.steps} />
              <View style={{ flex: 1 }}>
                <Text style={styles.streakTitle}>{streak}-day streak</Text>
                <Text style={styles.streakSub}>
                  Goal met {streak} day{streak !== 1 ? 's' : ''} in a row
                </Text>
              </View>
              <View style={styles.streakBadge}>
                <Text style={styles.streakBadgeText}>{streak}🔥</Text>
              </View>
            </View>
          )}

          {/* Quick-add */}
          <View style={styles.quickCard}>
            <Text style={styles.sectionLabel}>Quick Add</Text>
            <View style={styles.quickGrid}>
              {QUICK_STEPS.map((n) => (
                <Pressable key={n} style={styles.quickBtn} onPress={() => addSteps(today, n, dob)}>
                  <Text style={styles.quickBtnText}>
                    +{n >= 1000 ? `${n / 1000}k` : n}
                  </Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.customRow}>
              <View style={styles.customInputWrap}>
                <TextInput
                  style={styles.customInput}
                  value={customAmount}
                  onChangeText={setCustomAmount}
                  placeholder="Custom steps..."
                  placeholderTextColor={colors.textMuted}
                  keyboardType="number-pad"
                />
              </View>
              <Pressable style={styles.customAddBtn} onPress={handleCustomAdd}>
                <Text style={styles.customAddBtnText}>Add</Text>
              </Pressable>
            </View>
          </View>

          {/* Activity sessions */}
          <View style={styles.sessionsCard}>
            <View style={styles.sessionsHeader}>
              <Text style={styles.sectionLabel}>Activity Sessions</Text>
              <Pressable style={styles.addSessionBtn} onPress={() => setShowSessionModal(true)}>
                <Ionicons name="add" size={14} color={colors.steps} />
                <Text style={styles.addSessionText}>Add Session</Text>
              </Pressable>
            </View>

            {todaySessions.length === 0 ? (
              <Text style={styles.sessionsEmpty}>
                Log a session for a more accurate calorie estimate.
              </Text>
            ) : (
              todaySessions.map((s) => {
                const { low: sLow, high: sHigh } = estimateCalories(s.stepCount, weightKg, heightCm, [s])
                return (
                  <View key={s.id} style={styles.sessionRow}>
                    <View style={styles.sessionInfo}>
                      <View style={styles.sessionBadgeRow}>
                        <View style={styles.sessionTypeBadge}>
                          <Text style={styles.sessionTypeText}>{ACTIVITY_LABELS[s.activityType].toUpperCase()}</Text>
                        </View>
                        {s.incline > 0 && (
                          <Text style={styles.sessionIncline}>{INCLINE_LABELS[s.incline]}</Text>
                        )}
                      </View>
                      <View style={styles.sessionStats}>
                        <Text style={styles.sessionStepCount}>{formatSteps(s.stepCount)} steps</Text>
                        {s.durationMinutes != null && (
                          <Text style={styles.sessionStat}>{Math.round(s.durationMinutes)} min</Text>
                        )}
                        <Text style={styles.sessionStat}>{formatDistance(s.stepCount, heightCm)}</Text>
                        <Text style={styles.sessionCal}>{sLow === sHigh ? sLow : `${sLow}–${sHigh}`} kcal</Text>
                      </View>
                    </View>
                    <Pressable onPress={() => handleDeleteSession(s.id)} style={styles.deleteBtn}>
                      <Ionicons name="trash-outline" size={16} color="#c0533a" />
                    </Pressable>
                  </View>
                )
              })
            )}
          </View>

          {/* 7-day chart */}
          {last7.length > 0 && (
            <View style={styles.chartCard}>
              <Text style={styles.sectionLabel}>Last 7 Days</Text>
              <View style={styles.chartBars}>
                {last7.map((e) => {
                  const barH = Math.max(4, (e.stepCount / maxSteps) * 80)
                  const isToday = e.date === today
                  const metGoal = e.stepCount >= (e.goal ?? goal)
                  return (
                    <View key={e.date} style={styles.chartBarCol}>
                      <View style={styles.chartBarTrack}>
                        <View style={[
                          styles.chartBarFill,
                          {
                            height: barH,
                            backgroundColor: isToday ? colors.steps
                              : metGoal ? colors.success
                              : `${colors.steps}55`,
                          },
                        ]} />
                      </View>
                      <Text style={[styles.chartBarDate, isToday && { color: colors.steps }]}>
                        {isToday ? 'T' : e.date.slice(5).replace('-', '/')}
                      </Text>
                    </View>
                  )
                })}
              </View>
            </View>
          )}

          {/* Reset */}
          {stepCount > 0 && (
            <Pressable style={styles.resetBtn} onPress={handleReset}>
              <Ionicons name="refresh-outline" size={14} color={colors.textMuted} />
              <Text style={styles.resetText}>Reset today's steps</Text>
            </Pressable>
          )}

          <View style={{ height: spacing.xxl }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Session modal */}
      <Modal
        visible={showSessionModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSessionModal(false)}
      >
        <LogSessionModal
          onConfirm={handleAddSession}
          onClose={() => setShowSessionModal(false)}
        />
      </Modal>
    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingTop: 56, paddingBottom: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backBtn: { padding: spacing.xs, marginRight: spacing.xs },
  headerTitle: {
    fontFamily: `${fonts.ui}_700Bold`, fontSize: fontSize.sectionHeader, color: colors.text,
  },
  headerIconBtn: { padding: spacing.xs },

  scroll: { paddingHorizontal: spacing.md, paddingTop: spacing.md },

  goalCard: {
    backgroundColor: colors.surface, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.md, marginBottom: spacing.md, gap: spacing.sm,
  },
  goalCardTitle: {
    fontFamily: `${fonts.ui}_600SemiBold`, fontSize: fontSize.cardTitle, color: colors.text,
  },
  goalCardSub: {
    fontFamily: `${fonts.ui}_400Regular`, fontSize: fontSize.label, color: colors.textMuted,
  },
  goalPresets: { flexDirection: 'row', gap: spacing.sm },
  presetChip: {
    flex: 1, paddingVertical: spacing.xs, borderRadius: radius.sm,
    borderWidth: 1, borderColor: colors.border, alignItems: 'center',
  },
  presetChipActive: { backgroundColor: colors.steps, borderColor: colors.steps },
  presetText: {
    fontFamily: `${fonts.mono}_500Medium`, fontSize: fontSize.label, color: colors.textMuted,
  },
  presetTextActive: { color: colors.bg, fontFamily: `${fonts.mono}_600SemiBold` },
  goalInputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface2, borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
  },
  goalInput: {
    flex: 1, padding: spacing.sm, textAlign: 'right',
    fontFamily: `${fonts.mono}_600SemiBold`, fontSize: fontSize.sectionHeader, color: colors.text,
  },
  goalUnit: {
    fontFamily: `${fonts.mono}_400Regular`, fontSize: fontSize.body, color: colors.textMuted,
    paddingLeft: spacing.xs,
  },
  goalSaveBtn: {
    backgroundColor: colors.steps, borderRadius: radius.md,
    padding: spacing.sm, alignItems: 'center',
  },
  goalSaveBtnText: {
    fontFamily: `${fonts.ui}_700Bold`, fontSize: fontSize.body, color: colors.bg,
  },

  pedometerBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm,
    backgroundColor: `${colors.warning}18`, borderRadius: radius.md,
    borderWidth: 1, borderColor: `${colors.warning}44`,
    padding: spacing.md, marginBottom: spacing.md,
  },
  pedometerTitle: {
    fontFamily: `${fonts.ui}_600SemiBold`, fontSize: fontSize.label, color: colors.warning,
    marginBottom: 2,
  },
  pedometerBody: {
    fontFamily: `${fonts.ui}_400Regular`, fontSize: fontSize.micro, color: colors.textMuted, lineHeight: 16,
  },

  ringContainer: { alignItems: 'center', paddingVertical: spacing.md },
  ringWrapper: {
    width: RING_SIZE, height: RING_SIZE,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.md,
  },
  ringCenter: { alignItems: 'center' },
  ringSteps: {
    fontFamily: `${fonts.mono}_700Bold`, fontSize: 28, color: colors.steps,
  },
  ringGoal: {
    fontFamily: `${fonts.mono}_400Regular`, fontSize: fontSize.label, color: colors.textMuted,
  },
  ringPct: {
    fontFamily: `${fonts.mono}_600SemiBold`, fontSize: fontSize.body, color: colors.steps, marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.md,
  },
  statItem: { alignItems: 'center' },
  statVal: {
    fontFamily: `${fonts.mono}_600SemiBold`, fontSize: fontSize.body, color: colors.text,
  },
  statKey: {
    fontFamily: `${fonts.ui}_400Regular`, fontSize: fontSize.micro, color: colors.textMuted,
  },
  statSep: { width: 1, height: 28, backgroundColor: colors.border },

  streakCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.surface, borderRadius: radius.md,
    borderWidth: 1, borderColor: `${colors.steps}44`,
    padding: spacing.md, marginBottom: spacing.sm,
  },
  streakTitle: {
    fontFamily: `${fonts.ui}_700Bold`, fontSize: fontSize.cardTitle, color: colors.text,
  },
  streakSub: {
    fontFamily: `${fonts.ui}_400Regular`, fontSize: fontSize.micro, color: colors.textMuted,
  },
  streakBadge: {
    backgroundColor: `${colors.steps}22`, borderRadius: radius.full,
    paddingHorizontal: spacing.sm, paddingVertical: 4,
  },
  streakBadgeText: {
    fontFamily: `${fonts.mono}_700Bold`, fontSize: fontSize.label, color: colors.steps,
  },

  sectionLabel: {
    fontFamily: `${fonts.ui}_600SemiBold`, fontSize: fontSize.label,
    color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1,
    marginBottom: spacing.sm,
  },

  quickCard: {
    backgroundColor: colors.surface, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.md, marginBottom: spacing.sm,
  },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm },
  quickBtn: {
    backgroundColor: `${colors.steps}18`, borderRadius: radius.sm,
    paddingVertical: spacing.sm, paddingHorizontal: spacing.md,
    borderWidth: 1, borderColor: `${colors.steps}33`,
    minWidth: 80, alignItems: 'center',
  },
  quickBtnText: {
    fontFamily: `${fonts.mono}_600SemiBold`, fontSize: fontSize.body, color: colors.steps,
  },
  customRow: { flexDirection: 'row', gap: spacing.sm },
  customInputWrap: {
    flex: 1, backgroundColor: colors.surface2, borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
  },
  customInput: {
    fontFamily: `${fonts.mono}_400Regular`, fontSize: fontSize.body, color: colors.text,
    paddingVertical: spacing.sm,
  },
  customAddBtn: {
    backgroundColor: colors.steps, borderRadius: radius.md,
    paddingHorizontal: spacing.lg, justifyContent: 'center',
  },
  customAddBtnText: {
    fontFamily: `${fonts.ui}_700Bold`, fontSize: fontSize.body, color: colors.bg,
  },

  sessionsCard: {
    backgroundColor: colors.surface, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.md, marginBottom: spacing.sm,
  },
  sessionsHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  addSessionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: `${colors.steps}22`, borderRadius: radius.full,
    paddingHorizontal: spacing.sm, paddingVertical: 4,
  },
  addSessionText: {
    fontFamily: `${fonts.mono}_600SemiBold`, fontSize: fontSize.micro, color: colors.steps,
  },
  sessionsEmpty: {
    fontFamily: `${fonts.ui}_400Regular`, fontSize: fontSize.label,
    color: colors.textMuted, textAlign: 'center', paddingVertical: spacing.sm,
  },
  sessionRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.surface2, borderRadius: radius.sm,
    padding: spacing.sm, marginBottom: spacing.xs,
  },
  sessionInfo: { flex: 1 },
  sessionBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: 4 },
  sessionTypeBadge: {
    backgroundColor: `${colors.steps}22`, borderRadius: radius.full,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  sessionTypeText: {
    fontFamily: `${fonts.mono}_700Bold`, fontSize: fontSize.micro, color: colors.steps,
  },
  sessionIncline: {
    fontFamily: `${fonts.ui}_400Regular`, fontSize: fontSize.micro, color: colors.textMuted,
  },
  sessionStats: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  sessionStepCount: {
    fontFamily: `${fonts.mono}_500Medium`, fontSize: fontSize.label, color: colors.text,
  },
  sessionStat: {
    fontFamily: `${fonts.mono}_400Regular`, fontSize: fontSize.label, color: colors.textMuted,
  },
  sessionCal: {
    fontFamily: `${fonts.mono}_400Regular`, fontSize: fontSize.label, color: colors.steps,
  },
  deleteBtn: { padding: spacing.xs },

  chartCard: {
    backgroundColor: colors.surface, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.md, marginBottom: spacing.sm,
  },
  chartBars: {
    flexDirection: 'row', alignItems: 'flex-end', height: 100, gap: spacing.xs,
  },
  chartBarCol: { flex: 1, alignItems: 'center', gap: 4 },
  chartBarTrack: { flex: 1, justifyContent: 'flex-end', width: '100%' },
  chartBarFill: { width: '100%', borderRadius: radius.sm, minHeight: 4 },
  chartBarDate: {
    fontFamily: `${fonts.mono}_400Regular`, fontSize: 9, color: colors.textMuted,
  },

  resetBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.xs, paddingVertical: spacing.sm,
  },
  resetText: {
    fontFamily: `${fonts.ui}_400Regular`, fontSize: fontSize.label, color: colors.textMuted,
  },

  // Modal
  modalOverlay: {
    flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalSheet: {
    backgroundColor: colors.surface, borderTopLeftRadius: radius.lg * 2,
    borderTopRightRadius: radius.lg * 2,
    padding: spacing.md, paddingBottom: spacing.xxl,
    borderTopWidth: 1, borderColor: colors.border,
  },
  sheetHandle: {
    width: 36, height: 4, backgroundColor: colors.border,
    borderRadius: radius.full, alignSelf: 'center', marginBottom: spacing.md,
  },
  modalTitle: {
    fontFamily: `${fonts.ui}_700Bold`, fontSize: fontSize.sectionHeader, color: colors.text,
    marginBottom: spacing.md,
  },
  modalLabel: {
    fontFamily: `${fonts.ui}_400Regular`, fontSize: fontSize.label, color: colors.textMuted,
    marginBottom: spacing.xs, marginTop: spacing.sm,
  },
  typeRow: { flexDirection: 'row', gap: spacing.sm },
  typeChip: {
    flex: 1, paddingVertical: spacing.xs, borderRadius: radius.sm,
    borderWidth: 1, borderColor: colors.border, alignItems: 'center',
  },
  typeChipActive: { backgroundColor: colors.steps, borderColor: colors.steps },
  typeChipText: {
    fontFamily: `${fonts.ui}_400Regular`, fontSize: fontSize.label, color: colors.textMuted,
  },
  typeChipTextActive: { color: colors.bg, fontFamily: `${fonts.ui}_600SemiBold` },
  modalInput: {
    backgroundColor: colors.surface2, borderRadius: radius.md,
    padding: spacing.sm,
    fontFamily: `${fonts.mono}_500Medium`, fontSize: fontSize.body, color: colors.text,
  },
  durationRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  durationUnit: {
    fontFamily: `${fonts.mono}_400Regular`, fontSize: fontSize.body, color: colors.textMuted,
  },
  inclineList: { gap: spacing.xs },
  inclineRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    padding: spacing.sm, borderRadius: radius.sm,
    backgroundColor: colors.surface2, borderWidth: 1, borderColor: 'transparent',
  },
  inclineRowActive: { borderColor: `${colors.steps}66`, backgroundColor: `${colors.steps}18` },
  radio: {
    width: 18, height: 18, borderRadius: 9,
    borderWidth: 2, borderColor: colors.textMuted,
    alignItems: 'center', justifyContent: 'center',
  },
  radioActive: { borderColor: colors.steps },
  radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.steps },
  inclineText: {
    fontFamily: `${fonts.ui}_400Regular`, fontSize: fontSize.label, color: colors.textMuted,
  },
  modalActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  modalCancel: {
    flex: 1, padding: spacing.md, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border, alignItems: 'center',
  },
  modalCancelText: {
    fontFamily: `${fonts.ui}_600SemiBold`, fontSize: fontSize.body, color: colors.textMuted,
  },
  modalConfirm: {
    flex: 1, padding: spacing.md, borderRadius: radius.md,
    backgroundColor: colors.steps, alignItems: 'center',
  },
  modalConfirmDisabled: { opacity: 0.4 },
  modalConfirmText: {
    fontFamily: `${fonts.ui}_700Bold`, fontSize: fontSize.body, color: colors.bg,
  },
})
