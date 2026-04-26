import { View, Text, ViewStyle } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors, spacing, fontSize } from '@core/theme'
import Button from './Button'

interface EmptyStateProps {
  icon?: React.ComponentProps<typeof Ionicons>['name']
  title: string
  message?: string
  actionLabel?: string
  onAction?: () => void
  style?: ViewStyle
}

export default function EmptyState({
  icon = 'cube-outline',
  title,
  message,
  actionLabel,
  onAction,
  style,
}: EmptyStateProps) {
  return (
    <View
      style={[
        {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          padding: spacing.xl,
        },
        style,
      ]}
    >
      <Ionicons name={icon} size={56} color={colors.textMuted} style={{ marginBottom: spacing.md }} />
      <Text
        style={{
          color: colors.text,
          fontSize: fontSize.cardTitle,
          fontWeight: '600',
          textAlign: 'center',
          marginBottom: spacing.xs,
        }}
      >
        {title}
      </Text>
      {message && (
        <Text
          style={{
            color: colors.textMuted,
            fontSize: fontSize.body,
            textAlign: 'center',
            lineHeight: 20,
            marginBottom: spacing.lg,
          }}
        >
          {message}
        </Text>
      )}
      {actionLabel && onAction && (
        <Button label={actionLabel} onPress={onAction} />
      )}
    </View>
  )
}
