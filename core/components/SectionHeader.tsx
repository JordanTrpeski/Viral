import { View, Text, Pressable, ViewStyle } from 'react-native'
import { colors, spacing, fontSize } from '@core/theme'

interface SectionHeaderProps {
  title: string
  actionLabel?: string
  onAction?: () => void
  style?: ViewStyle
}

export default function SectionHeader({ title, actionLabel, onAction, style }: SectionHeaderProps) {
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingVertical: spacing.sm,
        },
        style,
      ]}
    >
      <Text style={{ color: colors.text, fontSize: fontSize.sectionHeader, fontWeight: '600' }}>
        {title}
      </Text>
      {actionLabel && onAction && (
        <Pressable onPress={onAction} hitSlop={12}>
          <Text style={{ color: colors.primary, fontSize: fontSize.body, fontWeight: '500' }}>
            {actionLabel}
          </Text>
        </Pressable>
      )}
    </View>
  )
}
