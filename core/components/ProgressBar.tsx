import { View, ViewStyle } from 'react-native'
import { colors, radius } from '@core/theme'

interface ProgressBarProps {
  progress: number      // 0–1
  height?: number
  color?: string
  trackColor?: string
  style?: ViewStyle
}

function resolveColor(progress: number, color?: string): string {
  if (color) return color
  if (progress >= 1) return colors.danger
  if (progress >= 0.8) return colors.warning
  return colors.success
}

export default function ProgressBar({
  progress,
  height = 6,
  color,
  trackColor = colors.surface2,
  style,
}: ProgressBarProps) {
  const clamped = Math.min(Math.max(progress, 0), 1)
  const barColor = resolveColor(clamped, color)

  return (
    <View
      style={[
        {
          height,
          backgroundColor: trackColor,
          borderRadius: radius.full,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <View
        style={{
          height,
          width: `${clamped * 100}%`,
          backgroundColor: barColor,
          borderRadius: radius.full,
        }}
      />
    </View>
  )
}
