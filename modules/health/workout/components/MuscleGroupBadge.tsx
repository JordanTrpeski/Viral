import { View, Text } from 'react-native'
import { colors, fontSize, radius, spacing } from '@core/theme'
import type { MuscleGroup } from '@modules/health/shared/types'

const MUSCLE_COLORS: Record<MuscleGroup, string> = {
  chest:     '#FF6B6B',
  back:      '#4ECDC4',
  legs:      '#45B7D1',
  shoulders: '#96CEB4',
  arms:      '#FFEAA7',
  core:      '#DDA0DD',
  cardio:    '#98D8C8',
}

interface Props {
  muscleGroup: MuscleGroup
  small?: boolean
}

export default function MuscleGroupBadge({ muscleGroup, small = false }: Props) {
  const color = MUSCLE_COLORS[muscleGroup]
  return (
    <View
      style={{
        backgroundColor: `${color}22`,
        borderRadius: radius.full,
        paddingHorizontal: small ? spacing.xs : spacing.sm,
        paddingVertical: small ? 2 : 4,
        alignSelf: 'flex-start',
      }}
    >
      <Text
        style={{
          color,
          fontSize: small ? fontSize.micro : fontSize.label,
          fontWeight: '600',
          textTransform: 'capitalize',
        }}
      >
        {muscleGroup}
      </Text>
    </View>
  )
}
