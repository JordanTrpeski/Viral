import { View, Text, Pressable, ScrollView, ViewStyle } from 'react-native'
import { colors, radius, spacing } from '@core/theme'

interface Tab {
  key: string
  label: string
}

interface TabBarProps {
  tabs: Tab[]
  activeKey: string
  onChange: (key: string) => void
  style?: ViewStyle
  scrollable?: boolean
}

export default function TabBar({ tabs, activeKey, onChange, style, scrollable = false }: TabBarProps) {
  const content = tabs.map((tab) => {
    const isActive = tab.key === activeKey
    return (
      <Pressable
        key={tab.key}
        onPress={() => onChange(tab.key)}
        style={{
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          borderRadius: radius.md,
          backgroundColor: isActive ? colors.primary + '20' : 'transparent',
          marginRight: spacing.xs,
          minHeight: 36,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text
          style={{
            color: isActive ? colors.primary : colors.textMuted,
            fontSize: 14,
            fontWeight: isActive ? '600' : '400',
          }}
        >
          {tab.label}
        </Text>
      </Pressable>
    )
  })

  if (scrollable) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[{ flexGrow: 0 }, style]}
        contentContainerStyle={{ paddingHorizontal: spacing.md, paddingVertical: spacing.xs }}
      >
        {content}
      </ScrollView>
    )
  }

  return (
    <View
      style={[
        {
          flexDirection: 'row',
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.xs,
        },
        style,
      ]}
    >
      {content}
    </View>
  )
}
