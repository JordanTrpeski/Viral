import '../global.css'
import { useEffect, useRef, useState } from 'react'
import { Platform, TextInput } from 'react-native'
import { Stack, useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import * as SplashScreen from 'expo-splash-screen'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import * as Sentry from '@sentry/react-native'
import {
  useFonts,
  SpaceGrotesk_400Regular,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk'
import {
  JetBrainsMono_400Regular,
  JetBrainsMono_500Medium,
  JetBrainsMono_700Bold,
} from '@expo-google-fonts/jetbrains-mono'
import { colors } from '@core/theme'
import { initDatabase } from '@core/db/database'
import { useUserStore } from '@core/store/userStore'
import { seedExercisesIfNeeded } from '@modules/health/workout/exerciseSeed'
import { seedChecklistIfNeeded } from '@modules/checklist/checklistSeed'
import { seedFoodsIfNeeded } from '@modules/health/diet/foodSeed'
import { seedBudgetCategoriesIfNeeded } from '@modules/budget/budgetSeed'
import { seedOrganizerTiersIfNeeded } from '@modules/organizer/organizerSeed'

Sentry.init({
  dsn: 'https://377853c6d1f84fafc119393db68e7648@o4511366080757760.ingest.de.sentry.io/4511366093209680',
  debug: false,
  enabled: true,
})

SplashScreen.preventAutoHideAsync()

// @gorhom/bottom-sheet calls TextInput.State.currentlyFocusedInput which doesn't exist on web
if (Platform.OS === 'web') {
  const State = (TextInput as unknown as { State?: Record<string, unknown> }).State
  if (State && !State.currentlyFocusedInput) {
    State.currentlyFocusedInput = () => null
  }
}

export { ErrorBoundary } from 'expo-router'

export const unstable_settings = {
  initialRouteName: '(tabs)',
}

export default function RootLayout() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const { loadProfile, profile } = useUserStore()

  // Run initDatabase() synchronously on first render so all tables exist
  // before any child screen's useFocusEffect fires and queries them.
  const dbInitialized = useRef(false)
  if (!dbInitialized.current) {
    initDatabase()
    dbInitialized.current = true
  }

  const [fontsLoaded] = useFonts({
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
    JetBrainsMono_400Regular,
    JetBrainsMono_500Medium,
    JetBrainsMono_700Bold,
  })

  useEffect(() => {
    seedExercisesIfNeeded()
    seedChecklistIfNeeded()
    seedFoodsIfNeeded()
    seedBudgetCategoriesIfNeeded()
    seedOrganizerTiersIfNeeded()
    loadProfile()
    setReady(true)
  }, [])

  useEffect(() => {
    if (ready && fontsLoaded) {
      SplashScreen.hideAsync()
    }
  }, [ready, fontsLoaded])

  useEffect(() => {
    if (!ready) return
    // SQLite profile is the single source of truth for onboarding completion.
    // MMKV can silently fall back to in-memory storage on some Android devices,
    // losing the flag between launches. A completed user always has a SQLite profile row.
    // Only redirect if no profile row exists — this is reliable across all restarts.
    if (profile === null) {
      router.replace('/onboarding')
    }
  }, [ready, profile])

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
        <Stack.Screen name="habits" />
        <Stack.Screen name="insights" options={{ presentation: 'card' }} />
        <Stack.Screen name="dev-tools" />
        <Stack.Screen name="tools" />
        <Stack.Screen name="+not-found" />
      </Stack>
    </GestureHandlerRootView>
  )
}
