import { View, Pressable, ViewStyle } from 'react-native'
import { colors, radius, spacing } from '@core/theme'

interface CardProps {
  children: React.ReactNode
  onPress?: () => void
  style?: ViewStyle
  padding?: number
}

export default function Card({ children, onPress, style, padding = spacing.md }: CardProps) {
  const containerStyle: ViewStyle = {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding,
  }

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [containerStyle, { opacity: pressed ? 0.85 : 1 }, style]}
      >
        {children}
      </Pressable>
    )
  }

  return <View style={[containerStyle, style]}>{children}</View>
}
