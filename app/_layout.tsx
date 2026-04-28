import '../global.css'
import { useEffect, useState } from 'react'
import { Stack, useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import * as SplashScreen from 'expo-splash-screen'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { colors } from '@core/theme'
import { initDatabase } from '@core/db/database'
import { useUserStore } from '@core/store/userStore'
import { seedExercisesIfNeeded } from '@modules/health/workout/exerciseSeed'
import { seedChecklistIfNeeded } from '@modules/checklist/checklistSeed'
import { seedFoodsIfNeeded } from '@modules/health/diet/foodSeed'
import { seedBudgetCategoriesIfNeeded } from '@modules/budget/budgetSeed'
import { seedOrganizerTiersIfNeeded } from '@modules/organizer/organizerSeed'

SplashScreen.preventAutoHideAsync()

export { ErrorBoundary } from 'expo-router'

export const unstable_settings = {
  initialRouteName: '(tabs)',
}

export default function RootLayout() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const { onboardingComplete, loadProfile } = useUserStore()

  useEffect(() => {
    initDatabase()
    seedExercisesIfNeeded()
    seedChecklistIfNeeded()
    seedFoodsIfNeeded()
    seedBudgetCategoriesIfNeeded()
    seedOrganizerTiersIfNeeded()
    loadProfile()
    setReady(true)
    SplashScreen.hideAsync()
  }, [])

  useEffect(() => {
    if (!ready) return
    if (!onboardingComplete) {
      router.replace('/onboarding')
    }
  }, [ready, onboardingComplete])

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="settings" options={{ presentation: 'card' }} />
        <Stack.Screen name="health" />
        <Stack.Screen name="checklist" />
        <Stack.Screen name="budget" />
        <Stack.Screen name="organizer" />
        <Stack.Screen name="+not-found" />
      </Stack>
    </GestureHandlerRootView>
  )
}
