import { useEffect, useRef, useState } from 'react'
import {
  View, Text, ScrollView, Pressable, TextInput, Alert, KeyboardAvoidingView, Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { colors, fontSize, spacing, radius } from '@core/theme'
import { ProgressBar } from '@core/components'
import { useWorkoutStore, type SessionExercise, type ActiveSet } from '@modules/health/workout/workoutStore'
import MuscleGroupBadge from '@modules/health/workout/components/MuscleGroupBadge'

// ─── Duration timer ───────────────────────────────────────────────────────────

function useDurationTimer(startedAt: string | undefined) {
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    if (!startedAt) return
    const update = () => {
      setElapsed(Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000))
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [startedAt])
  const m = Math.floor(elapsed / 60).toString().padStart(2, '0')
  const s = (elapsed % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

// ─── Rest timer bar ───────────────────────────────────────────────────────────

function RestTimerBar({ endsAt, totalSeconds, onSkip }: {
  endsAt: number; totalSeconds: number; onSkip: () => void
}) {
  const [left, setLeft] = useState(Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)))

  useEffect(() => {
    const id = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000))
      setLeft(remaining)
      if (remaining === 0) clearInterval(id)
    }, 500)
    return () => clearInterval(id)
  }, [endsAt])

  const progress = Math.max(0, left / totalSeconds)

  return (
    <View style={{
      position: 'absolute', bottom: 0, left: 0, right: 0,
      backgroundColor: colors.surface,
      borderTopWidth: 1, borderTopColor: colors.border,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      paddingBottom: spacing.md,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs }}>
        <Text style={{ color: colors.warning, fontSize: fontSize.label, fontWeight: '600', flex: 1 }}>
          Rest — {left}s
        </Text>
        <Pressable onPress={onSkip}>
          <Text style={{ color: colors.primary, fontSize: fontSize.label, fontWeight: '600' }}>Skip</Text>
        </Pressable>
      </View>
      <ProgressBar progress={progress} color={colors.warning} height={4} />
    </View>
  )
}

// ─── Set row ─────────────────────────────────────────────────────────────────

