import { useEffect, useRef, useState, useCallback } from 'react'
import {
  View, Text, ScrollView, Pressable, TextInput,
  Alert, KeyboardAvoidingView, Platform, Modal,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { colors, fontSize, spacing, radius, fonts } from '@core/theme'
import { ProgressBar } from '@core/components'
import {
  useWorkoutStoreV2,
  type SessionExerciseV2,
  type ActiveSet,
} from '@modules/health/workout/workoutStoreV2'
import { calculatePlates } from '@core/utils/plateCalculator'

// ─── Duration timer ───────────────────────────────────────────────────────────

function useDurationTimer(startedAt: string | undefined): string {
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    if (!startedAt) return
    const tick = () => setElapsed(Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [startedAt])
  const m = Math.floor(elapsed / 60).toString().padStart(2, '0')
  const s = (elapsed % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

// ─── Rest timer bar ───────────────────────────────────────────────────────────

function RestTimerBar({
  endsAt, totalSeconds, onSkip, onAdd30,
}: { endsAt: number; totalSeconds: number; onSkip: () => void; onAdd30: () => void }) {
  const [left, setLeft] = useState(Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)))

  useEffect(() => {
    const id = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000))
      setLeft(remaining)
      if (remaining === 0) clearInterval(id)
    }, 500)
    return () => clearInterval(id)
  }, [endsAt])

  const progress = left / totalSeconds

  return (
    <View style={{
      position: 'absolute',
      bottom: 0, left: 0, right: 0,
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
      paddingBottom: spacing.md,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs }}>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Ionicons name="timer-outline" size={14} color={colors.warning} />
          <Text style={{
            color: colors.warning,
            fontSize: fontSize.label,
            fontWeight: '600',
            fontFamily: `${fonts.mono}_500Medium`,
          }}>
            Rest — {left}s
          </Text>
        </View>
        <Pressable
          onPress={onAdd30}
          style={{ paddingHorizontal: spacing.sm, paddingVertical: 4 }}
        >
          <Text style={{
            color: colors.textMuted,
            fontSize: fontSize.label,
            fontWeight: '600',
            fontFamily: `${fonts.ui}_600SemiBold`,
          }}>
            +30s
          </Text>
        </Pressable>
        <Pressable
          onPress={onSkip}
          style={{ paddingHorizontal: spacing.sm, paddingVertical: 4 }}
        >
          <Text style={{
            color: colors.primary,
            fontSize: fontSize.label,
            fontWeight: '600',
            fontFamily: `${fonts.ui}_600SemiBold`,
          }}>
            Skip
          </Text>
        </Pressable>
      </View>
      <ProgressBar progress={progress} color={colors.warning} height={4} />
    </View>
  )
}

// ─── Plate calculator modal ───────────────────────────────────────────────────

