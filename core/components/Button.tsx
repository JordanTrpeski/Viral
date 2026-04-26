import { Pressable, Text, ActivityIndicator, ViewStyle, TextStyle } from 'react-native'
import { colors, radius, minTapTarget } from '@core/theme'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

interface ButtonProps {
  label: string
  onPress: () => void
  variant?: Variant
  loading?: boolean
  disabled?: boolean
  fullWidth?: boolean
  style?: ViewStyle
}

const variantStyles: Record<Variant, { container: ViewStyle; text: TextStyle }> = {
  primary: {
    container: { backgroundColor: colors.primary },
    text: { color: '#FFFFFF' },
  },
  secondary: {
    container: { backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.border },
    text: { color: colors.text },
  },
  ghost: {
    container: { backgroundColor: 'transparent' },
    text: { color: colors.primary },
  },
  danger: {
    container: { backgroundColor: colors.danger },
    text: { color: '#FFFFFF' },
  },
}

export default function Button({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
}: ButtonProps) {
  const { container, text } = variantStyles[variant]
  const isDisabled = disabled || loading

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: minTapTarget,
          paddingHorizontal: 20,
          borderRadius: radius.md,
          opacity: pressed || isDisabled ? 0.6 : 1,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
        },
        container,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={text.color as string} />
      ) : (
        <Text style={[{ fontSize: 16, fontWeight: '600' }, text]}>{label}</Text>
      )}
    </Pressable>
  )
}
