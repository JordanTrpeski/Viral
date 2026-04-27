import { useEffect } from 'react'
import { View, Text } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  withTiming,
} from 'react-native-reanimated'
import { Ionicons } from '@expo/vector-icons'
import * as Crypto from 'expo-crypto'
import { colors, fontSize, spacing, radius } from '@core/theme'
import { Button } from '@core/components'
import { useOnboardingStore } from '@core/store/onboardingStore'
import { useUserStore } from '@core/store/userStore'

export default function CompleteScreen() {
  const router = useRouter()
  const draft = useOnboardingStore()
  const { saveProfile, setUnits, completeOnboarding } = useUserStore()

  const scale   = useSharedValue(0)
  const opacity = useSharedValue(0)
  const btnOpacity = useSharedValue(0)

  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }))

  const btnStyle = useAnimatedStyle(() => ({
    opacity: btnOpacity.value,
  }))

  useEffect(() => {
    scale.value   = withSpring(1,    { damping: 12, stiffness: 120 })
    opacity.value = withTiming(1,    { duration: 400 })
    btnOpacity.value = withDelay(600, withTiming(1, { duration: 400 }))
  }, [])

  function handleStart() {
    const now = new Date().toISOString()

    saveProfile({
      id:              Crypto.randomUUID(),
      name:            draft.name,
      dateOfBirth:     draft.dateOfBirth,
      weightKg:        draft.weightKg,
      heightCm:        draft.heightCm,
      goals:           [draft.goal],
      calorieGoalKcal: draft.calorieGoal,
      createdAt:       now,
      updatedAt:       now,
    })

    setUnits(draft.units)
    completeOnboarding()
    draft.reset()

    router.replace('/(tabs)')
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg }}>

        <Animated.View
          style={[
            {
              width: 120,
              height: 120,
              borderRadius: 60,
              backgroundColor: `${colors.success}1A`,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: spacing.xl,
            },
            checkStyle,
          ]}
        >
          <Ionicons name="checkmark" size={64} color={colors.success} />
        </Animated.View>

        <Text
          style={{
            color: colors.text,
            fontSize: 32,
            fontWeight: '700',
            textAlign: 'center',
            marginBottom: spacing.sm,
          }}
        >
          You're all set,{'\n'}{draft.name}!
        </Text>

        <Text
          style={{
            color: colors.textMuted,
            fontSize: fontSize.body,
            textAlign: 'center',
            lineHeight: 22,
            marginBottom: spacing.xxl,
          }}
        >
          Your profile is ready. Start logging workouts, meals, and your daily progress.
        </Text>

        <Animated.View style={[{ width: '100%' }, btnStyle]}>
          <Button
            label="Start your journey"
            onPress={handleStart}
            fullWidth
          />
        </Animated.View>
      </View>

      <View style={{ paddingBottom: spacing.lg }}>
        <Text style={{ color: colors.textMuted, fontSize: fontSize.label, textAlign: 'center' }}>
          Step 6 of 6
        </Text>
      </View>
    </SafeAreaView>
  )
}