function PlateModal({ weight, onClose }: { weight: number; onClose: () => void }) {
  const result = calculatePlates(weight)

  return (
    <Modal
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' }}
        onPress={onClose}
      >
        <Pressable onPress={() => {}}>
          <View style={{
            backgroundColor: colors.surface,
            borderRadius: radius.lg,
            borderWidth: 1,
            borderColor: colors.border,
            padding: spacing.lg,
            width: 280,
            gap: spacing.md,
          }}>
            <Text style={{
              color: colors.text,
              fontSize: fontSize.cardTitle,
              fontWeight: '700',
              fontFamily: `${fonts.ui}_700Bold`,
            }}>
              Plates for {weight} kg
            </Text>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <View style={{
                backgroundColor: `${colors.workout}22`,
                borderRadius: radius.sm,
                paddingHorizontal: spacing.sm,
                paddingVertical: 4,
              }}>
                <Text style={{ color: colors.workout, fontSize: fontSize.label, fontFamily: `${fonts.mono}_500Medium` }}>
                  Bar: {result.barWeightKg} kg
                </Text>
              </View>
              {!result.achievable && (
                <Text style={{ color: colors.warning, fontSize: fontSize.micro, fontFamily: `${fonts.ui}_400Regular` }}>
                  ~{result.totalKg} kg
                </Text>
              )}
            </View>

            {result.platesPerSide.length === 0 ? (
              <Text style={{ color: colors.textMuted, fontSize: fontSize.body, fontFamily: `${fonts.ui}_400Regular` }}>
                Bar only
              </Text>
            ) : (
              <View style={{ gap: spacing.xs }}>
                <Text style={{
                  color: colors.textMuted,
                  fontSize: fontSize.micro,
                  textTransform: 'uppercase',
                  letterSpacing: 0.8,
                  fontFamily: `${fonts.ui}_400Regular`,
                }}>
                  Per side
                </Text>
                {result.platesPerSide.map((p) => (
                  <View key={p.weightKg} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                    <View style={{
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      backgroundColor: `${colors.primary}33`,
                      borderWidth: 2,
                      borderColor: colors.primary,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <Text style={{
                        color: colors.primary,
                        fontSize: 9,
                        fontWeight: '700',
                        fontFamily: `${fonts.mono}_700Bold`,
                      }}>
                        {p.weightKg}
                      </Text>
                    </View>
                    <Text style={{
                      color: colors.text,
                      fontSize: fontSize.body,
                      fontFamily: `${fonts.mono}_500Medium`,
                    }}>
                      × {p.count}
                    </Text>
                    <Text style={{ color: colors.textMuted, fontSize: fontSize.label, fontFamily: `${fonts.ui}_400Regular` }}>
                      ({p.weightKg * p.count * 2} kg total)
                    </Text>
                  </View>
                ))}
              </View>
            )}

            <Pressable
              onPress={onClose}
              style={{ alignSelf: 'flex-end', paddingVertical: spacing.xs, paddingHorizontal: spacing.md }}
            >
              <Text style={{ color: colors.primary, fontSize: fontSize.label, fontWeight: '600', fontFamily: `${fonts.ui}_600SemiBold` }}>
                Done
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

// ─── Set row ─────────────────────────────────────────────────────────────────

function SetRow({
  set, exerciseId, setIdx,
  onUpdate, onConfirm, onWarmupToggle, onRemove,
}: {
  set: ActiveSet
  exerciseId: string
  setIdx: number
  onUpdate: (field: 'weightInput' | 'repsInput' | 'rpeInput' | 'notes', val: string) => void
  onConfirm: () => void
  onWarmupToggle: () => void
  onRemove: () => void
}) {
  const repsRef = useRef<TextInput>(null)
  const [showOptions, setShowOptions] = useState(false)
  const [plateWeight, setPlateWeight] = useState<number | null>(null)

  const canConfirm = set.isWarmup
    ? set.weightInput.length > 0
    : set.weightInput.length > 0 && set.repsInput.length > 0

  function handleWeightLongPress() {
    const w = parseFloat(set.weightInput)
    if (w > 0) setPlateWeight(w)
  }

  if (set.confirmed) {
    return (
      <View style={{ paddingVertical: spacing.xs }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          {set.isWarmup && (
            <View style={{ width: 18 }}>
              <Text style={{ color: colors.textMuted, fontSize: 8, fontFamily: `${fonts.ui}_400Regular` }}>W</Text>
            </View>
          )}
          <Text style={{
            color: colors.textMuted,
            fontSize: fontSize.label,
            width: 20,
            textAlign: 'center',
            fontFamily: `${fonts.mono}_400Regular`,
          }}>
            {set.setNumber}
          </Text>
          <Text style={{
            color: colors.textMuted,
            fontSize: fontSize.body,
            flex: 1,
            fontFamily: `${fonts.mono}_400Regular`,
          }}>
            {set.weightInput} kg × {set.repsInput}
            {set.rpeInput ? ` @ RPE ${set.rpeInput}` : ''}
          </Text>
          <Ionicons name="checkmark-circle" size={20} color={colors.success} />
        </View>
        {set.notes ? (
          <Text style={{ color: colors.textMuted, fontSize: fontSize.micro, marginTop: 2, paddingLeft: 44, fontFamily: `${fonts.ui}_400Regular` }}>
            {set.notes}
          </Text>
        ) : null}
      </View>
    )
  }

  return (
    <View style={{ paddingVertical: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        {/* Warmup indicator */}
        <Pressable onPress={onWarmupToggle} style={{ width: 18, alignItems: 'center' }}>
          <Text style={{
            color: set.isWarmup ? colors.warning : colors.border,
            fontSize: 9,
            fontWeight: '700',
            fontFamily: `${fonts.ui}_700Bold`,
          }}>
            W
          </Text>
        </Pressable>

        {/* Set number */}
        <Text style={{
          color: colors.textMuted,
          fontSize: fontSize.label,
          width: 20,
          textAlign: 'center',
          fontFamily: `${fonts.mono}_400Regular`,
        }}>
          {set.setNumber}
        </Text>

        {/* Weight input */}
        <Pressable onLongPress={handleWeightLongPress} delayLongPress={500} style={{ flex: 1 }}>
          <TextInput
            value={set.weightInput}
            onChangeText={(v) => onUpdate('weightInput', v)}
            keyboardType="decimal-pad"
            placeholder="kg"
            placeholderTextColor={colors.textMuted}
            returnKeyType="next"
            onSubmitEditing={() => repsRef.current?.focus()}
            style={{
              backgroundColor: colors.surface2,
              borderRadius: radius.sm,
              borderWidth: 1,
              borderColor: colors.border,
              color: colors.text,
              fontSize: fontSize.body,
              fontWeight: '600',
              paddingHorizontal: spacing.sm,
              paddingVertical: 7,
              textAlign: 'center',
              fontFamily: `${fonts.mono}_500Medium`,
            }}
            selectionColor={colors.primary}
          />
        </Pressable>

        <Text style={{ color: colors.textMuted, fontSize: fontSize.label }}>×</Text>

        {/* Reps input */}
        <TextInput
          ref={repsRef}
          value={set.repsInput}
          onChangeText={(v) => onUpdate('repsInput', v)}
          keyboardType="number-pad"
          placeholder="reps"
          placeholderTextColor={colors.textMuted}
          returnKeyType="done"
          onSubmitEditing={canConfirm ? onConfirm : undefined}
          style={{
            flex: 1,
            backgroundColor: colors.surface2,
            borderRadius: radius.sm,
            borderWidth: 1,
            borderColor: colors.border,
            color: colors.text,
            fontSize: fontSize.body,
            fontWeight: '600',
            paddingHorizontal: spacing.sm,
            paddingVertical: 7,
            textAlign: 'center',
            fontFamily: `${fonts.mono}_500Medium`,
          }}
          selectionColor={colors.primary}
        />

        {/* Options toggle */}
        <Pressable
          onPress={() => setShowOptions((v) => !v)}
          style={{ padding: 4 }}
        >
          <Ionicons name="ellipsis-vertical" size={14} color={colors.textMuted} />
        </Pressable>

        {/* Confirm */}
        <Pressable
          onPress={canConfirm ? onConfirm : undefined}
          style={({ pressed }) => ({
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: canConfirm ? colors.success : colors.surface2,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Ionicons name="checkmark" size={18} color={canConfirm ? '#fff' : colors.textMuted} />
        </Pressable>
      </View>

      {/* Inline options */}
      {showOptions && (
        <View style={{
          flexDirection: 'row',
          gap: spacing.sm,
          marginTop: spacing.xs,
          paddingLeft: 38,
          alignItems: 'center',
        }}>
          <TextInput
            value={set.rpeInput}
            onChangeText={(v) => onUpdate('rpeInput', v)}
            keyboardType="decimal-pad"
            placeholder="RPE"
            placeholderTextColor={colors.textMuted}
            style={{
              backgroundColor: colors.surface2,
              borderRadius: radius.sm,
              borderWidth: 1,
              borderColor: colors.border,
              color: colors.text,
              fontSize: fontSize.micro,
              paddingHorizontal: spacing.sm,
              paddingVertical: 4,
              width: 56,
              textAlign: 'center',
              fontFamily: `${fonts.mono}_400Regular`,
            }}
            selectionColor={colors.primary}
          />
          <TextInput
            value={set.notes}
            onChangeText={(v) => onUpdate('notes', v)}
            placeholder="note…"
            placeholderTextColor={colors.textMuted}
            style={{
              flex: 1,
              backgroundColor: colors.surface2,
              borderRadius: radius.sm,
              borderWidth: 1,
              borderColor: colors.border,
              color: colors.text,
              fontSize: fontSize.micro,
              paddingHorizontal: spacing.sm,
              paddingVertical: 4,
              fontFamily: `${fonts.ui}_400Regular`,
            }}
            selectionColor={colors.primary}
          />
          <Pressable onPress={onRemove} style={{ padding: 4 }}>
            <Ionicons name="trash-outline" size={14} color={colors.danger} />
          </Pressable>
        </View>
      )}

      {/* Plate calculator modal */}
      {plateWeight !== null && (
        <PlateModal weight={plateWeight} onClose={() => setPlateWeight(null)} />
      )}
    </View>
  )
}

// ─── Exercise block ───────────────────────────────────────────────────────────

function ExerciseBlock({
  ex, isFirst, isLast,
}: { ex: SessionExerciseV2; isFirst: boolean; isLast: boolean }) {
  const { updateSetInput, confirmSet, addSet, removeSet, removeExercise, moveExercise, toggleWarmup } = useWorkoutStoreV2()
  const exId = ex.exercise.id

  return (
    <View style={{
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.md,
      marginBottom: spacing.md,
    }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
        <View style={{ flexDirection: 'column', marginRight: spacing.xs }}>
          <Pressable
            onPress={() => moveExercise(exId, 'up')}
            disabled={isFirst}
            style={{ padding: 2, opacity: isFirst ? 0.2 : 0.7 }}
          >
            <Ionicons name="chevron-up" size={14} color={colors.textMuted} />
          </Pressable>
          <Pressable
            onPress={() => moveExercise(exId, 'down')}
            disabled={isLast}
            style={{ padding: 2, opacity: isLast ? 0.2 : 0.7 }}
          >
            <Ionicons name="chevron-down" size={14} color={colors.textMuted} />
          </Pressable>
        </View>

        <View style={{ flex: 1 }}>
          <Text style={{
            color: colors.text,
            fontSize: fontSize.cardTitle,
            fontWeight: '600',
            fontFamily: `${fonts.ui}_600SemiBold`,
          }}>
            {ex.exercise.name}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 3, marginTop: 2 }}>
            {ex.exercise.primaryMuscles.slice(0, 2).map((m) => (
              <Text key={m} style={{
                color: colors.workout,
                fontSize: fontSize.micro,
                textTransform: 'capitalize',
                fontFamily: `${fonts.ui}_400Regular`,
              }}>
                {m}
              </Text>
            ))}
          </View>
        </View>

        <Pressable
          onPress={() => removeExercise(exId)}
          style={{ padding: spacing.xs }}
        >
          <Ionicons name="close" size={18} color={colors.textMuted} />
        </Pressable>
      </View>

      {/* Previous performance */}
      {ex.prevPerformance && (
        <View style={{
          backgroundColor: colors.surface2,
          borderRadius: radius.sm,
          paddingHorizontal: spacing.sm,
          paddingVertical: 4,
          marginBottom: spacing.sm,
          alignSelf: 'flex-start',
        }}>
          <Text style={{
            color: colors.textMuted,
            fontSize: fontSize.micro,
            fontFamily: `${fonts.mono}_400Regular`,
          }}>
            Last: {ex.prevPerformance.weightKg} kg × {ex.prevPerformance.reps}
          </Text>
        </View>
      )}

      {/* Sets */}
      {ex.sets.map((s, i) => (
        <SetRow
          key={s.id}
          set={s}
          exerciseId={exId}
          setIdx={i}
          onUpdate={(field, val) => updateSetInput(exId, i, field, val)}
          onConfirm={() => confirmSet(exId, i)}
          onWarmupToggle={() => toggleWarmup(exId, i)}
          onRemove={() => removeSet(exId, i)}
        />
      ))}

      {/* Add set */}
      <Pressable
        onPress={() => addSet(exId)}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: spacing.sm,
          marginTop: spacing.xs,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <Ionicons name="add" size={16} color={colors.primary} />
        <Text style={{
          color: colors.primary,
          fontSize: fontSize.label,
          fontWeight: '600',
          marginLeft: 4,
          fontFamily: `${fonts.ui}_600SemiBold`,
        }}>
          Add Set
        </Text>
      </Pressable>
    </View>
  )
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function ActiveSessionScreen() {
  const router = useRouter()
  const {
    activeSession, sessionExercises,
    restTimer, clearRestTimer, addRestTime,
    finishSession, discardSession,
  } = useWorkoutStoreV2()

  const duration = useDurationTimer(activeSession?.startedAt)
  const hasTimer = !!restTimer && restTimer.endsAt > Date.now()

  // Redirect if no active session
  if (!activeSession) {
    router.replace('/health/workout')
    return null
  }

  function handleFinish() {
    const confirmedCount = sessionExercises.flatMap((e) => e.sets.filter((s) => s.confirmed && !s.isWarmup)).length
    if (confirmedCount === 0) {
      Alert.alert('No sets logged', 'Log at least one set before finishing.', [{ text: 'OK' }])
      return
    }

    router.push('/health/workout/session/finish')
  }

  function handleDiscard() {
    Alert.alert(
      'Discard Workout?',
      'All logged sets will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => { discardSession(); router.replace('/health/workout') },
        },
      ],
    )
  }

  const totalConfirmed = sessionExercises.flatMap((e) => e.sets.filter((s) => s.confirmed && !s.isWarmup)).length

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
        <Pressable onPress={handleDiscard} style={{ padding: spacing.xs }}>
          <Ionicons name="close" size={22} color={colors.textMuted} />
        </Pressable>

        <View style={{ flex: 1 }}>
          <Text style={{
            color: colors.text,
            fontSize: fontSize.body,
            fontWeight: '600',
            fontFamily: `${fonts.ui}_600SemiBold`,
          }}>
            Workout
          </Text>
          <Text style={{
            color: colors.textMuted,
            fontSize: fontSize.micro,
            fontFamily: `${fonts.ui}_400Regular`,
          }}>
            {totalConfirmed} sets · {sessionExercises.length} exercises
          </Text>
        </View>

        <Text style={{
          color: colors.workout,
          fontSize: fontSize.cardTitle,
          fontWeight: '700',
          fontFamily: `${fonts.mono}_700Bold`,
          minWidth: 50,
          textAlign: 'center',
        }}>
          {duration}
        </Text>

        <Pressable
          onPress={handleFinish}
          style={({ pressed }) => ({
            backgroundColor: colors.success,
            borderRadius: radius.sm,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.xs,
            opacity: pressed ? 0.8 : 1,
          })}
        >
          <Text style={{
            color: '#fff',
            fontSize: fontSize.label,
            fontWeight: '700',
            fontFamily: `${fonts.ui}_700Bold`,
          }}>
            Finish
          </Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={hasTimer ? 90 : 10}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: spacing.md, paddingBottom: hasTimer ? 110 : 90 }}
          keyboardShouldPersistTaps="handled"
        >
          {sessionExercises.length === 0 && (
            <View style={{ alignItems: 'center', paddingVertical: spacing.xxl }}>
              <Ionicons name="barbell-outline" size={48} color={colors.textMuted} style={{ marginBottom: spacing.md }} />
              <Text style={{
                color: colors.textMuted,
                fontSize: fontSize.body,
                textAlign: 'center',
                fontFamily: `${fonts.ui}_400Regular`,
              }}>
                Tap + to add your first exercise
              </Text>
            </View>
          )}

          {sessionExercises.map((ex, idx) => (
            <ExerciseBlock
              key={ex.exercise.id}
              ex={ex}
              isFirst={idx === 0}
              isLast={idx === sessionExercises.length - 1}
            />
          ))}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Add exercise FAB */}
      <Pressable
        onPress={() => router.push('/health/workout/exercises?mode=select' as never)}
        style={({ pressed }) => ({
          position: 'absolute',
          bottom: hasTimer ? 90 : 24,
          right: spacing.lg,
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: colors.primary,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: pressed ? 0.85 : 1,
          shadowColor: colors.primary,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.4,
          shadowRadius: 8,
          elevation: 8,
        })}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </Pressable>

      {/* Rest timer */}
      {hasTimer && restTimer && (
        <RestTimerBar
          endsAt={restTimer.endsAt}
          totalSeconds={restTimer.totalSeconds}
          onSkip={clearRestTimer}
          onAdd30={() => addRestTime(30)}
        />
      )}
    </SafeAreaView>
  )
}
