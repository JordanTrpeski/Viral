import { Stack } from 'expo-router'
import { colors } from '@core/theme'

export default function ProgramsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
        animation: 'slide_from_right',
      }}
    />
  )
}
