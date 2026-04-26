import { View, Text, ViewStyle } from 'react-native'
import { colors, radius, fontSize } from '@core/theme'

interface BadgeProps {
  label: string
  color?: string
  textColor?: string
  style?: ViewStyle
}

export default function Badge({
  label,
  color = colors.primary,
  textColor = '#FFFFFF',
  style,
}: BadgeProps) {
  return (
    <View
      style={[
        {
          backgroundColor: color + '26', // 15% opacity background
          borderRadius: radius.full,
          paddingHorizontal: 10,
          paddingVertical: 3,
          alignSelf: 'flex-start',
          borderWidth: 1,
          borderColor: color + '40',
        },
        style,
      ]}
    >
      <Text style={{ color, fontSize: fontSize.label, fontWeight: '600' }}>{label}</Text>
    </View>
  )
}
