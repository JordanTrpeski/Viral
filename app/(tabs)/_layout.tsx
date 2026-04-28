import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { View, Text } from 'react-native'
import { colors } from '@core/theme'
import { useOrganizerStore } from '@modules/organizer/organizerStore'
import { localDateStr } from '@core/utils/units'

type IoniconsName = React.ComponentProps<typeof Ionicons>['name']

function TabIcon({ name, color }: { name: IoniconsName; color: string }) {
  return <Ionicons name={name} size={24} color={color} />
}

function OrganizerTabIcon({ color }: { color: string }) {
  const reminders = useOrganizerStore((s) => s.reminders)
  const today = localDateStr()
  const overdueCount = reminders.filter((r) => !r.isCompleted && r.dueDate < today).length
  return (
    <View>
      <Ionicons name="calendar" size={24} color={color} />
      {overdueCount > 0 && (
        <View style={{
          position: 'absolute', top: -4, right: -6,
          backgroundColor: colors.danger,
          borderRadius: 8, minWidth: 16, height: 16,
          alignItems: 'center', justifyContent: 'center',
          paddingHorizontal: 3,
        }}>
          <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700', lineHeight: 14 }}>
            {overdueCount > 99 ? '99+' : overdueCount}
          </Text>
        </View>
      )}
    </View>
  )
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 64,
          paddingBottom: 10,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <TabIcon name="home" color={color} />,
        }}
      />
      <Tabs.Screen
        name="health"
        options={{
          title: 'Health',
          tabBarIcon: ({ color }) => <TabIcon name="heart" color={color} />,
        }}
      />
      <Tabs.Screen
        name="checklist"
        options={{
          title: 'Checklist',
          tabBarIcon: ({ color }) => <TabIcon name="checkmark-circle" color={color} />,
        }}
      />
      <Tabs.Screen
        name="budget"
        options={{
          title: 'Budget',
          tabBarIcon: ({ color }) => <TabIcon name="wallet" color={color} />,
        }}
      />
      <Tabs.Screen
        name="organizer"
        options={{
          title: 'Organizer',
          tabBarIcon: ({ color }) => <OrganizerTabIcon color={color} />,
        }}
      />
    </Tabs>
  )
}
