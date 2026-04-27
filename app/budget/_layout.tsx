import { Stack } from 'expo-router'
import { colors } from '@core/theme'

export default function BudgetLayout() {
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
