import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { View, Text } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors, fonts } from '@core/theme'
import { useOrganizerStore } from '@modules/organizer/organizerStore'
import { localDateStr } from '@core/utils/units'

type IoniconsName = React.ComponentProps<typeof Ionicons>['name']

function TabIcon({ name, color, focused }: { name: IoniconsName; color: string; focused: boolean }) {
  return (
    <View style={{ alignItems: 'center' }}>
      {focused && (
        <View style={{
          position: 'absolute',
          top: -10,
          width: 24,
          height: 2,
          backgroundColor: colors.primary,
          borderRadius: 1,
        }} />
      )}
      <Ionicons name={name} size={22} color={color} />
    </View>
  )
}

function OrganizerTabIcon({ color, focused }: { color: string; focused: boolean }) {
  const reminders = useOrganizerStore((s) => s.reminders)
  const today = localDateStr()
  const overdueCount = reminders.filter((r) => !r.isCompleted && r.dueDate < today).length
  return (
    <View style={{ alignItems: 'center' }}>
      {focused && (
        <View style={{
          position: 'absolute',
          top: -10,
          width: 24,
          height: 2,
          backgroundColor: colors.primary,
          borderRadius: 1,
        }} />
      )}
      <View>
        <Ionicons name="calendar" size={22} color={color} />
        {overdueCount > 0 && (
          <View style={{
            position: 'absolute', top: -4, right: -6,
            backgroundColor: colors.danger,
            borderRadius: 8, minWidth: 16, height: 16,
            alignItems: 'center', justifyContent: 'center',
            paddingHorizontal: 3,
          }}>
            <Text style={{ color: colors.text, fontSize: 10, fontWeight: '700', lineHeight: 14 }}>
              {overdueCount > 99 ? '99+' : overdueCount}
            </Text>
          </View>
        )}
      </View>
    </View>
  )
}

export default function TabLayout() {
  const insets = useSafeAreaInsets()

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.borderAccent,
          borderTopWidth: 1,
          height: 64 + insets.bottom,
          paddingBottom: 10 + insets.bottom,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          fontFamily: `${fonts.ui}_600SemiBold`,
          letterSpacing: 0.8,
          textTransform: 'uppercase',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => <TabIcon name="home" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="health"
        options={{
          title: 'Health',
          tabBarIcon: ({ color, focused }) => <TabIcon name="heart" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="budget"
        options={{
          title: 'Budget',
          tabBarIcon: ({ color, focused }) => <TabIcon name="wallet" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="organizer"
        options={{
          title: 'Organizer',
          tabBarIcon: ({ color, focused }) => <OrganizerTabIcon color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="habits"
        options={{
          title: 'Habits',
          tabBarIcon: ({ color, focused }) => <TabIcon name="checkmark-circle" color={color} focused={focused} />,
        }}
      />
    </Tabs>
  )
}
