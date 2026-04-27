import { View, Text, Pressable } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors, fontSize, spacing, radius } from '@core/theme'
import MuscleGroupBadge from './MuscleGroupBadge'
import { formatDuration, formatVolume } from '@modules/health/workout/workoutUtils'
import type { MuscleGroup } from '@modules/health/shared/types'

interface Props {
  name: string
  date: string
  exerciseCount: number
  totalSets: number
  totalVolumeKg: number
  durationMinutes?: number
  muscleGroups?: string[]
  onPress?: () => void
}

export default function WorkoutSessionCard({
  name, date, exerciseCount, totalSets, totalVolumeKg, durationMinutes, muscleGroups, onPress,
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => ({
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        padding: spacing.md,
        opacity: pressed && onPress ? 0.85 : 1,
      })}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
        <Text style={{ color: colors.text, fontSize: fontSize.cardTitle, fontWeight: '600', flex: 1 }}>
          {name}
        </Text>
        {onPress && <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />}
      </View>

      <Text style={{ color: colors.textMuted, fontSize: fontSize.label, marginBottom: spacing.sm }}>
        {date}
      </Text>

      <View style={{ flexDirection: 'row', gap: spacing.lg, marginBottom: muscleGroups?.length ? spacing.sm : 0 }}>
        <StatItem icon="barbell-outline" value={`${exerciseCount} exercises`} />
        <StatItem icon="checkmark-circle-outline" value={`${totalSets} sets`} />
        <StatItem icon="stats-chart-outline" value={formatVolume(totalVolumeKg)} />
        {durationMinutes && <StatItem icon="time-outline" value={formatDuration(durationMinutes)} />}
      </View>

      {muscleGroups && muscleGroups.length > 0 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
          {muscleGroups.map((mg) => (
            <MuscleGroupBadge key={mg} muscleGroup={mg as MuscleGroup} small />
          ))}
        </View>
      )}
    </Pressable>
  )
}

function StatItem({ icon, value }: { icon: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <Ionicons name={icon as never} size={12} color={colors.textMuted} />
      <Text style={{ color: colors.textMuted, fontSize: fontSize.label }}>{value}</Text>
    </View>
  )
}
