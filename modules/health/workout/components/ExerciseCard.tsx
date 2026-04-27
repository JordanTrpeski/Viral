import { Pressable, View, Text } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors, fontSize, spacing, radius } from '@core/theme'
import MuscleGroupBadge from './MuscleGroupBadge'
import type { Exercise } from '@modules/health/shared/types'

interface Props {
  exercise: Exercise
  lastPerformance?: { weightKg: number; reps: number } | null
  isPersonalBest?: boolean
  onPress: () => void
}

export default function ExerciseCard({ exercise, lastPerformance, isPersonalBest, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        padding: spacing.md,
        gap: spacing.md,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: 4 }}>
          <Text style={{ color: colors.text, fontSize: fontSize.cardTitle, fontWeight: '600', flex: 1 }}>
            {exercise.name}
          </Text>
          {isPersonalBest && (
            <Ionicons name="star" size={14} color={colors.warning} />
          )}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          <MuscleGroupBadge muscleGroup={exercise.muscleGroup} small />
          {exercise.equipment && (
            <Text style={{ color: colors.textMuted, fontSize: fontSize.micro }}>
              · {exercise.equipment}
            </Text>
          )}
        </View>
        {lastPerformance && (
          <Text style={{ color: colors.textMuted, fontSize: fontSize.label, marginTop: 4 }}>
            Last: {lastPerformance.weightKg} kg × {lastPerformance.reps} reps
          </Text>
        )}
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
    </Pressable>
  )
}
