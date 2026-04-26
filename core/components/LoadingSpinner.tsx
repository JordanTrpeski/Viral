import { ActivityIndicator, View, ViewStyle } from 'react-native'
import { colors } from '@core/theme'

interface LoadingSpinnerProps {
  size?: 'small' | 'large'
  color?: string
  fullScreen?: boolean
  style?: ViewStyle
}

export default function LoadingSpinner({
  size = 'large',
  color = colors.primary,
  fullScreen = false,
  style,
}: LoadingSpinnerProps) {
  if (fullScreen) {
    return (
      <View
        style={[
          { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
          style,
        ]}
      >
        <ActivityIndicator size={size} color={color} />
      </View>
    )
  }

  return <ActivityIndicator size={size} color={color} style={style} />
}
