import { Pressable, Text, ActivityIndicator, ViewStyle, TextStyle } from 'react-native'
import { colors, radius, minTapTarget, fonts } from '@core/theme'

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
    container: {
      backgroundColor: colors.primary,
      borderWidth: 1,
      borderColor: colors.borderHero,
    },
    text: { color: '#fff' },
  },
  secondary: {
    container: {
      backgroundColor: colors.surface2,
      borderWidth: 1,
      borderColor: colors.borderAccent,
    },
    text: { color: colors.text },
  },
  ghost: {
    container: { backgroundColor: 'transparent' },
    text: { color: colors.primary },
  },
  danger: {
    container: {
      backgroundColor: colors.danger,
      borderWidth: 1,
      borderColor: colors.danger,
    },
    text: { color: colors.text },
  },
}

// Disabled state overrides — clearly visible but clearly inactive
const disabledContainer: ViewStyle = {
  backgroundColor: colors.surface2,
  borderWidth: 1,
  borderColor: colors.borderAccent,
}
const disabledText: TextStyle = { color: colors.textMuted }

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
          opacity: pressed ? 0.7 : 1,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
        },
        isDisabled ? disabledContainer : container,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={colors.textMuted} />
      ) : (
        <Text style={[
          {
            fontSize: 14,
            fontWeight: '600',
            fontFamily: `${fonts.ui}_600SemiBold`,
            letterSpacing: 1,
            textTransform: 'uppercase',
          },
          isDisabled ? disabledText : text,
        ]}>
          {label}
        </Text>
      )}
    </Pressable>
  )
}
