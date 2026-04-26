import { useState } from 'react'
import {
  TextInput,
  View,
  Text,
  TextInputProps,
  ViewStyle,
  KeyboardTypeOptions,
} from 'react-native'
import { colors, radius, spacing, fontSize } from '@core/theme'

interface InputProps extends Omit<TextInputProps, 'style'> {
  label?: string
  error?: string
  keyboardType?: KeyboardTypeOptions
  containerStyle?: ViewStyle
  suffix?: string
}

export default function Input({
  label,
  error,
  keyboardType = 'default',
  containerStyle,
  suffix,
  ...props
}: InputProps) {
  const [focused, setFocused] = useState(false)

  return (
    <View style={containerStyle}>
      {label && (
        <Text
          style={{
            color: colors.textMuted,
            fontSize: fontSize.label,
            marginBottom: spacing.xs,
            fontWeight: '500',
          }}
        >
          {label}
        </Text>
      )}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.surface2,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: error ? colors.danger : focused ? colors.primary : colors.border,
          paddingHorizontal: spacing.md,
          minHeight: 48,
        }}
      >
        <TextInput
          {...props}
          keyboardType={keyboardType}
          onFocus={(e) => { setFocused(true); props.onFocus?.(e) }}
          onBlur={(e) => { setFocused(false); props.onBlur?.(e) }}
          style={{
            flex: 1,
            color: colors.text,
            fontSize: fontSize.body,
            paddingVertical: spacing.sm,
          }}
          placeholderTextColor={colors.textMuted}
          selectionColor={colors.primary}
        />
        {suffix && (
          <Text style={{ color: colors.textMuted, fontSize: fontSize.body, marginLeft: spacing.xs }}>
            {suffix}
          </Text>
        )}
      </View>
      {error && (
        <Text style={{ color: colors.danger, fontSize: fontSize.label, marginTop: spacing.xs }}>
          {error}
        </Text>
      )}
    </View>
  )
}