function SetRow({
  set, exerciseId, setIdx, onUpdate, onConfirm,
}: {
  set: ActiveSet
  exerciseId: string
  setIdx: number
  onUpdate: (field: 'weightInput' | 'repsInput', val: string) => void
  onConfirm: () => void
}) {
  const repsRef = useRef<TextInput>(null)
  const canConfirm = set.weightInput.length > 0 && set.repsInput.length > 0

  if (set.confirmed) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.xs, gap: spacing.sm }}>
        <Text style={{ color: colors.textMuted, fontSize: fontSize.label, width: 20, textAlign: 'center' }}>{set.setNumber}</Text>
        <Text style={{ color: colors.textMuted, fontSize: fontSize.body, flex: 1 }}>
          {set.weightInput} kg × {set.repsInput} reps
        </Text>
        <Ionicons name="checkmark-circle" size={20} color={colors.success} />
      </View>
    )
  }

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xs }}>
      <Text style={{ color: colors.textMuted, fontSize: fontSize.label, width: 20, textAlign: 'center' }}>
        {set.setNumber}
      </Text>
      <TextInput
        value={set.weightInput}
        onChangeText={(v) => onUpdate('weightInput', v)}
        keyboardType="decimal-pad"
        placeholder="0"
        placeholderTextColor={colors.textMuted}
        returnKeyType="next"
        onSubmitEditing={() => repsRef.current?.focus()}
        style={{
          flex: 1, backgroundColor: colors.surface2, borderRadius: radius.sm,
          borderWidth: 1, borderColor: colors.border,
          color: colors.text, fontSize: fontSize.body, fontWeight: '600',
          paddingHorizontal: spacing.sm, paddingVertical: 6, textAlign: 'center',
        }}
        selectionColor={colors.primary}
      />
      <Text style={{ color: colors.textMuted, fontSize: fontSize.label }}>kg ×</Text>
      <TextInput
        ref={repsRef}
        value={set.repsInput}
        onChangeText={(v) => onUpdate('repsInput', v)}
        keyboardType="number-pad"
        placeholder="0"
        placeholderTextColor={colors.textMuted}
        returnKeyType="done"
        onSubmitEditing={canConfirm ? onConfirm : undefined}
        style={{
          flex: 1, backgroundColor: colors.surface2, borderRadius: radius.sm,
          borderWidth: 1, borderColor: colors.border,
          color: colors.text, fontSize: fontSize.body, fontWeight: '600',
          paddingHorizontal: spacing.sm, paddingVertical: 6, textAlign: 'center',
        }}
        selectionColor={colors.primary}
      />
      <Pressable
        onPress={canConfirm ? onConfirm : undefined}
        style={({ pressed }) => ({
          width: 36, height: 36, borderRadius: 18,
          backgroundColor: canConfirm ? colors.success : colors.surface2,
          alignItems: 'center', justifyContent: 'center',
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <Ionicons name="checkmark" size={18} color={canConfirm ? '#fff' : colors.textMuted} />
      </Pressable>
    </View>
  )
}

// ─── Exercise block ───────────────────────────────────────────────────────────

function ExerciseBlock({ ex }: { ex: SessionExercise }) {
  const { updateSetInput, confirmSet, addSet, removeExercise } = useWorkoutStore()

  return (
    <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
        <Text style={{ color: colors.text, fontSize: fontSize.cardTitle, fontWeight: '600', flex: 1 }}>
          {ex.exercise.name}
        </Text>
        <MuscleGroupBadge muscleGroup={ex.exercise.muscleGroup} small />
        <Pressable onPress={() => removeExercise(ex.exercise.id)} style={{ padding: spacing.xs, marginLeft: spacing.xs }}>
          <Ionicons name="close" size={18} color={colors.textMuted} />
        </Pressable>
      </View>

      {ex.prevPerformance && (
        <Text style={{ color: colors.textMuted, fontSize: fontSize.label, marginBottom: spacing.sm }}>
          Previous: {ex.prevPerformance.weightKg} kg × {ex.prevPerformance.reps} reps
        </Text>
      )}

      {ex.sets.map((s, i) => (
        <SetRow
          key={s.id}
          set={s}
          exerciseId={ex.exercise.id}
          setIdx={i}
          onUpdate={(field, val) => updateSetInput(ex.exercise.id, i, field, val)}
          onConfirm={() => confirmSet(ex.exercise.id, i)}
        />
      ))}

      <Pressable
        onPress={() => addSet(ex.exercise.id)}
        style={({ pressed }) => ({
          flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
          paddingVertical: spacing.sm, opacity: pressed ? 0.7 : 1,
          borderTopWidth: 1, borderTopColor: colors.border, marginTop: spacing.xs,
        })}
      >
        <Ionicons name="add" size={16} color={colors.primary} />
        <Text style={{ color: colors.primary, fontSize: fontSize.label, fontWeight: '600', marginLeft: 4 }}>
          Add Set
        </Text>
      </Pressable>
    </View>
  )
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function WorkoutActiveScreen() {
  const router = useRouter()
  const { activeSession, sessionExercises, restTimer, clearRestTimer, updateSessionName, finishSession } = useWorkoutStore()
  const [editingName, setEditingName] = useState(false)
  const [nameVal, setNameVal] = useState(activeSession?.name ?? '')
  const duration = useDurationTimer(activeSession?.startedAt)

  useEffect(() => {
    setNameVal(activeSession?.name ?? '')
  }, [activeSession?.name])

  if (!activeSession) {
    router.replace('/health/workout')
    return null
  }

  function handleFinish() {
    Alert.alert(
      'Finish Workout?',
      'This will save your session and end the workout.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Finish',
          onPress: () => {
            finishSession()
            router.replace('/health/workout-finish')
          },
        },
      ],
    )
  }

  function handleDiscard() {
    Alert.alert(
      'Discard Workout?',
      'All logged sets will be lost.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: () => {
          useWorkoutStore.getState().discardSession()
          router.replace('/health/workout')
        }},
      ],
    )
  }

  const hasTimer = !!restTimer && restTimer.endsAt > Date.now()

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border, gap: spacing.sm }}>
        <Pressable onPress={handleDiscard} style={{ padding: spacing.xs }}>
          <Ionicons name="close" size={22} color={colors.textMuted} />
        </Pressable>

        {editingName ? (
          <TextInput
            value={nameVal}
            onChangeText={setNameVal}
            autoFocus
            onBlur={() => { updateSessionName(nameVal); setEditingName(false) }}
            onSubmitEditing={() => { updateSessionName(nameVal); setEditingName(false) }}
            style={{ flex: 1, color: colors.text, fontSize: fontSize.body, fontWeight: '600', borderBottomWidth: 1, borderBottomColor: colors.primary }}
            selectionColor={colors.primary}
          />
        ) : (
          <Pressable onPress={() => setEditingName(true)} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text style={{ color: colors.text, fontSize: fontSize.body, fontWeight: '600' }} numberOfLines={1}>
              {activeSession.name}
            </Text>
            <Ionicons name="pencil" size={12} color={colors.textMuted} />
          </Pressable>
        )}

        <Text style={{ color: colors.primary, fontSize: fontSize.label, fontWeight: '700', minWidth: 44, textAlign: 'center' }}>
          {duration}
        </Text>

        <Pressable
          onPress={handleFinish}
          style={{ backgroundColor: colors.success, borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.xs }}
        >
          <Text style={{ color: '#fff', fontSize: fontSize.label, fontWeight: '700' }}>Finish</Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={hasTimer ? 90 : 10}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: spacing.md, paddingBottom: hasTimer ? 100 : 80 }}
        >
          {sessionExercises.length === 0 && (
            <View style={{ alignItems: 'center', paddingVertical: spacing.xxl }}>
              <Ionicons name="barbell-outline" size={48} color={colors.textMuted} style={{ marginBottom: spacing.md }} />
              <Text style={{ color: colors.textMuted, fontSize: fontSize.body, textAlign: 'center' }}>
                Tap + to add your first exercise
              </Text>
            </View>
          )}

          {sessionExercises.map((ex) => (
            <ExerciseBlock key={ex.exercise.id} ex={ex} />
          ))}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Add Exercise FAB */}
      <Pressable
        onPress={() => router.push({ pathname: '/health/exercise-library', params: { selectionMode: '1' } } as never)}
        style={({ pressed }) => ({
          position: 'absolute',
          bottom: hasTimer ? 86 : 24,
          right: spacing.lg,
          width: 56, height: 56,
          borderRadius: 28,
          backgroundColor: colors.primary,
          alignItems: 'center', justifyContent: 'center',
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
        />
      )}
    </SafeAreaView>
  )
}
