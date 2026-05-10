import { useState, useEffect } from 'react'
import {
  View, Text, ScrollView, Pressable, TextInput, Alert, Dimensions,
  KeyboardAvoidingView, Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import Svg, { Circle } from 'react-native-svg'
import { colors, fontSize, spacing, radius } from '@core/theme'
import { BottomSheet, SwipeableRow } from '@core/components'
import { useStepsStore } from '@modules/health/steps/stepsStore'
import { useUserStore } from '@core/store/userStore'
import {
  estimateCalories, formatSteps, formatDistance, defaultGoal,
  ACTIVITY_LABELS, INCLINE_LABELS,
} from '@modules/health/steps/stepsUtils'
import { localDateStr } from '@core/utils/units'
import type { ActivityType, InclineLevel } from '@modules/health/shared/types'
import GorhomBottomSheet from '@gorhom/bottom-sheet'
const BottomSheetTextInput = TextInput
import { useRef } from 'react'

const { width: SCREEN_W } = Dimensions.get('window')
const QUICK_STEPS = [500, 1000, 2000, 3000, 5000, 10000]
const GOAL_PRESETS = [5000, 7500, 10000, 12000]
const RING_SIZE = 200
const STROKE = 16
const R = (RING_SIZE - STROKE) / 2
const CIRC = 2 * Math.PI * R

const ACTIVITY_TYPES: ActivityType[] = ['walk', 'hike', 'jog', 'run']
const INCLINE_LEVELS: InclineLevel[] = [0, 1, 2, 3]

export default function StepsScreen() {
  const router = useRouter()
  const { profile } = useUserStore()
  const {
    todayEntry, todaySessions, history,
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

  // Session sheet state
  const sessionSheetRef = useRef<GorhomBottomSheet>(null)
  const [sessionType, setSessionType] = useState<ActivityType>('walk')
  const [sessionSteps, setSessionSteps] = useState('')
  const [sessionDuration, setSessionDuration] = useState('')
  const [sessionIncline, setSessionIncline] = useState<InclineLevel>(0)

  useEffect(() => {
    loadToday(today, dob)
    loadSessions(today)
    loadHistory()
    syncPedometer(today, dob)
  }, [])

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

  function handleSaveGoal() {
    const g = parseInt(goalInput)
    if (!g || g < 1000 || g > 100000) { Alert.alert('Enter a goal between 1,000 and 100,000'); return }
    setGoal(today, g, dob)
    setGoalExpanded(false)
  }

  function handleCustomAdd() {
    const n = parseInt(customAmount)
    if (!n || n <= 0) { Alert.alert('Enter a valid step count'); return }
    addSteps(today, n, dob)
    setCustomAmount('')
  }

  function handleReset() {
    Alert.alert('Reset today\'s steps', 'Set step count back to 0?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', style: 'destructive', onPress: () => addSteps(today, -stepCount, dob) },
    ])
  }

  function handleAddSession() {
    const steps = parseInt(sessionSteps)
    if (!steps || steps <= 0) { Alert.alert('Enter a valid step count'); return }
    const duration = sessionDuration ? parseFloat(sessionDuration) : null
    addSession(today, { activityType: sessionType, stepCount: steps, durationMinutes: duration, incline: sessionIncline })
    // Also add to daily total
    addSteps(today, steps, dob)
    setSessionSteps('')
    setSessionDuration('')
    setSessionIncline(0)
    setSessionType('walk')
    sessionSheetRef.current?.close()
  }

  function handleDeleteSession(id: string) {
    Alert.alert('Delete Session', 'Remove this activity session?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteSession(id, today) },
    ])
  }

  // Last 7 days for bar chart
  const last7 = [...history].reverse().slice(-7)
  const maxSteps = Math.max(...last7.map(e => e.stepCount), 1)

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>

        {/* Header */}
        <View style={{
          flexDirection: 'row', alignItems: 'center',
          paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
        }}>
          <Pressable onPress={() => router.back()} hitSlop={8} style={{ marginRight: spacing.sm }}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </Pressable>
          <Text style={{ color: colors.text, fontSize: fontSize.sectionHeader, fontWeight: '700', flex: 1 }}>
            Steps
          </Text>
          <Pressable onPress={() => setGoalExpanded(e => !e)} hitSlop={8}>
            <Ionicons name="settings-outline" size={20} color={goalExpanded ? colors.steps : colors.textMuted} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={{ padding: spacing.md, gap: spacing.md, paddingBottom: 48 }}>

          {/* Goal editor */}
          {goalExpanded && (
            <View style={{
              backgroundColor: colors.surface, borderRadius: radius.lg,
              borderWidth: 1, borderColor: colors.border, padding: spacing.md, gap: spacing.md,
            }}>
              <Text style={{ color: colors.text, fontSize: fontSize.sectionHeader, fontWeight: '700' }}>
                Daily Step Goal
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: fontSize.body }}>
                Recommended: 7,500–10,000 steps per day
              </Text>
              <View style={{
                flexDirection: 'row', alignItems: 'center',
                backgroundColor: colors.surface2, borderRadius: radius.md,
                paddingHorizontal: spacing.md,
              }}>
                <TextInput
                  value={goalInput}
                  onChangeText={setGoalInput}
                  keyboardType="number-pad"
                  style={{ flex: 1, color: colors.text, fontSize: 22, fontWeight: '700', paddingVertical: spacing.md }}
                />
                <Text style={{ color: colors.textMuted, fontSize: fontSize.body }}>steps</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                {GOAL_PRESETS.map(g => (
                  <Pressable
                    key={g}
                    onPress={() => setGoalInput(String(g))}
                    style={{
                      flex: 1, paddingVertical: spacing.sm, alignItems: 'center',
                      borderRadius: radius.md,
                      backgroundColor: goalInput === String(g) ? colors.steps : colors.surface2,
                    }}
                  >
                    <Text style={{
                      color: goalInput === String(g) ? '#000' : colors.textMuted,
                      fontSize: fontSize.label, fontWeight: '600',
                    }}>
                      {(g / 1000).toFixed(g % 1000 === 0 ? 0 : 1)}k
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Pressable
                onPress={handleSaveGoal}
                style={({ pressed }) => ({
                  backgroundColor: colors.steps, borderRadius: radius.md,
                  paddingVertical: spacing.md, alignItems: 'center', opacity: pressed ? 0.8 : 1,
                })}
              >
                <Text style={{ color: '#000', fontSize: fontSize.body, fontWeight: '700' }}>Save Goal</Text>
              </Pressable>
            </View>
          )}

          {/* Ring */}
          <View style={{ alignItems: 'center', paddingVertical: spacing.md }}>
            <View style={{ width: RING_SIZE, height: RING_SIZE, alignItems: 'center', justifyContent: 'center' }}>
              <Svg width={RING_SIZE} height={RING_SIZE} style={{ position: 'absolute' }}>
                <Circle cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={R}
                  stroke={colors.surface2} strokeWidth={STROKE} fill="none" />
                <Circle cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={R}
                  stroke={ringColor} strokeWidth={STROKE} fill="none"
                  strokeDasharray={`${CIRC}`} strokeDashoffset={offset}
                  strokeLinecap="round" rotation="-90"
                  origin={`${RING_SIZE / 2},${RING_SIZE / 2}`} />
              </Svg>
              <Text style={{ color: colors.text, fontSize: 32, fontWeight: '700' }}>
                {formatSteps(stepCount)}
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: fontSize.label }}>
                of {formatSteps(goal)}
              </Text>
              <Text style={{ color: ringColor, fontSize: fontSize.body, fontWeight: '600', marginTop: 4 }}>
                {pct}%
              </Text>
            </View>

            {/* Stat pills */}
            <View style={{ flexDirection: 'row', gap: spacing.xl, marginTop: spacing.md }}>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ color: colors.text, fontSize: fontSize.cardTitle, fontWeight: '700' }}>
                  {formatSteps(stepCount)}
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: fontSize.micro }}>steps</Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ color: colors.text, fontSize: fontSize.cardTitle, fontWeight: '700' }}>
                  {formatDistance(stepCount, heightCm)}
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: fontSize.micro }}>distance</Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ color: colors.steps, fontSize: fontSize.cardTitle, fontWeight: '700' }}>
                  {calLow === calHigh ? calLow : `${calLow}–${calHigh}`}
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: fontSize.micro }}>kcal</Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ color: colors.textMuted, fontSize: fontSize.cardTitle, fontWeight: '700' }}>
                  {formatSteps(remaining)}
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: fontSize.micro }}>remaining</Text>
              </View>
            </View>
          </View>

          {/* Quick add */}
          <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md }}>
            <Text style={{ color: colors.text, fontSize: fontSize.body, fontWeight: '600', marginBottom: spacing.sm }}>
              Quick Add
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              {QUICK_STEPS.map(n => (
                <Pressable
                  key={n}
                  onPress={() => addSteps(today, n, dob)}
                  style={({ pressed }) => ({
                    backgroundColor: pressed ? colors.steps : `${colors.steps}22`,
                    borderRadius: radius.md,
                    paddingVertical: spacing.sm,
                    paddingHorizontal: spacing.md,
                    minWidth: (SCREEN_W - spacing.md * 4 - spacing.sm * 2) / 3 - 1,
                    alignItems: 'center',
                  })}
                >
                  {({ pressed }) => (
                    <Text style={{ color: pressed ? '#000' : colors.steps, fontSize: fontSize.body, fontWeight: '600' }}>
                      +{n >= 1000 ? `${n / 1000}k` : n}
                    </Text>
                  )}
                </Pressable>
              ))}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm }}>
              <View style={{
                flex: 1, flexDirection: 'row', alignItems: 'center',
                backgroundColor: colors.surface2, borderRadius: radius.md,
                paddingHorizontal: spacing.sm,
              }}>
                <TextInput
                  value={customAmount}
                  onChangeText={setCustomAmount}
                  placeholder="Custom steps"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="number-pad"
                  style={{ flex: 1, color: colors.text, fontSize: fontSize.body, paddingVertical: spacing.sm }}
                />
              </View>
              <Pressable
                onPress={handleCustomAdd}
                style={({ pressed }) => ({
                  backgroundColor: colors.steps, borderRadius: radius.md,
                  paddingVertical: spacing.sm, paddingHorizontal: spacing.md, opacity: pressed ? 0.8 : 1,
                })}
              >
                <Text style={{ color: '#000', fontSize: fontSize.body, fontWeight: '700' }}>Add</Text>
              </Pressable>
            </View>
          </View>

          {/* Activity Sessions */}
          <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, gap: spacing.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ color: colors.text, fontSize: fontSize.body, fontWeight: '600', flex: 1 }}>
                Activity Sessions
              </Text>
              <Pressable
                onPress={() => sessionSheetRef.current?.expand()}
                style={({ pressed }) => ({
                  flexDirection: 'row', alignItems: 'center', gap: 4,
                  backgroundColor: `${colors.steps}22`, borderRadius: radius.full,
                  paddingHorizontal: spacing.sm, paddingVertical: 4,
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <Ionicons name="add" size={14} color={colors.steps} />
                <Text style={{ color: colors.steps, fontSize: fontSize.micro, fontWeight: '700' }}>Add Session</Text>
              </Pressable>
            </View>

            {todaySessions.length === 0 ? (
              <Text style={{ color: colors.textMuted, fontSize: fontSize.label, textAlign: 'center', paddingVertical: spacing.sm }}>
                Log a session to get a more accurate calorie estimate
              </Text>
            ) : (
              todaySessions.map(s => {
                const { low: sLow, high: sHigh } = estimateCalories(s.stepCount, weightKg, heightCm, [s])
                return (
                  <SwipeableRow
                    key={s.id}
                    rightActions={[{ label: 'Delete', icon: 'trash-outline', color: colors.danger, onPress: () => handleDeleteSession(s.id) }]}
                  >
                    <View style={{
                      backgroundColor: colors.surface2, borderRadius: radius.md,
                      padding: spacing.sm, gap: 4,
                    }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                        <View style={{
                          backgroundColor: `${colors.steps}22`, borderRadius: radius.full,
                          paddingHorizontal: 8, paddingVertical: 2,
                        }}>
                          <Text style={{ color: colors.steps, fontSize: fontSize.micro, fontWeight: '700' }}>
                            {ACTIVITY_LABELS[s.activityType].toUpperCase()}
                          </Text>
                        </View>
                        {s.incline > 0 && (
                          <Text style={{ color: colors.textMuted, fontSize: fontSize.micro }}>
                            {INCLINE_LABELS[s.incline]}
                          </Text>
                        )}
                        <Text style={{ color: colors.textMuted, fontSize: fontSize.micro, flex: 1, textAlign: 'right' }}>
                          {sLow === sHigh ? sLow : `${sLow}–${sHigh}`} kcal
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', gap: spacing.md }}>
                        <Text style={{ color: colors.text, fontSize: fontSize.label, fontWeight: '600' }}>
                          {formatSteps(s.stepCount)} steps
                        </Text>
                        {s.durationMinutes != null && (
                          <Text style={{ color: colors.textMuted, fontSize: fontSize.label }}>
                            {Math.round(s.durationMinutes)} min
                          </Text>
                        )}
                        <Text style={{ color: colors.textMuted, fontSize: fontSize.label }}>
                          {formatDistance(s.stepCount, heightCm)}
                        </Text>
                      </View>
                    </View>
                  </SwipeableRow>
                )
              })
            )}
          </View>

          {/* 7-day history bar chart */}
          {last7.length > 0 && (
            <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md }}>
              <Text style={{ color: colors.text, fontSize: fontSize.body, fontWeight: '600', marginBottom: spacing.md }}>
                Last 7 Days
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 64 }}>
                {last7.map(e => {
                  const barH = Math.max(4, (e.stepCount / maxSteps) * 60)
                  const isToday = e.date === today
                  return (
                    <View key={e.date} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
                      <View style={{
                        width: '100%', height: barH, borderRadius: 4,
                        backgroundColor: isToday ? colors.steps : `${colors.steps}55`,
                      }} />
                      <Text style={{ color: colors.textMuted, fontSize: 9 }}>
                        {e.date.slice(5).replace('-', '/')}
                      </Text>
                    </View>
                  )
                })}
              </View>
            </View>
          )}

          {/* Remove */}
          {stepCount > 0 && (
            <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md }}>
              <Text style={{ color: colors.text, fontSize: fontSize.body, fontWeight: '600', marginBottom: spacing.sm }}>
                Remove
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                {QUICK_STEPS.map(n => (
                  <Pressable
                    key={n}
                    onPress={() => addSteps(today, -n, dob)}
                    disabled={stepCount <= 0}
                    style={({ pressed }) => ({
                      backgroundColor: pressed ? colors.danger : `${colors.danger}22`,
                      borderRadius: radius.md,
                      paddingVertical: spacing.sm, paddingHorizontal: spacing.md,
                      minWidth: (SCREEN_W - spacing.md * 4 - spacing.sm * 2) / 3 - 1,
                      alignItems: 'center', opacity: stepCount <= 0 ? 0.4 : 1,
                    })}
                  >
                    {({ pressed }) => (
                      <Text style={{ color: pressed ? '#fff' : colors.danger, fontSize: fontSize.body, fontWeight: '600' }}>
                        -{n >= 1000 ? `${n / 1000}k` : n}
                      </Text>
                    )}
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {/* Reset */}
          {stepCount > 0 && (
            <Pressable onPress={handleReset} style={{ alignItems: 'center', paddingVertical: spacing.sm }}>
              <Text style={{ color: colors.textMuted, fontSize: fontSize.label }}>Reset today's steps</Text>
            </Pressable>
          )}

        </ScrollView>
      </KeyboardAvoidingView>

      {/* Add session bottom sheet */}
      <BottomSheet ref={sessionSheetRef} snapPoints={['65%']}>
        <View style={{ padding: spacing.lg, gap: spacing.md }}>
          <Text style={{ color: colors.text, fontSize: fontSize.sectionHeader, fontWeight: '600' }}>
            Log Activity Session
          </Text>

          {/* Activity type */}
          <View>
            <Text style={{ color: colors.textMuted, fontSize: fontSize.label, marginBottom: spacing.xs }}>Activity type</Text>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              {ACTIVITY_TYPES.map(t => (
                <Pressable
                  key={t}
                  onPress={() => setSessionType(t)}
                  style={{
                    flex: 1, paddingVertical: spacing.sm, alignItems: 'center',
                    borderRadius: radius.md,
                    backgroundColor: sessionType === t ? colors.steps : colors.surface2,
                  }}
                >
                  <Text style={{
                    color: sessionType === t ? '#000' : colors.textMuted,
                    fontSize: fontSize.label, fontWeight: '600',
                  }}>
                    {ACTIVITY_LABELS[t]}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Steps */}
          <View>
            <Text style={{ color: colors.textMuted, fontSize: fontSize.label, marginBottom: spacing.xs }}>Steps</Text>
            <View style={{
              flexDirection: 'row', alignItems: 'center',
              backgroundColor: colors.surface2, borderRadius: radius.md, paddingHorizontal: spacing.md,
            }}>
              <BottomSheetTextInput
                value={sessionSteps}
                onChangeText={setSessionSteps}
                placeholder="e.g. 3000"
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
                style={{ flex: 1, color: colors.text, fontSize: fontSize.body, paddingVertical: spacing.sm }}
                selectionColor={colors.steps}
              />
            </View>
          </View>

          {/* Duration */}
          <View>
            <Text style={{ color: colors.textMuted, fontSize: fontSize.label, marginBottom: spacing.xs }}>Duration (min) — optional</Text>
            <View style={{
              flexDirection: 'row', alignItems: 'center',
              backgroundColor: colors.surface2, borderRadius: radius.md, paddingHorizontal: spacing.md,
            }}>
              <BottomSheetTextInput
                value={sessionDuration}
                onChangeText={setSessionDuration}
                placeholder="e.g. 30"
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
                style={{ flex: 1, color: colors.text, fontSize: fontSize.body, paddingVertical: spacing.sm }}
                selectionColor={colors.steps}
              />
              <Text style={{ color: colors.textMuted, fontSize: fontSize.label }}>min</Text>
            </View>
          </View>

          {/* Incline */}
          <View>
            <Text style={{ color: colors.textMuted, fontSize: fontSize.label, marginBottom: spacing.xs }}>Incline</Text>
            <View style={{ gap: spacing.xs }}>
              {INCLINE_LEVELS.map(level => (
                <Pressable
                  key={level}
                  onPress={() => setSessionIncline(level)}
                  style={{
                    flexDirection: 'row', alignItems: 'center',
                    paddingVertical: spacing.sm, paddingHorizontal: spacing.md,
                    borderRadius: radius.md,
                    backgroundColor: sessionIncline === level ? `${colors.steps}22` : colors.surface2,
                    borderWidth: 1,
                    borderColor: sessionIncline === level ? `${colors.steps}66` : 'transparent',
                  }}
                >
                  <View style={{
                    width: 18, height: 18, borderRadius: 9, borderWidth: 2,
                    borderColor: sessionIncline === level ? colors.steps : colors.textMuted,
                    alignItems: 'center', justifyContent: 'center', marginRight: spacing.sm,
                  }}>
                    {sessionIncline === level && (
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.steps }} />
                    )}
                  </View>
                  <Text style={{ color: sessionIncline === level ? colors.steps : colors.textMuted, fontSize: fontSize.label }}>
                    {INCLINE_LABELS[level]}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <Pressable
            onPress={handleAddSession}
            disabled={!sessionSteps.trim()}
            style={({ pressed }) => ({
              backgroundColor: sessionSteps.trim() ? colors.steps : colors.surface2,
              borderRadius: radius.md, paddingVertical: spacing.sm + 2,
              alignItems: 'center', opacity: pressed ? 0.8 : 1,
            })}
          >
            <Text style={{ color: sessionSteps.trim() ? '#000' : colors.textMuted, fontSize: fontSize.body, fontWeight: '700' }}>
              Log Session
            </Text>
          </Pressable>
        </View>
      </BottomSheet>
    </SafeAreaView>
  )
}
