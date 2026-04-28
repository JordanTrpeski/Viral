import { Stack } from 'expo-router'
import { colors } from '@core/theme'

export default function OrganizerLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="tiers" />
      <Stack.Screen name="tier-edit" />
      <Stack.Screen name="people" />
      <Stack.Screen name="person-add" />
      <Stack.Screen name="person-edit" />
      <Stack.Screen name="person-profile" />
      <Stack.Screen name="birthdays" />
      <Stack.Screen name="reminders" />
      <Stack.Screen name="reminder-add" />
      <Stack.Screen name="calendar" />
      <Stack.Screen name="event-add" />
      <Stack.Screen name="notes" />
      <Stack.Screen name="note-edit" />
    </Stack>
  )
}
