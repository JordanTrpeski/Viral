import { useEffect, useState } from 'react'
import { View, Text, TextInput } from 'react-native'
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
import { useHealthSettingsStore } from '@core/store/healthSettingsStore'
import { calculateTDEE, goalAdjustedCalories } from '@core/utils/tdee'

const TOTAL_STEPS = 7
const CURRENT_STEP = 6  // 0-indexed → step 7 of 7

export default function CompleteScreen() {
  const router = useRouter()
  const draft = useOnboardingStore()
  const { saveProfile, setUnits, completeOnboarding } = useUserStore()
  const { setTrainingExperience, setTrainingGoal, setEquipment, setDaysPerWeek } = useHealthSettingsStore()

  // Calculate calorie goal silently from collected data
  const tdee = calculateTDEE(
    draft.weightKg,
    draft.heightCm,
    draft.dateOfBirth,
    draft.sex,
    draft.activityLevel,
  )
  const calculatedCalories = goalAdjustedCalories(tdee, draft.goal)
  // Use store value if already set, else use calculated
  const calorieGoal = draft.calorieGoal > 0 ? draft.calorieGoal : calculatedCalories

  const [goalWeightInput, setGoalWeightInput] = useState('')

  const scale      = useSharedValue(0)
  const opacity    = useSharedValue(0)
  const cardOpacity = useSharedValue(0)
  const btnOpacity = useSharedValue(0)

  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }))
  const cardStyle = useAnimatedStyle(() => ({ opacity: cardOpacity.value }))
  const btnStyle  = useAnimatedStyle(() => ({ opacity: btnOpacity.value }))

  useEffect(() => {
    scale.value      = withSpring(1,    { damping: 12, stiffness: 120 })
    opacity.value    = withTiming(1,    { duration: 400 })
    cardOpacity.value = withDelay(400,  withTiming(1, { duration: 400 }))
    btnOpacity.value = withDelay(700,   withTiming(1, { duration: 400 }))
  }, [])

  function handleStart() {
    const now = new Date().toISOString()

    const parsedGoalWeight = parseFloat(goalWeightInput)
    const goalWeightKg = !isNaN(parsedGoalWeight) && parsedGoalWeight > 0
      ? (draft.units === 'metric' ? parsedGoalWeight : parsedGoalWeight / 2.20462)
      : undefined

    saveProfile({
      id:              Crypto.randomUUID(),
      name:            draft.name,
      dateOfBirth:     draft.dateOfBirth,
      weightKg:        draft.weightKg,
      heightCm:        draft.heightCm,
      sex:             draft.sex,
      activityLevel:   draft.activityLevel,
      goals:           [draft.goal],
      calorieGoalKcal: calorieGoal,
      goalWeightKg,
      createdAt:       now,
      updatedAt:       now,
    })

    setUnits(draft.units)

    // Persist health-specific onboarding answers to health settings store
    setTrainingExperience(draft.trainingExperience)
    setTrainingGoal(draft.trainingGoal)
    setEquipment(draft.equipment)
    setDaysPerWeek(draft.daysPerWeek)

    completeOnboarding()
    draft.reset()

    router.replace('/(tabs)')
  }

  const goalLabel: Record<string, string> = {
    lose_weight:    'Calorie deficit for fat loss',
    build_muscle:   'Calorie surplus for muscle gain',
    maintain:       'Maintenance calories',
    general_health: 'Maintenance calories',
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg }}>

        <Animated.View
          style={[
            {
              width: 100,
              height: 100,
              borderRadius: 50,
              backgroundColor: `${colors.success}1A`,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: spacing.lg,
            },
            checkStyle,
          ]}
        >
          <Ionicons name="checkmark" size={56} color={colors.success} />
        </Animated.View>

        <Text style={{
          color: colors.text,
          fontSize: 32,
          fontWeight: '700',
          textAlign: 'center',
          marginBottom: spacing.sm,
        }}>
          You're all set,{'\n'}{draft.name}!
        </Text>

        <Text style={{
          color: colors.textMuted,
          fontSize: fontSize.body,
          textAlign: 'center',
          lineHeight: 22,
          marginBottom: spacing.xl,
        }}>
          Your daily calorie goal has been calculated from your stats and goal.
        </Text>

        {/* Calorie goal summary card */}
        <Animated.View style={[{ width: '100%' }, cardStyle]}>
          <View style={{
            backgroundColor: colors.surface,
            borderRadius: radius.lg,
            borderWidth: 1,
            borderColor: colors.border,
            padding: spacing.lg,
            marginBottom: spacing.xl,
            alignItems: 'center',
          }}>
            <Text style={{ color: colors.textMuted, fontSize: fontSize.label, marginBottom: spacing.xs }}>
              {goalLabel[draft.goal] ?? 'Your daily goal'}
            </Text>
            <Text style={{ color: colors.primary, fontSize: 52, fontWeight: '700', letterSpacing: -1 }}>
              {calorieGoal.toLocaleString()}
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: fontSize.body }}>kcal / day</Text>
            <Text style={{ color: colors.textMuted, fontSize: fontSize.label, marginTop: spacing.sm }}>
              Based on {tdee.toLocaleString()} kcal TDEE
            </Text>
          </View>
        </Animated.View>

        {/* Optional goal weight */}
        <Animated.View style={[{ width: '100%', marginBottom: spacing.xl }, cardStyle]}>
          <Text style={{ color: colors.textMuted, fontSize: fontSize.label, marginBottom: spacing.xs }}>
            Target weight ({draft.units === 'metric' ? 'kg' : 'lbs'}) — optional
          </Text>
          <TextInput
            value={goalWeightInput}
            onChangeText={setGoalWeightInput}
            keyboardType="decimal-pad"
            placeholder={`e.g. ${draft.units === 'metric' ? '70' : '154'}`}
            placeholderTextColor={colors.textMuted}
            style={{
              backgroundColor: colors.surface,
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: colors.border,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm,
              color: colors.text,
              fontSize: fontSize.body,
              minHeight: 44,
            }}
            selectionColor={colors.primary}
          />
        </Animated.View>

        <Animated.View style={[{ width: '100%' }, btnStyle]}>
          <Button
            label="Start your journey"
            onPress={handleStart}
            fullWidth
          />
        </Animated.View>
      </View>

      <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, gap: spacing.sm }}>
        <View style={{ flexDirection: 'row', gap: 3 }}>
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <View
              key={i}
              style={{
                flex: 1, height: 3, borderRadius: radius.full,
                backgroundColor: colors.primary,
              }}
            />
          ))}
        </View>
        <Text style={{ color: colors.textMuted, fontSize: fontSize.label, textAlign: 'center' }}>
          Step {CURRENT_STEP + 1} of {TOTAL_STEPS}
        </Text>
      </View>
    </SafeAreaView>
  )
}
